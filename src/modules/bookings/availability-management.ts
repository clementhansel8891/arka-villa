/**
 * Availability management — bulk operations, manual blocking, and Redis cache.
 *
 * Provides:
 * - Manual block/unblock by Agency_Admin with conflict detection
 * - Bulk seasonal blocks (multiple rooms for a date range)
 * - Automatic unblock of past blocked dates (scheduled cleanup)
 * - Redis availability cache with 60-second TTL and immediate invalidation
 *
 * Requirements: 5.1, 5.2, 5.5
 */

import { v4 as uuidv4 } from 'uuid';
import { tenantQuery } from '@/lib/db/tenant-query';
import { redis, createRedisClient } from '@/lib/db/redis';
import { EventBus } from '@/lib/events/event-bus';
import { STREAMS } from '@/lib/events/streams';
import type { PlatformEvent } from '@/lib/events/types';
import type { RoomAvailabilityState } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BlockReason = 'seasonal' | 'maintenance' | 'owner_hold' | 'manual';

export interface AvailabilityBlock {
  id: string;
  roomId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: BlockReason;
  notes: string | null;
  createdBy: string;
  createdAt: string;
}

export interface CreateBlockRequest {
  roomId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: BlockReason;
  notes?: string;
}

export interface BulkBlockRequest {
  roomIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  reason: BlockReason;
  notes?: string;
}

export interface BlockConflict {
  roomId: string;
  conflictingBookingIds: string[];
}

export interface BulkBlockResult {
  created: AvailabilityBlock[];
  conflicts: BlockConflict[];
}

// ─── Database Row Types ───────────────────────────────────────────────────────

interface BlockRow {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  reason: BlockReason;
  notes: string | null;
  created_by: string;
  created_at: string;
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class AvailabilityManagementError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'CONFLICT'
      | 'NOT_FOUND'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AvailabilityManagementError';
  }
}

// ─── Redis Cache ──────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 60;

/**
 * Build the Redis cache key for a specific room-date availability entry.
 * Key format: avail:{tenantId}:{roomId}:{date}
 */
export function buildCacheKey(
  tenantId: string,
  roomId: string,
  date: string
): string {
  return `avail:${tenantId}:${roomId}:${date}`;
}

/**
 * Get cached availability state for a room on a specific date.
 * Returns null if cache miss.
 */
export async function getCachedAvailability(
  tenantId: string,
  roomId: string,
  date: string
): Promise<RoomAvailabilityState | null> {
  const key = buildCacheKey(tenantId, roomId, date);
  const cached = await redis.get(key);
  if (cached && isValidState(cached)) {
    return cached as RoomAvailabilityState;
  }
  return null;
}

/**
 * Set cached availability state for a room on a specific date.
 * TTL: 60 seconds.
 */
export async function setCachedAvailability(
  tenantId: string,
  roomId: string,
  date: string,
  state: RoomAvailabilityState
): Promise<void> {
  const key = buildCacheKey(tenantId, roomId, date);
  await redis.set(key, state, 'EX', CACHE_TTL_SECONDS);
}

/**
 * Invalidate cached availability for a room across a date range.
 * Called immediately when availability changes (block/unblock/booking).
 */
export async function invalidateAvailabilityCache(
  tenantId: string,
  roomId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  const keys: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const dateStr = current.toISOString().split('T')[0];
    keys.push(buildCacheKey(tenantId, roomId, dateStr));
    current.setDate(current.getDate() + 1);
  }

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

function isValidState(value: string): value is RoomAvailabilityState {
  return value === 'available' || value === 'booked' || value === 'blocked';
}

// ─── Event Emission ───────────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

async function getEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    eventBusInstance = new EventBus({ publisher, subscriber });
  }
  return eventBusInstance;
}

async function emitAvailabilityEvent(
  type: string,
  tenantId: string,
  payload: unknown,
  actorUserId: string,
  actorRole: string
): Promise<void> {
  try {
    const eventBus = await getEventBus();
    const event: PlatformEvent = {
      id: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'availability-management',
      tenantId,
      correlationId: uuidv4(),
      actor: { userId: actorUserId, role: actorRole },
      payload,
      metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' },
    };
    await eventBus.emit(STREAMS.AVAILABILITY, event);
  } catch {
    console.error(`[AvailabilityManagement] Failed to emit event: ${type}`);
  }
}

// ─── Row Mapper ───────────────────────────────────────────────────────────────

function mapBlockRow(row: BlockRow): AvailabilityBlock {
  return {
    id: row.id,
    roomId: row.room_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// ─── Conflict Detection ───────────────────────────────────────────────────────

/**
 * Check if any active bookings exist for a room in the given date range.
 * Uses the same overlap logic as booking creation:
 * A booking conflicts if booking.check_in < endDate AND booking.check_out > startDate
 *
 * Returns the list of conflicting booking IDs.
 */
export async function detectBookingConflicts(
  tenantId: string,
  roomId: string,
  startDate: string,
  endDate: string
): Promise<string[]> {
  const result = await tenantQuery<{ id: string }>(
    tenantId,
    `SELECT id FROM bookings
     WHERE room_id = $1
       AND status NOT IN ('cancelled')
       AND check_in < $3
       AND check_out > $2`,
    [roomId, startDate, endDate]
  );
  return result.rows.map((r) => r.id);
}

// ─── Manual Block/Unblock ─────────────────────────────────────────────────────

/**
 * Manually block dates for a room.
 *
 * Agency_Admin blocks dates for a room. Must verify no active bookings
 * exist for those dates first.
 *
 * Requirements: 5.1, 5.5
 */
export async function createBlock(
  tenantId: string,
  request: CreateBlockRequest,
  actorUserId: string,
  actorRole: string
): Promise<AvailabilityBlock> {
  // Validate input
  validateBlockRequest(request);

  // Check for booking conflicts
  const conflicts = await detectBookingConflicts(
    tenantId,
    request.roomId,
    request.startDate,
    request.endDate
  );

  if (conflicts.length > 0) {
    throw new AvailabilityManagementError(
      `Cannot block dates: active bookings exist (${conflicts.join(', ')})`,
      'CONFLICT',
      409
    );
  }

  // Insert the block record
  const result = await tenantQuery<BlockRow>(
    tenantId,
    `INSERT INTO availability_blocks (room_id, start_date, end_date, reason, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, room_id, start_date, end_date, reason, notes, created_by, created_at`,
    [
      request.roomId,
      request.startDate,
      request.endDate,
      request.reason,
      request.notes ?? null,
      actorUserId,
    ]
  );

  const block = mapBlockRow(result.rows[0]);

  // Invalidate cache for affected dates
  await invalidateAvailabilityCache(
    tenantId,
    request.roomId,
    request.startDate,
    request.endDate
  );

  // Emit event
  await emitAvailabilityEvent(
    'availability.blocked',
    tenantId,
    {
      blockId: block.id,
      roomId: block.roomId,
      startDate: block.startDate,
      endDate: block.endDate,
      reason: block.reason,
    },
    actorUserId,
    actorRole
  );

  return block;
}

/**
 * Remove an availability block (unblock dates).
 *
 * Requirements: 5.1, 5.5
 */
export async function removeBlock(
  tenantId: string,
  blockId: string,
  actorUserId: string,
  actorRole: string
): Promise<AvailabilityBlock> {
  // Find the block
  const existing = await tenantQuery<BlockRow>(
    tenantId,
    `SELECT id, room_id, start_date, end_date, reason, notes, created_by, created_at
     FROM availability_blocks
     WHERE id = $1`,
    [blockId]
  );

  if (existing.rows.length === 0) {
    throw new AvailabilityManagementError(
      `Block not found: ${blockId}`,
      'NOT_FOUND',
      404
    );
  }

  const block = mapBlockRow(existing.rows[0]);

  // Delete the block
  await tenantQuery(
    tenantId,
    `DELETE FROM availability_blocks WHERE id = $1`,
    [blockId]
  );

  // Invalidate cache for affected dates
  await invalidateAvailabilityCache(
    tenantId,
    block.roomId,
    block.startDate,
    block.endDate
  );

  // Emit event
  await emitAvailabilityEvent(
    'availability.released',
    tenantId,
    {
      blockId: block.id,
      roomId: block.roomId,
      startDate: block.startDate,
      endDate: block.endDate,
    },
    actorUserId,
    actorRole
  );

  return block;
}

/**
 * List active blocks for a room (or all rooms if roomId not provided).
 */
export async function listBlocks(
  tenantId: string,
  roomId?: string
): Promise<AvailabilityBlock[]> {
  const query = roomId
    ? `SELECT id, room_id, start_date, end_date, reason, notes, created_by, created_at
       FROM availability_blocks
       WHERE room_id = $1
       ORDER BY start_date`
    : `SELECT id, room_id, start_date, end_date, reason, notes, created_by, created_at
       FROM availability_blocks
       ORDER BY start_date`;

  const params = roomId ? [roomId] : [];
  const result = await tenantQuery<BlockRow>(tenantId, query, params);
  return result.rows.map(mapBlockRow);
}

// ─── Bulk Seasonal Block ──────────────────────────────────────────────────────

/**
 * Block multiple rooms for a date range (e.g., monsoon season).
 *
 * Processes each room independently — rooms with booking conflicts
 * are skipped and reported in the result.
 *
 * Requirements: 5.1, 5.2
 */
export async function createBulkBlock(
  tenantId: string,
  request: BulkBlockRequest,
  actorUserId: string,
  actorRole: string
): Promise<BulkBlockResult> {
  // Validate
  if (!request.roomIds || request.roomIds.length === 0) {
    throw new AvailabilityManagementError(
      'At least one roomId is required',
      'VALIDATION_ERROR',
      400
    );
  }
  validateBlockRequest({
    roomId: request.roomIds[0],
    startDate: request.startDate,
    endDate: request.endDate,
    reason: request.reason,
  });

  const created: AvailabilityBlock[] = [];
  const conflicts: BlockConflict[] = [];

  for (const roomId of request.roomIds) {
    // Check for booking conflicts
    const conflictingIds = await detectBookingConflicts(
      tenantId,
      roomId,
      request.startDate,
      request.endDate
    );

    if (conflictingIds.length > 0) {
      conflicts.push({ roomId, conflictingBookingIds: conflictingIds });
      continue;
    }

    // Create block for this room
    const result = await tenantQuery<BlockRow>(
      tenantId,
      `INSERT INTO availability_blocks (room_id, start_date, end_date, reason, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, room_id, start_date, end_date, reason, notes, created_by, created_at`,
      [
        roomId,
        request.startDate,
        request.endDate,
        request.reason,
        request.notes ?? null,
        actorUserId,
      ]
    );

    const block = mapBlockRow(result.rows[0]);
    created.push(block);

    // Invalidate cache for this room
    await invalidateAvailabilityCache(
      tenantId,
      roomId,
      request.startDate,
      request.endDate
    );
  }

  // Emit bulk event
  if (created.length > 0) {
    await emitAvailabilityEvent(
      'availability.bulk_update',
      tenantId,
      {
        operation: 'block',
        roomIds: created.map((b) => b.roomId),
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        blocksCreated: created.length,
        conflictsDetected: conflicts.length,
      },
      actorUserId,
      actorRole
    );
  }

  return { created, conflicts };
}

// ─── Automatic Unblock (Scheduled Cleanup) ────────────────────────────────────

/**
 * Remove expired availability blocks where end_date < today.
 *
 * This function is intended to be called by a scheduled job (e.g., n8n cron).
 * It cleans up past blocks that are no longer relevant.
 *
 * Requirements: 5.1
 */
export async function cleanupExpiredBlocks(
  tenantId: string
): Promise<{ removedCount: number; removedBlocks: AvailabilityBlock[] }> {
  const today = new Date().toISOString().split('T')[0];

  // Find expired blocks
  const expired = await tenantQuery<BlockRow>(
    tenantId,
    `SELECT id, room_id, start_date, end_date, reason, notes, created_by, created_at
     FROM availability_blocks
     WHERE end_date < $1`,
    [today]
  );

  if (expired.rows.length === 0) {
    return { removedCount: 0, removedBlocks: [] };
  }

  const removedBlocks = expired.rows.map(mapBlockRow);

  // Delete expired blocks
  await tenantQuery(
    tenantId,
    `DELETE FROM availability_blocks WHERE end_date < $1`,
    [today]
  );

  // Invalidate cache for removed blocks
  for (const block of removedBlocks) {
    await invalidateAvailabilityCache(
      tenantId,
      block.roomId,
      block.startDate,
      block.endDate
    );
  }

  return { removedCount: removedBlocks.length, removedBlocks };
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

function validateBlockRequest(request: CreateBlockRequest): void {
  const errors: string[] = [];

  if (!request.roomId) {
    errors.push('roomId is required');
  }
  if (!request.startDate) {
    errors.push('startDate is required');
  }
  if (!request.endDate) {
    errors.push('endDate is required');
  }
  if (!request.reason) {
    errors.push('reason is required');
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (request.startDate && !dateRegex.test(request.startDate)) {
    errors.push('startDate must be in YYYY-MM-DD format');
  }
  if (request.endDate && !dateRegex.test(request.endDate)) {
    errors.push('endDate must be in YYYY-MM-DD format');
  }

  if (request.startDate && request.endDate && request.endDate <= request.startDate) {
    errors.push('endDate must be after startDate');
  }

  const validReasons: BlockReason[] = ['seasonal', 'maintenance', 'owner_hold', 'manual'];
  if (request.reason && !validReasons.includes(request.reason)) {
    errors.push(`reason must be one of: ${validReasons.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new AvailabilityManagementError(
      `Validation failed: ${errors.join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }
}

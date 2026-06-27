/**
 * Channel manager service.
 *
 * Orchestrates synchronization between the Booking_Engine and OTA channels.
 * Implements retry with exponential backoff, independent channel processing,
 * conflict resolution (Booking_Engine authoritative), and event emission.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

import { randomUUID } from 'crypto';
import { EventBus, STREAMS } from '@/lib/events';
import type { PlatformEvent } from '@/lib/events';
import type {
  ChannelAdapter,
  ExternalReservation,
  RoomAvailability,
  RateUpdate,
  SyncResult,
  SyncOperationType,
  RetryPolicy,
  ManualSyncResponse,
  ChannelSyncResult,
  ChannelSyncStartedPayload,
  ChannelSyncCompletedPayload,
  ChannelSyncFailedPayload,
  ChannelReservationReceivedPayload,
} from './types';
import { DEFAULT_RETRY_POLICY } from './types';
import { getAllAdapters, getAdapter } from './adapters';
import { logSyncEvent } from './sync-log';

// ─── Channel Sync Status Tracking ─────────────────────────────────────────────

/** In-memory channel sync status. In production, persisted to DB. */
const channelSyncStatus = new Map<
  string,
  { status: 'in_sync' | 'out_of_sync' | 'syncing'; lastError?: string }
>();

// ─── Error Class ──────────────────────────────────────────────────────────────

export class ChannelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'ChannelError';
  }
}

// ─── Retry Logic ──────────────────────────────────────────────────────────────

/**
 * Calculate exponential backoff delay for a given retry attempt.
 *
 * Formula: baseDelayMs * (backoffFactor ^ attempt)
 * With 5s base, factor 2: attempt 0 = 5s, attempt 1 = 10s, attempt 2 = 20s
 */
export function calculateBackoffDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): number {
  return policy.baseDelayMs * Math.pow(policy.backoffFactor, attempt);
}

/**
 * Execute an operation with exponential backoff retry.
 *
 * @param operation - Async function to execute
 * @param policy - Retry policy configuration
 * @returns Operation result on success
 * @throws Last error after all retries exhausted
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<{ result: T; attempts: number }> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    try {
      const result = await operation();
      return { result, attempts: attempt + 1 };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < policy.maxRetries) {
        const delay = calculateBackoffDelay(attempt, policy);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ─── Sync Orchestration ───────────────────────────────────────────────────────

/**
 * Trigger a manual sync for specified channels and operations.
 * Processes each channel independently — failure on one does not block others.
 *
 * @param tenantId - Tenant scope for the sync
 * @param channelIds - Channels to sync (all if omitted)
 * @param operations - Operations to run (all if omitted)
 * @param actorUserId - User triggering the sync
 * @param actorRole - Role of the triggering user
 * @param eventBus - Optional event bus instance for emitting events
 */
export async function triggerManualSync(
  tenantId: string,
  channelIds?: string[],
  operations?: SyncOperationType[],
  actorUserId: string = 'system',
  actorRole: string = 'Agency_Admin',
  eventBus?: EventBus
): Promise<ManualSyncResponse> {
  const adapters = channelIds
    ? channelIds
        .map((id) => getAdapter(id))
        .filter((a): a is ChannelAdapter => a !== undefined)
    : getAllAdapters();

  if (adapters.length === 0) {
    throw new ChannelError(
      'No adapters found for the specified channel IDs',
      'NO_ADAPTERS',
      404
    );
  }

  const ops: SyncOperationType[] = operations ?? [
    'fetch_reservations',
    'push_availability',
    'push_rates',
  ];

  const results: ChannelSyncResult[] = [];
  const triggeredAt = new Date().toISOString();

  // Process each channel independently (concurrent, isolated)
  const channelPromises = adapters.map(async (adapter) => {
    const channelResults = await syncChannel(
      adapter,
      ops,
      tenantId,
      actorUserId,
      actorRole,
      eventBus
    );
    return channelResults;
  });

  const settledResults = await Promise.allSettled(channelPromises);

  for (const settled of settledResults) {
    if (settled.status === 'fulfilled') {
      results.push(...settled.value);
    }
  }

  return { results, triggeredAt };
}

/**
 * Sync a single channel across the specified operations.
 * Each operation is retried independently with exponential backoff.
 */
async function syncChannel(
  adapter: ChannelAdapter,
  operations: SyncOperationType[],
  tenantId: string,
  actorUserId: string,
  actorRole: string,
  eventBus?: EventBus
): Promise<ChannelSyncResult[]> {
  const results: ChannelSyncResult[] = [];

  for (const operation of operations) {
    const result = await executeSyncOperation(
      adapter,
      operation,
      tenantId,
      actorUserId,
      actorRole,
      eventBus
    );
    results.push(result);
  }

  return results;
}

/**
 * Execute a single sync operation with retry and logging.
 */
async function executeSyncOperation(
  adapter: ChannelAdapter,
  operation: SyncOperationType,
  tenantId: string,
  actorUserId: string,
  actorRole: string,
  eventBus?: EventBus
): Promise<ChannelSyncResult> {
  const startTime = Date.now();
  const direction =
    operation === 'fetch_reservations' ? 'inbound' : 'outbound';

  // Emit sync started event
  if (eventBus) {
    await emitSyncEvent(eventBus, tenantId, actorUserId, actorRole, {
      type: 'channel.sync_started',
      payload: {
        channelId: adapter.channelId,
        channelName: adapter.channelName,
        operation,
        direction,
      } satisfies ChannelSyncStartedPayload,
    });
  }

  // Mark channel as syncing
  channelSyncStatus.set(adapter.channelId, { status: 'syncing' });

  try {
    const { result: syncResult, attempts } = await withRetry(async () => {
      return executeSingleOperation(adapter, operation);
    });

    const durationMs = Date.now() - startTime;

    // Mark channel as in sync
    channelSyncStatus.set(adapter.channelId, { status: 'in_sync' });

    // Log success
    await logSyncEvent({
      tenantId,
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      direction,
      status: 'success',
      durationMs,
      itemsProcessed: syncResult.itemsProcessed,
      metadata: { attempts },
    });

    // Emit sync completed event
    if (eventBus) {
      await emitSyncEvent(eventBus, tenantId, actorUserId, actorRole, {
        type: 'channel.sync_completed',
        payload: {
          channelId: adapter.channelId,
          channelName: adapter.channelName,
          operation,
          direction,
          itemsProcessed: syncResult.itemsProcessed ?? 0,
          durationMs,
        } satisfies ChannelSyncCompletedPayload,
      });
    }

    return {
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      success: true,
      syncedAt: syncResult.syncedAt,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    // Mark channel as out of sync after final failure
    channelSyncStatus.set(adapter.channelId, {
      status: 'out_of_sync',
      lastError: errorMessage,
    });

    // Log failure
    await logSyncEvent({
      tenantId,
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      direction,
      status: 'failure',
      durationMs,
      errorMessage,
      retryAttempt: DEFAULT_RETRY_POLICY.maxRetries,
    });

    // Emit sync failed event (includes notification trigger for Agency_Admin)
    if (eventBus) {
      await emitSyncEvent(eventBus, tenantId, actorUserId, actorRole, {
        type: 'channel.sync_failed',
        payload: {
          channelId: adapter.channelId,
          channelName: adapter.channelName,
          operation,
          direction,
          error: errorMessage,
          retryAttempt: DEFAULT_RETRY_POLICY.maxRetries,
          maxRetries: DEFAULT_RETRY_POLICY.maxRetries,
          markedOutOfSync: true,
        } satisfies ChannelSyncFailedPayload,
      });
    }

    return {
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      success: false,
      syncedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

/**
 * Execute a single operation (no retry — called from within withRetry).
 */
async function executeSingleOperation(
  adapter: ChannelAdapter,
  operation: SyncOperationType
): Promise<SyncResult> {
  switch (operation) {
    case 'fetch_reservations': {
      // Poll for new reservations since 60 seconds ago
      const since = new Date(Date.now() - 60_000);
      const reservations = await adapter.fetchReservations(since);
      return {
        success: true,
        syncedAt: new Date().toISOString(),
        itemsProcessed: reservations.length,
      };
    }
    case 'push_availability': {
      // In a real implementation, this would read current availability
      // from the Booking_Engine and push to the OTA
      const rooms: RoomAvailability[] = [];
      return adapter.pushAvailability(rooms);
    }
    case 'push_rates': {
      // In a real implementation, this would read current rates
      // from the Booking_Engine and push to the OTA
      const rates: RateUpdate[] = [];
      return adapter.pushRates(rates);
    }
    case 'check_connection': {
      const status = await adapter.checkConnection();
      return {
        success: status === 'connected',
        syncedAt: new Date().toISOString(),
        errors: status !== 'connected' ? [`Connection status: ${status}`] : undefined,
      };
    }
  }
}

// ─── Inbound Polling ──────────────────────────────────────────────────────────

/**
 * Poll all connected channels for new reservations.
 * Called on a 60-second interval by the channel sync agent or n8n.
 *
 * Processes each channel independently. Failure on one channel
 * does not block polling of other channels.
 */
export async function pollInboundReservations(
  tenantId: string,
  actorUserId: string = 'system',
  actorRole: string = 'system',
  eventBus?: EventBus
): Promise<ExternalReservation[]> {
  const adapters = getAllAdapters();
  const allReservations: ExternalReservation[] = [];
  const since = new Date(Date.now() - 60_000); // last 60 seconds

  const pollPromises = adapters.map(async (adapter) => {
    try {
      const { result: reservations } = await withRetry(() =>
        adapter.fetchReservations(since)
      );

      // Emit event for each received reservation
      if (eventBus) {
        for (const reservation of reservations) {
          await emitSyncEvent(
            eventBus,
            tenantId,
            actorUserId,
            actorRole,
            {
              type: 'channel.reservation_received',
              payload: {
                channelId: reservation.channelId,
                channelName: adapter.channelName,
                externalId: reservation.externalId,
                guestName: reservation.guestName,
                checkIn: reservation.checkIn,
                checkOut: reservation.checkOut,
                roomType: reservation.roomType,
                totalPrice: reservation.totalPrice,
                currency: reservation.currency,
              } satisfies ChannelReservationReceivedPayload,
            }
          );
        }
      }

      return reservations;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      // Mark channel as out-of-sync, but don't block other channels
      channelSyncStatus.set(adapter.channelId, {
        status: 'out_of_sync',
        lastError: errorMessage,
      });

      await logSyncEvent({
        tenantId,
        channelId: adapter.channelId,
        channelName: adapter.channelName,
        operation: 'fetch_reservations',
        direction: 'inbound',
        status: 'failure',
        durationMs: 0,
        errorMessage,
        retryAttempt: DEFAULT_RETRY_POLICY.maxRetries,
      });

      // Emit failure event for notification
      if (eventBus) {
        await emitSyncEvent(
          eventBus,
          tenantId,
          actorUserId,
          actorRole,
          {
            type: 'channel.sync_failed',
            payload: {
              channelId: adapter.channelId,
              channelName: adapter.channelName,
              operation: 'fetch_reservations',
              direction: 'inbound',
              error: errorMessage,
              retryAttempt: DEFAULT_RETRY_POLICY.maxRetries,
              maxRetries: DEFAULT_RETRY_POLICY.maxRetries,
              markedOutOfSync: true,
            } satisfies ChannelSyncFailedPayload,
          }
        );
      }

      return [] as ExternalReservation[];
    }
  });

  const results = await Promise.allSettled(pollPromises);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allReservations.push(...result.value);
    }
  }

  return allReservations;
}

// ─── Outbound Push ────────────────────────────────────────────────────────────

/**
 * Push availability updates to all connected channels.
 * Must complete within 60 seconds (SLA from requirements).
 * Processes each channel independently.
 */
export async function pushAvailabilityToChannels(
  tenantId: string,
  rooms: RoomAvailability[],
  actorUserId: string = 'system',
  actorRole: string = 'system',
  eventBus?: EventBus
): Promise<ChannelSyncResult[]> {
  const adapters = getAllAdapters();
  const results: ChannelSyncResult[] = [];

  const pushPromises = adapters.map(async (adapter) => {
    return executeSyncOperationForPush(
      adapter,
      'push_availability',
      tenantId,
      () => adapter.pushAvailability(rooms),
      actorUserId,
      actorRole,
      eventBus
    );
  });

  const settled = await Promise.allSettled(pushPromises);

  for (const s of settled) {
    if (s.status === 'fulfilled') {
      results.push(s.value);
    }
  }

  return results;
}

/**
 * Push rate updates to all connected channels.
 * Must complete within 120 seconds (SLA from requirements).
 * Processes each channel independently.
 */
export async function pushRatesToChannels(
  tenantId: string,
  rates: RateUpdate[],
  actorUserId: string = 'system',
  actorRole: string = 'system',
  eventBus?: EventBus
): Promise<ChannelSyncResult[]> {
  const adapters = getAllAdapters();
  const results: ChannelSyncResult[] = [];

  const pushPromises = adapters.map(async (adapter) => {
    return executeSyncOperationForPush(
      adapter,
      'push_rates',
      tenantId,
      () => adapter.pushRates(rates),
      actorUserId,
      actorRole,
      eventBus
    );
  });

  const settled = await Promise.allSettled(pushPromises);

  for (const s of settled) {
    if (s.status === 'fulfilled') {
      results.push(s.value);
    }
  }

  return results;
}

/**
 * Helper for outbound push operations with retry, logging, and event emission.
 */
async function executeSyncOperationForPush(
  adapter: ChannelAdapter,
  operation: SyncOperationType,
  tenantId: string,
  pushFn: () => Promise<SyncResult>,
  actorUserId: string,
  actorRole: string,
  eventBus?: EventBus
): Promise<ChannelSyncResult> {
  const startTime = Date.now();

  try {
    const { result: syncResult } = await withRetry(pushFn);
    const durationMs = Date.now() - startTime;

    channelSyncStatus.set(adapter.channelId, { status: 'in_sync' });

    await logSyncEvent({
      tenantId,
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      direction: 'outbound',
      status: 'success',
      durationMs,
      itemsProcessed: syncResult.itemsProcessed,
    });

    if (eventBus) {
      await emitSyncEvent(eventBus, tenantId, actorUserId, actorRole, {
        type: 'channel.sync_completed',
        payload: {
          channelId: adapter.channelId,
          channelName: adapter.channelName,
          operation,
          direction: 'outbound',
          itemsProcessed: syncResult.itemsProcessed ?? 0,
          durationMs,
        } satisfies ChannelSyncCompletedPayload,
      });
    }

    return {
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      success: true,
      syncedAt: syncResult.syncedAt,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    channelSyncStatus.set(adapter.channelId, {
      status: 'out_of_sync',
      lastError: errorMessage,
    });

    await logSyncEvent({
      tenantId,
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      direction: 'outbound',
      status: 'failure',
      durationMs,
      errorMessage,
      retryAttempt: DEFAULT_RETRY_POLICY.maxRetries,
    });

    if (eventBus) {
      await emitSyncEvent(eventBus, tenantId, actorUserId, actorRole, {
        type: 'channel.sync_failed',
        payload: {
          channelId: adapter.channelId,
          channelName: adapter.channelName,
          operation,
          direction: 'outbound',
          error: errorMessage,
          retryAttempt: DEFAULT_RETRY_POLICY.maxRetries,
          maxRetries: DEFAULT_RETRY_POLICY.maxRetries,
          markedOutOfSync: true,
        } satisfies ChannelSyncFailedPayload,
      });
    }

    return {
      channelId: adapter.channelId,
      channelName: adapter.channelName,
      operation,
      success: false,
      syncedAt: new Date().toISOString(),
      error: errorMessage,
    };
  }
}

// ─── Conflict Resolution ──────────────────────────────────────────────────────

/**
 * Resolve availability conflicts between OTA state and Booking_Engine.
 *
 * The Booking_Engine is ALWAYS the authoritative source.
 * When conflicts are detected, the Booking_Engine state is pushed
 * to the OTA, overwriting the OTA's view.
 *
 * Requirements: 6.6
 */
export async function resolveConflicts(
  tenantId: string,
  channelId: string,
  bookingEngineAvailability: RoomAvailability[],
  actorUserId: string = 'system',
  actorRole: string = 'system',
  eventBus?: EventBus
): Promise<SyncResult> {
  const adapter = getAdapter(channelId);
  if (!adapter) {
    throw new ChannelError(
      `Channel adapter not found: ${channelId}`,
      'ADAPTER_NOT_FOUND',
      404
    );
  }

  // Booking_Engine is authoritative — push its state to OTA
  const results = await pushAvailabilityToChannels(
    tenantId,
    bookingEngineAvailability,
    actorUserId,
    actorRole,
    eventBus
  );

  const channelResult = results.find((r) => r.channelId === channelId);

  return {
    success: channelResult?.success ?? false,
    syncedAt: channelResult?.syncedAt ?? new Date().toISOString(),
    errors: channelResult?.error ? [channelResult.error] : undefined,
  };
}

// ─── Channel Status ───────────────────────────────────────────────────────────

/**
 * Get the current sync status of a channel.
 */
export function getChannelSyncStatus(
  channelId: string
): { status: 'in_sync' | 'out_of_sync' | 'syncing'; lastError?: string } {
  return channelSyncStatus.get(channelId) ?? { status: 'in_sync' };
}

/**
 * Get the sync status of all registered channels.
 */
export function getAllChannelStatuses(): Array<{
  channelId: string;
  status: 'in_sync' | 'out_of_sync' | 'syncing';
  lastError?: string;
}> {
  const adapters = getAllAdapters();
  return adapters.map((adapter) => ({
    channelId: adapter.channelId,
    ...getChannelSyncStatus(adapter.channelId),
  }));
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate an external reservation has all required fields.
 * Returns list of missing/invalid fields.
 *
 * Requirements: 6.3
 */
export function validateExternalReservation(
  reservation: Partial<ExternalReservation>
): string[] {
  const missingFields: string[] = [];

  if (!reservation.externalId) missingFields.push('externalId');
  if (!reservation.guestName) missingFields.push('guestName');
  if (!reservation.checkIn) missingFields.push('checkIn');
  if (!reservation.checkOut) missingFields.push('checkOut');
  if (!reservation.roomType) missingFields.push('roomType');
  if (
    reservation.numberOfGuests === undefined ||
    reservation.numberOfGuests <= 0
  ) {
    missingFields.push('numberOfGuests');
  }
  if (reservation.totalPrice === undefined || reservation.totalPrice < 0) {
    missingFields.push('totalPrice');
  }

  return missingFields;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Emit a channel sync event to the event bus.
 */
async function emitSyncEvent(
  eventBus: EventBus,
  tenantId: string,
  actorUserId: string,
  actorRole: string,
  eventPartial: { type: string; payload: unknown }
): Promise<void> {
  const event: PlatformEvent = {
    id: randomUUID(),
    type: eventPartial.type,
    version: 1,
    timestamp: new Date().toISOString(),
    source: 'channels',
    tenantId,
    correlationId: randomUUID(),
    actor: {
      userId: actorUserId,
      role: actorRole,
    },
    payload: eventPartial.payload,
    metadata: {
      retryCount: 0,
      maxRetries: 3,
      priority: 'normal',
    },
  };

  try {
    await eventBus.emit(STREAMS.CHANNELS, event);
  } catch {
    // Log but don't fail the sync operation due to event emission failure
    console.error(
      `[Channels] Failed to emit event ${eventPartial.type} for channel sync`
    );
  }
}

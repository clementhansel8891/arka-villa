/**
 * Audit buffer — local in-memory buffer for audit entries when DB is unavailable.
 *
 * Holds up to 1000 entries and flushes them once the logging subsystem recovers.
 *
 * Requirement: 31.7
 */

import type { BufferedAuditEntry, LogAuditEventInput } from './types';

/** Maximum buffer capacity (Requirement 31.7). */
const MAX_BUFFER_SIZE = 1000;

/** Flush check interval in milliseconds (30 seconds). */
const FLUSH_INTERVAL_MS = 30_000;

/** In-memory buffer for audit entries. */
let buffer: BufferedAuditEntry[] = [];

/** Whether the buffer flush loop is active. */
let flushIntervalId: ReturnType<typeof setInterval> | null = null;

/** Callback to flush entries — set by the service when initializing the buffer. */
let flushCallback: ((entries: BufferedAuditEntry[]) => Promise<boolean>) | null = null;

/**
 * Add an entry to the local buffer.
 * If the buffer is full (1000 entries), the oldest entry is dropped.
 */
export function bufferEntry(entry: LogAuditEventInput): boolean {
  if (buffer.length >= MAX_BUFFER_SIZE) {
    // Drop oldest entry to make room
    buffer.shift();
  }

  buffer.push({
    entry,
    bufferedAt: new Date(),
  });

  return true;
}

/**
 * Get the current number of buffered entries.
 */
export function getBufferSize(): number {
  return buffer.length;
}

/**
 * Get all buffered entries (for inspection or manual flush).
 */
export function getBufferedEntries(): readonly BufferedAuditEntry[] {
  return buffer;
}

/**
 * Clear the buffer after successful flush.
 */
export function clearBuffer(): void {
  buffer = [];
}

/**
 * Remove a specific number of entries from the front of the buffer.
 * Used after partial flush success.
 */
export function removeFromBuffer(count: number): void {
  buffer = buffer.slice(count);
}

/**
 * Register a flush callback that the buffer will invoke periodically
 * to attempt re-delivery of buffered entries.
 */
export function registerFlushCallback(
  callback: (entries: BufferedAuditEntry[]) => Promise<boolean>
): void {
  flushCallback = callback;
}

/**
 * Start the periodic flush loop.
 * Attempts to flush buffered entries every 30 seconds.
 */
export function startFlushLoop(): void {
  if (flushIntervalId !== null) return;

  flushIntervalId = setInterval(async () => {
    if (buffer.length === 0 || !flushCallback) return;

    try {
      const entriesToFlush = [...buffer];
      const success = await flushCallback(entriesToFlush);
      if (success) {
        clearBuffer();
      }
    } catch {
      // Flush failed — entries remain in buffer for next attempt
    }
  }, FLUSH_INTERVAL_MS);
}

/**
 * Stop the periodic flush loop.
 */
export function stopFlushLoop(): void {
  if (flushIntervalId !== null) {
    clearInterval(flushIntervalId);
    flushIntervalId = null;
  }
}

/**
 * Reset the buffer (for testing purposes).
 */
export function resetBuffer(): void {
  buffer = [];
  flushCallback = null;
  stopFlushLoop();
}

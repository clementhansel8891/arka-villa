/**
 * Redis Streams stream name constants.
 *
 * All platform event streams are defined here as a single source of truth.
 * Agents and producers import from this module to avoid hardcoded stream names.
 */

/** All platform stream names used by the Redis Streams event bus. */
export const STREAMS = {
  BOOKINGS: 'stream:bookings',
  AVAILABILITY: 'stream:availability',
  NOTIFICATIONS: 'stream:notifications',
  CHANNELS: 'stream:channels',
  PAYMENTS: 'stream:payments',
  MAINTENANCE: 'stream:maintenance',
  STAFF: 'stream:staff',
  IOT: 'stream:iot',
  ESCALATIONS: 'stream:escalations',
  AI_CONTEXT: 'stream:ai-context',
  DEAD_LETTER_QUEUE: 'stream:dead-letter-queue',
} as const;

/** Union type of all valid stream names. */
export type StreamName = (typeof STREAMS)[keyof typeof STREAMS];

/** Array of all stream names for iteration. */
export const ALL_STREAMS: StreamName[] = Object.values(STREAMS);

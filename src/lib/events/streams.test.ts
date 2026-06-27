import { describe, it, expect } from 'vitest';
import { STREAMS, ALL_STREAMS, type StreamName } from './streams';

describe('STREAMS constants', () => {
  it('defines all required stream names', () => {
    expect(STREAMS.BOOKINGS).toBe('stream:bookings');
    expect(STREAMS.AVAILABILITY).toBe('stream:availability');
    expect(STREAMS.NOTIFICATIONS).toBe('stream:notifications');
    expect(STREAMS.CHANNELS).toBe('stream:channels');
    expect(STREAMS.PAYMENTS).toBe('stream:payments');
    expect(STREAMS.MAINTENANCE).toBe('stream:maintenance');
    expect(STREAMS.STAFF).toBe('stream:staff');
    expect(STREAMS.IOT).toBe('stream:iot');
    expect(STREAMS.ESCALATIONS).toBe('stream:escalations');
    expect(STREAMS.AI_CONTEXT).toBe('stream:ai-context');
    expect(STREAMS.DEAD_LETTER_QUEUE).toBe('stream:dead-letter-queue');
  });

  it('all stream names follow the stream: prefix convention', () => {
    for (const stream of ALL_STREAMS) {
      expect(stream).toMatch(/^stream:/);
    }
  });

  it('ALL_STREAMS contains all defined streams', () => {
    expect(ALL_STREAMS).toHaveLength(11);
    expect(ALL_STREAMS).toContain(STREAMS.BOOKINGS);
    expect(ALL_STREAMS).toContain(STREAMS.DEAD_LETTER_QUEUE);
  });

  it('stream names are unique', () => {
    const unique = new Set(ALL_STREAMS);
    expect(unique.size).toBe(ALL_STREAMS.length);
  });

  it('StreamName type matches the constant values', () => {
    const name: StreamName = STREAMS.BOOKINGS;
    expect(name).toBe('stream:bookings');
  });
});

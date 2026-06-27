/**
 * Unit tests for availability state machine logic.
 *
 * Tests valid/invalid state transitions and the pure
 * availability state machine logic.
 */

import { describe, it, expect } from 'vitest';
import { isValidTransition } from './availability';
import type { RoomAvailabilityState } from './types';

describe('isValidTransition', () => {
  it('allows available → booked', () => {
    expect(isValidTransition('available', 'booked')).toBe(true);
  });

  it('allows available → blocked', () => {
    expect(isValidTransition('available', 'blocked')).toBe(true);
  });

  it('allows booked → available (cancellation)', () => {
    expect(isValidTransition('booked', 'available')).toBe(true);
  });

  it('allows blocked → available (unblock)', () => {
    expect(isValidTransition('blocked', 'available')).toBe(true);
  });

  it('rejects booked → blocked', () => {
    expect(isValidTransition('booked', 'blocked')).toBe(false);
  });

  it('rejects blocked → booked', () => {
    expect(isValidTransition('blocked', 'booked')).toBe(false);
  });

  it('rejects same-state transitions', () => {
    const states: RoomAvailabilityState[] = ['available', 'booked', 'blocked'];
    for (const state of states) {
      expect(isValidTransition(state, state)).toBe(false);
    }
  });

  it('rejects available → available', () => {
    expect(isValidTransition('available', 'available')).toBe(false);
  });
});

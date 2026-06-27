/**
 * Unit tests for the Guest Message Escalation Service.
 *
 * Tests business hours validation and escalation logic.
 */

import { describe, it, expect } from 'vitest';
import { isWithinBusinessHours } from './escalation';
import type { BusinessHoursConfig } from './types';
import { DEFAULT_BUSINESS_HOURS } from './types';

describe('isWithinBusinessHours', () => {
  const config: BusinessHoursConfig = {
    startHour: 8,
    endHour: 20,
    timezone: 'UTC',
  };

  it('returns true during business hours', () => {
    // 12:00 UTC
    const noon = new Date('2024-03-15T12:00:00Z');
    expect(isWithinBusinessHours(config, noon)).toBe(true);
  });

  it('returns true at the start of business hours (08:00)', () => {
    const start = new Date('2024-03-15T08:00:00Z');
    expect(isWithinBusinessHours(config, start)).toBe(true);
  });

  it('returns false at the end of business hours (20:00)', () => {
    // endHour is exclusive (20:00 is end, so hour 20 is outside)
    const end = new Date('2024-03-15T20:00:00Z');
    expect(isWithinBusinessHours(config, end)).toBe(false);
  });

  it('returns false before business hours', () => {
    const earlyMorning = new Date('2024-03-15T06:00:00Z');
    expect(isWithinBusinessHours(config, earlyMorning)).toBe(false);
  });

  it('returns false after business hours', () => {
    const lateNight = new Date('2024-03-15T22:00:00Z');
    expect(isWithinBusinessHours(config, lateNight)).toBe(false);
  });

  it('returns true at 19:59 (just before end)', () => {
    const justBefore = new Date('2024-03-15T19:59:00Z');
    expect(isWithinBusinessHours(config, justBefore)).toBe(true);
  });

  it('returns false at 07:59 (just before start)', () => {
    const justBeforeStart = new Date('2024-03-15T07:59:00Z');
    expect(isWithinBusinessHours(config, justBeforeStart)).toBe(false);
  });

  it('works with custom business hours', () => {
    const customConfig: BusinessHoursConfig = {
      startHour: 9,
      endHour: 17,
      timezone: 'UTC',
    };

    expect(isWithinBusinessHours(customConfig, new Date('2024-03-15T09:00:00Z'))).toBe(true);
    expect(isWithinBusinessHours(customConfig, new Date('2024-03-15T16:59:00Z'))).toBe(true);
    expect(isWithinBusinessHours(customConfig, new Date('2024-03-15T17:00:00Z'))).toBe(false);
    expect(isWithinBusinessHours(customConfig, new Date('2024-03-15T08:59:00Z'))).toBe(false);
  });

  it('defaults to 08:00-20:00 Asia/Makassar in DEFAULT_BUSINESS_HOURS', () => {
    expect(DEFAULT_BUSINESS_HOURS.startHour).toBe(8);
    expect(DEFAULT_BUSINESS_HOURS.endHour).toBe(20);
    expect(DEFAULT_BUSINESS_HOURS.timezone).toBe('Asia/Makassar');
  });
});

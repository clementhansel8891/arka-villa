/**
 * Unit tests for Customer Support Widget logic
 *
 * Tests core support widget functionality: URL building for WhatsApp/Telegram,
 * support hours determination, and channel filtering.
 *
 * Requirements: 26.1, 26.4, 26.6, 26.7
 */
import { describe, it, expect } from 'vitest';

// ─── Extracted Logic (mirrors SupportWidgetPanel internals) ──────────────────

interface SupportHours {
  start: string;
  end: string;
  timezone: string;
}

interface SupportChannel {
  type: 'whatsapp' | 'telegram' | 'ai_chat';
  enabled: boolean;
  handle?: string;
  prefillMessage?: string;
}

function buildWhatsAppUrl(handle: string, message?: string): string {
  const phone = handle.replace(/[^0-9]/g, '');
  const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${phone}${encoded}`;
}

function buildTelegramUrl(handle: string): string {
  const username = handle.replace(/^@/, '');
  return `https://t.me/${username}`;
}

function isWithinSupportHours(hours: SupportHours | undefined, currentTimeStr: string): boolean {
  if (!hours) return true;

  const [startH, startM] = hours.start.split(':').map(Number);
  const [endH, endM] = hours.end.split(':').map(Number);
  const [nowH, nowM] = currentTimeStr.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const nowMinutes = nowH * 60 + nowM;

  return nowMinutes >= startMinutes && nowMinutes < endMinutes;
}

function getEnabledChannels(channels: SupportChannel[]): SupportChannel[] {
  return channels.filter((c) => c.enabled);
}

// ─── WhatsApp URL Builder ────────────────────────────────────────────────────

describe('SupportWidget - WhatsApp URL Builder', () => {
  it('builds correct URL from phone number with country code', () => {
    const url = buildWhatsAppUrl('6287837452510');
    expect(url).toBe('https://wa.me/6287837452510');
  });

  it('strips non-numeric characters from phone number', () => {
    const url = buildWhatsAppUrl('+62-878-3745-2510');
    expect(url).toBe('https://wa.me/6287837452510');
  });

  it('appends encoded prefill message when provided', () => {
    const url = buildWhatsAppUrl('6287837452510', 'Hello! I have a question.');
    expect(url).toBe('https://wa.me/6287837452510?text=Hello!%20I%20have%20a%20question.');
  });

  it('omits text parameter when message is not provided', () => {
    const url = buildWhatsAppUrl('6287837452510');
    expect(url).not.toContain('?text=');
  });

  it('handles empty message as no text param', () => {
    const url = buildWhatsAppUrl('6287837452510', '');
    expect(url).toBe('https://wa.me/6287837452510');
  });
});

// ─── Telegram URL Builder ────────────────────────────────────────────────────

describe('SupportWidget - Telegram URL Builder', () => {
  it('builds correct URL from username without @ prefix', () => {
    const url = buildTelegramUrl('arkavilla_bot');
    expect(url).toBe('https://t.me/arkavilla_bot');
  });

  it('strips leading @ from username', () => {
    const url = buildTelegramUrl('@arkavilla_bot');
    expect(url).toBe('https://t.me/arkavilla_bot');
  });

  it('handles username with no special prefix', () => {
    const url = buildTelegramUrl('support_team');
    expect(url).toBe('https://t.me/support_team');
  });
});

// ─── Support Hours Determination ─────────────────────────────────────────────

describe('SupportWidget - Support Hours Check', () => {
  const standardHours: SupportHours = {
    start: '08:00',
    end: '20:00',
    timezone: 'Asia/Makassar',
  };

  it('returns true when current time is within support hours', () => {
    expect(isWithinSupportHours(standardHours, '10:30')).toBe(true);
    expect(isWithinSupportHours(standardHours, '08:00')).toBe(true);
    expect(isWithinSupportHours(standardHours, '19:59')).toBe(true);
  });

  it('returns false when current time is outside support hours', () => {
    expect(isWithinSupportHours(standardHours, '07:59')).toBe(false);
    expect(isWithinSupportHours(standardHours, '20:00')).toBe(false);
    expect(isWithinSupportHours(standardHours, '23:30')).toBe(false);
    expect(isWithinSupportHours(standardHours, '00:00')).toBe(false);
  });

  it('returns true when no support hours are configured (always available)', () => {
    expect(isWithinSupportHours(undefined, '03:00')).toBe(true);
    expect(isWithinSupportHours(undefined, '15:00')).toBe(true);
  });

  it('handles boundary at start of support hours', () => {
    expect(isWithinSupportHours(standardHours, '08:00')).toBe(true);
  });

  it('handles boundary at end of support hours (exclusive)', () => {
    expect(isWithinSupportHours(standardHours, '20:00')).toBe(false);
  });
});

// ─── Channel Filtering ───────────────────────────────────────────────────────

describe('SupportWidget - Channel Filtering', () => {
  const allChannels: SupportChannel[] = [
    { type: 'whatsapp', enabled: true, handle: '6287837452510' },
    { type: 'telegram', enabled: false, handle: '@arkavilla_bot' },
    { type: 'ai_chat', enabled: true },
  ];

  it('returns only enabled channels', () => {
    const enabled = getEnabledChannels(allChannels);
    expect(enabled).toHaveLength(2);
    expect(enabled.map((c) => c.type)).toEqual(['whatsapp', 'ai_chat']);
  });

  it('returns empty array when no channels are enabled', () => {
    const noChannels: SupportChannel[] = [
      { type: 'whatsapp', enabled: false },
      { type: 'telegram', enabled: false },
      { type: 'ai_chat', enabled: false },
    ];
    expect(getEnabledChannels(noChannels)).toHaveLength(0);
  });

  it('returns all channels when all are enabled', () => {
    const allEnabled: SupportChannel[] = [
      { type: 'whatsapp', enabled: true, handle: '123' },
      { type: 'telegram', enabled: true, handle: '@bot' },
      { type: 'ai_chat', enabled: true },
    ];
    expect(getEnabledChannels(allEnabled)).toHaveLength(3);
  });
});

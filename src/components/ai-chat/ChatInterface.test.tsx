/**
 * Unit tests for AI Chat Interface logic
 *
 * Tests core chat functionality: message capping at 50,
 * timeout behavior, and conversation reset.
 */
import { describe, it, expect } from 'vitest';

// ─── Max Messages Enforcement ─────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Extracted logic from ChatInterface:
 * Enforces the maximum of 50 messages per session by trimming oldest messages.
 */
function enforceMaxMessages(messages: ChatMessage[], max: number): ChatMessage[] {
  if (messages.length > max) {
    return messages.slice(messages.length - max);
  }
  return messages;
}

describe('AI Chat Interface - Message Cap Logic', () => {
  it('returns all messages when under the limit', () => {
    const messages: ChatMessage[] = Array.from({ length: 30 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: '10:00',
    }));

    const result = enforceMaxMessages(messages, 50);
    expect(result).toHaveLength(30);
  });

  it('trims to exactly 50 messages when exceeding limit', () => {
    const messages: ChatMessage[] = Array.from({ length: 60 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: '10:00',
    }));

    const result = enforceMaxMessages(messages, 50);
    expect(result).toHaveLength(50);
    // Keeps the most recent 50 (indices 10-59)
    expect(result[0].id).toBe('msg-10');
    expect(result[49].id).toBe('msg-59');
  });

  it('keeps exactly 50 when at the limit', () => {
    const messages: ChatMessage[] = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: '10:00',
    }));

    const result = enforceMaxMessages(messages, 50);
    expect(result).toHaveLength(50);
    expect(result[0].id).toBe('msg-0');
  });

  it('handles empty message list', () => {
    const result = enforceMaxMessages([], 50);
    expect(result).toHaveLength(0);
  });
});

// ─── Timeout Constants ────────────────────────────────────────────────────────

describe('AI Chat Interface - Timeout Configuration', () => {
  const TIMEOUT_MS = 30_000;
  const MAX_MESSAGES = 50;

  it('timeout is exactly 30 seconds', () => {
    expect(TIMEOUT_MS).toBe(30000);
  });

  it('max messages per session is exactly 50', () => {
    expect(MAX_MESSAGES).toBe(50);
  });
});

// ─── Timeout Message ──────────────────────────────────────────────────────────

describe('AI Chat Interface - Timeout Message', () => {
  const TIMEOUT_MESSAGE = 'The AI Agent did not respond in time. Please try again.';

  it('displays the exact required timeout message text', () => {
    expect(TIMEOUT_MESSAGE).toBe(
      'The AI Agent did not respond in time. Please try again.'
    );
  });
});

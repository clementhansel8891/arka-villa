/**
 * Unit tests for the AI Agent service.
 *
 * Tests chat handling, tool invocation, context building,
 * payload validation, truncation, and timeout enforcement.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AIUserContext, AIChatRequest, AIToolRequest } from './types';
import {
  MAX_RESPONSE_CHARS,
  MAX_PAYLOAD_SIZE_BYTES,
  TRUNCATION_INDICATOR,
} from './types';

// ─── Mocks ────────────────────────────────────────────────────────

vi.mock('@/modules/rbac', () => ({
  checkPermission: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    pipeline: vi.fn(() => ({
      set: vi.fn().mockReturnThis(),
      zadd: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    })),
    zadd: vi.fn().mockResolvedValue(1),
    zremrangebyscore: vi.fn().mockResolvedValue(0),
    zrangebyscore: vi.fn().mockResolvedValue([]),
    zcount: vi.fn().mockResolvedValue(0),
    ttl: vi.fn().mockResolvedValue(7776000),
    scan: vi.fn().mockResolvedValue(['0', []]),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock the global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('AI Service - buildUserContext', () => {
  it('builds user context with all required fields', async () => {
    const { buildUserContext } = await import('./service');

    const ctx = buildUserContext({
      userId: 'user-1',
      role: 'Agency_Admin',
      tenantScope: ['tenant-a', 'tenant-b'],
      permissions: ['bookings:read', 'financial_reports:read'],
    });

    expect(ctx).toEqual({
      userId: 'user-1',
      role: 'Agency_Admin',
      tenantScope: ['tenant-a', 'tenant-b'],
      permissions: ['bookings:read', 'financial_reports:read'],
    });
  });

  it('builds context with empty tenant scope', async () => {
    const { buildUserContext } = await import('./service');

    const ctx = buildUserContext({
      userId: 'user-2',
      role: 'Guest',
      tenantScope: [],
      permissions: [],
    });

    expect(ctx.tenantScope).toEqual([]);
    expect(ctx.role).toBe('Guest');
  });
});

describe('AI Service - handleChat', () => {
  const mockUserContext: AIUserContext = {
    userId: 'user-1',
    role: 'Agency_Admin',
    tenantScope: ['tenant-1'],
    permissions: [],
  };

  const mockChatRequest: AIChatRequest = {
    sessionId: 'session-1',
    message: 'Hello AI',
    conversationHistory: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('returns response from LLM Agent on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ message: 'Hello! How can I help?' })),
    });

    const { handleChat } = await import('./service');
    const result = await handleChat(mockChatRequest, mockUserContext);

    expect(result.message).toBe('Hello! How can I help?');
    expect(result.truncated).toBe(false);
  });

  it('truncates responses exceeding 4000 characters', async () => {
    const longMessage = 'a'.repeat(5000);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ message: longMessage })),
    });

    const { handleChat } = await import('./service');
    const result = await handleChat(mockChatRequest, mockUserContext);

    expect(result.truncated).toBe(true);
    expect(result.message.length).toBeLessThanOrEqual(MAX_RESPONSE_CHARS);
    expect(result.message).toContain(TRUNCATION_INDICATOR);
  });

  it('throws timeout error when LLM Agent does not respond in 30s', async () => {
    mockFetch.mockImplementationOnce(() => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    const { handleChat } = await import('./service');

    await expect(handleChat(mockChatRequest, mockUserContext)).rejects.toThrow('timeout');
  });

  it('throws error when LLM Agent returns non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    const { handleChat } = await import('./service');

    await expect(handleChat(mockChatRequest, mockUserContext)).rejects.toThrow(
      'LLM Agent returned status 500'
    );
  });

  it('rejects payloads exceeding 50KB response from LLM Agent', async () => {
    const largePayload = 'x'.repeat(MAX_PAYLOAD_SIZE_BYTES + 1);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(largePayload),
    });

    const { handleChat } = await import('./service');

    await expect(handleChat(mockChatRequest, mockUserContext)).rejects.toThrow(
      '50KB payload limit'
    );
  });
});

describe('AI Service - handleToolInvocation', () => {
  const mockUserContext: AIUserContext = {
    userId: 'user-1',
    role: 'Agency_Admin',
    tenantScope: ['tenant-1'],
    permissions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('returns error for unregistered tools', async () => {
    const { handleToolInvocation } = await import('./service');

    const request: AIToolRequest = {
      toolCall: {
        id: 'call-1',
        toolName: 'nonexistent_tool',
        parameters: {},
      },
    };

    const result = await handleToolInvocation(request, mockUserContext);

    expect(result.result.authorized).toBe(false);
    expect(result.result.error).toContain('not registered');
  });

  it('validates RBAC permissions before tool execution', async () => {
    const { checkPermission } = await import('@/modules/rbac');
    const mockedCheck = vi.mocked(checkPermission);
    mockedCheck.mockResolvedValueOnce({ allowed: false, reason: 'No access to bookings' });

    const { handleToolInvocation } = await import('./service');

    const request: AIToolRequest = {
      toolCall: {
        id: 'call-1',
        toolName: 'booking_lookup',
        parameters: { bookingId: 'bk-123' },
      },
    };

    const result = await handleToolInvocation(request, mockUserContext);

    expect(result.result.authorized).toBe(false);
    expect(result.result.error).toContain('Insufficient permissions');
    expect(mockedCheck).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        role: 'Agency_Admin',
        resource: 'bookings',
        action: 'read',
      })
    );
  });

  it('executes tool when RBAC allows and returns result', async () => {
    const { checkPermission } = await import('@/modules/rbac');
    const mockedCheck = vi.mocked(checkPermission);
    mockedCheck.mockResolvedValueOnce({ allowed: true });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: { id: 'bk-123', status: 'confirmed' } })),
    });

    const { handleToolInvocation } = await import('./service');

    const request: AIToolRequest = {
      toolCall: {
        id: 'call-1',
        toolName: 'booking_lookup',
        parameters: { bookingId: 'bk-123' },
      },
    };

    const result = await handleToolInvocation(request, mockUserContext);

    expect(result.result.authorized).toBe(true);
    expect(result.result.result).toEqual({ id: 'bk-123', status: 'confirmed' });
  });

  it('validates required parameters in tool calls', async () => {
    const { handleToolInvocation } = await import('./service');

    // financial_query requires 'reportType'
    const request: AIToolRequest = {
      toolCall: {
        id: 'call-2',
        toolName: 'financial_query',
        parameters: { dateFrom: '2024-01-01' },
      },
    };

    const result = await handleToolInvocation(request, mockUserContext);

    expect(result.result.authorized).toBe(false);
    expect(result.result.error).toContain("Missing required parameter: 'reportType'");
  });

  it('rejects unknown parameters in tool calls', async () => {
    const { handleToolInvocation } = await import('./service');

    const request: AIToolRequest = {
      toolCall: {
        id: 'call-3',
        toolName: 'booking_lookup',
        parameters: { unknownField: 'value' },
      },
    };

    const result = await handleToolInvocation(request, mockUserContext);

    expect(result.result.authorized).toBe(false);
    expect(result.result.error).toContain("Unknown parameter: 'unknownField'");
  });
});

describe('AI Service - registerTool', () => {
  it('registers and retrieves tools', async () => {
    const { registerTool, getRegisteredTools } = await import('./service');

    registerTool({
      name: 'test_tool',
      description: 'A test tool',
      requiredResource: 'test',
      requiredAction: 'read',
      parametersSchema: { type: 'object', properties: {} },
    });

    const tools = getRegisteredTools();
    const testTool = tools.find((t) => t.name === 'test_tool');
    expect(testTool).toBeDefined();
    expect(testTool!.description).toBe('A test tool');
  });
});

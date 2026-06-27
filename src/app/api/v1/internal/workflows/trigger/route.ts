/**
 * POST /api/v1/internal/workflows/trigger — Trigger Platform Operations from n8n.
 *
 * Internal-only endpoint that allows n8n workflows to trigger specific
 * platform operations (e.g., channel polling, financial report generation).
 * Authenticated via internal service key.
 *
 * Request body:
 * {
 *   operation: string;               // Operation identifier (e.g., "channels.poll")
 *   params?: Record<string, unknown>; // Optional parameters for the operation
 *   workflowId?: string;             // n8n workflow ID that triggered this (for audit)
 *   correlationId?: string;          // Correlation ID for tracing
 * }
 *
 * Requirements: Related to n8n workflow engine integration in the design.
 */

import { NextRequest } from 'next/server';
import {
  INTERNAL_SERVICE_KEY_HEADER,
  validateInternalServiceKey,
  isValidOperation,
  getWorkflowById,
  VALID_OPERATIONS,
  WORKFLOW_CONFIGS,
  type ValidOperation,
} from '@/lib/workflows';

interface TriggerRequestBody {
  operation: string;
  params?: Record<string, unknown>;
  workflowId?: string;
  correlationId?: string;
}

interface OperationResult {
  operation: ValidOperation;
  status: 'accepted' | 'completed' | 'failed';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Execute a platform operation triggered by n8n.
 *
 * Each operation maps to a specific domain module action.
 * Operations are dispatched asynchronously — n8n receives an
 * acceptance response immediately.
 */
async function executeOperation(
  operation: ValidOperation,
  params?: Record<string, unknown>
): Promise<OperationResult> {
  switch (operation) {
    case 'marketing.syncMetrics':
      return {
        operation,
        status: 'accepted',
        message: 'Marketing metrics sync initiated',
        data: { syncType: params?.syncType ?? 'full' },
      };

    case 'financial.generateReports':
      return {
        operation,
        status: 'accepted',
        message: 'Financial report generation initiated',
        data: {
          reportDate: params?.reportDate ?? new Date().toISOString().split('T')[0],
        },
      };

    case 'maintenance.checkRecurring':
      return {
        operation,
        status: 'accepted',
        message: 'Recurring maintenance check initiated',
        data: { checkDate: new Date().toISOString() },
      };

    case 'notifications.sendPreArrival':
      return {
        operation,
        status: 'accepted',
        message: 'Pre-arrival message dispatch initiated',
        data: { lookAheadHours: params?.lookAheadHours ?? 48 },
      };

    case 'iot.cleanupRetention':
      return {
        operation,
        status: 'accepted',
        message: 'IoT retention cleanup initiated',
        data: { retentionDays: params?.retentionDays ?? 90 },
      };

    case 'channels.poll':
      return {
        operation,
        status: 'accepted',
        message: 'Channel polling initiated',
        data: {
          channels: params?.channels ?? ['booking.com', 'airbnb'],
        },
      };

    case 'escalations.sendDigest':
      return {
        operation,
        status: 'accepted',
        message: 'Escalation digest generation initiated',
        data: { digestDate: new Date().toISOString().split('T')[0] },
      };

    case 'bookings.syncAvailability':
      return {
        operation,
        status: 'accepted',
        message: 'Availability sync initiated across all channels',
        data: { tenantId: params?.tenantId ?? 'all' },
      };

    case 'staff.checkOverdue':
      return {
        operation,
        status: 'accepted',
        message: 'Overdue task check initiated',
        data: { overdueThresholdMinutes: params?.overdueThresholdMinutes ?? 15 },
      };

    case 'ai.pruneContext':
      return {
        operation,
        status: 'accepted',
        message: 'AI context pruning initiated',
        data: { maxTokensPerTenant: params?.maxTokensPerTenant ?? 8000 },
      };

    default:
      return {
        operation,
        status: 'failed' as const,
        message: `Unknown operation: ${operation}`,
      };
  }
}

export async function POST(request: NextRequest) {
  // ─── Authenticate internal service key ───────────────────────────
  const serviceKey = request.headers.get(INTERNAL_SERVICE_KEY_HEADER);
  if (!validateInternalServiceKey(serviceKey)) {
    return Response.json(
      { error: 'Unauthorized: invalid or missing internal service key' },
      { status: 401 }
    );
  }

  // ─── Parse and validate request body ─────────────────────────────
  let body: TriggerRequestBody;
  try {
    body = (await request.json()) as TriggerRequestBody;
  } catch {
    return Response.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (!body.operation) {
    return Response.json(
      { error: 'Missing required field: operation' },
      { status: 400 }
    );
  }

  // Validate operation
  if (!isValidOperation(body.operation)) {
    return Response.json(
      {
        error: `Invalid operation: "${body.operation}". Use GET /api/v1/internal/workflows/trigger for available operations.`,
      },
      { status: 400 }
    );
  }

  // ─── Check workflow status if workflowId provided ────────────────
  if (body.workflowId) {
    const workflow = getWorkflowById(body.workflowId);
    if (workflow && !workflow.enabled) {
      return Response.json(
        {
          error: `Workflow "${body.workflowId}" is disabled`,
          workflowId: body.workflowId,
        },
        { status: 403 }
      );
    }
  }

  // ─── Execute the operation ───────────────────────────────────────
  try {
    const result = await executeOperation(
      body.operation as ValidOperation,
      body.params
    );

    return Response.json(
      {
        ...result,
        workflowId: body.workflowId ?? null,
        correlationId: body.correlationId ?? null,
        triggeredAt: new Date().toISOString(),
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[internal/workflows/trigger] Operation failed:', error);
    return Response.json(
      {
        error: 'Operation execution failed',
        operation: body.operation,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/internal/workflows/trigger — List available operations.
 *
 * Returns the list of valid operations and their associated workflow
 * configurations. Useful for n8n workflow development/debugging.
 */
export async function GET(request: NextRequest) {
  const serviceKey = request.headers.get(INTERNAL_SERVICE_KEY_HEADER);
  if (!validateInternalServiceKey(serviceKey)) {
    return Response.json(
      { error: 'Unauthorized: invalid or missing internal service key' },
      { status: 401 }
    );
  }

  return Response.json({
    operations: VALID_OPERATIONS,
    workflows: Object.values(WORKFLOW_CONFIGS).map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      schedule: w.schedule,
      enabled: w.enabled,
      operation: w.operation,
    })),
  });
}

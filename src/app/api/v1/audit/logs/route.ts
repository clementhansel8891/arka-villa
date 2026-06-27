/**
 * GET /api/v1/audit/logs
 *
 * Query audit logs with search and filter capabilities.
 * Supports date range, user, action type, resource, and tenant filters.
 * Returns results within 5 seconds for queries spanning up to 90 days.
 *
 * Requirements: 31.5
 */

import { searchAuditLogs } from '@/modules/audit';
import type { AuditOutcome, AuditQuery } from '@/modules/audit';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;
  const userId = searchParams.get('userId') ?? undefined;
  const actionType = searchParams.get('actionType') ?? undefined;
  const resourceType = searchParams.get('resourceType') ?? undefined;
  const resourceId = searchParams.get('resourceId') ?? undefined;
  const tenantId = searchParams.get('tenantId') ?? undefined;
  const outcome = searchParams.get('outcome') as AuditOutcome | undefined;
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;
  const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : undefined;

  // Validate date range if provided
  if (dateFrom && isNaN(Date.parse(dateFrom))) {
    return Response.json(
      { error: 'Invalid dateFrom format. Use ISO 8601.' },
      { status: 400 }
    );
  }

  if (dateTo && isNaN(Date.parse(dateTo))) {
    return Response.json(
      { error: 'Invalid dateTo format. Use ISO 8601.' },
      { status: 400 }
    );
  }

  // Validate date range does not exceed 90 days for performance
  if (dateFrom && dateTo) {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      return Response.json(
        { error: 'dateFrom must be before dateTo' },
        { status: 400 }
      );
    }

    if (diffDays > 90) {
      return Response.json(
        { error: 'Date range cannot exceed 90 days' },
        { status: 400 }
      );
    }
  }

  // Validate outcome if provided
  if (outcome && !['success', 'failure', 'denied'].includes(outcome)) {
    return Response.json(
      { error: 'Invalid outcome. Must be one of: success, failure, denied' },
      { status: 400 }
    );
  }

  // Validate numeric params
  if (limit !== undefined && (isNaN(limit) || limit < 1)) {
    return Response.json(
      { error: 'limit must be a positive integer' },
      { status: 400 }
    );
  }

  if (offset !== undefined && (isNaN(offset) || offset < 0)) {
    return Response.json(
      { error: 'offset must be a non-negative integer' },
      { status: 400 }
    );
  }

  const query: AuditQuery = {
    dateFrom,
    dateTo,
    userId,
    actionType,
    resourceType,
    resourceId,
    tenantId,
    outcome,
    limit,
    offset,
  };

  try {
    const result = await searchAuditLogs(query);

    return Response.json({
      data: result.logs,
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    console.error('[Audit API] Error querying audit logs:', error);
    return Response.json(
      { error: 'Internal server error while querying audit logs' },
      { status: 500 }
    );
  }
}

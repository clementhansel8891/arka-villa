/**
 * POST /api/v1/staff/tasks — Assign a task to an employee.
 * PATCH /api/v1/staff/tasks — Update task status.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 10.2, 10.3, 10.7, 10.8
 */

import { NextRequest } from 'next/server';
import {
  assignTask,
  updateStatus,
  StaffError,
  type AssignTaskRequest,
  type UpdateTaskStatusRequest,
} from '@/modules/staff';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorUserId = request.headers.get('x-user-id') ?? 'system';
    const actorRole = request.headers.get('x-user-role') ?? 'Agency_Admin';

    const body = (await request.json()) as AssignTaskRequest;

    const task = await assignTask(tenantId, body, actorUserId, actorRole);

    return Response.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof StaffError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorUserId = request.headers.get('x-user-id') ?? 'system';
    const actorRole = request.headers.get('x-user-role') ?? 'Employee';

    const body = (await request.json()) as UpdateTaskStatusRequest;

    const task = await updateStatus(tenantId, body, actorUserId, actorRole);

    return Response.json({ task });
  } catch (error) {
    if (error instanceof StaffError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

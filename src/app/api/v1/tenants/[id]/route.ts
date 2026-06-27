/**
 * PATCH /api/v1/tenants/:id — Update a tenant's name or status.
 * DELETE /api/v1/tenants/:id — Deactivate a tenant (revoke sessions, prevent logins).
 *
 * Both require Agency_Admin role.
 */

import { NextRequest } from 'next/server';
import {
  updateTenant,
  deactivateTenant,
  TenantError,
  type UpdateTenantRequest,
} from '@/modules/tenants';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  ctx: RouteParams
) {
  try {
    const { id } = await ctx.params;

    const userRole = request.headers.get('x-user-role');
    if (userRole && userRole !== 'Agency_Admin') {
      return Response.json(
        { error: 'Forbidden: only Agency_Admin can update tenants' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as UpdateTenantRequest;

    if (!body.name && !body.status) {
      return Response.json(
        { error: 'At least one of "name" or "status" must be provided' },
        { status: 400 }
      );
    }

    const tenant = await updateTenant(id, body);

    return Response.json({ tenant });
  } catch (error) {
    if (error instanceof TenantError) {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        NOT_FOUND: 404,
        CONFLICT: 409,
        PROVISIONING_ERROR: 500,
        INTERNAL_ERROR: 500,
      };
      return Response.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteParams
) {
  try {
    const { id } = await ctx.params;

    const userRole = request.headers.get('x-user-role');
    if (userRole && userRole !== 'Agency_Admin') {
      return Response.json(
        { error: 'Forbidden: only Agency_Admin can deactivate tenants' },
        { status: 403 }
      );
    }

    const result = await deactivateTenant(id);

    return Response.json({
      message: 'Tenant deactivated successfully',
      tenantId: result.tenantId,
      sessionsRevoked: result.sessionsRevoked,
      deactivatedAt: result.deactivatedAt,
    });
  } catch (error) {
    if (error instanceof TenantError) {
      const statusMap: Record<string, number> = {
        VALIDATION_ERROR: 400,
        NOT_FOUND: 404,
        CONFLICT: 409,
        PROVISIONING_ERROR: 500,
        INTERNAL_ERROR: 500,
      };
      return Response.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

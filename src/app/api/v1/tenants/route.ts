/**
 * POST /api/v1/tenants — Create a new tenant (villa registration).
 *
 * Creates a tenant record and provisions a dedicated PostgreSQL schema
 * with all per-tenant tables. Must complete within 10 seconds.
 *
 * Requires Agency_Admin role.
 */

import { NextRequest } from 'next/server';
import {
  createTenant,
  TenantError,
  type CreateTenantRequest,
} from '@/modules/tenants';

export async function POST(request: NextRequest) {
  try {
    // In production, RBAC middleware validates the role.
    // Here we check the header set by middleware as a guard.
    const userRole = request.headers.get('x-user-role');
    if (userRole && userRole !== 'Agency_Admin') {
      return Response.json(
        { error: 'Forbidden: only Agency_Admin can create tenants' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateTenantRequest;

    if (!body.name || !body.slug) {
      return Response.json(
        { error: 'Both "name" and "slug" fields are required' },
        { status: 400 }
      );
    }

    const result = await createTenant(body);

    return Response.json(
      {
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
          schemaName: result.tenant.schemaName,
          status: result.tenant.status,
          createdAt: result.tenant.createdAt,
          updatedAt: result.tenant.updatedAt,
        },
        schemaProvisioned: result.schemaProvisioned,
        provisioningDurationMs: result.provisioningDurationMs,
      },
      { status: 201 }
    );
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

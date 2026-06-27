/**
 * GET /api/v1/rbac/permissions
 *
 * Returns the permissions for the currently authenticated user.
 * Loads the user's role assignment, resolves permissions from the
 * permission matrix, and returns the result.
 *
 * Requires authentication — returns 401 if no valid session.
 *
 * Requirements: 2.1, 2.2
 */

import { headers } from 'next/headers';

import { MIDDLEWARE_HEADERS } from '@/lib/middleware/types';
import type { Role } from '@/modules/rbac/types';
import { loadUserPermissions } from '@/modules/rbac/service';
import { getPermissionsForRole } from '@/modules/rbac/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const headersList = await headers();

  const userId = headersList.get(MIDDLEWARE_HEADERS.USER_ID);
  const userRole = headersList.get(MIDDLEWARE_HEADERS.USER_ROLE) as Role | null;

  // Unauthenticated — return Visitor permissions
  if (!userId || !userRole) {
    const visitorPermissions = getPermissionsForRole('Visitor');
    return Response.json({
      role: 'Visitor',
      tenantIds: [],
      permissions: visitorPermissions,
    });
  }

  // Load full permissions for the authenticated user
  const userPermissions = await loadUserPermissions(userId);

  if (!userPermissions) {
    // User has no role assignment — fall back to role from JWT
    const permissions = getPermissionsForRole(userRole);
    return Response.json({
      userId,
      role: userRole,
      tenantIds: [],
      permissions,
    });
  }

  return Response.json({
    userId: userPermissions.userId,
    role: userPermissions.role,
    tenantIds: userPermissions.tenantIds,
    permissions: userPermissions.permissions,
    loadedAt: userPermissions.loadedAt,
  });
}

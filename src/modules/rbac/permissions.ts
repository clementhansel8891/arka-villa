/**
 * RBAC Permission Matrix.
 *
 * Defines the complete permission matrix mapping each of the 5 roles
 * to their allowed operations and resources.
 *
 * Requirements:
 * - 2.1: Five distinct roles with specific access levels
 * - 2.3: Agency_Admin full read/write across all tenants
 * - 2.4: Villa_Owner restricted to owned villa data
 * - 2.5: Employee restricted to assigned villa operational data
 * - 2.6: Guest restricted to own booking records, profile, messaging
 * - Visitor: public content only
 */

import type { Permission, PermissionMatrix, Role } from './types';

/**
 * Agency_Admin permissions: full read/write across all tenants and resources.
 * Per Requirement 2.3.
 */
const AGENCY_ADMIN_PERMISSIONS: Permission[] = [
  // Tenant management
  { resource: 'tenants', action: 'create', scope: 'all' },
  { resource: 'tenants', action: 'read', scope: 'all' },
  { resource: 'tenants', action: 'update', scope: 'all' },
  { resource: 'tenants', action: 'delete', scope: 'all' },

  // User and role management
  { resource: 'users', action: 'create', scope: 'all' },
  { resource: 'users', action: 'read', scope: 'all' },
  { resource: 'users', action: 'update', scope: 'all' },
  { resource: 'users', action: 'delete', scope: 'all' },
  { resource: 'roles', action: 'create', scope: 'all' },
  { resource: 'roles', action: 'read', scope: 'all' },
  { resource: 'roles', action: 'update', scope: 'all' },
  { resource: 'roles', action: 'delete', scope: 'all' },

  // Bookings
  { resource: 'bookings', action: 'create', scope: 'all' },
  { resource: 'bookings', action: 'read', scope: 'all' },
  { resource: 'bookings', action: 'update', scope: 'all' },
  { resource: 'bookings', action: 'delete', scope: 'all' },

  // Financial
  { resource: 'financial_reports', action: 'read', scope: 'all' },
  { resource: 'financial_reports', action: 'create', scope: 'all' },
  { resource: 'transactions', action: 'create', scope: 'all' },
  { resource: 'transactions', action: 'read', scope: 'all' },
  { resource: 'transactions', action: 'update', scope: 'all' },

  // Staff management
  { resource: 'staff', action: 'create', scope: 'all' },
  { resource: 'staff', action: 'read', scope: 'all' },
  { resource: 'staff', action: 'update', scope: 'all' },
  { resource: 'staff', action: 'delete', scope: 'all' },
  { resource: 'tasks', action: 'create', scope: 'all' },
  { resource: 'tasks', action: 'read', scope: 'all' },
  { resource: 'tasks', action: 'update', scope: 'all' },
  { resource: 'tasks', action: 'delete', scope: 'all' },
  { resource: 'schedules', action: 'create', scope: 'all' },
  { resource: 'schedules', action: 'read', scope: 'all' },
  { resource: 'schedules', action: 'update', scope: 'all' },

  // Maintenance
  { resource: 'maintenance', action: 'create', scope: 'all' },
  { resource: 'maintenance', action: 'read', scope: 'all' },
  { resource: 'maintenance', action: 'update', scope: 'all' },
  { resource: 'maintenance', action: 'delete', scope: 'all' },

  // Marketing
  { resource: 'marketing_campaigns', action: 'create', scope: 'all' },
  { resource: 'marketing_campaigns', action: 'read', scope: 'all' },
  { resource: 'marketing_campaigns', action: 'update', scope: 'all' },
  { resource: 'marketing_campaigns', action: 'delete', scope: 'all' },
  { resource: 'marketing_metrics', action: 'read', scope: 'all' },

  // Communications
  { resource: 'messages', action: 'create', scope: 'all' },
  { resource: 'messages', action: 'read', scope: 'all' },
  { resource: 'messages', action: 'update', scope: 'all' },

  // Reviews
  { resource: 'reviews', action: 'read', scope: 'all' },
  { resource: 'reviews', action: 'update', scope: 'all' },
  { resource: 'reviews', action: 'delete', scope: 'all' },

  // IoT and CCTV
  { resource: 'iot_devices', action: 'create', scope: 'all' },
  { resource: 'iot_devices', action: 'read', scope: 'all' },
  { resource: 'iot_devices', action: 'update', scope: 'all' },
  { resource: 'iot_devices', action: 'delete', scope: 'all' },
  { resource: 'cctv', action: 'read', scope: 'all' },
  { resource: 'cctv', action: 'update', scope: 'all' },

  // Channels
  { resource: 'channels', action: 'create', scope: 'all' },
  { resource: 'channels', action: 'read', scope: 'all' },
  { resource: 'channels', action: 'update', scope: 'all' },
  { resource: 'channels', action: 'delete', scope: 'all' },

  // Notifications
  { resource: 'notifications', action: 'create', scope: 'all' },
  { resource: 'notifications', action: 'read', scope: 'all' },
  { resource: 'notifications', action: 'update', scope: 'all' },

  // Audit
  { resource: 'audit_logs', action: 'read', scope: 'all' },

  // Villa websites
  { resource: 'villa_content', action: 'create', scope: 'all' },
  { resource: 'villa_content', action: 'read', scope: 'all' },
  { resource: 'villa_content', action: 'update', scope: 'all' },
  { resource: 'villa_content', action: 'delete', scope: 'all' },

  // AI
  { resource: 'ai_chat', action: 'create', scope: 'all' },
  { resource: 'ai_chat', action: 'read', scope: 'all' },

  // Settings
  { resource: 'settings', action: 'read', scope: 'all' },
  { resource: 'settings', action: 'update', scope: 'all' },
];

/**
 * Villa_Owner permissions: read financial, bookings, reviews, operations;
 * write owner-configurable settings.
 * Per Requirement 2.4.
 */
const VILLA_OWNER_PERMISSIONS: Permission[] = [
  // Financial — read only
  { resource: 'financial_reports', action: 'read', scope: 'tenant' },
  { resource: 'transactions', action: 'read', scope: 'tenant' },

  // Bookings — read only
  { resource: 'bookings', action: 'read', scope: 'tenant' },

  // Reviews — read only
  { resource: 'reviews', action: 'read', scope: 'tenant' },

  // Operational activity — read only
  { resource: 'staff', action: 'read', scope: 'tenant' },
  { resource: 'tasks', action: 'read', scope: 'tenant' },
  { resource: 'schedules', action: 'read', scope: 'tenant' },
  { resource: 'maintenance', action: 'read', scope: 'tenant' },

  // Owner-configurable settings — write access
  { resource: 'settings', action: 'read', scope: 'tenant' },
  { resource: 'settings', action: 'update', scope: 'tenant' },

  // Notifications — own
  { resource: 'notifications', action: 'read', scope: 'own' },
  { resource: 'notifications', action: 'update', scope: 'own' },

  // CCTV — read for owned villas
  { resource: 'cctv', action: 'read', scope: 'tenant' },

  // AI chat
  { resource: 'ai_chat', action: 'create', scope: 'tenant' },
  { resource: 'ai_chat', action: 'read', scope: 'own' },

  // Messages — read communications for their villas
  { resource: 'messages', action: 'read', scope: 'tenant' },
];

/**
 * Employee permissions: read/write tasks, schedules, work hours,
 * guest communications for assigned villas only.
 * Per Requirement 2.5.
 */
const EMPLOYEE_PERMISSIONS: Permission[] = [
  // Tasks — full CRUD for assigned villas
  { resource: 'tasks', action: 'read', scope: 'tenant' },
  { resource: 'tasks', action: 'update', scope: 'tenant' },

  // Schedules — read own schedules
  { resource: 'schedules', action: 'read', scope: 'tenant' },

  // Work hours — own records
  { resource: 'work_hours', action: 'create', scope: 'own' },
  { resource: 'work_hours', action: 'read', scope: 'own' },
  { resource: 'work_hours', action: 'update', scope: 'own' },

  // Guest communications — for assigned villas
  { resource: 'messages', action: 'create', scope: 'tenant' },
  { resource: 'messages', action: 'read', scope: 'tenant' },
  { resource: 'messages', action: 'update', scope: 'tenant' },

  // Maintenance — can report and update assigned tickets
  { resource: 'maintenance', action: 'create', scope: 'tenant' },
  { resource: 'maintenance', action: 'read', scope: 'tenant' },
  { resource: 'maintenance', action: 'update', scope: 'tenant' },

  // Notifications — own
  { resource: 'notifications', action: 'read', scope: 'own' },
  { resource: 'notifications', action: 'update', scope: 'own' },

  // AI chat
  { resource: 'ai_chat', action: 'create', scope: 'tenant' },
  { resource: 'ai_chat', action: 'read', scope: 'own' },

  // Bookings — read only for context
  { resource: 'bookings', action: 'read', scope: 'tenant' },
];

/**
 * Guest permissions: read/write own booking records, profile, messaging.
 * Per Requirement 2.6.
 */
const GUEST_PERMISSIONS: Permission[] = [
  // Own bookings
  { resource: 'bookings', action: 'create', scope: 'own' },
  { resource: 'bookings', action: 'read', scope: 'own' },
  { resource: 'bookings', action: 'update', scope: 'own' },

  // Profile
  { resource: 'profile', action: 'read', scope: 'own' },
  { resource: 'profile', action: 'update', scope: 'own' },

  // Messaging
  { resource: 'messages', action: 'create', scope: 'own' },
  { resource: 'messages', action: 'read', scope: 'own' },

  // Notifications — own
  { resource: 'notifications', action: 'read', scope: 'own' },
  { resource: 'notifications', action: 'update', scope: 'own' },

  // Reviews — can create for own bookings
  { resource: 'reviews', action: 'create', scope: 'own' },
  { resource: 'reviews', action: 'read', scope: 'own' },

  // AI chat
  { resource: 'ai_chat', action: 'create', scope: 'own' },
  { resource: 'ai_chat', action: 'read', scope: 'own' },
];

/**
 * Visitor permissions: read public villa website content and agency showcase only.
 * Visitor is the implicit role for unauthenticated users.
 */
const VISITOR_PERMISSIONS: Permission[] = [
  // Public villa content
  { resource: 'villa_content', action: 'read', scope: 'public' },

  // Agency showcase
  { resource: 'agency_showcase', action: 'read', scope: 'public' },

  // Public reviews
  { resource: 'reviews', action: 'read', scope: 'public' },
];

/**
 * The complete permission matrix mapping each role to its allowed permissions.
 */
export const PERMISSION_MATRIX: PermissionMatrix = {
  Agency_Admin: AGENCY_ADMIN_PERMISSIONS,
  Villa_Owner: VILLA_OWNER_PERMISSIONS,
  Employee: EMPLOYEE_PERMISSIONS,
  Guest: GUEST_PERMISSIONS,
  Visitor: VISITOR_PERMISSIONS,
};

/**
 * Look up permissions for a given role.
 */
export function getPermissionsForRole(role: Role): Permission[] {
  return PERMISSION_MATRIX[role] ?? [];
}

/**
 * Check if a role has a specific permission on a resource.
 */
export function roleHasPermission(
  role: Role,
  resource: string,
  action: Permission['action']
): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.some(
    (p) => p.resource === resource && p.action === action
  );
}

/**
 * Get the scope for a given role/resource/action combination.
 * Returns null if the permission does not exist.
 */
export function getPermissionScope(
  role: Role,
  resource: string,
  action: Permission['action']
): Permission['scope'] | null {
  const permissions = getPermissionsForRole(role);
  const match = permissions.find(
    (p) => p.resource === resource && p.action === action
  );
  return match?.scope ?? null;
}

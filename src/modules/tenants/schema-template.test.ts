/**
 * Unit tests for the per-tenant schema SQL template.
 *
 * Verifies that schema generation produces valid, well-formed SQL
 * containing all required per-tenant tables.
 */

import { describe, it, expect } from 'vitest';
import { generateSchemaSQL } from './schema-template';

describe('generateSchemaSQL', () => {
  const schemaName = 'tenant_villa_sunrise';
  const sql = generateSchemaSQL(schemaName);

  it('creates the schema with the correct name', () => {
    expect(sql).toContain(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
  });

  it('sets the search path to the tenant schema', () => {
    expect(sql).toContain(`SET search_path TO ${schemaName}`);
  });

  it('resets the search path at the end', () => {
    expect(sql).toContain('SET search_path TO public;');
  });

  describe('creates all required per-tenant tables', () => {
    const requiredTables = [
      'bookings',
      'rooms',
      'room_types',
      'rate_plans',
      'guests',
      'guest_communications',
      'staff_tasks',
      'staff_attendance',
      'staff_assignments',
      'maintenance_tickets',
      'recurring_maintenance',
      'financial_transactions',
      'marketing_campaigns',
      'marketing_metrics',
      'iot_devices',
      'cctv_recordings',
      'villa_content',
      'reviews',
    ];

    for (const table of requiredTables) {
      it(`includes table: ${table}`, () => {
        expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
      });
    }
  });

  it('creates indexes for bookings table', () => {
    expect(sql).toContain('idx_bookings_guest_id');
    expect(sql).toContain('idx_bookings_room_id');
    expect(sql).toContain('idx_bookings_dates');
    expect(sql).toContain('idx_bookings_status');
  });

  it('creates indexes for staff tables', () => {
    expect(sql).toContain('idx_staff_tasks_assigned_to');
    expect(sql).toContain('idx_staff_tasks_status');
    expect(sql).toContain('idx_staff_attendance_user_date');
  });

  it('creates indexes for maintenance tables', () => {
    expect(sql).toContain('idx_maintenance_tickets_status');
    expect(sql).toContain('idx_maintenance_tickets_severity');
  });

  it('creates indexes for financial transactions', () => {
    expect(sql).toContain('idx_financial_transactions_category');
    expect(sql).toContain('idx_financial_transactions_date');
  });

  it('booking table has date check constraint', () => {
    expect(sql).toContain('CONSTRAINT check_dates CHECK (check_out > check_in)');
  });

  it('uses different schema name when provided', () => {
    const otherSQL = generateSchemaSQL('tenant_another_villa');
    expect(otherSQL).toContain('CREATE SCHEMA IF NOT EXISTS tenant_another_villa');
    expect(otherSQL).toContain('SET search_path TO tenant_another_villa');
  });
});

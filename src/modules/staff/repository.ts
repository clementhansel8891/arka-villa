/**
 * Staff repository — tenant-scoped database queries.
 *
 * All queries use the tenant-scoped connection helper to ensure
 * data isolation between tenants.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import { tenantQuery } from '@/lib/db/tenant-query';
import type {
  StaffTask,
  StaffTaskRow,
  TaskEvidence,
  TaskStatus,
  TaskPriority,
  AttendanceRecord,
  AttendanceRow,
  AttendanceStatus,
  StaffAssignment,
  StaffAssignmentRow,
} from './types';

// ─── Row → Domain Mappers ─────────────────────────────────────────────────────

function mapTaskRow(row: StaffTaskRow): StaffTask {
  const evidence =
    typeof row.evidence === 'string'
      ? JSON.parse(row.evidence)
      : row.evidence ?? [];

  return {
    id: row.id,
    assignedTo: row.assigned_to,
    assignedBy: row.assigned_by,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    deadline: row.deadline,
    completedAt: row.completed_at,
    evidence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAttendanceRow(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    shiftDate: row.shift_date,
    shiftStart: row.shift_start,
    clockIn: row.clock_in,
    clockOut: row.clock_out,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function mapAssignmentRow(row: StaffAssignmentRow): StaffAssignment {
  return {
    id: row.id,
    userId: row.user_id,
    role: row.role,
    assignedAt: row.assigned_at,
    isActive: row.is_active,
  };
}

// ─── Staff Assignment Queries ─────────────────────────────────────────────────

/**
 * Get active assignments for a user in a tenant (villa).
 */
export async function getActiveAssignments(
  tenantId: string,
  userId: string
): Promise<StaffAssignment[]> {
  const result = await tenantQuery<StaffAssignmentRow>(
    tenantId,
    `SELECT id, user_id, role, assigned_at, is_active
     FROM staff_assignments
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  return result.rows.map(mapAssignmentRow);
}

/**
 * Count total active assignments for a villa (tenant).
 * Used to enforce the max 50 employees per villa limit.
 */
export async function countActiveAssignmentsForVilla(
  tenantId: string
): Promise<number> {
  const result = await tenantQuery<{ count: string }>(
    tenantId,
    `SELECT COUNT(DISTINCT user_id) AS count
     FROM staff_assignments
     WHERE is_active = TRUE`
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Count roles for a user across all tenants is not needed;
 * we count per-tenant active roles.
 */
export async function countRolesForUser(
  tenantId: string,
  userId: string
): Promise<number> {
  const result = await tenantQuery<{ count: string }>(
    tenantId,
    `SELECT COUNT(*) AS count
     FROM staff_assignments
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );
  return parseInt(result.rows[0].count, 10);
}

// ─── Task Queries ─────────────────────────────────────────────────────────────

/**
 * Create a new staff task record.
 */
export async function createTask(
  tenantId: string,
  assignedTo: string,
  assignedBy: string,
  title: string,
  description: string | null,
  priority: TaskPriority,
  deadline: string
): Promise<StaffTask> {
  const result = await tenantQuery<StaffTaskRow>(
    tenantId,
    `INSERT INTO staff_tasks (assigned_to, assigned_by, title, description, priority, deadline)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, assigned_to, assigned_by, title, description, priority, status,
               deadline, completed_at, evidence, created_at, updated_at`,
    [assignedTo, assignedBy, title, description, priority, deadline]
  );
  return mapTaskRow(result.rows[0]);
}

/**
 * Get a task by ID.
 */
export async function getTaskById(
  tenantId: string,
  taskId: string
): Promise<StaffTask | null> {
  const result = await tenantQuery<StaffTaskRow>(
    tenantId,
    `SELECT id, assigned_to, assigned_by, title, description, priority, status,
            deadline, completed_at, evidence, created_at, updated_at
     FROM staff_tasks
     WHERE id = $1`,
    [taskId]
  );
  if (result.rows.length === 0) return null;
  return mapTaskRow(result.rows[0]);
}

/**
 * Update task status.
 * If completing, sets completed_at and evidence.
 */
export async function updateTaskStatus(
  tenantId: string,
  taskId: string,
  status: TaskStatus,
  evidence?: TaskEvidence[]
): Promise<StaffTask | null> {
  let query: string;
  let params: unknown[];

  if (status === 'completed') {
    query = `UPDATE staff_tasks
             SET status = $1, completed_at = NOW(), evidence = $2, updated_at = NOW()
             WHERE id = $3
             RETURNING id, assigned_to, assigned_by, title, description, priority, status,
                       deadline, completed_at, evidence, created_at, updated_at`;
    params = [status, JSON.stringify(evidence ?? []), taskId];
  } else {
    query = `UPDATE staff_tasks
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, assigned_to, assigned_by, title, description, priority, status,
                       deadline, completed_at, evidence, created_at, updated_at`;
    params = [status, taskId];
  }

  const result = await tenantQuery<StaffTaskRow>(tenantId, query, params);
  if (result.rows.length === 0) return null;
  return mapTaskRow(result.rows[0]);
}

/**
 * Get tasks for a specific day ordered by priority (High > Medium > Low).
 */
export async function getTasksByDate(
  tenantId: string,
  userId: string,
  date: string
): Promise<StaffTask[]> {
  const result = await tenantQuery<StaffTaskRow>(
    tenantId,
    `SELECT id, assigned_to, assigned_by, title, description, priority, status,
            deadline, completed_at, evidence, created_at, updated_at
     FROM staff_tasks
     WHERE assigned_to = $1
       AND DATE(deadline) = $2
     ORDER BY
       CASE priority
         WHEN 'high' THEN 1
         WHEN 'medium' THEN 2
         WHEN 'low' THEN 3
       END ASC,
       deadline ASC`,
    [userId, date]
  );
  return result.rows.map(mapTaskRow);
}

/**
 * Get overdue tasks (past deadline, not completed).
 * Used by escalation logic.
 */
export async function getOverdueTasks(
  tenantId: string
): Promise<StaffTask[]> {
  const result = await tenantQuery<StaffTaskRow>(
    tenantId,
    `SELECT id, assigned_to, assigned_by, title, description, priority, status,
            deadline, completed_at, evidence, created_at, updated_at
     FROM staff_tasks
     WHERE status != 'completed'
       AND deadline < NOW()
     ORDER BY deadline ASC`
  );
  return result.rows.map(mapTaskRow);
}

// ─── Attendance Queries ───────────────────────────────────────────────────────

/**
 * Get attendance record for a user on a specific shift date.
 */
export async function getAttendanceByDate(
  tenantId: string,
  userId: string,
  shiftDate: string
): Promise<AttendanceRecord | null> {
  const result = await tenantQuery<AttendanceRow>(
    tenantId,
    `SELECT id, user_id, shift_date, shift_start, clock_in, clock_out, status, notes, created_at
     FROM staff_attendance
     WHERE user_id = $1 AND shift_date = $2
     LIMIT 1`,
    [userId, shiftDate]
  );
  if (result.rows.length === 0) return null;
  return mapAttendanceRow(result.rows[0]);
}

/**
 * Record clock-in. Creates the attendance record if it doesn't exist,
 * or updates it if a record for the shift already exists.
 *
 * Rounds timestamp to nearest minute and determines attendance status.
 */
export async function recordClockIn(
  tenantId: string,
  userId: string,
  clockInTime: string,
  status: AttendanceStatus
): Promise<AttendanceRecord> {
  // Get the shift date from the clock-in time
  const shiftDate = clockInTime.split('T')[0];

  // Try to update an existing record first
  const existing = await getAttendanceByDate(tenantId, userId, shiftDate);

  if (existing) {
    const result = await tenantQuery<AttendanceRow>(
      tenantId,
      `UPDATE staff_attendance
       SET clock_in = $1, status = $2
       WHERE id = $3
       RETURNING id, user_id, shift_date, shift_start, clock_in, clock_out, status, notes, created_at`,
      [clockInTime, status, existing.id]
    );
    return mapAttendanceRow(result.rows[0]);
  }

  // Create a new record — default shift_start is 08:00
  const result = await tenantQuery<AttendanceRow>(
    tenantId,
    `INSERT INTO staff_attendance (user_id, shift_date, shift_start, clock_in, status)
     VALUES ($1, $2, '08:00', $3, $4)
     RETURNING id, user_id, shift_date, shift_start, clock_in, clock_out, status, notes, created_at`,
    [userId, shiftDate, clockInTime, status]
  );
  return mapAttendanceRow(result.rows[0]);
}

/**
 * Record clock-out for an existing attendance record.
 */
export async function recordClockOut(
  tenantId: string,
  userId: string,
  clockOutTime: string
): Promise<AttendanceRecord | null> {
  const shiftDate = clockOutTime.split('T')[0];

  const result = await tenantQuery<AttendanceRow>(
    tenantId,
    `UPDATE staff_attendance
     SET clock_out = $1
     WHERE user_id = $2 AND shift_date = $3
     RETURNING id, user_id, shift_date, shift_start, clock_in, clock_out, status, notes, created_at`,
    [clockOutTime, userId, shiftDate]
  );

  if (result.rows.length === 0) return null;
  return mapAttendanceRow(result.rows[0]);
}

/**
 * Get today's schedule (attendance + tasks) for a user.
 */
export async function getScheduleForDate(
  tenantId: string,
  userId: string,
  date: string
): Promise<{ attendance: AttendanceRecord | null; tasks: StaffTask[] }> {
  const attendance = await getAttendanceByDate(tenantId, userId, date);
  const tasks = await getTasksByDate(tenantId, userId, date);
  return { attendance, tasks };
}

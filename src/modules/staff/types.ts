/**
 * Staff module types.
 *
 * Types for task assignment, attendance tracking, employee assignments,
 * and escalation handling within the staff operations domain.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

// ─── Enums / Literal Types ────────────────────────────────────────────────────

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type AttendanceStatus = 'present' | 'late' | 'absent';
export type StaffRole = 'housekeeping' | 'maintenance' | 'front_desk' | 'management';

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface StaffTask {
  id: string;
  assignedTo: string;
  assignedBy: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  completedAt: string | null;
  evidence: TaskEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskEvidence {
  type: 'photo' | 'note';
  content: string;
  addedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  shiftDate: string;
  shiftStart: string;
  clockIn: string | null;
  clockOut: string | null;
  status: AttendanceStatus;
  notes: string | null;
  createdAt: string;
}

export interface StaffAssignment {
  id: string;
  userId: string;
  role: StaffRole;
  assignedAt: string;
  isActive: boolean;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface StaffTaskRow {
  id: string;
  assigned_to: string;
  assigned_by: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  completed_at: string | null;
  evidence: TaskEvidence[] | string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRow {
  id: string;
  user_id: string;
  shift_date: string;
  shift_start: string;
  clock_in: string | null;
  clock_out: string | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
}

export interface StaffAssignmentRow {
  id: string;
  user_id: string;
  role: StaffRole;
  assigned_at: string;
  is_active: boolean;
}

// ─── Request / Response Types ─────────────────────────────────────────────────

export interface AssignTaskRequest {
  assignedTo: string;
  title: string;
  description?: string;
  priority: 'High' | 'Medium' | 'Low';
  deadline: string;
  villaId?: string;
}

export interface UpdateTaskStatusRequest {
  taskId: string;
  status: TaskStatus;
  evidence?: TaskEvidence[];
}

export interface ClockInRequest {
  userId: string;
  timestamp?: string;
}

export interface ClockOutRequest {
  userId: string;
  timestamp?: string;
}

export interface GetScheduleQuery {
  userId?: string;
  date?: string;
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface TaskAssignedPayload {
  taskId: string;
  assignedTo: string;
  assignedBy: string;
  title: string;
  priority: TaskPriority;
  deadline: string;
}

export interface TaskCompletedPayload {
  taskId: string;
  assignedTo: string;
  completedAt: string;
}

export interface TaskOverduePayload {
  taskId: string;
  assignedTo: string;
  deadline: string;
  title: string;
}

export interface ClockInPayload {
  userId: string;
  clockIn: string;
  shiftDate: string;
  status: AttendanceStatus;
}

export interface ClockOutPayload {
  userId: string;
  clockOut: string;
  shiftDate: string;
}

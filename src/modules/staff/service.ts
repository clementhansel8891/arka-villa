/**
 * Staff service — business logic orchestration.
 *
 * Coordinates task assignment, clock-in/out, schedule retrieval,
 * escalation, and event emission for the staff operations domain.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS } from '@/lib/events/streams';
import type { PlatformEvent } from '@/lib/events/types';
import { createRedisClient } from '@/lib/db/redis';
import {
  getActiveAssignments,
  countActiveAssignmentsForVilla,
  countRolesForUser,
  createTask,
  getTaskById,
  updateTaskStatus,
  getTasksByDate,
  getOverdueTasks,
  recordClockIn,
  recordClockOut,
  getAttendanceByDate,
  getScheduleForDate,
} from './repository';
import type {
  StaffTask,
  AttendanceRecord,
  AttendanceStatus,
  TaskPriority,
  TaskStatus,
  TaskEvidence,
  AssignTaskRequest,
  UpdateTaskStatusRequest,
  ClockInRequest,
  ClockOutRequest,
  GetScheduleQuery,
  TaskAssignedPayload,
  TaskCompletedPayload,
  TaskOverduePayload,
  ClockInPayload,
  ClockOutPayload,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of employees per villa. Requirement 10.1 */
const MAX_EMPLOYEES_PER_VILLA = 50;

/** Maximum number of roles per employee. Requirement 10.1 */
const MAX_ROLES_PER_EMPLOYEE = 3;

/** Minutes after shift start before an employee is considered late. Requirement 10.5 */
const LATE_THRESHOLD_MINUTES = 15;

/** Minutes after deadline before escalation. Requirement 10.4 */
const ESCALATION_DELAY_MINUTES = 15;

// ─── Error Classes ────────────────────────────────────────────────────────────

export class StaffError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'NOT_FOUND'
      | 'ASSIGNMENT_ERROR'
      | 'CAPACITY_EXCEEDED'
      | 'EVIDENCE_REQUIRED'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'StaffError';
  }
}

// ─── Event Emission Helper ────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

async function getEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    eventBusInstance = new EventBus({ publisher, subscriber });
  }
  return eventBusInstance;
}

async function emitStaffEvent<T>(
  type: string,
  tenantId: string,
  payload: T,
  actorUserId: string,
  actorRole: string,
  correlationId?: string
): Promise<void> {
  try {
    const eventBus = await getEventBus();

    const event: PlatformEvent<T> = {
      id: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'staff',
      tenantId,
      correlationId: correlationId ?? uuidv4(),
      actor: {
        userId: actorUserId,
        role: actorRole,
      },
      payload,
      metadata: {
        retryCount: 0,
        maxRetries: 3,
        priority: 'normal',
      },
    };

    await eventBus.emit(STREAMS.STAFF, event);
  } catch {
    // Event emission failure should not break the staff operation flow.
    console.error(`[Staff] Failed to emit event: ${type}`);
  }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Normalize priority from request (High/Medium/Low) to database format (high/medium/low).
 */
function normalizePriority(priority: 'High' | 'Medium' | 'Low'): TaskPriority {
  return priority.toLowerCase() as TaskPriority;
}

/**
 * Round a timestamp to the nearest minute.
 * Requirement 10.5: clock-in/out rounded to nearest minute.
 */
function roundToNearestMinute(timestamp: string): string {
  const date = new Date(timestamp);
  const seconds = date.getSeconds();
  if (seconds >= 30) {
    date.setMinutes(date.getMinutes() + 1);
  }
  date.setSeconds(0, 0);
  return date.toISOString();
}

/**
 * Determine attendance status based on clock-in time relative to shift start.
 * Requirement 10.5:
 *   - Present: clock_in within 15 min of shift_start
 *   - Late: clock_in > 15 min after shift_start
 *   - Absent: no clock_in
 */
function determineAttendanceStatus(
  clockInTime: string,
  shiftStart: string,
  shiftDate: string
): AttendanceStatus {
  // Build full shift start datetime from shift_date + shift_start (time only)
  const shiftStartDateTime = new Date(`${shiftDate}T${shiftStart}:00`);
  const clockIn = new Date(clockInTime);

  const diffMs = clockIn.getTime() - shiftStartDateTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes <= LATE_THRESHOLD_MINUTES) {
    return 'present';
  }
  return 'late';
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Assign a task to an employee.
 *
 * Validates:
 * - Employee is actively assigned to the target villa (tenant)
 * - Employee is not inactive
 * - Task fields are valid
 *
 * Requirements: 10.2, 10.7
 */
export async function assignTask(
  tenantId: string,
  request: AssignTaskRequest,
  actorUserId: string,
  actorRole: string
): Promise<StaffTask> {
  // Validate required fields
  if (!request.assignedTo) {
    throw new StaffError('assignedTo is required', 'VALIDATION_ERROR');
  }
  if (!request.title || request.title.trim().length === 0) {
    throw new StaffError('title is required', 'VALIDATION_ERROR');
  }
  if (!request.priority) {
    throw new StaffError('priority is required', 'VALIDATION_ERROR');
  }
  if (!['High', 'Medium', 'Low'].includes(request.priority)) {
    throw new StaffError(
      'priority must be High, Medium, or Low',
      'VALIDATION_ERROR'
    );
  }
  if (!request.deadline) {
    throw new StaffError('deadline is required', 'VALIDATION_ERROR');
  }

  // Validate deadline is in the future
  const deadlineDate = new Date(request.deadline);
  if (isNaN(deadlineDate.getTime())) {
    throw new StaffError('deadline must be a valid date', 'VALIDATION_ERROR');
  }

  // Requirement 10.7: Reject task assignment to inactive employees
  // or employees not assigned to target villa
  const assignments = await getActiveAssignments(tenantId, request.assignedTo);
  if (assignments.length === 0) {
    throw new StaffError(
      'Employee is not assigned to this villa or is inactive',
      'ASSIGNMENT_ERROR',
      403
    );
  }

  // Create the task
  const priority = normalizePriority(request.priority);
  const task = await createTask(
    tenantId,
    request.assignedTo,
    actorUserId,
    request.title,
    request.description ?? null,
    priority,
    request.deadline
  );

  // Emit task assigned event
  const eventPayload: TaskAssignedPayload = {
    taskId: task.id,
    assignedTo: task.assignedTo,
    assignedBy: task.assignedBy,
    title: task.title,
    priority: task.priority,
    deadline: task.deadline,
  };

  await emitStaffEvent(
    'staff.task_assigned',
    tenantId,
    eventPayload,
    actorUserId,
    actorRole,
    task.id
  );

  return task;
}

/**
 * Update the status of a task.
 *
 * Requirement 10.3: Employees can update status (pending, in_progress, completed).
 * Requirement 10.8: Completion requires evidence (photo or note).
 */
export async function updateStatus(
  tenantId: string,
  request: UpdateTaskStatusRequest,
  actorUserId: string,
  actorRole: string
): Promise<StaffTask> {
  if (!request.taskId) {
    throw new StaffError('taskId is required', 'VALIDATION_ERROR');
  }
  if (!request.status) {
    throw new StaffError('status is required', 'VALIDATION_ERROR');
  }
  if (!['pending', 'in_progress', 'completed'].includes(request.status)) {
    throw new StaffError(
      'status must be pending, in_progress, or completed',
      'VALIDATION_ERROR'
    );
  }

  // Verify task exists
  const existing = await getTaskById(tenantId, request.taskId);
  if (!existing) {
    throw new StaffError(
      `Task not found: ${request.taskId}`,
      'NOT_FOUND',
      404
    );
  }

  // Requirement 10.8: Completion requires evidence
  if (request.status === 'completed') {
    if (!request.evidence || request.evidence.length === 0) {
      throw new StaffError(
        'Completion evidence is required (at least one photo or note)',
        'EVIDENCE_REQUIRED'
      );
    }

    // Validate evidence entries have correct structure
    for (const item of request.evidence) {
      if (!item.type || !['photo', 'note'].includes(item.type)) {
        throw new StaffError(
          'Evidence type must be "photo" or "note"',
          'VALIDATION_ERROR'
        );
      }
      if (!item.content || item.content.trim().length === 0) {
        throw new StaffError(
          'Evidence content cannot be empty',
          'VALIDATION_ERROR'
        );
      }
    }
  }

  const updated = await updateTaskStatus(
    tenantId,
    request.taskId,
    request.status,
    request.evidence
  );

  if (!updated) {
    throw new StaffError('Failed to update task', 'INTERNAL_ERROR', 500);
  }

  // Emit event on completion
  if (request.status === 'completed') {
    const completedPayload: TaskCompletedPayload = {
      taskId: updated.id,
      assignedTo: updated.assignedTo,
      completedAt: updated.completedAt ?? new Date().toISOString(),
    };
    await emitStaffEvent(
      'staff.task_completed',
      tenantId,
      completedPayload,
      actorUserId,
      actorRole,
      updated.id
    );
  }

  return updated;
}

/**
 * Record employee clock-in.
 *
 * Requirement 10.5:
 * - Timestamp rounded to nearest minute
 * - Status: present (≤15 min late), late (>15 min), absent (no clock-in)
 */
export async function clockIn(
  tenantId: string,
  request: ClockInRequest,
  actorUserId: string,
  actorRole: string
): Promise<AttendanceRecord> {
  if (!request.userId) {
    throw new StaffError('userId is required', 'VALIDATION_ERROR');
  }

  // Verify employee is assigned to this villa
  const assignments = await getActiveAssignments(tenantId, request.userId);
  if (assignments.length === 0) {
    throw new StaffError(
      'Employee is not assigned to this villa',
      'ASSIGNMENT_ERROR',
      403
    );
  }

  // Round to nearest minute
  const rawTimestamp = request.timestamp ?? new Date().toISOString();
  const clockInTime = roundToNearestMinute(rawTimestamp);
  const shiftDate = clockInTime.split('T')[0];

  // Check if already clocked in today
  const existing = await getAttendanceByDate(tenantId, request.userId, shiftDate);

  // Determine shift start (from existing record or default 08:00)
  const shiftStart = existing?.shiftStart ?? '08:00';

  // Determine attendance status
  const status = determineAttendanceStatus(clockInTime, shiftStart, shiftDate);

  const attendance = await recordClockIn(
    tenantId,
    request.userId,
    clockInTime,
    status
  );

  // Emit clock-in event
  const eventPayload: ClockInPayload = {
    userId: request.userId,
    clockIn: clockInTime,
    shiftDate,
    status,
  };
  await emitStaffEvent(
    'staff.clock_in',
    tenantId,
    eventPayload,
    actorUserId,
    actorRole
  );

  return attendance;
}

/**
 * Record employee clock-out.
 *
 * Requirement 10.5: Timestamp rounded to nearest minute.
 */
export async function clockOut(
  tenantId: string,
  request: ClockOutRequest,
  actorUserId: string,
  actorRole: string
): Promise<AttendanceRecord> {
  if (!request.userId) {
    throw new StaffError('userId is required', 'VALIDATION_ERROR');
  }

  // Verify employee is assigned to this villa
  const assignments = await getActiveAssignments(tenantId, request.userId);
  if (assignments.length === 0) {
    throw new StaffError(
      'Employee is not assigned to this villa',
      'ASSIGNMENT_ERROR',
      403
    );
  }

  // Round to nearest minute
  const rawTimestamp = request.timestamp ?? new Date().toISOString();
  const clockOutTime = roundToNearestMinute(rawTimestamp);
  const shiftDate = clockOutTime.split('T')[0];

  // Verify employee has clocked in today
  const existing = await getAttendanceByDate(tenantId, request.userId, shiftDate);
  if (!existing || !existing.clockIn) {
    throw new StaffError(
      'Cannot clock out without a prior clock-in for today',
      'VALIDATION_ERROR'
    );
  }

  const attendance = await recordClockOut(
    tenantId,
    request.userId,
    clockOutTime
  );

  if (!attendance) {
    throw new StaffError(
      'Failed to record clock-out',
      'INTERNAL_ERROR',
      500
    );
  }

  // Emit clock-out event
  const eventPayload: ClockOutPayload = {
    userId: request.userId,
    clockOut: clockOutTime,
    shiftDate,
  };
  await emitStaffEvent(
    'staff.clock_out',
    tenantId,
    eventPayload,
    actorUserId,
    actorRole
  );

  return attendance;
}

/**
 * Get daily schedule for an employee sorted by priority.
 *
 * Requirement 10.6: Daily schedule ordered by priority (High first, then Medium, then Low).
 */
export async function getSchedule(
  tenantId: string,
  query: GetScheduleQuery
): Promise<{ attendance: AttendanceRecord | null; tasks: StaffTask[] }> {
  if (!query.userId) {
    throw new StaffError('userId is required', 'VALIDATION_ERROR');
  }

  // Default to today
  const date = query.date ?? new Date().toISOString().split('T')[0];

  return getScheduleForDate(tenantId, query.userId, date);
}

/**
 * Check for overdue tasks and trigger escalation events.
 *
 * Requirement 10.4: Within 15 minutes of deadline passing,
 * notify Agency_Admin and villa manager.
 *
 * This function is called by the escalation agent / scheduled job.
 */
export async function checkAndEscalateOverdueTasks(
  tenantId: string
): Promise<StaffTask[]> {
  const overdueTasks = await getOverdueTasks(tenantId);

  for (const task of overdueTasks) {
    // Check if the task has been overdue for at least ESCALATION_DELAY_MINUTES
    const deadline = new Date(task.deadline);
    const now = new Date();
    const overdueMinutes = (now.getTime() - deadline.getTime()) / (1000 * 60);

    if (overdueMinutes >= ESCALATION_DELAY_MINUTES) {
      const overduePayload: TaskOverduePayload = {
        taskId: task.id,
        assignedTo: task.assignedTo,
        deadline: task.deadline,
        title: task.title,
      };

      // Emit to both STAFF and ESCALATIONS streams
      await emitStaffEvent(
        'staff.task_overdue',
        tenantId,
        overduePayload,
        'system',
        'system'
      );

      // Also emit to escalations stream for the escalation agent
      try {
        const eventBus = await getEventBus();
        const event: PlatformEvent<TaskOverduePayload> = {
          id: uuidv4(),
          type: 'escalation.triggered',
          version: 1,
          timestamp: new Date().toISOString(),
          source: 'staff',
          tenantId,
          correlationId: task.id,
          actor: { userId: 'system', role: 'system' },
          payload: overduePayload,
          metadata: {
            retryCount: 0,
            maxRetries: 3,
            priority: 'high',
          },
        };
        await eventBus.emit(STREAMS.ESCALATIONS, event);
      } catch {
        console.error(
          `[Staff] Failed to emit escalation for task ${task.id}`
        );
      }
    }
  }

  return overdueTasks;
}

/**
 * Validate employee assignment constraints.
 *
 * Requirement 10.1:
 * - Max 50 employees per villa
 * - Max 3 roles per employee
 */
export async function validateAssignmentConstraints(
  tenantId: string,
  userId: string
): Promise<{ valid: boolean; reason?: string }> {
  const villaCount = await countActiveAssignmentsForVilla(tenantId);
  if (villaCount >= MAX_EMPLOYEES_PER_VILLA) {
    return {
      valid: false,
      reason: `Villa has reached the maximum of ${MAX_EMPLOYEES_PER_VILLA} assigned employees`,
    };
  }

  const roleCount = await countRolesForUser(tenantId, userId);
  if (roleCount >= MAX_ROLES_PER_EMPLOYEE) {
    return {
      valid: false,
      reason: `Employee has reached the maximum of ${MAX_ROLES_PER_EMPLOYEE} roles`,
    };
  }

  return { valid: true };
}

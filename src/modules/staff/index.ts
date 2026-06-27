/**
 * Staff Module
 *
 * Employee management, task assignment, attendance tracking,
 * and shift scheduling.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8
 */

export * from './types';

export {
  assignTask,
  updateStatus,
  clockIn,
  clockOut,
  getSchedule,
  checkAndEscalateOverdueTasks,
  validateAssignmentConstraints,
  StaffError,
} from './service';

export type { AssignTaskRequest, UpdateTaskStatusRequest, ClockInRequest, ClockOutRequest, GetScheduleQuery } from './types';

/**
 * Maintenance Module
 *
 * Maintenance tickets, recurring tasks, severity-based
 * escalation, cost tracking, and lifecycle management.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

export * from './types';

export {
  createMaintenanceTicket,
  updateMaintenanceTicketStatus,
  getMaintenanceTickets,
  getMaintenanceTicket,
  getRecurringSchedule,
  getMaintenanceCosts,
  checkAndEscalateStaleTickets,
  checkOverdueRecurringMaintenance,
  completeRecurringMaintenanceTask,
  MaintenanceError,
} from './service';

export type {
  CreateTicketRequest,
  UpdateTicketStatusRequest,
  GetTicketsQuery,
  GetScheduleQuery,
} from './types';

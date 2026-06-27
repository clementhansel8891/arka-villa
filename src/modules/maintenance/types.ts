/**
 * Maintenance module types.
 *
 * Types for maintenance tickets, recurring maintenance scheduling,
 * lifecycle transitions, cost tracking, and event payloads.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

// ─── Enums / Literal Types ────────────────────────────────────────────────────

export type TicketSeverity = 'critical' | 'high' | 'medium' | 'low';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface MaintenanceTicket {
  id: string;
  reportedBy: string;
  assignedTo: string | null;
  severity: TicketSeverity;
  status: TicketStatus;
  title: string;
  description: string | null;
  photos: string[];
  cost: number | null;
  completedAt: string | null;
  completionEvidence: CompletionEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface CompletionEvidence {
  url: string;
  uploadedAt: string;
}

export interface RecurringMaintenance {
  id: string;
  title: string;
  description: string | null;
  intervalDays: number;
  lastCompletedAt: string | null;
  nextDueAt: string;
  assignedTo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface MaintenanceTicketRow {
  id: string;
  reported_by: string;
  assigned_to: string | null;
  severity: TicketSeverity;
  status: TicketStatus;
  title: string;
  description: string | null;
  photos: string[] | string;
  cost: string | null;
  completed_at: string | null;
  completion_evidence: CompletionEvidence[] | string;
  created_at: string;
  updated_at: string;
}

export interface RecurringMaintenanceRow {
  id: string;
  title: string;
  description: string | null;
  interval_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  assigned_to: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Request / Response Types ─────────────────────────────────────────────────

export interface CreateTicketRequest {
  title: string;
  description?: string;
  severity: TicketSeverity;
  photos?: string[];
}

export interface UpdateTicketStatusRequest {
  ticketId: string;
  status: TicketStatus;
  assignedTo?: string;
  cost?: number;
  completionEvidence?: CompletionEvidence[];
}

export interface GetTicketsQuery {
  status?: TicketStatus;
  severity?: TicketSeverity;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface GetScheduleQuery {
  activeOnly?: boolean;
  limit?: number;
  offset?: number;
}

// ─── Event Payloads ───────────────────────────────────────────────────────────

export interface TicketCreatedPayload {
  ticketId: string;
  reportedBy: string;
  severity: TicketSeverity;
  title: string;
}

export interface TicketAssignedPayload {
  ticketId: string;
  assignedTo: string;
  severity: TicketSeverity;
  title: string;
}

export interface TicketCompletedPayload {
  ticketId: string;
  assignedTo: string | null;
  completedAt: string;
  cost: number | null;
}

export interface TicketEscalatedPayload {
  ticketId: string;
  severity: TicketSeverity;
  status: TicketStatus;
  hoursOpen: number;
  title: string;
}

export interface RecurringDuePayload {
  recurringId: string;
  title: string;
  assignedTo: string | null;
  nextDueAt: string;
  hoursPastDue: number;
}

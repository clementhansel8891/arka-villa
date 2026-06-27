/**
 * Financial module types.
 *
 * Covers transaction recording, financial reporting,
 * commission calculation, audit trail, and reconciliation.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
 */

// ─── Transaction Categories ───────────────────────────────────────────────────

export type TransactionCategory =
  | 'booking_revenue'
  | 'ota_commission'
  | 'agency_fee'
  | 'operational_cost'
  | 'maintenance_expense';

// ─── Transaction Core ─────────────────────────────────────────────────────────

export interface FinancialTransaction {
  id: string;
  category: TransactionCategory;
  amount: number;
  currency: string;
  description: string | null;
  bookingId: string | null;
  referenceId: string | null;
  recordedBy: string | null;
  transactionDate: string; // ISO date (YYYY-MM-DD)
  createdAt: string;
}

// ─── Request / Response DTOs ──────────────────────────────────────────────────

export interface CreateTransactionRequest {
  category: TransactionCategory;
  amount: number;
  currency?: string;
  description?: string;
  bookingId?: string;
  referenceId?: string;
  transactionDate?: string; // YYYY-MM-DD, defaults to today
}

export interface TransactionListQuery {
  category?: TransactionCategory;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  bookingId?: string;
  limit?: number;
  offset?: number;
}

// ─── Financial Report ─────────────────────────────────────────────────────────

export interface MonthlyReportEntry {
  month: string; // YYYY-MM
  grossRevenue: number;
  otaCommissions: number;
  agencyFees: number;
  operationalCosts: number;
  maintenanceExpenses: number;
  netOwnerIncome: number;
  currency: string;
}

export interface FinancialReport {
  villaId: string;
  startMonth: string; // YYYY-MM
  endMonth: string;   // YYYY-MM
  entries: MonthlyReportEntry[];
  totals: {
    grossRevenue: number;
    otaCommissions: number;
    agencyFees: number;
    operationalCosts: number;
    maintenanceExpenses: number;
    netOwnerIncome: number;
  };
  currency: string;
  generatedAt: string;
}

export interface ReportQuery {
  startMonth: string; // YYYY-MM
  endMonth: string;   // YYYY-MM
  format?: 'json' | 'pdf';
}

// ─── Commission Configuration ─────────────────────────────────────────────────

export interface CommissionConfig {
  villaId: string;
  ratePercent: number; // 0-100 inclusive
  updatedAt: string;
  updatedBy: string;
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

export interface FinancialAuditEntry {
  id: string;
  transactionId: string;
  fieldName: string;
  previousValue: string | null;
  newValue: string;
  modifiedBy: string;
  modifiedAt: string;
}

// ─── OTA Reconciliation ───────────────────────────────────────────────────────

export interface ReconciliationResult {
  bookingId: string;
  expectedAmount: number;
  receivedAmount: number;
  discrepancyPercent: number;
  flagged: boolean;
  reconciledAt: string;
}

export interface OTAPayoutRecord {
  bookingId: string;
  payoutAmount: number;
  currency: string;
  channel: string;
  payoutDate: string;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface TransactionRow {
  id: string;
  category: TransactionCategory;
  amount: string; // numeric from PG comes as string
  currency: string;
  description: string | null;
  booking_id: string | null;
  reference_id: string | null;
  recorded_by: string | null;
  transaction_date: string;
  created_at: string;
}

export interface AuditRow {
  id: string;
  transaction_id: string;
  field_name: string;
  previous_value: string | null;
  new_value: string;
  modified_by: string;
  modified_at: string;
}

/**
 * Financial service — business logic for recording, reporting, and commission.
 *
 * Handles transaction creation with automatic commission calculation,
 * financial reporting, audit trail, and OTA reconciliation.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
 */

import type {
  FinancialTransaction,
  CreateTransactionRequest,
  TransactionListQuery,
  FinancialReport,
  ReconciliationResult,
  OTAPayoutRecord,
  TransactionRow,
  FinancialAuditEntry,
  AuditRow,
} from './types';
import {
  insertTransaction,
  listTransactions,
  getTransactionById,
  getCommissionRate,
  setCommissionRate,
  insertAuditEntry,
  getAuditTrail,
  getBookingRevenueForReconciliation,
} from './repository';
import { generateReport, generatePDF, ReportError } from './report-generator';

// ─── Transaction Management ───────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'booking_revenue',
  'ota_commission',
  'agency_fee',
  'operational_cost',
  'maintenance_expense',
] as const;

/**
 * Records a financial transaction and optionally calculates agency commission.
 *
 * When a booking_revenue transaction is recorded, an agency_fee transaction
 * is automatically generated if the villa has a commission rate configured.
 *
 * @param tenantId - The tenant/villa ID
 * @param request - Transaction creation data
 * @param recordedBy - User ID of the person recording this transaction
 * @returns Created transaction(s)
 */
export async function recordTransaction(
  tenantId: string,
  request: CreateTransactionRequest,
  recordedBy: string
): Promise<{
  transaction: FinancialTransaction;
  commissionTransaction?: FinancialTransaction;
}> {
  // Validate category
  if (!VALID_CATEGORIES.includes(request.category)) {
    throw new FinancialError(
      `Invalid category: ${request.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
      'INVALID_CATEGORY',
      400
    );
  }

  // Validate amount
  if (typeof request.amount !== 'number' || request.amount <= 0) {
    throw new FinancialError(
      'Amount must be a positive number',
      'INVALID_AMOUNT',
      400
    );
  }

  const transactionDate =
    request.transactionDate ?? new Date().toISOString().split('T')[0];
  const currency = request.currency ?? 'USD';

  // Record the primary transaction
  const row = await insertTransaction(tenantId, {
    category: request.category,
    amount: request.amount,
    currency,
    description: request.description ?? null,
    bookingId: request.bookingId ?? null,
    referenceId: request.referenceId ?? null,
    recordedBy,
    transactionDate,
  });

  const transaction = mapRowToTransaction(row);

  // Audit trail: record creation
  await insertAuditEntry(tenantId, {
    transactionId: transaction.id,
    fieldName: 'created',
    previousValue: null,
    newValue: JSON.stringify({
      category: transaction.category,
      amount: transaction.amount,
      currency: transaction.currency,
    }),
    modifiedBy: recordedBy,
  });

  // Auto-calculate agency commission for booking revenue
  let commissionTransaction: FinancialTransaction | undefined;
  if (request.category === 'booking_revenue') {
    commissionTransaction = await calculateAndRecordCommission(
      tenantId,
      transaction,
      recordedBy
    );
  }

  return { transaction, commissionTransaction };
}

/**
 * Lists financial transactions for a tenant with optional filters.
 */
export async function getTransactions(
  tenantId: string,
  query: TransactionListQuery
): Promise<{ transactions: FinancialTransaction[]; total: number }> {
  const result = await listTransactions(tenantId, query);
  return {
    transactions: result.rows.map(mapRowToTransaction),
    total: result.total,
  };
}

// ─── Commission Calculation ───────────────────────────────────────────────────

/**
 * Calculates commission as amount × rate / 100.
 *
 * @param amount - The base amount to calculate commission on
 * @param ratePercent - Commission rate (0-100)
 * @returns Calculated commission amount (rounded to 2 decimals)
 */
export function calculateCommission(amount: number, ratePercent: number): number {
  if (ratePercent < 0 || ratePercent > 100) {
    throw new FinancialError(
      'Commission rate must be between 0 and 100',
      'INVALID_RATE',
      400
    );
  }
  return Math.round((amount * ratePercent) / 100 * 100) / 100;
}

/**
 * Gets the current commission rate for a villa/tenant.
 */
export async function getVillaCommissionRate(tenantId: string): Promise<number> {
  return getCommissionRate(tenantId);
}

/**
 * Updates the commission rate for a villa/tenant.
 * Rate must be between 0 and 100 inclusive.
 */
export async function updateCommissionRate(
  tenantId: string,
  rate: number,
  updatedBy: string
): Promise<void> {
  if (rate < 0 || rate > 100) {
    throw new FinancialError(
      'Commission rate must be between 0 and 100',
      'INVALID_RATE',
      400
    );
  }
  await setCommissionRate(tenantId, rate, updatedBy);
}

/**
 * Automatically calculates and records agency commission for a revenue transaction.
 * Returns the commission transaction if a rate > 0 is configured, otherwise undefined.
 */
async function calculateAndRecordCommission(
  tenantId: string,
  revenueTransaction: FinancialTransaction,
  recordedBy: string
): Promise<FinancialTransaction | undefined> {
  const rate = await getCommissionRate(tenantId);
  if (rate <= 0) {
    return undefined;
  }

  const commissionAmount = calculateCommission(revenueTransaction.amount, rate);
  if (commissionAmount <= 0) {
    return undefined;
  }

  const row = await insertTransaction(tenantId, {
    category: 'agency_fee',
    amount: commissionAmount,
    currency: revenueTransaction.currency,
    description: `Agency commission (${rate}%) on booking revenue`,
    bookingId: revenueTransaction.bookingId,
    referenceId: revenueTransaction.id,
    recordedBy,
    transactionDate: revenueTransaction.transactionDate,
  });

  const commissionTx = mapRowToTransaction(row);

  // Audit trail for auto-generated commission
  await insertAuditEntry(tenantId, {
    transactionId: commissionTx.id,
    fieldName: 'created',
    previousValue: null,
    newValue: JSON.stringify({
      category: 'agency_fee',
      amount: commissionAmount,
      ratePercent: rate,
      sourceTransactionId: revenueTransaction.id,
    }),
    modifiedBy: recordedBy,
  });

  return commissionTx;
}

// ─── Reporting ────────────────────────────────────────────────────────────────

/**
 * Generates a financial report for a tenant/villa.
 * Must complete within 10 seconds for up to 24-month range.
 *
 * @param tenantId - The tenant/villa ID
 * @param startMonth - Start month (YYYY-MM)
 * @param endMonth - End month (YYYY-MM, inclusive)
 * @returns Structured financial report
 */
export async function getFinancialReport(
  tenantId: string,
  startMonth: string,
  endMonth: string
): Promise<FinancialReport> {
  // Validate month format
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth)) {
    throw new FinancialError(
      'Month must be in YYYY-MM format',
      'INVALID_MONTH_FORMAT',
      400
    );
  }

  return generateReport(tenantId, startMonth, endMonth);
}

/**
 * Generates a PDF version of the financial report.
 *
 * @param tenantId - The tenant/villa ID
 * @param startMonth - Start month (YYYY-MM)
 * @param endMonth - End month (YYYY-MM, inclusive)
 * @returns PDF content as a Buffer
 */
export async function getFinancialReportPDF(
  tenantId: string,
  startMonth: string,
  endMonth: string
): Promise<Buffer> {
  const report = await getFinancialReport(tenantId, startMonth, endMonth);
  return generatePDF(report);
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

/**
 * Retrieves the audit trail for a specific transaction.
 * Audit entries retained for 7 years minimum (Requirement 13.3).
 */
export async function getTransactionAuditTrail(
  tenantId: string,
  transactionId: string
): Promise<FinancialAuditEntry[]> {
  const rows = await getAuditTrail(tenantId, transactionId);
  return rows.map(mapAuditRowToEntry);
}

// ─── OTA Reconciliation ───────────────────────────────────────────────────────

/**
 * Reconciles OTA payout records against booking revenue transactions.
 * Flags discrepancies exceeding 1% of transaction value.
 * Must complete within 24 hours of receiving payout data (Requirement 13.7).
 *
 * @param tenantId - The tenant/villa ID
 * @param payouts - Array of OTA payout records to reconcile
 * @returns Reconciliation results with flagged discrepancies
 */
export async function reconcileOTAPayouts(
  tenantId: string,
  payouts: OTAPayoutRecord[]
): Promise<ReconciliationResult[]> {
  if (payouts.length === 0) {
    return [];
  }

  // Get date range from payouts
  const dates = payouts.map((p) => p.payoutDate);
  const startDate = dates.reduce((a, b) => (a < b ? a : b));
  const endDate = dates.reduce((a, b) => (a > b ? a : b));

  // Fetch corresponding booking revenue records
  const revenueRecords = await getBookingRevenueForReconciliation(
    tenantId,
    startDate,
    endDate
  );

  // Build a map of bookingId → recorded amount
  const revenueMap = new Map<string, number>();
  for (const record of revenueRecords) {
    revenueMap.set(record.booking_id, parseFloat(record.amount));
  }

  // Compare each payout against our records
  const results: ReconciliationResult[] = payouts.map((payout) => {
    const expectedAmount = revenueMap.get(payout.bookingId) ?? 0;
    const receivedAmount = payout.payoutAmount;
    const difference = Math.abs(expectedAmount - receivedAmount);
    const discrepancyPercent =
      expectedAmount > 0
        ? (difference / expectedAmount) * 100
        : receivedAmount > 0
          ? 100
          : 0;
    const flagged = discrepancyPercent > 1;

    return {
      bookingId: payout.bookingId,
      expectedAmount,
      receivedAmount,
      discrepancyPercent: Math.round(discrepancyPercent * 100) / 100,
      flagged,
      reconciledAt: new Date().toISOString(),
    };
  });

  return results;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapRowToTransaction(row: TransactionRow): FinancialTransaction {
  return {
    id: row.id,
    category: row.category,
    amount: parseFloat(row.amount),
    currency: row.currency,
    description: row.description,
    bookingId: row.booking_id,
    referenceId: row.reference_id,
    recordedBy: row.recorded_by,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
  };
}

function mapAuditRowToEntry(row: AuditRow): FinancialAuditEntry {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    fieldName: row.field_name,
    previousValue: row.previous_value,
    newValue: row.new_value,
    modifiedBy: row.modified_by,
    modifiedAt: row.modified_at,
  };
}

function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class FinancialError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'FinancialError';
  }
}

export { ReportError };

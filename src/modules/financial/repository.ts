/**
 * Financial repository — tenant-scoped database queries.
 *
 * All financial data lives within the tenant's schema.
 * Audit trail entries use a separate table for immutable logging.
 *
 * Requirements: 13.1, 13.2, 13.3
 */

import { tenantQuery } from '@/lib/db';
import type {
  TransactionCategory,
  TransactionRow,
  AuditRow,
  TransactionListQuery,
} from './types';

// ─── Transaction Queries ──────────────────────────────────────────────────────

/**
 * Inserts a new financial transaction into the tenant's schema.
 */
export async function insertTransaction(
  tenantId: string,
  data: {
    category: TransactionCategory;
    amount: number;
    currency: string;
    description: string | null;
    bookingId: string | null;
    referenceId: string | null;
    recordedBy: string | null;
    transactionDate: string;
  }
): Promise<TransactionRow> {
  const result = await tenantQuery<TransactionRow>(
    tenantId,
    `INSERT INTO financial_transactions
       (category, amount, currency, description, booking_id, reference_id, recorded_by, transaction_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.category,
      data.amount,
      data.currency,
      data.description,
      data.bookingId,
      data.referenceId,
      data.recordedBy,
      data.transactionDate,
    ]
  );
  return result.rows[0];
}

/**
 * Lists transactions with optional filtering.
 */
export async function listTransactions(
  tenantId: string,
  query: TransactionListQuery
): Promise<{ rows: TransactionRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (query.category) {
    conditions.push(`category = $${paramIndex++}`);
    params.push(query.category);
  }
  if (query.startDate) {
    conditions.push(`transaction_date >= $${paramIndex++}`);
    params.push(query.startDate);
  }
  if (query.endDate) {
    conditions.push(`transaction_date <= $${paramIndex++}`);
    params.push(query.endDate);
  }
  if (query.bookingId) {
    conditions.push(`booking_id = $${paramIndex++}`);
    params.push(query.bookingId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;

  const countResult = await tenantQuery<{ count: string }>(
    tenantId,
    `SELECT COUNT(*) as count FROM financial_transactions ${where}`,
    params
  );

  const dataResult = await tenantQuery<TransactionRow>(
    tenantId,
    `SELECT * FROM financial_transactions ${where}
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * Fetches a single transaction by ID.
 */
export async function getTransactionById(
  tenantId: string,
  transactionId: string
): Promise<TransactionRow | null> {
  const result = await tenantQuery<TransactionRow>(
    tenantId,
    `SELECT * FROM financial_transactions WHERE id = $1`,
    [transactionId]
  );
  return result.rows[0] ?? null;
}

// ─── Report Queries ───────────────────────────────────────────────────────────

/**
 * Aggregates monthly financial data for reporting.
 * Returns one row per month with sums per category.
 */
export async function getMonthlyAggregates(
  tenantId: string,
  startMonth: string, // YYYY-MM
  endMonth: string    // YYYY-MM
): Promise<
  Array<{
    month: string;
    category: TransactionCategory;
    total: string;
    currency: string;
  }>
> {
  const startDate = `${startMonth}-01`;
  // End of month: first day of month after endMonth
  const [endYear, endMon] = endMonth.split('-').map(Number);
  const nextMonth = endMon === 12 ? 1 : endMon + 1;
  const nextYear = endMon === 12 ? endYear + 1 : endYear;
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

  const result = await tenantQuery<{
    month: string;
    category: TransactionCategory;
    total: string;
    currency: string;
  }>(
    tenantId,
    `SELECT
       TO_CHAR(transaction_date, 'YYYY-MM') as month,
       category,
       SUM(amount) as total,
       currency
     FROM financial_transactions
     WHERE transaction_date >= $1 AND transaction_date < $2
     GROUP BY month, category, currency
     ORDER BY month ASC`,
    [startDate, endDate]
  );

  return result.rows;
}

// ─── Audit Trail Queries ──────────────────────────────────────────────────────

/**
 * Inserts an audit trail entry for a financial modification.
 * Audit entries are immutable (append-only).
 * Retention: 7 years minimum (Requirement 13.3).
 */
export async function insertAuditEntry(
  tenantId: string,
  data: {
    transactionId: string;
    fieldName: string;
    previousValue: string | null;
    newValue: string;
    modifiedBy: string;
  }
): Promise<AuditRow> {
  const result = await tenantQuery<AuditRow>(
    tenantId,
    `INSERT INTO financial_audit_trail
       (transaction_id, field_name, previous_value, new_value, modified_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.transactionId,
      data.fieldName,
      data.previousValue,
      data.newValue,
      data.modifiedBy,
    ]
  );
  return result.rows[0];
}

/**
 * Retrieves audit trail entries for a specific transaction.
 */
export async function getAuditTrail(
  tenantId: string,
  transactionId: string
): Promise<AuditRow[]> {
  const result = await tenantQuery<AuditRow>(
    tenantId,
    `SELECT * FROM financial_audit_trail
     WHERE transaction_id = $1
     ORDER BY modified_at ASC`,
    [transactionId]
  );
  return result.rows;
}

// ─── Commission Configuration ─────────────────────────────────────────────────

/**
 * Retrieves the agency commission rate for this tenant/villa.
 * Stored in a villa_settings table or defaults to 0.
 */
export async function getCommissionRate(
  tenantId: string
): Promise<number> {
  const result = await tenantQuery<{ value: string }>(
    tenantId,
    `SELECT value FROM villa_settings WHERE key = 'agency_commission_rate' LIMIT 1`,
    []
  );
  if (result.rows.length === 0) {
    return 0;
  }
  return parseFloat(result.rows[0].value);
}

/**
 * Sets the agency commission rate for this tenant/villa.
 * Rate must be between 0 and 100 inclusive.
 */
export async function setCommissionRate(
  tenantId: string,
  rate: number,
  updatedBy: string
): Promise<void> {
  await tenantQuery(
    tenantId,
    `INSERT INTO villa_settings (key, value, updated_by, updated_at)
     VALUES ('agency_commission_rate', $1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_by = $2, updated_at = NOW()`,
    [String(rate), updatedBy]
  );
}

// ─── Reconciliation Queries ───────────────────────────────────────────────────

/**
 * Fetches booking revenue transactions for reconciliation
 * within a given date range.
 */
export async function getBookingRevenueForReconciliation(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ booking_id: string; amount: string; currency: string }>> {
  const result = await tenantQuery<{
    booking_id: string;
    amount: string;
    currency: string;
  }>(
    tenantId,
    `SELECT booking_id, amount, currency
     FROM financial_transactions
     WHERE category = 'booking_revenue'
       AND booking_id IS NOT NULL
       AND transaction_date >= $1
       AND transaction_date <= $2`,
    [startDate, endDate]
  );
  return result.rows;
}

/**
 * Financial Module
 *
 * Transaction recording, financial reporting, agency commission
 * calculation, audit trail, PDF report generation, and OTA
 * payout reconciliation.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
 */

export * from './types';
export {
  recordTransaction,
  getTransactions,
  calculateCommission,
  getVillaCommissionRate,
  updateCommissionRate,
  getFinancialReport,
  getFinancialReportPDF,
  getTransactionAuditTrail,
  reconcileOTAPayouts,
  FinancialError,
  ReportError,
} from './service';
export { generateReport, generatePDF } from './report-generator';

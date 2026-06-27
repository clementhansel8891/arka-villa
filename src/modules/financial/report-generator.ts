/**
 * Financial report generator.
 *
 * Generates monthly financial reports and PDF output.
 * Must complete within 10 seconds for up to 24-month range.
 *
 * Requirements: 13.1, 13.5, 13.6, 13.8
 */

import type {
  FinancialReport,
  MonthlyReportEntry,
  TransactionCategory,
} from './types';
import { getMonthlyAggregates } from './repository';

// ─── Report Generation ────────────────────────────────────────────────────────

/**
 * Generates a financial report for a villa (tenant) over a date range.
 *
 * Aggregates transactions by month and category, computing:
 * - gross_revenue (booking_revenue)
 * - ota_commissions
 * - agency_fees
 * - operational_costs
 * - maintenance_expenses
 * - net_owner_income = gross - commissions - fees - costs - expenses
 *
 * @param tenantId - The tenant/villa ID
 * @param startMonth - Start month in YYYY-MM format
 * @param endMonth - End month in YYYY-MM format (inclusive)
 * @returns Structured financial report
 */
export async function generateReport(
  tenantId: string,
  startMonth: string,
  endMonth: string
): Promise<FinancialReport> {
  // Validate date range (max 24 months)
  const monthsDiff = calculateMonthDiff(startMonth, endMonth);
  if (monthsDiff > 24) {
    throw new ReportError(
      'Date range exceeds maximum of 24 months',
      'RANGE_EXCEEDED',
      400
    );
  }
  if (monthsDiff < 0) {
    throw new ReportError(
      'Start month must not be after end month',
      'INVALID_RANGE',
      400
    );
  }

  const aggregates = await getMonthlyAggregates(tenantId, startMonth, endMonth);

  // Build a map of month → category → total
  const monthMap = new Map<string, Map<TransactionCategory, number>>();
  let currency = 'USD';

  for (const row of aggregates) {
    if (!monthMap.has(row.month)) {
      monthMap.set(row.month, new Map());
    }
    monthMap.get(row.month)!.set(row.category, parseFloat(row.total));
    currency = row.currency; // Use last seen currency
  }

  // Generate all months in the range (even those without transactions)
  const allMonths = generateMonthRange(startMonth, endMonth);
  const entries: MonthlyReportEntry[] = allMonths.map((month) => {
    const categoryTotals = monthMap.get(month);
    const grossRevenue = categoryTotals?.get('booking_revenue') ?? 0;
    const otaCommissions = categoryTotals?.get('ota_commission') ?? 0;
    const agencyFees = categoryTotals?.get('agency_fee') ?? 0;
    const operationalCosts = categoryTotals?.get('operational_cost') ?? 0;
    const maintenanceExpenses = categoryTotals?.get('maintenance_expense') ?? 0;
    const netOwnerIncome = round2(
      grossRevenue - otaCommissions - agencyFees - operationalCosts - maintenanceExpenses
    );

    return {
      month,
      grossRevenue: round2(grossRevenue),
      otaCommissions: round2(otaCommissions),
      agencyFees: round2(agencyFees),
      operationalCosts: round2(operationalCosts),
      maintenanceExpenses: round2(maintenanceExpenses),
      netOwnerIncome,
      currency,
    };
  });

  // Calculate totals
  const totals = entries.reduce(
    (acc, entry) => ({
      grossRevenue: round2(acc.grossRevenue + entry.grossRevenue),
      otaCommissions: round2(acc.otaCommissions + entry.otaCommissions),
      agencyFees: round2(acc.agencyFees + entry.agencyFees),
      operationalCosts: round2(acc.operationalCosts + entry.operationalCosts),
      maintenanceExpenses: round2(acc.maintenanceExpenses + entry.maintenanceExpenses),
      netOwnerIncome: round2(acc.netOwnerIncome + entry.netOwnerIncome),
    }),
    {
      grossRevenue: 0,
      otaCommissions: 0,
      agencyFees: 0,
      operationalCosts: 0,
      maintenanceExpenses: 0,
      netOwnerIncome: 0,
    }
  );

  return {
    villaId: tenantId,
    startMonth,
    endMonth,
    entries,
    totals,
    currency,
    generatedAt: new Date().toISOString(),
  };
}

// ─── PDF Generation (Placeholder) ────────────────────────────────────────────

/**
 * Generates a PDF representation of a financial report.
 *
 * Returns a Buffer containing the PDF content.
 * Uses a simple text-based layout. In production, this would
 * use a library like pdfkit or puppeteer for rich formatting.
 *
 * Must complete within 10 seconds (Requirement 13.5).
 *
 * @param report - The structured financial report data
 * @returns PDF content as a Buffer
 */
export async function generatePDF(report: FinancialReport): Promise<Buffer> {
  // Build a simple text representation as PDF placeholder.
  // In production, replace with pdfkit/puppeteer for styled output.
  const lines: string[] = [];

  lines.push('FINANCIAL REPORT');
  lines.push('================');
  lines.push('');
  lines.push(`Villa: ${report.villaId}`);
  lines.push(`Period: ${report.startMonth} to ${report.endMonth}`);
  lines.push(`Currency: ${report.currency}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('─'.repeat(80));
  lines.push(
    padRight('Month', 10) +
    padRight('Revenue', 12) +
    padRight('OTA Comm.', 12) +
    padRight('Agency Fee', 12) +
    padRight('Op. Costs', 12) +
    padRight('Maint.', 12) +
    padRight('Net Income', 12)
  );
  lines.push('─'.repeat(80));

  for (const entry of report.entries) {
    lines.push(
      padRight(entry.month, 10) +
      padRight(formatCurrency(entry.grossRevenue), 12) +
      padRight(formatCurrency(entry.otaCommissions), 12) +
      padRight(formatCurrency(entry.agencyFees), 12) +
      padRight(formatCurrency(entry.operationalCosts), 12) +
      padRight(formatCurrency(entry.maintenanceExpenses), 12) +
      padRight(formatCurrency(entry.netOwnerIncome), 12)
    );
  }

  lines.push('─'.repeat(80));
  lines.push(
    padRight('TOTALS', 10) +
    padRight(formatCurrency(report.totals.grossRevenue), 12) +
    padRight(formatCurrency(report.totals.otaCommissions), 12) +
    padRight(formatCurrency(report.totals.agencyFees), 12) +
    padRight(formatCurrency(report.totals.operationalCosts), 12) +
    padRight(formatCurrency(report.totals.maintenanceExpenses), 12) +
    padRight(formatCurrency(report.totals.netOwnerIncome), 12)
  );
  lines.push('');
  lines.push('Net Owner Income = Gross Revenue - OTA Commissions - Agency Fees - Operational Costs - Maintenance Expenses');

  const content = lines.join('\n');

  // Simple PDF wrapper (minimal valid PDF structure)
  // In production, use a proper PDF library for styled documents.
  const pdfContent = buildMinimalPDF(content);
  return Buffer.from(pdfContent);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateMonthDiff(startMonth: string, endMonth: string): number {
  const [startYear, startMon] = startMonth.split('-').map(Number);
  const [endYear, endMon] = endMonth.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMon - startMon);
}

function generateMonthRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  const [startYear, startMon] = startMonth.split('-').map(Number);
  const [endYear, endMon] = endMonth.split('-').map(Number);

  let year = startYear;
  let month = startMon;

  while (year < endYear || (year === endYear && month <= endMon)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

function padRight(str: string, width: number): string {
  return str.padEnd(width);
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Builds a minimal valid PDF file containing text content.
 * This is a simplified placeholder; production should use pdfkit.
 */
function buildMinimalPDF(text: string): Uint8Array {
  const encoder = new TextEncoder();

  // Escape special PDF characters in text
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

  // Split text into lines for PDF rendering
  const lines = escapedText.split('\n');
  const pageHeight = 792; // US Letter height in points
  const startY = pageHeight - 50;
  const lineHeight = 12;

  // Build text rendering commands
  const textOps = lines
    .map((line, i) => `1 0 0 1 50 ${startY - i * lineHeight} Tm (${line}) Tj`)
    .join('\n');

  const stream = `BT\n/F1 9 Tf\n${textOps}\nET`;
  const streamLength = encoder.encode(stream).byteLength;

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj

4 0 obj
<< /Length ${streamLength} >>
stream
${stream}
endstream
endobj

5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

  return encoder.encode(pdf);
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class ReportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'ReportError';
  }
}

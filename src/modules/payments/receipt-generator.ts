/**
 * PDF receipt generator for payment transactions.
 *
 * Generates a basic PDF receipt containing transaction details
 * without relying on external PDF libraries. Uses a minimal PDF
 * specification compliant generator to avoid heavy dependencies.
 *
 * Requirements: 33.7
 */

import type { ReceiptData } from './types';

// ─── PDF Content Builder ──────────────────────────────────────────────────────

/**
 * Generate a PDF receipt buffer for a completed payment.
 *
 * The PDF includes:
 * - Transaction ID and date
 * - Guest name and email
 * - Villa name
 * - Payment amount and currency
 * - Payment method and provider
 * - Description of charges
 */
export function generateReceiptPdf(data: ReceiptData): Buffer {
  const lines = buildReceiptContent(data);
  return createMinimalPdf(lines, data);
}

/**
 * Build receipt text content lines.
 */
function buildReceiptContent(data: ReceiptData): string[] {
  const formattedAmount = formatCurrency(data.amount, data.currency);
  const formattedDate = new Date(data.paidAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    'PAYMENT RECEIPT',
    '',
    `Receipt No: ${data.paymentId}`,
    `Date: ${formattedDate}`,
    '',
    '---',
    '',
    `Guest: ${data.guestName}`,
    `Email: ${data.guestEmail}`,
    `Villa: ${data.villaName}`,
    '',
    '---',
    '',
    `Booking ID: ${data.bookingId}`,
    `Description: ${data.description}`,
    '',
    `Amount: ${formattedAmount}`,
    `Payment Method: ${formatPaymentMethod(data.paymentMethod)}`,
    `Provider: ${data.provider.charAt(0).toUpperCase() + data.provider.slice(1)}`,
    `Transaction ID: ${data.transactionId}`,
    '',
    '---',
    '',
    'Thank you for your payment.',
    'This receipt is generated electronically and is valid without signature.',
  ];
}

/**
 * Create a minimal valid PDF document from text lines.
 *
 * This produces a basic PDF 1.4 compliant document with a single page
 * containing the receipt text. For production use with rich formatting,
 * this can be swapped with a library like pdfkit or puppeteer.
 */
function createMinimalPdf(lines: string[], data: ReceiptData): Buffer {
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 50;
  const lineHeight = 16;
  const titleFontSize = 18;
  const bodyFontSize = 10;

  // Build PDF content stream
  let contentStream = '';
  let yPos = pageHeight - margin;

  // Title
  contentStream += `BT\n/F1 ${titleFontSize} Tf\n${margin} ${yPos} Td\n(${escapePdfString(lines[0])}) Tj\nET\n`;
  yPos -= lineHeight * 2;

  // Body lines (skip the title)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '---') {
      // Draw a horizontal rule
      contentStream += `${margin} ${yPos + 6} m ${pageWidth - margin} ${yPos + 6} l S\n`;
      yPos -= lineHeight;
      continue;
    }
    if (line === '') {
      yPos -= lineHeight * 0.5;
      continue;
    }
    contentStream += `BT\n/F1 ${bodyFontSize} Tf\n${margin} ${yPos} Td\n(${escapePdfString(line)}) Tj\nET\n`;
    yPos -= lineHeight;
  }

  const streamBytes = Buffer.from(contentStream, 'latin1');

  // Build PDF structure
  const objects: string[] = [];
  let objectCount = 0;

  // Object 1: Catalog
  objectCount++;
  objects.push(`${objectCount} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);

  // Object 2: Pages
  objectCount++;
  objects.push(`${objectCount} 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);

  // Object 3: Page
  objectCount++;
  objects.push(
    `${objectCount} 0 obj\n<< /Type /Page /Parent 2 0 R ` +
      `/MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`
  );

  // Object 4: Content stream
  objectCount++;
  objects.push(
    `${objectCount} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${contentStream}endstream\nendobj`
  );

  // Object 5: Font
  objectCount++;
  objects.push(
    `${objectCount} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`
  );

  // Assemble PDF
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += obj + '\n';
  }

  // Cross-reference table
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n';
  pdf += `0 ${objectCount + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (const offset of offsets) {
    pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }

  // Trailer
  pdf += 'trailer\n';
  pdf += `<< /Size ${objectCount + 1} /Root 1 0 R >>\n`;
  pdf += 'startxref\n';
  pdf += `${xrefOffset}\n`;
  pdf += '%%EOF\n';

  return Buffer.from(pdf, 'latin1');
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

function escapePdfString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: 'EUR ',
    GBP: 'GBP ',
    IDR: 'Rp ',
    AUD: 'A$',
    SGD: 'S$',
  };

  const symbol = symbols[currency] ?? `${currency} `;

  if (currency === 'IDR') {
    return `${symbol}${amount.toLocaleString('id-ID')}`;
  }

  return `${symbol}${amount.toFixed(2)}`;
}

function formatPaymentMethod(method: string): string {
  return method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

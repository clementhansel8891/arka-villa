/**
 * GET /api/v1/financial/reports — Generate financial report for a villa.
 *
 * Returns a monthly financial report with gross revenue, OTA commissions,
 * agency fees, operational costs, maintenance expenses, and net owner income.
 *
 * Query parameters:
 *   - startMonth: YYYY-MM (required)
 *   - endMonth: YYYY-MM (required)
 *   - format: 'json' | 'pdf' (optional, defaults to 'json')
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 13.1, 13.5, 13.6, 13.8
 */

import { NextRequest } from 'next/server';
import {
  getFinancialReport,
  getFinancialReportPDF,
  FinancialError,
  ReportError,
} from '@/modules/financial';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startMonth = searchParams.get('startMonth');
    const endMonth = searchParams.get('endMonth');
    const format = searchParams.get('format') ?? 'json';

    if (!startMonth || !endMonth) {
      return Response.json(
        { error: 'startMonth and endMonth query parameters are required (YYYY-MM format)' },
        { status: 400 }
      );
    }

    // Enforce 10-second timeout for report generation (Requirement 13.5, 13.6)
    const timeoutMs = 10_000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (format === 'pdf') {
        const pdfBuffer = await Promise.race([
          getFinancialReportPDF(tenantId, startMonth, endMonth),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener('abort', () =>
              reject(new ReportError(
                'Report generation exceeded 10-second limit. Try a shorter date range or retry.',
                'GENERATION_TIMEOUT',
                408
              ))
            );
          }),
        ]);

        clearTimeout(timeout);

        return new Response(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="financial-report-${startMonth}-to-${endMonth}.pdf"`,
          },
        });
      }

      // JSON format (default)
      const report = await Promise.race([
        getFinancialReport(tenantId, startMonth, endMonth),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () =>
            reject(new ReportError(
              'Report generation exceeded 10-second limit. Try a shorter date range or retry.',
              'GENERATION_TIMEOUT',
              408
            ))
          );
        }),
      ]);

      clearTimeout(timeout);

      return Response.json({ report });
    } catch (innerError) {
      clearTimeout(timeout);
      throw innerError;
    }
  } catch (error) {
    if (error instanceof FinancialError || error instanceof ReportError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/financial/transactions — Record a new financial transaction.
 *
 * Records a transaction with a category and automatically calculates
 * agency commission when booking_revenue is recorded.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 13.2, 13.4
 */

import { NextRequest } from 'next/server';
import {
  recordTransaction,
  FinancialError,
  type CreateTransactionRequest,
} from '@/modules/financial';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const recordedBy = request.headers.get('x-user-id') ?? 'system';

    const body = (await request.json()) as CreateTransactionRequest;

    const result = await recordTransaction(tenantId, body, recordedBy);

    return Response.json(
      {
        transaction: result.transaction,
        ...(result.commissionTransaction && {
          commissionTransaction: result.commissionTransaction,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof FinancialError) {
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

/**
 * POST /api/v1/payments/initiate — Initiate a payment.
 *
 * Selects Stripe or Midtrans based on payment method and currency,
 * with automatic failover if primary provider is unavailable.
 *
 * Requires authenticated user with tenant access.
 * Tenant ID is extracted from the x-tenant-id header (set by middleware).
 *
 * Requirements: 33.1, 33.2, 33.3, 33.9
 */

import { NextRequest } from 'next/server';
import {
  initiatePayment,
  PaymentError,
  type InitiatePaymentRequest,
} from '@/modules/payments';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return Response.json(
        { error: 'Missing tenant context' },
        { status: 400 }
      );
    }

    const actorUserId = request.headers.get('x-user-id') ?? 'system';
    const actorRole = request.headers.get('x-user-role') ?? 'Guest';

    const body = (await request.json()) as InitiatePaymentRequest;

    const result = await initiatePayment(tenantId, body, actorUserId, actorRole);

    return Response.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentError) {
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

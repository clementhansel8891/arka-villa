/**
 * POST /api/v1/payments/webhook — Handle payment provider webhooks.
 *
 * Receives webhook notifications from Stripe and Midtrans,
 * verifies signatures, and updates payment status accordingly.
 *
 * The provider is determined from the x-provider header or
 * inferred from the request signature format.
 *
 * This endpoint does NOT require authentication — webhook
 * verification is done via provider-specific signature validation.
 *
 * Requirements: 33.4, 33.5
 */

import { NextRequest } from 'next/server';
import { processWebhook, PaymentError } from '@/modules/payments';

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const payload = await request.text();

    // Determine provider from header or signature format
    const providerHeader = request.headers.get('x-provider');
    const stripeSignature = request.headers.get('stripe-signature');
    const signature = stripeSignature ?? request.headers.get('x-webhook-signature') ?? '';

    let providerName: string;
    if (providerHeader) {
      providerName = providerHeader;
    } else if (stripeSignature) {
      providerName = 'stripe';
    } else {
      // Default to midtrans if no stripe signature present
      providerName = 'midtrans';
    }

    const result = await processWebhook(providerName, payload, signature);

    if (result.processed) {
      return Response.json(
        { status: 'ok', paymentId: result.paymentId },
        { status: 200 }
      );
    }

    // Acknowledge even if not processed (provider expects 200)
    return Response.json(
      { status: 'acknowledged' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof PaymentError) {
      // For invalid signatures, return 401
      if (error.code === 'VALIDATION_ERROR' && error.statusCode === 401) {
        return Response.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }

      return Response.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    // Webhooks should generally return 200 to avoid provider retries
    // unless it's a clear authentication failure
    return Response.json(
      { error: 'Webhook processing error' },
      { status: 500 }
    );
  }
}

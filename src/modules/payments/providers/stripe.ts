/**
 * Stripe payment provider adapter.
 *
 * Handles international card payments, refunds, webhook verification,
 * and settlement fetching for reconciliation.
 *
 * Security: Never stores raw card data — relies on Stripe tokenization.
 *
 * Requirements: 33.1, 33.2, 33.3, 33.5, 33.6, 33.9
 */

import { createHmac, timingSafeEqual } from 'crypto';

import type {
  PaymentProviderAdapter,
  PaymentMethod,
  Currency,
  ProviderChargeRequest,
  ProviderChargeResponse,
  ProviderRefundRequest,
  ProviderRefundResponse,
  ProviderWebhookEvent,
  ProviderSettlement,
} from '../types';

// ─── Configuration ────────────────────────────────────────────────────────────

const STRIPE_API_BASE = process.env.STRIPE_API_BASE ?? 'https://api.stripe.com/v1';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';

// ─── Stripe Provider ──────────────────────────────────────────────────────────

export const stripeProvider: PaymentProviderAdapter = {
  name: 'stripe',

  supportedMethods: [
    'credit_card',
    'debit_card',
    'bank_transfer',
    'e_wallet',
  ],

  supportedCurrencies: ['USD', 'EUR', 'GBP', 'AUD', 'SGD', 'IDR'],

  async charge(request: ProviderChargeRequest): Promise<ProviderChargeResponse> {
    const body = new URLSearchParams({
      amount: Math.round(request.amount * 100).toString(), // Stripe uses cents
      currency: request.currency.toLowerCase(),
      description: request.description,
      'metadata[paymentId]': request.paymentId,
      'metadata[guestEmail]': request.guestEmail,
      'metadata[guestName]': request.guestName,
      payment_method_types: mapPaymentMethodToStripe(request.paymentMethod),
    });

    const response = await fetch(`${STRIPE_API_BASE}/payment_intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Stripe charge failed: ${error?.error?.message ?? response.statusText}`
      );
    }

    const data = await response.json();

    return {
      providerTransactionId: data.id,
      status: mapStripeStatus(data.status),
      clientSecret: data.client_secret ?? undefined,
      providerToken: data.id,
    };
  },

  async refund(request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
    const body = new URLSearchParams({
      payment_intent: request.providerTransactionId,
      amount: Math.round(request.amount * 100).toString(),
      reason: mapRefundReason(request.reason),
    });

    const response = await fetch(`${STRIPE_API_BASE}/refunds`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Stripe refund failed: ${error?.error?.message ?? response.statusText}`
      );
    }

    const data = await response.json();

    return {
      refundId: data.id,
      status: data.status === 'succeeded' ? 'succeeded' : 'pending',
      amount: data.amount / 100,
    };
  },

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!STRIPE_WEBHOOK_SECRET) return false;

    try {
      // Stripe signature format: t=timestamp,v1=signature
      const parts = signature.split(',');
      const timestampPart = parts.find(p => p.startsWith('t='));
      const sigPart = parts.find(p => p.startsWith('v1='));

      if (!timestampPart || !sigPart) return false;

      const timestamp = timestampPart.slice(2);
      const expectedSig = sigPart.slice(3);

      // Check timestamp tolerance (5 min)
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp, 10)) > 300) return false;

      const signedPayload = `${timestamp}.${payload}`;
      const computedSig = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      return timingSafeEqual(
        Buffer.from(computedSig),
        Buffer.from(expectedSig)
      );
    } catch {
      return false;
    }
  },

  parseWebhook(payload: string): ProviderWebhookEvent {
    const event = JSON.parse(payload);
    const object = event.data?.object ?? {};

    return {
      type: mapStripeEventType(event.type),
      providerTransactionId: object.payment_intent ?? object.id ?? '',
      amount: (object.amount ?? object.amount_received ?? 0) / 100,
      currency: (object.currency ?? 'usd').toUpperCase() as Currency,
      metadata: object.metadata ?? {},
      rawEvent: event,
    };
  },

  async fetchSettlements(date: string): Promise<ProviderSettlement[]> {
    // Fetch balance transactions for the given date from Stripe
    const startOfDay = new Date(`${date}T00:00:00Z`).getTime() / 1000;
    const endOfDay = new Date(`${date}T23:59:59Z`).getTime() / 1000;

    const params = new URLSearchParams({
      created_gte: Math.floor(startOfDay).toString(),
      created_lte: Math.floor(endOfDay).toString(),
      type: 'charge',
      limit: '100',
    });

    const response = await fetch(
      `${STRIPE_API_BASE}/balance_transactions?${params.toString()}`,
      {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();

    return (data.data ?? []).map((txn: Record<string, unknown>) => ({
      transactionId: txn.source as string,
      amount: (txn.amount as number) / 100,
      currency: ((txn.currency as string) ?? 'usd').toUpperCase() as Currency,
      settledAt: new Date((txn.created as number) * 1000).toISOString(),
      status: txn.status === 'available' ? 'settled' as const : 'pending' as const,
    }));
  },

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${STRIPE_API_BASE}/balance`, {
        headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapPaymentMethodToStripe(method: PaymentMethod): string {
  switch (method) {
    case 'credit_card':
    case 'debit_card':
      return 'card';
    case 'bank_transfer':
      return 'customer_balance';
    case 'e_wallet':
      return 'link';
    default:
      return 'card';
  }
}

function mapStripeStatus(status: string): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (status) {
    case 'succeeded':
      return 'completed';
    case 'requires_payment_method':
    case 'requires_confirmation':
    case 'requires_action':
      return 'pending';
    case 'processing':
      return 'processing';
    case 'canceled':
      return 'failed';
    default:
      return 'pending';
  }
}

function mapStripeEventType(type: string): ProviderWebhookEvent['type'] {
  switch (type) {
    case 'payment_intent.succeeded':
    case 'charge.succeeded':
      return 'payment.completed';
    case 'payment_intent.payment_failed':
    case 'charge.failed':
      return 'payment.failed';
    case 'payment_intent.canceled':
      return 'payment.expired';
    case 'charge.refunded':
    case 'refund.updated':
      return 'refund.completed';
    default:
      return 'payment.failed';
  }
}

function mapRefundReason(reason: string): string {
  // Stripe accepts: duplicate, fraudulent, requested_by_customer
  if (reason.toLowerCase().includes('duplicate')) return 'duplicate';
  if (reason.toLowerCase().includes('fraud')) return 'fraudulent';
  return 'requested_by_customer';
}

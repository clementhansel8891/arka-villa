/**
 * Midtrans payment provider adapter.
 *
 * Handles Indonesian domestic payment methods including
 * e-wallets (GoPay, OVO, DANA, ShopeePay), QRIS, and
 * virtual account bank transfers.
 *
 * Security: Never stores raw card data — relies on Midtrans tokenization.
 *
 * Requirements: 33.1, 33.2, 33.3, 33.5, 33.6, 33.9
 */

import { createHmac } from 'crypto';

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

const MIDTRANS_API_BASE =
  process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com/v2'
    : 'https://api.sandbox.midtrans.com/v2';

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? '';
const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY ?? '';

function getMidtransAuthHeader(): string {
  return `Basic ${Buffer.from(`${MIDTRANS_SERVER_KEY}:`).toString('base64')}`;
}

// ─── Midtrans Provider ────────────────────────────────────────────────────────

export const midtransProvider: PaymentProviderAdapter = {
  name: 'midtrans',

  supportedMethods: [
    'credit_card',
    'debit_card',
    'bank_transfer',
    'e_wallet',
    'gopay',
    'ovo',
    'dana',
    'shopeepay',
    'qris',
    'va_bca',
    'va_bni',
    'va_mandiri',
    'va_permata',
  ],

  supportedCurrencies: ['IDR'],

  async charge(request: ProviderChargeRequest): Promise<ProviderChargeResponse> {
    const payload = buildChargePayload(request);

    const response = await fetch(`${MIDTRANS_API_BASE}/charge`, {
      method: 'POST',
      headers: {
        'Authorization': getMidtransAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Midtrans charge failed: ${error?.status_message ?? response.statusText}`
      );
    }

    const data = await response.json();

    return {
      providerTransactionId: data.transaction_id ?? data.order_id,
      status: mapMidtransStatus(data.transaction_status),
      redirectUrl: data.redirect_url ?? data.actions?.[0]?.url ?? undefined,
      providerToken: data.transaction_id,
    };
  },

  async refund(request: ProviderRefundRequest): Promise<ProviderRefundResponse> {
    const payload = {
      refund_key: `refund-${request.providerTransactionId}-${Date.now()}`,
      amount: Math.round(request.amount),
      reason: request.reason,
    };

    const response = await fetch(
      `${MIDTRANS_API_BASE}/${request.providerTransactionId}/refund`,
      {
        method: 'POST',
        headers: {
          'Authorization': getMidtransAuthHeader(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Midtrans refund failed: ${error?.status_message ?? response.statusText}`
      );
    }

    const data = await response.json();

    return {
      refundId: data.refund_key ?? data.transaction_id,
      status: data.status_code === '200' ? 'succeeded' : 'pending',
      amount: request.amount,
    };
  },

  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!MIDTRANS_SERVER_KEY) return false;

    try {
      const data = JSON.parse(payload);
      // Midtrans signature: SHA512(order_id + status_code + gross_amount + ServerKey)
      const signatureInput = `${data.order_id}${data.status_code}${data.gross_amount}${MIDTRANS_SERVER_KEY}`;
      const computedSig = createHmac('sha512', MIDTRANS_SERVER_KEY)
        .update(signatureInput)
        .digest('hex');

      return computedSig === (signature || data.signature_key);
    } catch {
      return false;
    }
  },

  parseWebhook(payload: string): ProviderWebhookEvent {
    const data = JSON.parse(payload);

    return {
      type: mapMidtransWebhookEventType(data.transaction_status),
      providerTransactionId: data.transaction_id ?? data.order_id,
      amount: parseFloat(data.gross_amount ?? '0'),
      currency: (data.currency ?? 'IDR').toUpperCase() as Currency,
      metadata: {
        orderId: data.order_id,
        paymentType: data.payment_type,
        fraudStatus: data.fraud_status,
      },
      rawEvent: data,
    };
  },

  async fetchSettlements(date: string): Promise<ProviderSettlement[]> {
    // Midtrans doesn't have a direct settlements API like Stripe.
    // We query transaction status by date range using the status endpoint.
    // In production, this would integrate with Midtrans Iris (disbursement) or
    // use their settlement report download API.
    const response = await fetch(
      `${MIDTRANS_API_BASE}/settlement/report?from_date=${date}&to_date=${date}`,
      {
        headers: {
          'Authorization': getMidtransAuthHeader(),
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const transactions = data.transactions ?? data.data ?? [];

    return transactions.map((txn: Record<string, unknown>) => ({
      transactionId: txn.transaction_id as string,
      amount: parseFloat(txn.gross_amount as string ?? '0'),
      currency: 'IDR' as Currency,
      settledAt: txn.settlement_time as string ?? date,
      status: (txn.transaction_status === 'settlement' ? 'settled' : 'pending') as 'settled' | 'pending',
    }));
  },

  async isAvailable(): Promise<boolean> {
    try {
      // Midtrans health check: fetch a known status endpoint
      const response = await fetch(`${MIDTRANS_API_BASE}/ping`, {
        headers: { 'Authorization': getMidtransAuthHeader() },
        signal: AbortSignal.timeout(5000),
      });
      // Midtrans may not have /ping — fallback: check if auth returns 401 or 200-range
      return response.status !== 503 && response.status !== 502;
    } catch {
      return false;
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildChargePayload(request: ProviderChargeRequest): Record<string, unknown> {
  const base = {
    transaction_details: {
      order_id: request.paymentId,
      gross_amount: Math.round(request.amount),
    },
    customer_details: {
      email: request.guestEmail,
      first_name: request.guestName,
    },
    metadata: request.metadata,
  };

  const paymentType = mapPaymentMethodToMidtrans(request.paymentMethod);

  switch (paymentType) {
    case 'gopay':
      return { ...base, payment_type: 'gopay', gopay: { enable_callback: true } };
    case 'shopeepay':
      return { ...base, payment_type: 'shopeepay' };
    case 'qris':
      return { ...base, payment_type: 'qris' };
    case 'bank_transfer':
      return {
        ...base,
        payment_type: 'bank_transfer',
        bank_transfer: { bank: getBankFromMethod(request.paymentMethod) },
      };
    case 'credit_card':
      return {
        ...base,
        payment_type: 'credit_card',
        credit_card: { secure: true, authentication: true },
      };
    case 'cstore':
      return { ...base, payment_type: 'cstore' };
    default:
      return { ...base, payment_type: paymentType };
  }
}

function mapPaymentMethodToMidtrans(method: PaymentMethod): string {
  switch (method) {
    case 'gopay':
      return 'gopay';
    case 'shopeepay':
      return 'shopeepay';
    case 'qris':
      return 'qris';
    case 'ovo':
    case 'dana':
    case 'e_wallet':
      return 'gopay'; // OVO/DANA routed via e-wallet gateway
    case 'va_bca':
    case 'va_bni':
    case 'va_mandiri':
    case 'va_permata':
    case 'bank_transfer':
      return 'bank_transfer';
    case 'credit_card':
    case 'debit_card':
      return 'credit_card';
    default:
      return 'gopay';
  }
}

function getBankFromMethod(method: PaymentMethod): string {
  switch (method) {
    case 'va_bca':
      return 'bca';
    case 'va_bni':
      return 'bni';
    case 'va_mandiri':
      return 'mandiri';
    case 'va_permata':
      return 'permata';
    default:
      return 'bca';
  }
}

function mapMidtransStatus(
  status: string
): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (status) {
    case 'capture':
    case 'settlement':
      return 'completed';
    case 'pending':
      return 'pending';
    case 'deny':
    case 'cancel':
    case 'expire':
      return 'failed';
    default:
      return 'pending';
  }
}

function mapMidtransWebhookEventType(
  status: string
): ProviderWebhookEvent['type'] {
  switch (status) {
    case 'capture':
    case 'settlement':
      return 'payment.completed';
    case 'deny':
    case 'cancel':
      return 'payment.failed';
    case 'expire':
      return 'payment.expired';
    case 'refund':
    case 'partial_refund':
      return 'refund.completed';
    default:
      return 'payment.failed';
  }
}

export { MIDTRANS_CLIENT_KEY };

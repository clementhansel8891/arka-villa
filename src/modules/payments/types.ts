/**
 * Payments module types
 *
 * Type definitions for payment processing, provider abstraction,
 * webhook handling, refunds, reconciliation, and receipt generation.
 *
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7, 33.8, 33.9
 */

// ─── Core Enums / Unions ──────────────────────────────────────────────────────

export type PaymentProvider = 'stripe' | 'midtrans';

export type PaymentLifecycleStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'bank_transfer'
  | 'e_wallet'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'shopeepay'
  | 'qris'
  | 'va_bca'
  | 'va_bni'
  | 'va_mandiri'
  | 'va_permata';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'IDR' | 'AUD' | 'SGD';

// ─── Payment Intent ───────────────────────────────────────────────────────────

export interface PaymentIntent {
  id: string;
  bookingId: string;
  tenantId: string;
  provider: PaymentProvider;
  amount: number;
  currency: Currency;
  status: PaymentLifecycleStatus;
  paymentMethod: PaymentMethod;
  providerTransactionId: string | null;
  providerToken: string | null;
  failureReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Initiation ───────────────────────────────────────────────────────────────

export interface InitiatePaymentRequest {
  bookingId: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  guestEmail: string;
  guestName: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  provider: PaymentProvider;
  status: PaymentLifecycleStatus;
  clientSecret?: string;
  redirectUrl?: string;
  expiresAt?: string;
}

// ─── Provider Interface ───────────────────────────────────────────────────────

export interface ProviderChargeRequest {
  paymentId: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  guestEmail: string;
  guestName: string;
  description: string;
  metadata: Record<string, unknown>;
}

export interface ProviderChargeResponse {
  providerTransactionId: string;
  status: PaymentLifecycleStatus;
  clientSecret?: string;
  redirectUrl?: string;
  providerToken?: string;
}

export interface ProviderRefundRequest {
  providerTransactionId: string;
  amount: number;
  currency: Currency;
  reason: string;
}

export interface ProviderRefundResponse {
  refundId: string;
  status: 'succeeded' | 'pending' | 'failed';
  amount: number;
}

export interface ProviderSettlement {
  transactionId: string;
  amount: number;
  currency: Currency;
  settledAt: string;
  status: 'settled' | 'pending' | 'disputed';
}

export interface PaymentProviderAdapter {
  readonly name: PaymentProvider;

  /** Supported payment methods for this provider */
  readonly supportedMethods: PaymentMethod[];

  /** Supported currencies for this provider */
  readonly supportedCurrencies: Currency[];

  /** Initiate a charge through the provider */
  charge(request: ProviderChargeRequest): Promise<ProviderChargeResponse>;

  /** Process a refund through the provider */
  refund(request: ProviderRefundRequest): Promise<ProviderRefundResponse>;

  /** Verify webhook signature */
  verifyWebhookSignature(payload: string, signature: string): boolean;

  /** Parse webhook payload into a normalized event */
  parseWebhook(payload: string): ProviderWebhookEvent;

  /** Fetch settlement data for reconciliation */
  fetchSettlements(date: string): Promise<ProviderSettlement[]>;

  /** Check provider health / availability */
  isAvailable(): Promise<boolean>;
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'payment.expired'
  | 'refund.completed'
  | 'refund.failed';

export interface ProviderWebhookEvent {
  type: WebhookEventType;
  providerTransactionId: string;
  amount: number;
  currency: Currency;
  metadata: Record<string, unknown>;
  rawEvent: unknown;
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  initiatedBy: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed';
  provider: PaymentProvider;
  processedAt: string;
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export interface ReconciliationResult {
  date: string;
  provider: PaymentProvider;
  platformTotal: number;
  providerTotal: number;
  discrepancy: number;
  discrepancyPercent: number;
  flagged: boolean;
  mismatches: ReconciliationMismatch[];
}

export interface ReconciliationMismatch {
  transactionId: string;
  platformAmount: number;
  providerAmount: number;
  difference: number;
}

// ─── Receipt ──────────────────────────────────────────────────────────────────

export interface ReceiptData {
  paymentId: string;
  bookingId: string;
  guestName: string;
  guestEmail: string;
  villaName: string;
  amount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  transactionId: string;
  paidAt: string;
  description: string;
}

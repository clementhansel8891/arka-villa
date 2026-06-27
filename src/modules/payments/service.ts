/**
 * Payments service — business logic orchestration.
 *
 * Coordinates payment initiation, webhook processing,
 * refund management, and daily reconciliation.
 *
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7, 33.8, 33.9
 */

import { v4 as uuidv4 } from 'uuid';

import { EventBus } from '@/lib/events/event-bus';
import { STREAMS } from '@/lib/events/streams';
import type { PlatformEvent } from '@/lib/events/types';
import { createRedisClient } from '@/lib/db/redis';
import { tenantQuery } from '@/lib/db/tenant-query';

import type {
  PaymentIntent,
  PaymentLifecycleStatus,
  PaymentProvider,
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  RefundRequest,
  RefundResult,
  ReconciliationResult,
  ReconciliationMismatch,
  ProviderWebhookEvent,
  ReceiptData,
} from './types';
import {
  selectProviderWithFailover,
  getProvider,
  getAllProviders,
  PaymentProviderError,
} from './providers';
import { generateReceiptPdf } from './receipt-generator';

// ─── Error Classes ────────────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_ERROR'
      | 'PROVIDER_ERROR'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION'
      | 'RECONCILIATION_ERROR'
      | 'INTERNAL_ERROR',
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// ─── Event Emission ───────────────────────────────────────────────────────────

let eventBusInstance: EventBus | null = null;

async function getEventBus(): Promise<EventBus> {
  if (!eventBusInstance) {
    const publisher = createRedisClient();
    const subscriber = createRedisClient();
    eventBusInstance = new EventBus({ publisher, subscriber });
  }
  return eventBusInstance;
}

async function emitPaymentEvent<T>(
  type: string,
  tenantId: string,
  payload: T,
  actorUserId: string,
  actorRole: string,
  correlationId?: string
): Promise<void> {
  try {
    const eventBus = await getEventBus();

    const event: PlatformEvent<T> = {
      id: uuidv4(),
      type,
      version: 1,
      timestamp: new Date().toISOString(),
      source: 'payments',
      tenantId,
      correlationId: correlationId ?? uuidv4(),
      actor: { userId: actorUserId, role: actorRole },
      payload,
      metadata: { retryCount: 0, maxRetries: 3, priority: 'normal' },
    };

    await eventBus.emit(STREAMS.PAYMENTS, event);
  } catch {
    console.error(`[Payments] Failed to emit event: ${type}`);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateInitiateRequest(body: InitiatePaymentRequest): string[] {
  const errors: string[] = [];

  if (!body.bookingId) errors.push('bookingId is required');
  if (!body.amount || body.amount <= 0) errors.push('amount must be positive');
  if (!body.currency) errors.push('currency is required');
  if (!body.paymentMethod) errors.push('paymentMethod is required');
  if (!body.guestEmail) errors.push('guestEmail is required');
  if (!body.guestName) errors.push('guestName is required');

  return errors;
}

// ─── Valid Status Transitions ─────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<PaymentLifecycleStatus, PaymentLifecycleStatus[]> = {
  pending: ['processing', 'failed'],
  processing: ['completed', 'failed'],
  completed: ['refunded', 'partially_refunded'],
  failed: ['pending'], // Allow retry
  refunded: [],
  partially_refunded: ['refunded', 'partially_refunded'],
};

function isValidTransition(
  from: PaymentLifecycleStatus,
  to: PaymentLifecycleStatus
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Service Functions ────────────────────────────────────────────────────────

/**
 * Initiate a payment.
 *
 * Flow:
 * 1. Validate request
 * 2. Select provider with failover
 * 3. Create payment record (pending)
 * 4. Charge via provider
 * 5. Update payment record with provider response
 * 6. Emit payment.initiated event
 *
 * Security: No raw card data is handled — provider tokenization only.
 *
 * Requirements: 33.1, 33.2, 33.3, 33.4, 33.9
 */
export async function initiatePayment(
  tenantId: string,
  request: InitiatePaymentRequest,
  actorUserId: string,
  actorRole: string
): Promise<InitiatePaymentResponse> {
  // 1. Validate
  const errors = validateInitiateRequest(request);
  if (errors.length > 0) {
    throw new PaymentError(
      `Validation failed: ${errors.join(', ')}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // 2. Select provider with failover
  let provider;
  try {
    provider = await selectProviderWithFailover(
      request.paymentMethod,
      request.currency
    );
  } catch (error) {
    if (error instanceof PaymentProviderError) {
      throw new PaymentError(
        error.message,
        'PROVIDER_ERROR',
        503
      );
    }
    throw error;
  }

  // 3. Create payment record in pending state
  const paymentId = uuidv4();
  await createPaymentRecord(tenantId, {
    id: paymentId,
    bookingId: request.bookingId,
    tenantId,
    provider: provider.name,
    amount: request.amount,
    currency: request.currency,
    status: 'pending',
    paymentMethod: request.paymentMethod,
    providerTransactionId: null,
    providerToken: null,
    failureReason: null,
    metadata: request.metadata ?? {},
  });

  // 4. Charge via provider
  let chargeResponse;
  try {
    chargeResponse = await provider.charge({
      paymentId,
      amount: request.amount,
      currency: request.currency,
      paymentMethod: request.paymentMethod,
      guestEmail: request.guestEmail,
      guestName: request.guestName,
      description: request.description ?? `Payment for booking ${request.bookingId}`,
      metadata: { bookingId: request.bookingId, tenantId, ...request.metadata },
    });
  } catch (error) {
    // Update payment as failed
    await updatePaymentStatus(tenantId, paymentId, 'failed', {
      failureReason: error instanceof Error ? error.message : 'Provider charge failed',
    });

    throw new PaymentError(
      'Payment processing failed. Please try again or use a different payment method.',
      'PROVIDER_ERROR',
      502
    );
  }

  // 5. Update payment record
  const newStatus = chargeResponse.status;
  await updatePaymentStatus(tenantId, paymentId, newStatus, {
    providerTransactionId: chargeResponse.providerTransactionId,
    providerToken: chargeResponse.providerToken ?? null,
  });

  // 6. Emit event
  await emitPaymentEvent(
    'payment.initiated',
    tenantId,
    {
      paymentId,
      bookingId: request.bookingId,
      provider: provider.name,
      amount: request.amount,
      currency: request.currency,
      status: newStatus,
    },
    actorUserId,
    actorRole,
    paymentId
  );

  return {
    paymentId,
    provider: provider.name,
    status: newStatus,
    clientSecret: chargeResponse.clientSecret,
    redirectUrl: chargeResponse.redirectUrl,
  };
}

/**
 * Process a webhook from a payment provider.
 *
 * Flow:
 * 1. Identify provider from headers/payload
 * 2. Verify webhook signature
 * 3. Parse webhook event
 * 4. Look up payment record by provider transaction ID
 * 5. Apply status transition
 * 6. Emit appropriate event
 *
 * Requirements: 33.4, 33.5
 */
export async function processWebhook(
  providerName: string,
  payload: string,
  signature: string
): Promise<{ processed: boolean; paymentId?: string }> {
  const provider = getProvider(providerName);
  if (!provider) {
    throw new PaymentError(
      `Unknown provider: ${providerName}`,
      'VALIDATION_ERROR',
      400
    );
  }

  // Verify signature
  const isValid = provider.verifyWebhookSignature(payload, signature);
  if (!isValid) {
    throw new PaymentError(
      'Invalid webhook signature',
      'VALIDATION_ERROR',
      401
    );
  }

  // Parse the webhook
  const webhookEvent: ProviderWebhookEvent = provider.parseWebhook(payload);

  // Look up payment by provider transaction ID
  const payment = await findPaymentByProviderTransaction(
    webhookEvent.providerTransactionId
  );

  if (!payment) {
    // Could be a webhook for a transaction we don't track — acknowledge it
    return { processed: false };
  }

  // Map webhook event to new status
  const newStatus = mapWebhookEventToStatus(webhookEvent, payment);
  if (!newStatus || newStatus === payment.status) {
    return { processed: true, paymentId: payment.id };
  }

  // Validate transition
  if (!isValidTransition(payment.status, newStatus)) {
    console.error(
      `[Payments] Invalid transition: ${payment.status} → ${newStatus} for payment ${payment.id}`
    );
    return { processed: false, paymentId: payment.id };
  }

  // Apply status update
  const updateFields: Record<string, unknown> = {};
  if (newStatus === 'failed') {
    updateFields.failureReason = extractFailureReason(webhookEvent);
  }

  await updatePaymentStatus(payment.tenantId, payment.id, newStatus, updateFields);

  // Emit event
  const eventType =
    newStatus === 'completed'
      ? 'payment.completed'
      : newStatus === 'failed'
        ? 'payment.failed'
        : newStatus === 'refunded' || newStatus === 'partially_refunded'
          ? 'payment.refunded'
          : 'payment.initiated';

  await emitPaymentEvent(
    eventType,
    payment.tenantId,
    {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: newStatus,
    },
    'system',
    'system',
    payment.id
  );

  return { processed: true, paymentId: payment.id };
}

/**
 * Process a refund (full or partial).
 *
 * Only Agency_Admin can initiate refunds.
 *
 * Requirements: 33.6
 */
export async function processRefund(
  tenantId: string,
  request: RefundRequest,
  actorUserId: string,
  actorRole: string
): Promise<RefundResult> {
  // Validate
  if (!request.paymentId) {
    throw new PaymentError('paymentId is required', 'VALIDATION_ERROR', 400);
  }
  if (!request.amount || request.amount <= 0) {
    throw new PaymentError('Refund amount must be positive', 'VALIDATION_ERROR', 400);
  }
  if (!request.reason) {
    throw new PaymentError('Refund reason is required', 'VALIDATION_ERROR', 400);
  }

  // Fetch payment
  const payment = await getPaymentById(tenantId, request.paymentId);
  if (!payment) {
    throw new PaymentError(
      `Payment not found: ${request.paymentId}`,
      'NOT_FOUND',
      404
    );
  }

  // Validate refund eligibility
  if (payment.status !== 'completed' && payment.status !== 'partially_refunded') {
    throw new PaymentError(
      `Cannot refund a payment with status: ${payment.status}`,
      'INVALID_TRANSITION',
      400
    );
  }

  if (request.amount > payment.amount) {
    throw new PaymentError(
      'Refund amount exceeds payment amount',
      'VALIDATION_ERROR',
      400
    );
  }

  if (!payment.providerTransactionId) {
    throw new PaymentError(
      'Payment has no provider transaction — cannot refund',
      'INTERNAL_ERROR',
      500
    );
  }

  // Process refund through provider
  const provider = getProvider(payment.provider);
  if (!provider) {
    throw new PaymentError(
      `Provider not available: ${payment.provider}`,
      'PROVIDER_ERROR',
      503
    );
  }

  let refundResponse;
  try {
    refundResponse = await provider.refund({
      providerTransactionId: payment.providerTransactionId,
      amount: request.amount,
      currency: payment.currency,
      reason: request.reason,
    });
  } catch (error) {
    throw new PaymentError(
      `Refund processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PROVIDER_ERROR',
      502
    );
  }

  // Determine new status
  const isFullRefund = request.amount >= payment.amount;
  const newStatus: PaymentLifecycleStatus = isFullRefund
    ? 'refunded'
    : 'partially_refunded';

  await updatePaymentStatus(tenantId, payment.id, newStatus, {});

  // Emit refund event
  await emitPaymentEvent(
    'payment.refunded',
    tenantId,
    {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      refundId: refundResponse.refundId,
      refundAmount: request.amount,
      isFullRefund,
      reason: request.reason,
    },
    actorUserId,
    actorRole,
    payment.id
  );

  return {
    refundId: refundResponse.refundId,
    paymentId: payment.id,
    amount: refundResponse.amount,
    status: refundResponse.status,
    provider: payment.provider,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Run daily reconciliation across all providers.
 *
 * Compares platform payment records against provider settlement
 * reports and flags discrepancies exceeding 0.5%.
 *
 * Requirements: 33.8
 */
export async function runReconciliation(
  date: string,
  tenantId?: string
): Promise<ReconciliationResult[]> {
  const results: ReconciliationResult[] = [];
  const providers = getAllProviders();

  for (const provider of providers) {
    try {
      // Fetch settlements from provider
      const settlements = await provider.fetchSettlements(date);
      if (settlements.length === 0) continue;

      // Fetch our platform records for the same date and provider
      const platformPayments = await getPlatformPaymentsForDate(
        date,
        provider.name,
        tenantId
      );

      // Calculate totals
      const providerTotal = settlements.reduce((sum, s) => sum + s.amount, 0);
      const platformTotal = platformPayments.reduce((sum, p) => sum + p.amount, 0);

      // Find mismatches
      const mismatches: ReconciliationMismatch[] = [];
      for (const settlement of settlements) {
        const match = platformPayments.find(
          (p) => p.providerTransactionId === settlement.transactionId
        );
        if (match && Math.abs(match.amount - settlement.amount) > 0.01) {
          mismatches.push({
            transactionId: settlement.transactionId,
            platformAmount: match.amount,
            providerAmount: settlement.amount,
            difference: Math.abs(match.amount - settlement.amount),
          });
        }
      }

      // Calculate discrepancy
      const discrepancy = Math.abs(platformTotal - providerTotal);
      const discrepancyPercent =
        platformTotal > 0 ? (discrepancy / platformTotal) * 100 : 0;
      const flagged = discrepancyPercent > 0.5;

      results.push({
        date,
        provider: provider.name,
        platformTotal,
        providerTotal,
        discrepancy,
        discrepancyPercent,
        flagged,
        mismatches,
      });

      // If flagged, emit alert event
      if (flagged) {
        await emitPaymentEvent(
          'payment.settlement_received',
          tenantId ?? 'platform',
          {
            date,
            provider: provider.name,
            discrepancyPercent,
            flagged: true,
          },
          'system',
          'system'
        );
      }
    } catch (error) {
      results.push({
        date,
        provider: provider.name,
        platformTotal: 0,
        providerTotal: 0,
        discrepancy: 0,
        discrepancyPercent: 0,
        flagged: false,
        mismatches: [],
      });
      console.error(
        `[Payments] Reconciliation failed for ${provider.name}: ${error}`
      );
    }
  }

  return results;
}

/**
 * Generate a PDF receipt for a completed payment.
 *
 * Requirements: 33.7
 */
export async function generateReceipt(
  tenantId: string,
  paymentId: string
): Promise<Buffer> {
  const payment = await getPaymentById(tenantId, paymentId);
  if (!payment) {
    throw new PaymentError(`Payment not found: ${paymentId}`, 'NOT_FOUND', 404);
  }

  if (payment.status !== 'completed' && payment.status !== 'refunded' && payment.status !== 'partially_refunded') {
    throw new PaymentError(
      'Receipt can only be generated for completed payments',
      'INVALID_TRANSITION',
      400
    );
  }

  const receiptData: ReceiptData = {
    paymentId: payment.id,
    bookingId: payment.bookingId,
    guestName: (payment.metadata?.guestName as string) ?? 'Guest',
    guestEmail: (payment.metadata?.guestEmail as string) ?? '',
    villaName: (payment.metadata?.villaName as string) ?? 'Villa',
    amount: payment.amount,
    currency: payment.currency,
    paymentMethod: payment.paymentMethod,
    provider: payment.provider,
    transactionId: payment.providerTransactionId ?? payment.id,
    paidAt: payment.updatedAt.toISOString(),
    description: (payment.metadata?.description as string) ?? `Booking ${payment.bookingId}`,
  };

  return generateReceiptPdf(receiptData);
}

/**
 * Get a payment by ID.
 */
export async function getPayment(
  tenantId: string,
  paymentId: string
): Promise<PaymentIntent> {
  const payment = await getPaymentById(tenantId, paymentId);
  if (!payment) {
    throw new PaymentError(`Payment not found: ${paymentId}`, 'NOT_FOUND', 404);
  }
  return payment;
}

// ─── Database Helpers ─────────────────────────────────────────────────────────

async function createPaymentRecord(
  tenantId: string,
  payment: Omit<PaymentIntent, 'createdAt' | 'updatedAt'>
): Promise<void> {
  await tenantQuery(
    tenantId,
    `INSERT INTO payments (
      id, booking_id, tenant_id, provider, amount, currency,
      status, payment_method, provider_transaction_id,
      provider_token, failure_reason, metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
    [
      payment.id,
      payment.bookingId,
      payment.tenantId,
      payment.provider,
      payment.amount,
      payment.currency,
      payment.status,
      payment.paymentMethod,
      payment.providerTransactionId,
      payment.providerToken,
      payment.failureReason,
      JSON.stringify(payment.metadata),
    ]
  );
}

async function updatePaymentStatus(
  tenantId: string,
  paymentId: string,
  status: PaymentLifecycleStatus,
  extra: Record<string, unknown>
): Promise<void> {
  const setClauses = ['status = $2', 'updated_at = NOW()'];
  const params: unknown[] = [paymentId, status];
  let paramIndex = 3;

  if (extra.providerTransactionId !== undefined) {
    setClauses.push(`provider_transaction_id = $${paramIndex}`);
    params.push(extra.providerTransactionId);
    paramIndex++;
  }
  if (extra.providerToken !== undefined) {
    setClauses.push(`provider_token = $${paramIndex}`);
    params.push(extra.providerToken);
    paramIndex++;
  }
  if (extra.failureReason !== undefined) {
    setClauses.push(`failure_reason = $${paramIndex}`);
    params.push(extra.failureReason);
    paramIndex++;
  }

  await tenantQuery(
    tenantId,
    `UPDATE payments SET ${setClauses.join(', ')} WHERE id = $1`,
    params
  );
}

async function getPaymentById(
  tenantId: string,
  paymentId: string
): Promise<PaymentIntent | null> {
  const result = await tenantQuery<{
    id: string;
    booking_id: string;
    tenant_id: string;
    provider: PaymentProvider;
    amount: string;
    currency: string;
    status: PaymentLifecycleStatus;
    payment_method: string;
    provider_transaction_id: string | null;
    provider_token: string | null;
    failure_reason: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
  }>(tenantId, 'SELECT * FROM payments WHERE id = $1', [paymentId]);

  const row = result.rows[0];
  if (!row) return null;

  return mapRowToPaymentIntent(row);
}

async function findPaymentByProviderTransaction(
  providerTransactionId: string
): Promise<PaymentIntent | null> {
  // Search across all tenants in the public payments table
  // In production, payments may also have a cross-tenant index
  const { publicQuery } = await import('@/lib/db/tenant-query');

  const result = await publicQuery<{
    id: string;
    booking_id: string;
    tenant_id: string;
    provider: PaymentProvider;
    amount: string;
    currency: string;
    status: PaymentLifecycleStatus;
    payment_method: string;
    provider_transaction_id: string | null;
    provider_token: string | null;
    failure_reason: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
  }>(
    'SELECT * FROM payments WHERE provider_transaction_id = $1 LIMIT 1',
    [providerTransactionId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return mapRowToPaymentIntent(row);
}

async function getPlatformPaymentsForDate(
  date: string,
  providerName: string,
  tenantId?: string
): Promise<PaymentIntent[]> {
  const { publicQuery } = await import('@/lib/db/tenant-query');

  let query =
    `SELECT * FROM payments WHERE provider = $1 AND status = 'completed' ` +
    `AND DATE(updated_at) = $2`;
  const params: unknown[] = [providerName, date];

  if (tenantId) {
    query += ' AND tenant_id = $3';
    params.push(tenantId);
  }

  const result = await publicQuery<{
    id: string;
    booking_id: string;
    tenant_id: string;
    provider: PaymentProvider;
    amount: string;
    currency: string;
    status: PaymentLifecycleStatus;
    payment_method: string;
    provider_transaction_id: string | null;
    provider_token: string | null;
    failure_reason: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
  }>(query, params);

  return result.rows.map(mapRowToPaymentIntent);
}

// ─── Row Mapping ──────────────────────────────────────────────────────────────

function mapRowToPaymentIntent(row: {
  id: string;
  booking_id: string;
  tenant_id: string;
  provider: PaymentProvider;
  amount: string;
  currency: string;
  status: PaymentLifecycleStatus;
  payment_method: string;
  provider_transaction_id: string | null;
  provider_token: string | null;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}): PaymentIntent {
  return {
    id: row.id,
    bookingId: row.booking_id,
    tenantId: row.tenant_id,
    provider: row.provider,
    amount: parseFloat(row.amount),
    currency: row.currency as PaymentIntent['currency'],
    status: row.status,
    paymentMethod: row.payment_method as PaymentIntent['paymentMethod'],
    providerTransactionId: row.provider_transaction_id,
    providerToken: row.provider_token,
    failureReason: row.failure_reason,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Webhook Event Mapping ────────────────────────────────────────────────────

function mapWebhookEventToStatus(
  event: ProviderWebhookEvent,
  payment: PaymentIntent
): PaymentLifecycleStatus | null {
  switch (event.type) {
    case 'payment.completed':
      return 'completed';
    case 'payment.failed':
    case 'payment.expired':
      return 'failed';
    case 'refund.completed':
      return event.amount >= payment.amount ? 'refunded' : 'partially_refunded';
    case 'refund.failed':
      return null; // No status change
    default:
      return null;
  }
}

function extractFailureReason(event: ProviderWebhookEvent): string {
  const raw = event.rawEvent as Record<string, unknown>;
  if (raw?.data && typeof raw.data === 'object') {
    const obj = (raw.data as Record<string, unknown>).object as Record<string, unknown> | undefined;
    if (obj?.last_payment_error && typeof obj.last_payment_error === 'object') {
      return (obj.last_payment_error as Record<string, unknown>).message as string ?? 'Payment failed';
    }
  }
  return 'Payment failed';
}



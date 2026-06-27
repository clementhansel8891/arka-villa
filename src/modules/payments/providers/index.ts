/**
 * Payment provider registry with failover support.
 *
 * Selects the appropriate provider based on payment method and currency,
 * with automatic failover to alternate provider if the primary is unavailable.
 *
 * Provider selection logic:
 * - Stripe: international cards, international currencies (USD, EUR, GBP, AUD, SGD)
 * - Midtrans: Indonesian payment methods (GoPay, OVO, DANA, ShopeePay, QRIS, VA), IDR currency
 *
 * Failover: if primary provider unavailable, attempt alternate for compatible methods.
 *
 * Requirements: 33.1, 33.2, 33.9
 */

import type {
  PaymentProviderAdapter,
  PaymentMethod,
  Currency,
} from '../types';
import { stripeProvider } from './stripe';
import { midtransProvider } from './midtrans';

// ─── Provider Registry ────────────────────────────────────────────────────────

const providers: Map<string, PaymentProviderAdapter> = new Map([
  ['stripe', stripeProvider],
  ['midtrans', midtransProvider],
]);

/**
 * Indonesian domestic payment methods that should route to Midtrans.
 */
const INDONESIAN_METHODS: PaymentMethod[] = [
  'gopay',
  'ovo',
  'dana',
  'shopeepay',
  'qris',
  'va_bca',
  'va_bni',
  'va_mandiri',
  'va_permata',
];

/**
 * Determine the primary provider for a given payment method and currency.
 *
 * Logic:
 * - Indonesian-specific methods → Midtrans
 * - IDR currency with generic methods → Midtrans
 * - International currencies → Stripe
 * - Default → Stripe
 */
export function selectPrimaryProvider(
  paymentMethod: PaymentMethod,
  currency: Currency
): PaymentProviderAdapter {
  // Indonesian-specific methods always go to Midtrans
  if (INDONESIAN_METHODS.includes(paymentMethod)) {
    return midtransProvider;
  }

  // IDR with generic methods (credit_card, bank_transfer, e_wallet) → Midtrans
  if (currency === 'IDR') {
    return midtransProvider;
  }

  // International currencies → Stripe
  return stripeProvider;
}

/**
 * Get the alternate provider for failover.
 *
 * Returns the opposite provider if the payment method is supported.
 * Returns null if no compatible failover exists.
 */
export function getFailoverProvider(
  primaryProvider: PaymentProviderAdapter,
  paymentMethod: PaymentMethod,
  currency: Currency
): PaymentProviderAdapter | null {
  const alternate =
    primaryProvider.name === 'stripe' ? midtransProvider : stripeProvider;

  // Check if alternate supports both the method and currency
  const supportsMethod = alternate.supportedMethods.includes(paymentMethod);
  const supportsCurrency = alternate.supportedCurrencies.includes(currency);

  if (supportsMethod && supportsCurrency) {
    return alternate;
  }

  return null;
}

/**
 * Select provider with failover capability.
 *
 * 1. Determine primary provider based on method/currency
 * 2. Check if primary is available
 * 3. If unavailable, attempt failover to alternate provider
 * 4. If no failover available, throw error
 *
 * Requirements: 33.9
 */
export async function selectProviderWithFailover(
  paymentMethod: PaymentMethod,
  currency: Currency
): Promise<PaymentProviderAdapter> {
  const primary = selectPrimaryProvider(paymentMethod, currency);

  // Check primary availability
  const primaryAvailable = await primary.isAvailable();
  if (primaryAvailable) {
    return primary;
  }

  // Try failover
  const alternate = getFailoverProvider(primary, paymentMethod, currency);
  if (alternate) {
    const alternateAvailable = await alternate.isAvailable();
    if (alternateAvailable) {
      return alternate;
    }
  }

  // No provider available
  throw new PaymentProviderError(
    `Payment provider unavailable. Primary: ${primary.name}, ` +
      `Failover: ${alternate?.name ?? 'none compatible'}. ` +
      `Please try again later.`,
    primary.name
  );
}

/**
 * Get a specific provider by name.
 */
export function getProvider(name: string): PaymentProviderAdapter | undefined {
  return providers.get(name);
}

/**
 * Get all registered providers.
 */
export function getAllProviders(): PaymentProviderAdapter[] {
  return Array.from(providers.values());
}

// ─── Error Class ──────────────────────────────────────────────────────────────

export class PaymentProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'PaymentProviderError';
  }
}

export { stripeProvider, midtransProvider };

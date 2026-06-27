/**
 * Email Delivery Tracker
 *
 * Tracks email delivery status (sent, delivered, bounced, opened),
 * handles bounce management with consecutive bounce counting,
 * and flags invalid email addresses after 3 consecutive bounces.
 *
 * Uses Redis for fast delivery status lookups and bounce counters.
 */

import { redis } from '@/lib/db';

/** Delivery statuses tracked by the system. */
export type DeliveryStatus = 'sent' | 'delivered' | 'bounced' | 'opened';

/** A delivery record for a single email send attempt. */
export interface DeliveryRecord {
  messageId: string;
  tenantId: string;
  recipientEmail: string;
  templateName: string;
  status: DeliveryStatus;
  sentAt: string;
  updatedAt: string;
  errorReason?: string;
  retryCount: number;
}

/** Result of checking whether an email is flagged as invalid. */
export interface EmailValidityCheck {
  email: string;
  isValid: boolean;
  consecutiveBounces: number;
  flaggedAt?: string;
}

/** Bounce threshold before flagging an email as invalid. */
const BOUNCE_THRESHOLD = 3;

/** Redis key prefixes for delivery tracking. */
const KEYS = {
  deliveryRecord: (messageId: string) => `email:delivery:${messageId}`,
  bounceCounter: (tenantId: string, email: string) =>
    `email:bounces:${tenantId}:${email}`,
  invalidFlag: (tenantId: string, email: string) =>
    `email:invalid:${tenantId}:${email}`,
  /** TTL for delivery records: 90 days */
  deliveryTtl: 90 * 24 * 60 * 60,
  /** TTL for bounce counters: 30 days (resets if no bounces in 30 days) */
  bounceTtl: 30 * 24 * 60 * 60,
} as const;

/**
 * Records that an email was sent successfully to the SMTP server.
 */
export async function recordSent(
  messageId: string,
  tenantId: string,
  recipientEmail: string,
  templateName: string,
): Promise<DeliveryRecord> {
  const now = new Date().toISOString();
  const record: DeliveryRecord = {
    messageId,
    tenantId,
    recipientEmail,
    templateName,
    status: 'sent',
    sentAt: now,
    updatedAt: now,
    retryCount: 0,
  };

  await redis.set(
    KEYS.deliveryRecord(messageId),
    JSON.stringify(record),
    'EX',
    KEYS.deliveryTtl,
  );

  return record;
}

/**
 * Updates the delivery status for a message.
 * Returns the updated record and whether the email was flagged as invalid.
 */
export async function updateDeliveryStatus(
  messageId: string,
  status: DeliveryStatus,
  errorReason?: string,
): Promise<{ record: DeliveryRecord | null; emailFlagged: boolean }> {
  const raw = await redis.get(KEYS.deliveryRecord(messageId));
  if (!raw) {
    return { record: null, emailFlagged: false };
  }

  const record: DeliveryRecord = JSON.parse(raw);
  record.status = status;
  record.updatedAt = new Date().toISOString();
  if (errorReason) {
    record.errorReason = errorReason;
  }

  await redis.set(
    KEYS.deliveryRecord(messageId),
    JSON.stringify(record),
    'EX',
    KEYS.deliveryTtl,
  );

  let emailFlagged = false;

  if (status === 'bounced') {
    emailFlagged = await incrementBounceCounter(
      record.tenantId,
      record.recipientEmail,
    );
  } else if (status === 'delivered' || status === 'opened') {
    // Successful delivery resets bounce counter
    await resetBounceCounter(record.tenantId, record.recipientEmail);
  }

  return { record, emailFlagged };
}

/**
 * Increments the consecutive bounce counter for an email address.
 * Returns true if the email was flagged as invalid (reached threshold).
 */
async function incrementBounceCounter(
  tenantId: string,
  email: string,
): Promise<boolean> {
  const key = KEYS.bounceCounter(tenantId, email);
  const count = await redis.incr(key);
  await redis.expire(key, KEYS.bounceTtl);

  if (count >= BOUNCE_THRESHOLD) {
    await flagEmailAsInvalid(tenantId, email);
    return true;
  }

  return false;
}

/**
 * Resets the consecutive bounce counter for an email (e.g., on successful delivery).
 */
async function resetBounceCounter(
  tenantId: string,
  email: string,
): Promise<void> {
  await redis.del(KEYS.bounceCounter(tenantId, email));
}

/**
 * Flags an email address as invalid after reaching bounce threshold.
 */
async function flagEmailAsInvalid(
  tenantId: string,
  email: string,
): Promise<void> {
  const data = JSON.stringify({
    email,
    tenantId,
    flaggedAt: new Date().toISOString(),
    reason: `${BOUNCE_THRESHOLD} consecutive bounces`,
  });
  await redis.set(KEYS.invalidFlag(tenantId, email), data);
}

/**
 * Checks whether an email address has been flagged as invalid.
 */
export async function checkEmailValidity(
  tenantId: string,
  email: string,
): Promise<EmailValidityCheck> {
  const invalidRaw = await redis.get(KEYS.invalidFlag(tenantId, email));
  const bounceCountRaw = await redis.get(KEYS.bounceCounter(tenantId, email));
  const consecutiveBounces = bounceCountRaw ? parseInt(bounceCountRaw, 10) : 0;

  if (invalidRaw) {
    const data = JSON.parse(invalidRaw);
    return {
      email,
      isValid: false,
      consecutiveBounces,
      flaggedAt: data.flaggedAt,
    };
  }

  return {
    email,
    isValid: true,
    consecutiveBounces,
  };
}

/**
 * Retrieves the delivery record for a message.
 */
export async function getDeliveryRecord(
  messageId: string,
): Promise<DeliveryRecord | null> {
  const raw = await redis.get(KEYS.deliveryRecord(messageId));
  return raw ? JSON.parse(raw) : null;
}

/**
 * Removes the invalid flag for an email (e.g., after admin updates contact info).
 */
export async function clearInvalidFlag(
  tenantId: string,
  email: string,
): Promise<void> {
  await redis.del(KEYS.invalidFlag(tenantId, email));
  await redis.del(KEYS.bounceCounter(tenantId, email));
}

/**
 * Unit tests for the email notification service.
 *
 * Tests cover:
 * - Template rendering for all 5 template types
 * - Rate limiting (100 emails/min/villa)
 * - Delivery tracking and bounce management
 * - Invalid email flagging after 3 consecutive bounces
 * - SMTP config loading
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderTemplate,
  type VillaBranding,
  type BookingConfirmationVars,
  type PreArrivalVars,
  type ReviewRequestVars,
  type PaymentReceiptVars,
  type SecurityAlertVars,
} from './templates';
import { getSmtpConfig, checkRateLimit, getRateLimitStatus } from './email-service';
import {
  recordSent,
  updateDeliveryStatus,
  checkEmailValidity,
  getDeliveryRecord,
  clearInvalidFlag,
} from './delivery-tracker';

// Mock Redis
vi.mock('@/lib/db', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}));

// Import the mocked redis after vi.mock
import { redis } from '@/lib/db';
const mockRedis = vi.mocked(redis);

const testBranding: VillaBranding = {
  villaName: 'Villa Serenity',
  logoUrl: 'https://example.com/logo.png',
  primaryColor: '#2c5f2d',
  secondaryColor: '#f5f5f0',
  contactEmail: 'info@villaserenity.com',
  contactPhone: '+62 812 3456 7890',
  websiteUrl: 'https://villaserenity.com',
};

describe('Email Templates', () => {
  describe('renderTemplate - booking-confirmation', () => {
    const vars: BookingConfirmationVars = {
      guestName: 'John Smith',
      bookingId: 'BK-001',
      checkIn: '2024-03-15',
      checkOut: '2024-03-18',
      roomType: 'Deluxe Suite',
      totalAmount: '450.00',
      currency: 'USD',
      paymentStatus: 'Paid',
    };

    it('renders subject with villa name and booking ID', () => {
      const result = renderTemplate('booking-confirmation', testBranding, vars);
      expect(result.subject).toBe('Booking Confirmed - Villa Serenity (#BK-001)');
    });

    it('includes guest name in HTML body', () => {
      const result = renderTemplate('booking-confirmation', testBranding, vars);
      expect(result.html).toContain('John Smith');
    });

    it('includes booking details in HTML', () => {
      const result = renderTemplate('booking-confirmation', testBranding, vars);
      expect(result.html).toContain('2024-03-15');
      expect(result.html).toContain('2024-03-18');
      expect(result.html).toContain('Deluxe Suite');
      expect(result.html).toContain('USD 450.00');
    });

    it('includes villa branding colors in HTML', () => {
      const result = renderTemplate('booking-confirmation', testBranding, vars);
      expect(result.html).toContain('#2c5f2d');
    });

    it('renders plain text fallback', () => {
      const result = renderTemplate('booking-confirmation', testBranding, vars);
      expect(result.text).toContain('John Smith');
      expect(result.text).toContain('BK-001');
      expect(result.text).toContain('Villa Serenity');
    });
  });

  describe('renderTemplate - pre-arrival', () => {
    const vars: PreArrivalVars = {
      guestName: 'Jane Doe',
      bookingId: 'BK-002',
      checkIn: '2024-04-01',
      checkOut: '2024-04-05',
      roomType: 'Garden Villa',
      specialInstructions: 'Late check-in at 10pm',
      mapUrl: 'https://maps.example.com/villa',
      transferDetails: 'Airport pickup at 9pm',
    };

    it('renders subject with villa name', () => {
      const result = renderTemplate('pre-arrival', testBranding, vars);
      expect(result.subject).toContain('Villa Serenity');
      expect(result.subject).toContain('Arrival Information');
    });

    it('includes special instructions', () => {
      const result = renderTemplate('pre-arrival', testBranding, vars);
      expect(result.html).toContain('Late check-in at 10pm');
    });

    it('includes map URL when provided', () => {
      const result = renderTemplate('pre-arrival', testBranding, vars);
      expect(result.html).toContain('https://maps.example.com/villa');
    });

    it('includes transfer details when provided', () => {
      const result = renderTemplate('pre-arrival', testBranding, vars);
      expect(result.html).toContain('Airport pickup at 9pm');
    });
  });

  describe('renderTemplate - review-request', () => {
    const vars: ReviewRequestVars = {
      guestName: 'Bob Wilson',
      bookingId: 'BK-003',
      checkOut: '2024-03-20',
      reviewUrl: 'https://example.com/review/BK-003',
    };

    it('renders subject asking about the stay', () => {
      const result = renderTemplate('review-request', testBranding, vars);
      expect(result.subject).toContain('How was your stay');
      expect(result.subject).toContain('Villa Serenity');
    });

    it('includes review URL as a button', () => {
      const result = renderTemplate('review-request', testBranding, vars);
      expect(result.html).toContain('https://example.com/review/BK-003');
      expect(result.html).toContain('Leave a Review');
    });
  });

  describe('renderTemplate - payment-receipt', () => {
    const vars: PaymentReceiptVars = {
      guestName: 'Alice Chen',
      bookingId: 'BK-004',
      transactionId: 'TXN-12345',
      amount: '300.00',
      currency: 'IDR',
      paymentMethod: 'Credit Card',
      paidAt: '2024-03-10 14:30 UTC',
      description: 'Room booking - Garden Villa',
    };

    it('renders subject with transaction ID', () => {
      const result = renderTemplate('payment-receipt', testBranding, vars);
      expect(result.subject).toContain('TXN-12345');
    });

    it('includes all payment details', () => {
      const result = renderTemplate('payment-receipt', testBranding, vars);
      expect(result.html).toContain('TXN-12345');
      expect(result.html).toContain('IDR 300.00');
      expect(result.html).toContain('Credit Card');
    });
  });

  describe('renderTemplate - security-alert', () => {
    const vars: SecurityAlertVars = {
      recipientName: 'Admin User',
      alertType: 'Suspicious Login',
      alertMessage: 'Multiple failed login attempts detected',
      occurredAt: '2024-03-10 08:00 UTC',
      ipAddress: '192.168.1.100',
      actionRequired: 'Review and confirm if this was you',
    };

    it('renders subject with alert type', () => {
      const result = renderTemplate('security-alert', testBranding, vars);
      expect(result.subject).toContain('Suspicious Login');
    });

    it('includes IP address when provided', () => {
      const result = renderTemplate('security-alert', testBranding, vars);
      expect(result.html).toContain('192.168.1.100');
    });

    it('includes action required text', () => {
      const result = renderTemplate('security-alert', testBranding, vars);
      expect(result.html).toContain('Review and confirm if this was you');
    });
  });

  describe('renderTemplate - unknown template', () => {
    it('throws error for unknown template name', () => {
      expect(() =>
        renderTemplate(
          'unknown-template' as any,
          testBranding,
          {} as any,
        ),
      ).toThrow('Unknown template');
    });
  });
});

describe('Email Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows sending when under rate limit', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    const allowed = await checkRateLimit('tenant-1');
    expect(allowed).toBe(true);
  });

  it('allows sending at exactly 100 emails', async () => {
    mockRedis.incr.mockResolvedValue(100);

    const allowed = await checkRateLimit('tenant-1');
    expect(allowed).toBe(true);
  });

  it('blocks sending when over rate limit', async () => {
    mockRedis.incr.mockResolvedValue(101);

    const allowed = await checkRateLimit('tenant-1');
    expect(allowed).toBe(false);
  });

  it('sets expiry on first email in window', async () => {
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);

    await checkRateLimit('tenant-1');

    expect(mockRedis.expire).toHaveBeenCalledWith(
      'email:ratelimit:tenant-1',
      60,
    );
  });

  it('does not reset expiry on subsequent emails', async () => {
    mockRedis.incr.mockResolvedValue(50);

    await checkRateLimit('tenant-1');

    expect(mockRedis.expire).not.toHaveBeenCalled();
  });

  it('returns correct rate limit status', async () => {
    mockRedis.get.mockResolvedValue('42');

    const status = await getRateLimitStatus('tenant-1');
    expect(status.used).toBe(42);
    expect(status.limit).toBe(100);
    expect(status.remaining).toBe(58);
  });

  it('returns zero usage when no emails sent', async () => {
    mockRedis.get.mockResolvedValue(null);

    const status = await getRateLimitStatus('tenant-1');
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(100);
  });
});

describe('SMTP Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads config from environment variables', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'secret123';
    process.env.SMTP_FROM = 'noreply@example.com';

    const config = getSmtpConfig();
    expect(config.host).toBe('smtp.example.com');
    expect(config.port).toBe(587);
    expect(config.user).toBe('user@example.com');
    expect(config.password).toBe('secret123');
    expect(config.from).toBe('noreply@example.com');
    expect(config.secure).toBe(false);
  });

  it('sets secure to true for port 465', () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'secret123';
    process.env.SMTP_FROM = 'noreply@example.com';

    const config = getSmtpConfig();
    expect(config.secure).toBe(true);
  });

  it('throws when SMTP_HOST is missing', () => {
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASSWORD = 'secret123';
    process.env.SMTP_FROM = 'noreply@example.com';
    delete process.env.SMTP_HOST;

    expect(() => getSmtpConfig()).toThrow('Missing SMTP configuration');
  });
});

describe('Delivery Tracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordSent', () => {
    it('stores a delivery record in Redis', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const record = await recordSent(
        'msg-001',
        'tenant-1',
        'guest@example.com',
        'booking-confirmation',
      );

      expect(record.messageId).toBe('msg-001');
      expect(record.tenantId).toBe('tenant-1');
      expect(record.recipientEmail).toBe('guest@example.com');
      expect(record.status).toBe('sent');
      expect(record.retryCount).toBe(0);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'email:delivery:msg-001',
        expect.any(String),
        'EX',
        7776000, // 90 days
      );
    });
  });

  describe('updateDeliveryStatus', () => {
    it('updates status to delivered and resets bounce counter', async () => {
      const existingRecord = JSON.stringify({
        messageId: 'msg-001',
        tenantId: 'tenant-1',
        recipientEmail: 'guest@example.com',
        templateName: 'booking-confirmation',
        status: 'sent',
        sentAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        retryCount: 0,
      });
      mockRedis.get.mockResolvedValue(existingRecord);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.del.mockResolvedValue(1);

      const { record, emailFlagged } = await updateDeliveryStatus(
        'msg-001',
        'delivered',
      );

      expect(record?.status).toBe('delivered');
      expect(emailFlagged).toBe(false);
      // Should reset bounce counter on successful delivery
      expect(mockRedis.del).toHaveBeenCalledWith(
        'email:bounces:tenant-1:guest@example.com',
      );
    });

    it('increments bounce counter on bounce', async () => {
      const existingRecord = JSON.stringify({
        messageId: 'msg-002',
        tenantId: 'tenant-1',
        recipientEmail: 'bouncy@example.com',
        templateName: 'booking-confirmation',
        status: 'sent',
        sentAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        retryCount: 0,
      });
      mockRedis.get.mockResolvedValue(existingRecord);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const { record, emailFlagged } = await updateDeliveryStatus(
        'msg-002',
        'bounced',
        'Mailbox not found',
      );

      expect(record?.status).toBe('bounced');
      expect(record?.errorReason).toBe('Mailbox not found');
      expect(emailFlagged).toBe(false);
    });

    it('flags email as invalid after 3 consecutive bounces', async () => {
      const existingRecord = JSON.stringify({
        messageId: 'msg-003',
        tenantId: 'tenant-1',
        recipientEmail: 'invalid@example.com',
        templateName: 'booking-confirmation',
        status: 'sent',
        sentAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        retryCount: 0,
      });
      mockRedis.get.mockResolvedValue(existingRecord);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.incr.mockResolvedValue(3); // 3rd consecutive bounce
      mockRedis.expire.mockResolvedValue(1);

      const { emailFlagged } = await updateDeliveryStatus(
        'msg-003',
        'bounced',
        'Permanent failure',
      );

      expect(emailFlagged).toBe(true);
      // Should flag the email
      expect(mockRedis.set).toHaveBeenCalledWith(
        'email:invalid:tenant-1:invalid@example.com',
        expect.stringContaining('"reason":"3 consecutive bounces"'),
      );
    });

    it('returns null record when message not found', async () => {
      mockRedis.get.mockResolvedValue(null);

      const { record, emailFlagged } = await updateDeliveryStatus(
        'msg-unknown',
        'delivered',
      );

      expect(record).toBeNull();
      expect(emailFlagged).toBe(false);
    });
  });

  describe('checkEmailValidity', () => {
    it('returns valid when email is not flagged', async () => {
      mockRedis.get
        .mockResolvedValueOnce(null) // invalid flag
        .mockResolvedValueOnce(null); // bounce counter

      const result = await checkEmailValidity('tenant-1', 'good@example.com');
      expect(result.isValid).toBe(true);
      expect(result.consecutiveBounces).toBe(0);
    });

    it('returns invalid when email is flagged', async () => {
      mockRedis.get
        .mockResolvedValueOnce(
          JSON.stringify({
            email: 'bad@example.com',
            tenantId: 'tenant-1',
            flaggedAt: '2024-01-15T00:00:00.000Z',
            reason: '3 consecutive bounces',
          }),
        )
        .mockResolvedValueOnce('3'); // bounce counter

      const result = await checkEmailValidity('tenant-1', 'bad@example.com');
      expect(result.isValid).toBe(false);
      expect(result.consecutiveBounces).toBe(3);
      expect(result.flaggedAt).toBe('2024-01-15T00:00:00.000Z');
    });
  });

  describe('getDeliveryRecord', () => {
    it('returns record when it exists', async () => {
      const record = {
        messageId: 'msg-001',
        tenantId: 'tenant-1',
        recipientEmail: 'guest@example.com',
        status: 'delivered',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(record));

      const result = await getDeliveryRecord('msg-001');
      expect(result?.messageId).toBe('msg-001');
      expect(result?.status).toBe('delivered');
    });

    it('returns null when record does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await getDeliveryRecord('msg-nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('clearInvalidFlag', () => {
    it('removes both invalid flag and bounce counter', async () => {
      mockRedis.del.mockResolvedValue(1);

      await clearInvalidFlag('tenant-1', 'restored@example.com');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'email:invalid:tenant-1:restored@example.com',
      );
      expect(mockRedis.del).toHaveBeenCalledWith(
        'email:bounces:tenant-1:restored@example.com',
      );
    });
  });
});

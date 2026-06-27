/**
 * Unit tests for the Guest Messaging Service.
 *
 * Tests message validation, messaging window logic, and core service behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  isWithinMessagingWindow,
  validateMessage,
  MessagingError,
} from './service';
import type {
  SendMessageRequest,
  BookingDateContext,
} from './types';
import { MESSAGE_CONSTRAINTS } from './types';

/** Helper to build a valid SendMessageRequest. */
function makeValidRequest(overrides: Partial<SendMessageRequest> = {}): SendMessageRequest {
  return {
    bookingId: 'booking-001',
    guestId: 'guest-001',
    direction: 'inbound',
    channel: 'in_app',
    message: 'Hello, I have a question about check-in.',
    ...overrides,
  };
}

describe('isWithinMessagingWindow', () => {
  const bookingDates: BookingDateContext = {
    checkInDate: new Date('2024-03-15T14:00:00Z'),
    checkOutDate: new Date('2024-03-20T10:00:00Z'),
  };

  it('returns true when current time is within the messaging window', () => {
    // During the stay
    const during = new Date('2024-03-17T12:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, during)).toBe(true);
  });

  it('returns true 7 days before check-in (window start)', () => {
    const windowStart = new Date('2024-03-08T14:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, windowStart)).toBe(true);
  });

  it('returns true 7 days after checkout (window end)', () => {
    const windowEnd = new Date('2024-03-27T10:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, windowEnd)).toBe(true);
  });

  it('returns false before the messaging window opens', () => {
    const beforeWindow = new Date('2024-03-07T12:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, beforeWindow)).toBe(false);
  });

  it('returns false after the messaging window closes', () => {
    const afterWindow = new Date('2024-03-28T12:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, afterWindow)).toBe(false);
  });

  it('returns true on check-in day', () => {
    const checkInDay = new Date('2024-03-15T08:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, checkInDay)).toBe(true);
  });

  it('returns true on checkout day', () => {
    const checkOutDay = new Date('2024-03-20T15:00:00Z');
    expect(isWithinMessagingWindow(bookingDates, checkOutDay)).toBe(true);
  });
});

describe('validateMessage', () => {
  it('does not throw for a valid message', () => {
    expect(() => validateMessage(makeValidRequest())).not.toThrow();
  });

  it('throws VALIDATION_ERROR for empty message', () => {
    expect(() => validateMessage(makeValidRequest({ message: '' })))
      .toThrow(MessagingError);

    try {
      validateMessage(makeValidRequest({ message: '' }));
    } catch (err) {
      expect((err as MessagingError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('throws VALIDATION_ERROR for whitespace-only message', () => {
    expect(() => validateMessage(makeValidRequest({ message: '   ' })))
      .toThrow(MessagingError);
  });

  it('throws MESSAGE_TOO_LONG when exceeding 2000 characters', () => {
    const longMessage = 'a'.repeat(MESSAGE_CONSTRAINTS.MAX_TEXT_LENGTH + 1);
    try {
      validateMessage(makeValidRequest({ message: longMessage }));
    } catch (err) {
      expect(err).toBeInstanceOf(MessagingError);
      expect((err as MessagingError).code).toBe('MESSAGE_TOO_LONG');
    }
  });

  it('accepts a message at exactly 2000 characters', () => {
    const maxMessage = 'a'.repeat(MESSAGE_CONSTRAINTS.MAX_TEXT_LENGTH);
    expect(() => validateMessage(makeValidRequest({ message: maxMessage }))).not.toThrow();
  });

  it('throws TOO_MANY_ATTACHMENTS when exceeding 3 attachments', () => {
    const attachments = Array.from({ length: 4 }, (_, i) => ({
      id: `att-${i}`,
      filename: `image${i}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      url: `https://storage.example.com/att-${i}`,
      uploadedAt: new Date().toISOString(),
    }));

    try {
      validateMessage(makeValidRequest({ attachments }));
    } catch (err) {
      expect(err).toBeInstanceOf(MessagingError);
      expect((err as MessagingError).code).toBe('TOO_MANY_ATTACHMENTS');
    }
  });

  it('accepts exactly 3 attachments', () => {
    const attachments = Array.from({ length: 3 }, (_, i) => ({
      id: `att-${i}`,
      filename: `image${i}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      url: `https://storage.example.com/att-${i}`,
      uploadedAt: new Date().toISOString(),
    }));

    expect(() => validateMessage(makeValidRequest({ attachments }))).not.toThrow();
  });

  it('throws ATTACHMENT_TOO_LARGE when an attachment exceeds 5MB', () => {
    const attachments = [{
      id: 'att-1',
      filename: 'large.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: MESSAGE_CONSTRAINTS.MAX_ATTACHMENT_SIZE_BYTES + 1,
      url: 'https://storage.example.com/large',
      uploadedAt: new Date().toISOString(),
    }];

    try {
      validateMessage(makeValidRequest({ attachments }));
    } catch (err) {
      expect(err).toBeInstanceOf(MessagingError);
      expect((err as MessagingError).code).toBe('ATTACHMENT_TOO_LARGE');
    }
  });

  it('accepts an attachment at exactly 5MB', () => {
    const attachments = [{
      id: 'att-1',
      filename: 'exact5mb.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: MESSAGE_CONSTRAINTS.MAX_ATTACHMENT_SIZE_BYTES,
      url: 'https://storage.example.com/exact5mb',
      uploadedAt: new Date().toISOString(),
    }];

    expect(() => validateMessage(makeValidRequest({ attachments }))).not.toThrow();
  });

  it('throws INVALID_ATTACHMENT_TYPE for non-image attachments', () => {
    const attachments = [{
      id: 'att-1',
      filename: 'document.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      url: 'https://storage.example.com/doc',
      uploadedAt: new Date().toISOString(),
    }];

    try {
      validateMessage(makeValidRequest({ attachments }));
    } catch (err) {
      expect(err).toBeInstanceOf(MessagingError);
      expect((err as MessagingError).code).toBe('INVALID_ATTACHMENT_TYPE');
    }
  });

  it('accepts various image MIME types', () => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (const mimeType of imageTypes) {
      const attachments = [{
        id: 'att-1',
        filename: 'photo.img',
        mimeType,
        sizeBytes: 1024,
        url: 'https://storage.example.com/photo',
        uploadedAt: new Date().toISOString(),
      }];

      expect(() => validateMessage(makeValidRequest({ attachments }))).not.toThrow();
    }
  });

  it('passes validation when attachments array is undefined', () => {
    const request = makeValidRequest();
    delete (request as unknown as Record<string, unknown>).attachments;
    expect(() => validateMessage(request)).not.toThrow();
  });
});

describe('MessagingError', () => {
  it('has the correct name, code, and statusCode', () => {
    const err = new MessagingError('test error', 'MESSAGE_TOO_LONG', 400);
    expect(err.name).toBe('MessagingError');
    expect(err.code).toBe('MESSAGE_TOO_LONG');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('test error');
  });

  it('defaults statusCode to 400', () => {
    const err = new MessagingError('test', 'VALIDATION_ERROR');
    expect(err.statusCode).toBe(400);
  });
});

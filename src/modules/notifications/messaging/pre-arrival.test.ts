/**
 * Unit tests for the Pre-Arrival Messages module.
 *
 * Tests template rendering and validation of pre-arrival message logic.
 */

import { describe, it, expect } from 'vitest';
import { renderTemplate } from './pre-arrival';

describe('renderTemplate', () => {
  const booking = {
    id: 'booking-123',
    guestId: 'guest-456',
    guestName: 'John Smith',
    guestEmail: 'john@example.com',
    checkInDate: new Date('2024-03-15T14:00:00Z'),
    roomName: 'Deluxe Suite',
    villaName: 'Arka Villa Ubud',
  };

  it('replaces {{guest_name}} placeholder', () => {
    const template = 'Hello {{guest_name}}, welcome!';
    const result = renderTemplate(template, booking);
    expect(result).toContain('John Smith');
    expect(result).not.toContain('{{guest_name}}');
  });

  it('replaces {{check_in_date}} placeholder with formatted date', () => {
    const template = 'Your check-in is on {{check_in_date}}.';
    const result = renderTemplate(template, booking);
    expect(result).not.toContain('{{check_in_date}}');
    // Should contain a human-readable date format
    expect(result).toContain('2024');
  });

  it('replaces {{room_name}} placeholder', () => {
    const template = 'Your room: {{room_name}}';
    const result = renderTemplate(template, booking);
    expect(result).toContain('Deluxe Suite');
    expect(result).not.toContain('{{room_name}}');
  });

  it('replaces {{villa_name}} placeholder', () => {
    const template = 'Welcome to {{villa_name}}!';
    const result = renderTemplate(template, booking);
    expect(result).toContain('Arka Villa Ubud');
    expect(result).not.toContain('{{villa_name}}');
  });

  it('replaces {{booking_id}} placeholder', () => {
    const template = 'Booking reference: {{booking_id}}';
    const result = renderTemplate(template, booking);
    expect(result).toContain('booking-123');
    expect(result).not.toContain('{{booking_id}}');
  });

  it('replaces multiple placeholders in one template', () => {
    const template = 'Dear {{guest_name}}, your booking {{booking_id}} at {{villa_name}} in {{room_name}} starts {{check_in_date}}.';
    const result = renderTemplate(template, booking);

    expect(result).toContain('John Smith');
    expect(result).toContain('booking-123');
    expect(result).toContain('Arka Villa Ubud');
    expect(result).toContain('Deluxe Suite');
    expect(result).not.toContain('{{');
  });

  it('handles templates with no placeholders', () => {
    const template = 'Welcome! Please check in at the front desk.';
    const result = renderTemplate(template, booking);
    expect(result).toBe(template);
  });

  it('handles repeated placeholders', () => {
    const template = '{{guest_name}} - Reminder for {{guest_name}}';
    const result = renderTemplate(template, booking);
    expect(result).toBe('John Smith - Reminder for John Smith');
  });
});

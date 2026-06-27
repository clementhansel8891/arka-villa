/**
 * Email Templates Module
 *
 * Template definitions for per-villa branded emails.
 * Templates support villa-specific branding variables (logo, colors, name).
 *
 * Template types:
 * - booking-confirmation
 * - pre-arrival
 * - review-request
 * - payment-receipt
 * - security-alert
 */

/** Villa branding context injected into every template. */
export interface VillaBranding {
  villaName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
}

/** Variables specific to each template type. */
export interface BookingConfirmationVars {
  guestName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  totalAmount: string;
  currency: string;
  paymentStatus: string;
}

export interface PreArrivalVars {
  guestName: string;
  bookingId: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  specialInstructions: string;
  mapUrl?: string;
  transferDetails?: string;
}

export interface ReviewRequestVars {
  guestName: string;
  bookingId: string;
  checkOut: string;
  reviewUrl: string;
  villaExperienceSummary?: string;
}

export interface PaymentReceiptVars {
  guestName: string;
  bookingId: string;
  transactionId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  paidAt: string;
  description: string;
}

export interface SecurityAlertVars {
  recipientName: string;
  alertType: string;
  alertMessage: string;
  occurredAt: string;
  ipAddress?: string;
  actionRequired: string;
}

export type TemplateName =
  | 'booking-confirmation'
  | 'pre-arrival'
  | 'review-request'
  | 'payment-receipt'
  | 'security-alert';

export type TemplateVars =
  | BookingConfirmationVars
  | PreArrivalVars
  | ReviewRequestVars
  | PaymentReceiptVars
  | SecurityAlertVars;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Renders an email template with villa branding and template-specific variables.
 */
export function renderTemplate(
  templateName: TemplateName,
  branding: VillaBranding,
  vars: TemplateVars,
): RenderedEmail {
  switch (templateName) {
    case 'booking-confirmation':
      return renderBookingConfirmation(branding, vars as BookingConfirmationVars);
    case 'pre-arrival':
      return renderPreArrival(branding, vars as PreArrivalVars);
    case 'review-request':
      return renderReviewRequest(branding, vars as ReviewRequestVars);
    case 'payment-receipt':
      return renderPaymentReceipt(branding, vars as PaymentReceiptVars);
    case 'security-alert':
      return renderSecurityAlert(branding, vars as SecurityAlertVars);
    default:
      throw new Error(`Unknown template: ${templateName}`);
  }
}

/** Wraps email content in a branded HTML layout. */
function wrapInLayout(branding: VillaBranding, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${branding.villaName}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f8f8f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;">
    <tr>
      <td style="padding:24px;text-align:center;background-color:${branding.primaryColor};">
        <img src="${branding.logoUrl}" alt="${branding.villaName}" style="max-height:60px;" />
      </td>
    </tr>
    <tr>
      <td style="padding:32px 24px;">
        ${content}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;text-align:center;font-size:12px;color:#666;background-color:${branding.secondaryColor};">
        <p style="margin:0;">${branding.villaName}</p>
        <p style="margin:4px 0;">${branding.contactEmail} | ${branding.contactPhone}</p>
        <p style="margin:4px 0;"><a href="${branding.websiteUrl}" style="color:${branding.primaryColor};">${branding.websiteUrl}</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderBookingConfirmation(
  branding: VillaBranding,
  vars: BookingConfirmationVars,
): RenderedEmail {
  const subject = `Booking Confirmed - ${branding.villaName} (#${vars.bookingId})`;

  const content = `
    <h1 style="color:${branding.primaryColor};margin:0 0 16px;">Booking Confirmed</h1>
    <p>Dear ${vars.guestName},</p>
    <p>Your booking at <strong>${branding.villaName}</strong> has been confirmed.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Booking ID</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.bookingId}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Check-in</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.checkIn}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Check-out</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.checkOut}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Room</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.roomType}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Total</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.currency} ${vars.totalAmount}</td></tr>
      <tr><td style="padding:8px 0;"><strong>Payment</strong></td><td style="padding:8px 0;">${vars.paymentStatus}</td></tr>
    </table>
    <p>We look forward to welcoming you!</p>`;

  const text = `Booking Confirmed - ${branding.villaName}

Dear ${vars.guestName},

Your booking at ${branding.villaName} has been confirmed.

Booking ID: ${vars.bookingId}
Check-in: ${vars.checkIn}
Check-out: ${vars.checkOut}
Room: ${vars.roomType}
Total: ${vars.currency} ${vars.totalAmount}
Payment: ${vars.paymentStatus}

We look forward to welcoming you!

${branding.villaName}
${branding.contactEmail} | ${branding.contactPhone}`;

  return { subject, html: wrapInLayout(branding, content), text };
}

function renderPreArrival(
  branding: VillaBranding,
  vars: PreArrivalVars,
): RenderedEmail {
  const subject = `Your Stay at ${branding.villaName} - Arrival Information`;

  const transferSection = vars.transferDetails
    ? `<p><strong>Transfer:</strong> ${vars.transferDetails}</p>`
    : '';
  const mapSection = vars.mapUrl
    ? `<p><a href="${vars.mapUrl}" style="color:${branding.primaryColor};">View Map &amp; Directions</a></p>`
    : '';

  const content = `
    <h1 style="color:${branding.primaryColor};margin:0 0 16px;">Welcome to ${branding.villaName}</h1>
    <p>Dear ${vars.guestName},</p>
    <p>We are excited to welcome you soon! Here is your arrival information:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Check-in</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.checkIn}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Check-out</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.checkOut}</td></tr>
      <tr><td style="padding:8px 0;"><strong>Room</strong></td><td style="padding:8px 0;">${vars.roomType}</td></tr>
    </table>
    ${vars.specialInstructions ? `<p><strong>Special Instructions:</strong> ${vars.specialInstructions}</p>` : ''}
    ${transferSection}
    ${mapSection}
    <p>If you have any questions, please contact us at ${branding.contactEmail}.</p>`;

  const text = `Your Stay at ${branding.villaName} - Arrival Information

Dear ${vars.guestName},

We are excited to welcome you soon!

Check-in: ${vars.checkIn}
Check-out: ${vars.checkOut}
Room: ${vars.roomType}
${vars.specialInstructions ? `Special Instructions: ${vars.specialInstructions}` : ''}
${vars.transferDetails ? `Transfer: ${vars.transferDetails}` : ''}
${vars.mapUrl ? `Map: ${vars.mapUrl}` : ''}

Contact: ${branding.contactEmail} | ${branding.contactPhone}`;

  return { subject, html: wrapInLayout(branding, content), text };
}

function renderReviewRequest(
  branding: VillaBranding,
  vars: ReviewRequestVars,
): RenderedEmail {
  const subject = `How was your stay at ${branding.villaName}?`;

  const content = `
    <h1 style="color:${branding.primaryColor};margin:0 0 16px;">We'd Love Your Feedback</h1>
    <p>Dear ${vars.guestName},</p>
    <p>Thank you for staying with us at <strong>${branding.villaName}</strong>. We hope you had a wonderful experience!</p>
    ${vars.villaExperienceSummary ? `<p>${vars.villaExperienceSummary}</p>` : ''}
    <p>Would you take a moment to share your experience?</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${vars.reviewUrl}" style="background-color:${branding.primaryColor};color:#ffffff;padding:12px 32px;text-decoration:none;border-radius:4px;display:inline-block;">Leave a Review</a>
    </p>
    <p>Your feedback helps us improve and helps future guests make their decisions.</p>`;

  const text = `How was your stay at ${branding.villaName}?

Dear ${vars.guestName},

Thank you for staying with us at ${branding.villaName}. We hope you had a wonderful experience!

Please leave a review: ${vars.reviewUrl}

Your feedback helps us improve and helps future guests make their decisions.

${branding.villaName}
${branding.contactEmail}`;

  return { subject, html: wrapInLayout(branding, content), text };
}

function renderPaymentReceipt(
  branding: VillaBranding,
  vars: PaymentReceiptVars,
): RenderedEmail {
  const subject = `Payment Receipt - ${branding.villaName} (#${vars.transactionId})`;

  const content = `
    <h1 style="color:${branding.primaryColor};margin:0 0 16px;">Payment Receipt</h1>
    <p>Dear ${vars.guestName},</p>
    <p>This confirms your payment to <strong>${branding.villaName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Transaction ID</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.transactionId}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Booking ID</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.bookingId}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Amount</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.currency} ${vars.amount}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Payment Method</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.paymentMethod}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Date</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.paidAt}</td></tr>
      <tr><td style="padding:8px 0;"><strong>Description</strong></td><td style="padding:8px 0;">${vars.description}</td></tr>
    </table>
    <p>Thank you for your payment.</p>`;

  const text = `Payment Receipt - ${branding.villaName}

Dear ${vars.guestName},

This confirms your payment to ${branding.villaName}.

Transaction ID: ${vars.transactionId}
Booking ID: ${vars.bookingId}
Amount: ${vars.currency} ${vars.amount}
Payment Method: ${vars.paymentMethod}
Date: ${vars.paidAt}
Description: ${vars.description}

Thank you for your payment.

${branding.villaName}
${branding.contactEmail}`;

  return { subject, html: wrapInLayout(branding, content), text };
}

function renderSecurityAlert(
  branding: VillaBranding,
  vars: SecurityAlertVars,
): RenderedEmail {
  const subject = `Security Alert - ${branding.villaName}: ${vars.alertType}`;

  const content = `
    <h1 style="color:#c0392b;margin:0 0 16px;">Security Alert</h1>
    <p>Dear ${vars.recipientName},</p>
    <p>A security event has been detected on your <strong>${branding.villaName}</strong> account.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Alert Type</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.alertType}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>Details</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.alertMessage}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>When</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.occurredAt}</td></tr>
      ${vars.ipAddress ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;"><strong>IP Address</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;">${vars.ipAddress}</td></tr>` : ''}
      <tr><td style="padding:8px 0;"><strong>Action Required</strong></td><td style="padding:8px 0;">${vars.actionRequired}</td></tr>
    </table>
    <p style="color:#c0392b;"><strong>If you did not perform this action, please secure your account immediately.</strong></p>`;

  const text = `Security Alert - ${branding.villaName}

Dear ${vars.recipientName},

A security event has been detected on your ${branding.villaName} account.

Alert Type: ${vars.alertType}
Details: ${vars.alertMessage}
When: ${vars.occurredAt}
${vars.ipAddress ? `IP Address: ${vars.ipAddress}` : ''}
Action Required: ${vars.actionRequired}

If you did not perform this action, please secure your account immediately.

${branding.villaName}
${branding.contactEmail}`;

  return { subject, html: wrapInLayout(branding, content), text };
}

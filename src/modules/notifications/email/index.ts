/**
 * Email Notification Module
 *
 * Barrel export for the email notification subsystem.
 * Provides SMTP email sending with:
 * - Per-villa branded templates
 * - Rate limiting (100/min/villa)
 * - Retry with exponential backoff (3x)
 * - Delivery tracking and bounce management
 */

// Email service (main send interface)
export {
  sendEmail,
  sendBookingEmail,
  processDeliveryWebhook,
  getSmtpConfig,
  checkRateLimit,
  getRateLimitStatus,
  type SmtpConfig,
  type SendEmailOptions,
  type SendResult,
} from './email-service';

// Templates
export {
  renderTemplate,
  type TemplateName,
  type TemplateVars,
  type VillaBranding,
  type RenderedEmail,
  type BookingConfirmationVars,
  type PreArrivalVars,
  type ReviewRequestVars,
  type PaymentReceiptVars,
  type SecurityAlertVars,
} from './templates';

// Delivery tracking
export {
  recordSent,
  updateDeliveryStatus,
  checkEmailValidity,
  getDeliveryRecord,
  clearInvalidFlag,
  type DeliveryStatus,
  type DeliveryRecord,
  type EmailValidityCheck,
} from './delivery-tracker';

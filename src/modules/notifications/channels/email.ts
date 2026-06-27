/**
 * Email notification channel.
 *
 * Placeholder implementation for transactional email delivery.
 * In production, integrates with an SMTP service or transactional
 * email provider (e.g., Resend, SES, Postmark).
 */

import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  NotificationPayload,
} from '../types';

/**
 * Email channel adapter.
 *
 * Currently a placeholder that simulates successful delivery.
 * Replace the `deliver` implementation with actual SMTP/API calls
 * when the email service is configured.
 */
export class EmailChannel implements ChannelAdapter {
  readonly channel = 'email' as const;

  async deliver(notification: NotificationPayload): Promise<ChannelDeliveryResult> {
    try {
      // TODO: Replace with actual email delivery integration
      // Example integration points:
      // - nodemailer with SMTP
      // - AWS SES SDK
      // - Resend API
      // - Postmark API

      const emailServiceConfigured = !!process.env.SMTP_HOST;

      if (!emailServiceConfigured) {
        // In development/placeholder mode, log and simulate success
        console.log(
          `[EmailChannel] Placeholder delivery to user ${notification.userId}: "${notification.title}"`
        );
        return {
          success: true,
          messageId: `email_placeholder_${Date.now()}`,
        };
      }

      // When configured, this would:
      // 1. Look up user's email address from the users table
      // 2. Render the email template with notification content
      // 3. Send via the configured transport
      // 4. Return the message ID from the provider

      return {
        success: true,
        messageId: `email_${Date.now()}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Email delivery failed: ${message}` };
    }
  }
}

export const emailChannel = new EmailChannel();

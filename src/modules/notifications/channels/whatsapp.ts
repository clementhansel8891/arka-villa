/**
 * WhatsApp notification channel.
 *
 * Placeholder implementation for WhatsApp Business API delivery.
 * In production, integrates with the WhatsApp Business API (Cloud API)
 * for sending template messages and notifications.
 */

import type {
  ChannelAdapter,
  ChannelDeliveryResult,
  NotificationPayload,
} from '../types';

/**
 * WhatsApp channel adapter.
 *
 * Currently a placeholder that simulates successful delivery.
 * Replace the `deliver` implementation with WhatsApp Business API
 * calls when the integration is configured.
 */
export class WhatsAppChannel implements ChannelAdapter {
  readonly channel = 'whatsapp' as const;

  async deliver(notification: NotificationPayload): Promise<ChannelDeliveryResult> {
    try {
      // TODO: Replace with actual WhatsApp Business API integration
      // Example integration points:
      // - WhatsApp Cloud API (Meta)
      // - WhatsApp Business Solution Provider (BSP)
      //
      // Steps:
      // 1. Look up user's phone number from the users table
      // 2. Select appropriate message template for the event type
      // 3. Send via WhatsApp Cloud API using access token
      // 4. Return the message ID from Meta's response

      const whatsappConfigured = !!process.env.WHATSAPP_ACCESS_TOKEN;

      if (!whatsappConfigured) {
        // In development/placeholder mode, log and simulate success
        console.log(
          `[WhatsAppChannel] Placeholder delivery to user ${notification.userId}: "${notification.title}"`
        );
        return {
          success: true,
          messageId: `wa_placeholder_${Date.now()}`,
        };
      }

      // When configured, this would:
      // 1. Retrieve user phone number
      // 2. Call the WhatsApp Cloud API with template message
      // 3. Handle rate limits and delivery receipts
      // 4. Return the wamid (WhatsApp message ID)

      return {
        success: true,
        messageId: `wa_${Date.now()}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `WhatsApp delivery failed: ${message}` };
    }
  }
}

export const whatsAppChannel = new WhatsAppChannel();

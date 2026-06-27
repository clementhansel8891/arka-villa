/**
 * Guest Messaging Submodule
 *
 * Provides guest communication, escalation, and pre-arrival messaging
 * for the notifications module.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

export {
  sendMessage,
  listMessages,
  markMessageRead,
  validateMessage,
  isWithinMessagingWindow,
  MessagingError,
} from './service';

export {
  isWithinBusinessHours,
  getBusinessHours,
  findUnrespondedMessages,
  escalateMessage,
  runEscalationCheck,
  runEscalationCheckAllTenants,
} from './escalation';

export {
  getPreArrivalTemplates,
  upsertPreArrivalTemplate,
  findBookingsForPreArrival,
  renderTemplate,
  sendPreArrivalMessages,
  runPreArrivalAllTenants,
} from './pre-arrival';

export type {
  SendMessageRequest,
  ListMessagesFilter,
  ListMessagesResult,
  GuestCommunication,
  GuestCommunicationRow,
  BookingDateContext,
  BusinessHoursConfig,
  MessageAttachment,
  MessageDirection,
  MessageChannel,
  EscalationStatus,
  PreArrivalTemplate,
  PreArrivalTemplateRow,
  MessagingErrorCode,
} from './types';

export { MESSAGE_CONSTRAINTS, DEFAULT_BUSINESS_HOURS } from './types';

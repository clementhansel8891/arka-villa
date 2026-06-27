/**
 * Events module types
 */

export interface EventStream {
  name: string;
  consumerGroups: string[];
}

export interface DeadLetterEntry {
  originalEvent: import('@/lib/events/types').PlatformEvent;
  failedAt: string;
  failureReason: string;
  failedAgent: string;
  retryAttempts: number;
  lastError: string;
  resolution: 'pending' | 'manual_retry' | 'discarded' | 'resolved';
}

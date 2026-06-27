/**
 * Channels module types.
 *
 * Defines the ChannelAdapter interface, sync event logging,
 * retry policies, and channel conflict resolution types.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
 */

// ─── Channel Adapter Interface ────────────────────────────────────────────────

/**
 * Adapter interface for OTA integrations.
 * New OTA integrations implement this interface and register
 * via the adapter registry without modifying the Booking_Engine core.
 */
export interface ChannelAdapter {
  readonly channelId: string;
  readonly channelName: string;

  /** Inbound: fetch reservations from OTA since a given date */
  fetchReservations(since: Date): Promise<ExternalReservation[]>;

  /** Outbound: push availability updates to OTA */
  pushAvailability(rooms: RoomAvailability[]): Promise<SyncResult>;

  /** Outbound: push rate updates to OTA */
  pushRates(rates: RateUpdate[]): Promise<SyncResult>;

  /** Health check: verify connection to OTA API */
  checkConnection(): Promise<ConnectionStatus>;
}

// ─── Data Transfer Types ──────────────────────────────────────────────────────

export interface ExternalReservation {
  externalId: string;
  channelId: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  roomType: string;
  numberOfGuests: number;
  totalPrice: number;
  currency: string;
  rawPayload?: Record<string, unknown>;
}

export interface RoomAvailability {
  roomId: string;
  date: string; // YYYY-MM-DD
  available: boolean;
}

export interface RateUpdate {
  roomId: string;
  date: string; // YYYY-MM-DD
  rate: number;
  currency: string;
  ratePlanId?: string;
}

export interface SyncResult {
  success: boolean;
  syncedAt: string; // ISO 8601
  itemsProcessed?: number;
  errors?: string[];
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

// ─── Sync Operations ──────────────────────────────────────────────────────────

export type SyncOperationType =
  | 'fetch_reservations'
  | 'push_availability'
  | 'push_rates'
  | 'check_connection';

export type SyncDirection = 'inbound' | 'outbound';

export type ChannelSyncStatus = 'in_sync' | 'out_of_sync' | 'syncing';

// ─── Sync Event Log ───────────────────────────────────────────────────────────

export interface SyncLogEntry {
  id: string;
  tenantId: string;
  channelId: string;
  channelName: string;
  operation: SyncOperationType;
  direction: SyncDirection;
  status: 'success' | 'failure';
  timestamp: string; // ISO 8601
  durationMs: number;
  itemsProcessed?: number;
  errorMessage?: string;
  retryAttempt?: number;
  metadata?: Record<string, unknown>;
}

// ─── Retry Policy ─────────────────────────────────────────────────────────────

export interface RetryPolicy {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Backoff factor (multiplied each retry) */
  backoffFactor: number;
}

/** Default retry policy: 5s base, factor 2, 3 retries max */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 5000,
  backoffFactor: 2,
};

// ─── Sync Configuration ───────────────────────────────────────────────────────

export interface ChannelConfig {
  channelId: string;
  channelName: string;
  enabled: boolean;
  syncStatus: ChannelSyncStatus;
  lastSyncAt?: string;
  lastError?: string;
}

// ─── Sync Trigger Request ─────────────────────────────────────────────────────

export interface ManualSyncRequest {
  channelIds?: string[]; // If omitted, sync all connected channels
  operations?: SyncOperationType[]; // If omitted, run all operations
}

export interface ManualSyncResponse {
  results: ChannelSyncResult[];
  triggeredAt: string;
}

export interface ChannelSyncResult {
  channelId: string;
  channelName: string;
  operation: SyncOperationType;
  success: boolean;
  syncedAt: string;
  error?: string;
}

// ─── Channel Event Payloads ───────────────────────────────────────────────────

export interface ChannelSyncStartedPayload {
  channelId: string;
  channelName: string;
  operation: SyncOperationType;
  direction: SyncDirection;
}

export interface ChannelSyncCompletedPayload {
  channelId: string;
  channelName: string;
  operation: SyncOperationType;
  direction: SyncDirection;
  itemsProcessed: number;
  durationMs: number;
}

export interface ChannelSyncFailedPayload {
  channelId: string;
  channelName: string;
  operation: SyncOperationType;
  direction: SyncDirection;
  error: string;
  retryAttempt: number;
  maxRetries: number;
  markedOutOfSync: boolean;
}

export interface ChannelReservationReceivedPayload {
  channelId: string;
  channelName: string;
  externalId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  totalPrice: number;
  currency: string;
}

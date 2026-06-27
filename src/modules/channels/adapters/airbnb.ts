/**
 * Airbnb channel adapter.
 *
 * Implements the ChannelAdapter interface for Airbnb OTA integration.
 * Handles fetching reservations, pushing availability, and pushing rates.
 *
 * Requirements: 6.1, 6.2, 6.4
 */

import type {
  ChannelAdapter,
  ExternalReservation,
  RoomAvailability,
  RateUpdate,
  SyncResult,
  ConnectionStatus,
} from '../types';

/**
 * Airbnb adapter implementing the ChannelAdapter interface.
 *
 * In production, this would use the Airbnb Connectivity API (Software Partner).
 * Currently implements the contract with structured API calls.
 */
export class AirbnbAdapter implements ChannelAdapter {
  readonly channelId = 'airbnb';
  readonly channelName = 'Airbnb';

  private readonly apiBaseUrl: string;
  private readonly accessToken: string;
  private readonly listingId: string;

  constructor(config?: {
    apiBaseUrl?: string;
    accessToken?: string;
    listingId?: string;
  }) {
    this.apiBaseUrl =
      config?.apiBaseUrl ??
      process.env.AIRBNB_API_URL ??
      'https://api.airbnb.com/v2';
    this.accessToken =
      config?.accessToken ?? process.env.AIRBNB_ACCESS_TOKEN ?? '';
    this.listingId =
      config?.listingId ?? process.env.AIRBNB_LISTING_ID ?? '';
  }

  /**
   * Fetch reservations from Airbnb since a given date.
   * Polls the Airbnb reservations API for new/modified bookings.
   */
  async fetchReservations(since: Date): Promise<ExternalReservation[]> {
    const response = await this.apiRequest<AirbnbReservationsResponse>(
      '/reservations',
      {
        method: 'GET',
        params: {
          listing_id: this.listingId,
          start_date: since.toISOString().split('T')[0],
          status: 'accepted',
        },
      }
    );

    return response.reservations.map((r) => this.mapReservation(r));
  }

  /**
   * Push room availability updates to Airbnb.
   * Uses the calendar API to update listing availability.
   */
  async pushAvailability(rooms: RoomAvailability[]): Promise<SyncResult> {
    const payload = rooms.map((room) => ({
      listing_id: this.listingId,
      date: room.date,
      available: room.available,
    }));

    const response = await this.apiRequest<AirbnbSyncResponse>(
      '/calendar',
      {
        method: 'PUT',
        body: { days: payload },
      }
    );

    return {
      success: response.status === 'success',
      syncedAt: new Date().toISOString(),
      itemsProcessed: rooms.length,
      errors: response.errors?.length ? response.errors : undefined,
    };
  }

  /**
   * Push rate updates to Airbnb.
   * Uses the pricing API to update listing rates.
   */
  async pushRates(rates: RateUpdate[]): Promise<SyncResult> {
    const payload = rates.map((rate) => ({
      listing_id: this.listingId,
      date: rate.date,
      price: rate.rate,
      currency: rate.currency,
    }));

    const response = await this.apiRequest<AirbnbSyncResponse>(
      '/pricing',
      {
        method: 'PUT',
        body: { pricing: payload },
      }
    );

    return {
      success: response.status === 'success',
      syncedAt: new Date().toISOString(),
      itemsProcessed: rates.length,
      errors: response.errors?.length ? response.errors : undefined,
    };
  }

  /**
   * Verify connection to Airbnb API.
   */
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      await this.apiRequest<{ listing: { id: string } }>(
        `/listings/${this.listingId}`,
        { method: 'GET' }
      );
      return 'connected';
    } catch {
      return 'error';
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private mapReservation(raw: AirbnbReservation): ExternalReservation {
    return {
      externalId: raw.confirmation_code,
      channelId: this.channelId,
      guestName: `${raw.guest.first_name} ${raw.guest.last_name}`,
      guestEmail: raw.guest.email,
      guestPhone: raw.guest.phone,
      checkIn: raw.start_date,
      checkOut: raw.end_date,
      roomType: raw.listing.room_type ?? 'entire_home',
      numberOfGuests: raw.number_of_guests,
      totalPrice: raw.expected_payout_amount_accurate,
      currency: raw.listing_base_price_currency,
      rawPayload: raw as unknown as Record<string, unknown>,
    };
  }

  private async apiRequest<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT';
      params?: Record<string, string>;
      body?: unknown;
    }
  ): Promise<T> {
    const url = new URL(`${this.apiBaseUrl}${endpoint}`);

    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Airbnb-API-Key': this.accessToken,
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      throw new Error(
        `Airbnb API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }
}

// ─── Airbnb API Response Types ────────────────────────────────────────────────

interface AirbnbReservation {
  confirmation_code: string;
  guest: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  start_date: string;
  end_date: string;
  listing: {
    room_type?: string;
  };
  number_of_guests: number;
  expected_payout_amount_accurate: number;
  listing_base_price_currency: string;
}

interface AirbnbReservationsResponse {
  reservations: AirbnbReservation[];
}

interface AirbnbSyncResponse {
  status: 'success' | 'error';
  errors?: string[];
}

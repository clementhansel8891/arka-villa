/**
 * Booking.com channel adapter.
 *
 * Implements the ChannelAdapter interface for Booking.com OTA integration.
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
 * Booking.com adapter implementing the ChannelAdapter interface.
 *
 * In production, this would use the Booking.com Connectivity API.
 * Currently implements the contract with structured API calls.
 */
export class BookingComAdapter implements ChannelAdapter {
  readonly channelId = 'booking_com';
  readonly channelName = 'Booking.com';

  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly hotelId: string;

  constructor(config?: {
    apiBaseUrl?: string;
    apiKey?: string;
    hotelId?: string;
  }) {
    this.apiBaseUrl =
      config?.apiBaseUrl ??
      process.env.BOOKING_COM_API_URL ??
      'https://supply-xml.booking.com/hotels/xml';
    this.apiKey =
      config?.apiKey ?? process.env.BOOKING_COM_API_KEY ?? '';
    this.hotelId =
      config?.hotelId ?? process.env.BOOKING_COM_HOTEL_ID ?? '';
  }

  /**
   * Fetch reservations from Booking.com since a given date.
   * Polls the Booking.com reservations API for new/modified bookings.
   */
  async fetchReservations(since: Date): Promise<ExternalReservation[]> {
    const response = await this.apiRequest<BookingComReservationsResponse>(
      '/reservations',
      {
        method: 'GET',
        params: {
          hotel_id: this.hotelId,
          last_change: since.toISOString(),
        },
      }
    );

    return response.reservations.map((r) => this.mapReservation(r));
  }

  /**
   * Push room availability updates to Booking.com.
   * Uses the availability API to update room inventory.
   */
  async pushAvailability(rooms: RoomAvailability[]): Promise<SyncResult> {
    const payload = rooms.map((room) => ({
      room_id: room.roomId,
      date: room.date,
      available: room.available ? 1 : 0,
    }));

    const response = await this.apiRequest<BookingComSyncResponse>(
      '/availability',
      {
        method: 'POST',
        body: { updates: payload },
      }
    );

    return {
      success: response.status === 'ok',
      syncedAt: new Date().toISOString(),
      itemsProcessed: rooms.length,
      errors: response.errors?.length ? response.errors : undefined,
    };
  }

  /**
   * Push rate updates to Booking.com.
   * Uses the rates API to update room pricing.
   */
  async pushRates(rates: RateUpdate[]): Promise<SyncResult> {
    const payload = rates.map((rate) => ({
      room_id: rate.roomId,
      date: rate.date,
      price: rate.rate,
      currency: rate.currency,
    }));

    const response = await this.apiRequest<BookingComSyncResponse>(
      '/rates',
      {
        method: 'POST',
        body: { updates: payload },
      }
    );

    return {
      success: response.status === 'ok',
      syncedAt: new Date().toISOString(),
      itemsProcessed: rates.length,
      errors: response.errors?.length ? response.errors : undefined,
    };
  }

  /**
   * Verify connection to Booking.com API.
   */
  async checkConnection(): Promise<ConnectionStatus> {
    try {
      await this.apiRequest<{ status: string }>('/ping', { method: 'GET' });
      return 'connected';
    } catch {
      return 'error';
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────

  private mapReservation(raw: BookingComReservation): ExternalReservation {
    return {
      externalId: raw.reservation_id,
      channelId: this.channelId,
      guestName: raw.guest_name,
      guestEmail: raw.guest_email,
      guestPhone: raw.guest_phone,
      checkIn: raw.checkin,
      checkOut: raw.checkout,
      roomType: raw.room_type,
      numberOfGuests: raw.num_guests,
      totalPrice: raw.total_price,
      currency: raw.currency,
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
      Authorization: `Bearer ${this.apiKey}`,
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
        `Booking.com API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }
}

// ─── Booking.com API Response Types ───────────────────────────────────────────

interface BookingComReservation {
  reservation_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  checkin: string;
  checkout: string;
  room_type: string;
  num_guests: number;
  total_price: number;
  currency: string;
}

interface BookingComReservationsResponse {
  reservations: BookingComReservation[];
}

interface BookingComSyncResponse {
  status: 'ok' | 'error';
  errors?: string[];
}

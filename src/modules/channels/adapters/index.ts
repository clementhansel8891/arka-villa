/**
 * Channel adapter registry.
 *
 * Registers available channel adapters and provides lookup
 * by channel ID. New adapters can be registered without modifying
 * the Booking_Engine core logic.
 *
 * Requirements: 6.1, 6.8
 */

import type { ChannelAdapter } from '../types';
import { BookingComAdapter } from './booking-com';
import { AirbnbAdapter } from './airbnb';

/** Registry of available channel adapters, keyed by channel ID. */
const adapterRegistry = new Map<string, ChannelAdapter>();

/**
 * Register a channel adapter in the registry.
 * This allows new OTA integrations to be added without
 * modifying existing code.
 */
export function registerAdapter(adapter: ChannelAdapter): void {
  adapterRegistry.set(adapter.channelId, adapter);
}

/**
 * Get a registered adapter by channel ID.
 * Returns undefined if the channel is not registered.
 */
export function getAdapter(channelId: string): ChannelAdapter | undefined {
  return adapterRegistry.get(channelId);
}

/**
 * Get all registered adapters.
 */
export function getAllAdapters(): ChannelAdapter[] {
  return Array.from(adapterRegistry.values());
}

/**
 * Get all registered channel IDs.
 */
export function getRegisteredChannelIds(): string[] {
  return Array.from(adapterRegistry.keys());
}

/**
 * Remove an adapter from the registry.
 */
export function unregisterAdapter(channelId: string): boolean {
  return adapterRegistry.delete(channelId);
}

/**
 * Initialize the default adapters.
 * Called during module initialization to register Booking.com and Airbnb.
 */
export function initializeDefaultAdapters(): void {
  registerAdapter(new BookingComAdapter());
  registerAdapter(new AirbnbAdapter());
}

// Initialize default adapters on module load
initializeDefaultAdapters();

export { BookingComAdapter } from './booking-com';
export { AirbnbAdapter } from './airbnb';

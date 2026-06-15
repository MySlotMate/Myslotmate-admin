// Admin on-spot ("walk-in") booking API.
//
// Flow: initiate → (paid: open Razorpay checkout on-screen) → complete.
// Free events confirm immediately on initiate (paid === false).

import { apiFetch } from './client';

export interface WalkInInitiateBody {
  guest_name: string;
  guest_phone: string;
  event_id: string;
  quantity: number;
  occurrence_date?: string; // RFC3339; required for recurring events
}

export interface WalkInInitiateResponse {
  paid: boolean;
  booking?: unknown;
  guest_user_id: string;
  occurrence_date: string;
  // Razorpay checkout fields (paid path only)
  order_id?: string;
  key_id?: string;
  amount_cents?: number;
  currency?: string;
  payment_id?: string;
}

export interface WalkInCompleteBody {
  guest_user_id: string;
  event_id: string;
  quantity: number;
  occurrence_date?: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Result of looking up whether a phone already belongs to a user.
export interface WalkInPhoneLookup {
  exists: boolean;
  user_id?: string;
  name?: string;
}

// Looks up a phone (full +91… form) to auto-fill the guest name if it exists.
export function lookupWalkInPhone(phone: string): Promise<WalkInPhoneLookup> {
  return apiFetch<WalkInPhoneLookup>(`/admin/bookings/walk-in/lookup?phone=${encodeURIComponent(phone)}`);
}

// One upcoming occurrence of an event, from GET /events/{id}/availability.
export interface EventOccurrence {
  date: string; // RFC3339 — pass back verbatim as occurrence_date
  total_booked: number;
  capacity: number;
  remaining: number;
  is_fully_booked: boolean;
  is_paused?: boolean;
}

// Fetches upcoming occurrences for an event (single date for non-recurring).
export function fetchEventOccurrences(eventId: string): Promise<EventOccurrence[]> {
  return apiFetch<EventOccurrence[]>(`/events/${eventId}/availability`);
}

export function initiateWalkIn(body: WalkInInitiateBody): Promise<WalkInInitiateResponse> {
  return apiFetch<WalkInInitiateResponse>('/admin/bookings/walk-in/initiate', {
    method: 'POST',
    body,
  });
}

export function completeWalkIn(body: WalkInCompleteBody): Promise<unknown> {
  return apiFetch<unknown>('/admin/bookings/walk-in/complete', {
    method: 'POST',
    body,
  });
}

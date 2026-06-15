// Admin directory data — Users and Hosts tabs.
// These hit the admin-token-protected /admin/directory/* endpoints and return
// server-paginated, server-filtered data shaped to the dashboard's domain types.

import { apiFetch } from './client';
import type { User, Host, HostApplicationStatus } from '../types';

// Paginated is the envelope the backend returns for list endpoints.
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserQuery {
  page: number;
  pageSize: number;
  search?: string;
  city?: string;
  tier?: string; // 'high_value' | 'repeat' | 'new'
}

export interface HostQuery {
  page: number;
  pageSize: number;
  search?: string;
}

function buildParams(base: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function fetchUsers(q: UserQuery): Promise<Paginated<User>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    city: q.city,
    tier: q.tier,
  });
  return apiFetch<Paginated<User>>(`/admin/directory/users?${qs}`);
}

export function fetchHosts(q: HostQuery): Promise<Paginated<Host>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
  });
  return apiFetch<Paginated<Host>>(`/admin/directory/hosts?${qs}`);
}

// ── Single host detail (profile page) ────────────────────────────────────────

// HostRecord mirrors the backend host model (snake_case). Only the fields the
// profile page renders are typed here.
export interface HostRecord {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  phn_number: string;
  avatar_url?: string;
  tagline?: string;
  bio?: string;
  application_status: HostApplicationStatus;
  experience_desc?: string;
  description?: string;
  moods?: string[];
  preferred_days?: string[];
  expertise_tags?: string[];
  group_size?: number;
  government_id_url?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  is_identity_verified?: boolean;
  is_super_host?: boolean;
  is_community_champ?: boolean;
  social_instagram?: string;
  social_linkedin?: string;
  social_website?: string;
  avg_rating?: number;
  total_reviews?: number;
  created_at: string;
}

export interface HostDetailUser {
  name: string;
  email: string;
  phone: string;
  city: string;
  isVerified: boolean;
}

export interface HostDetailStats {
  experiencesCreated: number;
  bookingsGenerated: number;
  revenueGenerated: number;
}

export interface HostDetail {
  host: HostRecord;
  user: HostDetailUser | null;
  stats: HostDetailStats;
}

export function fetchHostDetail(hostId: string): Promise<HostDetail> {
  return apiFetch<HostDetail>(`/admin/directory/hosts/${hostId}`);
}

// HostEvent is a host's experience as returned by the events endpoint.
export interface HostEvent {
  id: string;
  title: string;
  status: string;
  price_cents?: number;
  is_free: boolean;
  is_online: boolean;
  location?: string;
  capacity: number;
  total_bookings: number;
  avg_rating?: number;
  time: string;
  cover_image_url?: string;
  mood?: string;
}

export function fetchHostEvents(hostId: string): Promise<HostEvent[]> {
  return apiFetch<HostEvent[]>(`/events/host/${hostId}`);
}

// ── All events (Experiences tab) ─────────────────────────────────────────────

export interface AdminEvent {
  id: string;
  title: string;
  hostName: string;
  city: string;
  category: string;
  price: number;
  isFree: boolean;
  bookings: number;
  rating: number;
  status: string; // draft | live | paused | cancelled
}

export interface EventQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export function fetchEvents(q: EventQuery): Promise<Paginated<AdminEvent>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    status: q.status,
  });
  return apiFetch<Paginated<AdminEvent>>(`/admin/directory/events?${qs}`);
}

// ── Bookings tab ─────────────────────────────────────────────────────────────

export interface AdminBooking {
  id: string;
  event_id: string;
  user: string;
  experience: string;
  host: string;
  city: string;
  date: string;
  occurrence_date: string; // RFC3339, used for ticket generation
  amount: number;
  amount_cents: number;
  quantity: number;
  paymentStatus: string;
  bookingStatus: string;
}

export interface BookingQuery {
  page: number;
  pageSize: number;
  search?: string;
  status?: string; // booking status: pending | confirmed | cancelled | refunded
  eventId?: string; // filter to a single experience (event UUID)
}

export function fetchBookings(q: BookingQuery): Promise<Paginated<AdminBooking>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    status: q.status,
    event_id: q.eventId,
  });
  return apiFetch<Paginated<AdminBooking>>(`/admin/directory/bookings?${qs}`);
}

export interface BookingReminderPreview {
  whatsapp_body: string;
  email_subject: string;
  email_body: string;
  user_email: string;
  user_phone: string;
}

export function fetchBookingReminderPreview(bookingId: string): Promise<BookingReminderPreview> {
  return apiFetch<BookingReminderPreview>(`/admin/directory/bookings/${bookingId}/reminder-preview`);
}

export function sendBookingReminder(bookingId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/admin/directory/bookings/${bookingId}/send-reminder`, {
    method: 'POST',
  });
}

export function bulkNotifyEventGuests(
  eventId: string,
  body: { message: string; channel: string }
): Promise<{ message: string; notified_count: number }> {
  return apiFetch<{ message: string; notified_count: number }>(
    `/admin/directory/marketing/events/${eventId}/bulk-notify`,
    {
      method: 'POST',
      body,
    }
  );
}

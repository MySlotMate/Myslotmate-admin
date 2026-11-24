// Landing pages API — /marketing-pages/* on the Go backend.
// A landing page lives at myslotmate.com/{slug}, links to one event (live
// price/slots/booking) but owns an independent copy of the content.

import { apiFetch } from './client';

export interface LandingPageDTO {
  id: string;
  slug: string;
  event_id: string;
  event_slug: string;
  event_title: string;
  title: string;
  hook_line: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  content: string;
  cta_text: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Full replace: every field is sent; an empty string clears it. */
export interface LandingPageUpdatePayload {
  slug: string;
  title: string;
  hook_line: string;
  cover_image_url: string;
  gallery_urls: string[];
  content: string;
  cta_text: string;
  seo_description: string;
}

export const SITE_URL = 'https://myslotmate.com';

export interface MarketingEventOption {
  id: string;
  title: string;
  hostName: string;
  city: string;
  status: string;
}

/** Event picker for "Create new" — also open to the marketing login. */
export function searchMarketingEvents(search?: string): Promise<{ items: MarketingEventOption[] }> {
  const qs = new URLSearchParams({ page: '1', page_size: '10' });
  if (search) qs.set('search', search);
  return apiFetch<{ items: MarketingEventOption[] }>(`/marketing-pages/events?${qs}`);
}

export function fetchLandingPages(): Promise<LandingPageDTO[]> {
  return apiFetch<LandingPageDTO[]>('/marketing-pages/admin');
}

/** Creates a page for the event, prefilled from the event's content. */
export function createLandingPage(eventId: string): Promise<LandingPageDTO> {
  return apiFetch<LandingPageDTO>('/marketing-pages', { method: 'POST', body: { event_id: eventId } });
}

export function updateLandingPage(id: string, body: LandingPageUpdatePayload): Promise<LandingPageDTO> {
  return apiFetch<LandingPageDTO>(`/marketing-pages/${id}`, { method: 'PUT', body });
}

export function deleteLandingPage(id: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/marketing-pages/${id}`, { method: 'DELETE' });
}

export function setLandingPagePublished(id: string, published: boolean): Promise<LandingPageDTO> {
  return apiFetch<LandingPageDTO>(`/marketing-pages/${id}/${published ? 'publish' : 'unpublish'}`, { method: 'POST' });
}

export async function uploadLandingImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('files', file);
  const results = await apiFetch<Array<{ url: string }>>('/upload?folder=marketing/pages', {
    method: 'POST',
    body: formData,
  });
  return results[0]?.url || '';
}

// ── Live event data for the editor preview ───────────────────────────────
// The same public endpoints the website's event page reads, so the preview
// shows the real dates, location, host and price.

export interface LiveEvent {
  id: string;
  host_id: string;
  mood: string | null;
  is_private: boolean;
  is_online: boolean;
  is_free: boolean;
  is_recurring: boolean;
  schedule_type: string | null;
  custom_dates: string[] | null;
  location: string | null;
  google_maps_url: string | null;
  time: string | null;
  next_available_date: string | null;
  duration_minutes: number | null;
  capacity: number;
  total_bookings: number;
  price_cents: number | null;
  price_tiers: Array<{ price_cents: number }> | null;
}

export interface LiveHost {
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  tagline: string | null;
  city: string | null;
  is_identity_verified: boolean;
  host_tier?: string | null;
  application_status?: string | null;
}

export interface LiveEventData {
  event: LiveEvent;
  availability: Array<{ date: string; is_fully_booked: boolean }> | null;
  host: LiveHost | null;
  rating: { average_rating: number; total_reviews: number } | null;
}

export async function fetchLiveEvent(eventSlug: string): Promise<LiveEventData> {
  const event = await apiFetch<LiveEvent>(`/events/${encodeURIComponent(eventSlug)}`, { auth: false });
  const [availability, host, rating] = await Promise.all([
    apiFetch<LiveEventData['availability']>(`/events/${event.id}/availability`, { auth: false }).catch(() => null),
    apiFetch<LiveHost>(`/hosts/${event.host_id}`, { auth: false }).catch(() => null),
    apiFetch<LiveEventData['rating']>(`/reviews/event/${event.id}/rating`, { auth: false }).catch(() => null),
  ]);
  return { event, availability, host, rating };
}

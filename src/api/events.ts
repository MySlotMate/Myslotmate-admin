// Event creation on behalf of a host. The backend's /events routes accept the
// acting host via `host_id` in the body, so the admin console can create and
// publish an experience for any host. Payload shape mirrors
// MySlotmate-Frontend/src/lib/api.ts (EventCreatePayload).

import { apiFetch } from './client';

export interface PriceTierInput {
  name: string;
  price_cents: number;
  capacity?: number | null;
  sort_order?: number;
}

/**
 * A group experience takes many guests per session; a one-on-one experience is
 * a calendar of single-seat slots (capacity 1). Dated windows are expanded into
 * custom_dates; weekly windows repeat and are generated server-side.
 */
export type SessionType = 'group' | 'one_on_one';

/** How a private event gates booking: a typed passkey, or an approved request. */
export type PrivateAccessMode = 'passkey' | 'rsvp';

/** One availability window, in IST wall-clock. Dated OR weekly, never both. */
export interface ApiSessionWindow {
  /** "YYYY-MM-DD" — dated windows only. */
  date: string;
  /** "HH:mm" */
  start: string;
  /** "HH:mm" */
  end: string;
  /** 0 = Sunday … 6 = Saturday — weekly windows only. */
  weekday?: number;
}

export interface EventCreatePayload {
  host_id: string;
  title: string;
  hook_line?: string;
  mood?: string;
  description?: string;
  cover_image_url?: string;
  gallery_urls?: string[];
  time: string;
  end_time?: string;
  is_online?: boolean;
  location?: string;
  location_lat?: number;
  location_lng?: number;
  duration_minutes?: number;
  capacity: number;
  min_group_size?: number;
  max_group_size?: number;
  languages?: string[];
  level?: string;
  price_cents?: number;
  is_free?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string;
  schedule_type?: 'one_time' | 'recurring' | 'custom_dates';
  custom_dates?: string[];
  session_type?: SessionType;
  break_minutes?: number;
  session_windows?: ApiSessionWindow[];
  private_access_mode?: PrivateAccessMode;
  cancellation_policy?: string;
  meeting_link?: string;
  google_maps_url?: string;
  status?: 'draft' | 'live';
  price_tiers?: PriceTierInput[];
  requires_attendee_details?: boolean;
  attendee_fields?: string[];
  terms_and_conditions?: string;
  // Privacy & access. is_private lists the event with a lock; access_passkey is
  // required at the Book step; passkey_grants_free makes that passkey also comp a
  // paid booking to free.
  is_private?: boolean;
  access_passkey?: string | null;
  passkey_grants_free?: boolean;
}

export interface CreatedEvent {
  id: string;
  title: string;
  status: string;
}

export function createEvent(body: EventCreatePayload): Promise<CreatedEvent> {
  return apiFetch<CreatedEvent>('/events/', { method: 'POST', body });
}

// EventUpdatePayload mirrors EventCreatePayload; the backend PUT accepts all
// fields as optional and requires host_id in the body for ownership. `slug`
// lets an admin override the public URL slug (validated + de-duplicated
// server-side; a collision returns 409).
export type EventUpdatePayload = Omit<EventCreatePayload, 'status'> & {
  slug?: string;
};

export function updateEvent(
  eventId: string,
  body: EventUpdatePayload,
): Promise<unknown> {
  return apiFetch(`/events/${eventId}`, { method: 'PUT', body });
}

// Live duplicate check for the slug editor. `exclude` is the event being
// edited, so its own current slug does not count as taken.
export interface SlugAvailability {
  available: boolean;
  slug: string;
}

export function checkEventSlugAvailability(
  slug: string,
  excludeEventId?: string,
): Promise<SlugAvailability> {
  const params = new URLSearchParams({ slug });
  if (excludeEventId) params.set('exclude', excludeEventId);
  return apiFetch<SlugAvailability>(`/events/slug-available?${params.toString()}`);
}

// Full event detail (GET /events/{id}) for prefilling the edit form.
export interface EventDetail {
  id: string;
  slug: string;
  host_id: string;
  title: string;
  hook_line: string | null;
  mood: string | null;
  description: string | null;
  cover_image_url: string | null;
  gallery_urls: string[] | null;
  time: string;
  end_time: string | null;
  is_online: boolean;
  location: string | null;
  meeting_link: string | null;
  google_maps_url: string | null;
  duration_minutes: number | null;
  min_group_size: number | null;
  max_group_size: number | null;
  capacity: number;
  languages: string[] | null;
  level: string | null;
  price_cents: number | null;
  is_free: boolean;
  is_recurring: boolean;
  recurrence_rule: string | null;
  schedule_type?: string;
  custom_dates?: string[] | null;
  session_type?: SessionType;
  break_minutes?: number;
  session_windows?: ApiSessionWindow[] | null;
  private_access_mode?: PrivateAccessMode;
  cancellation_policy: string | null;
  price_tiers: { id: string; name: string; price_cents: number }[] | null;
  requires_attendee_details: boolean;
  attendee_fields: string[] | null;
  terms_and_conditions: string | null;
  is_private: boolean;
  // Only returned when the owning host_id is supplied (see fetchEventDetail).
  access_passkey: string | null;
  passkey_grants_free: boolean;
}

// Pass the owning hostId so the backend includes the private-event passkey in
// the response (it is stripped for anyone else). Needed to prefill the edit form.
export function fetchEventDetail(eventId: string, hostId?: string): Promise<EventDetail> {
  const qs = hostId ? `?host_id=${encodeURIComponent(hostId)}` : '';
  return apiFetch<EventDetail>(`/events/${eventId}${qs}`);
}

export function publishEvent(eventId: string, hostId: string): Promise<CreatedEvent> {
  return apiFetch<CreatedEvent>(`/events/${eventId}/publish`, {
    method: 'POST',
    body: { host_id: hostId },
  });
}

// deleteEvent permanently deletes an experience. The backend refuses if the
// event still has active (pending/confirmed) bookings — cancel it first.
export function deleteEvent(eventId: string, hostId: string): Promise<unknown> {
  return apiFetch(`/events/${eventId}`, {
    method: 'DELETE',
    body: { host_id: hostId },
  });
}

// One occurrence of a (possibly recurring) experience, for the pause picker.
export interface EventOccurrence {
  date: string;
  remaining: number;
  is_fully_booked: boolean;
  is_paused: boolean;
}

// GET /events/{id}/occurrences?host_id= — every upcoming session, paused ones
// flagged. Used to pick which session(s) to pause.
export function fetchEventOccurrences(
  eventId: string,
  hostId: string,
): Promise<EventOccurrence[]> {
  return apiFetch<EventOccurrence[]>(
    `/events/${eventId}/occurrences?host_id=${encodeURIComponent(hostId)}`,
  );
}

// pauseEvent pauses an experience. Modes:
//  - neither arg           → pause entirely (all future sessions)
//  - pausedFrom=<RFC3339>  → pause that session and every one after it
//  - pausedDate=<RFC3339>  → skip just that one occurrence (recurring only)
// NOTE: the backend automatically cancels + refunds the affected bookings.
export function pauseEvent(
  eventId: string,
  hostId: string,
  pausedFrom?: string,
  pausedDate?: string,
): Promise<unknown> {
  return apiFetch(`/events/${eventId}/pause`, {
    method: 'POST',
    body: { host_id: hostId, paused_from: pausedFrom, paused_date: pausedDate },
  });
}

// resumeEvent clears every pause (full, from-session and single-session) and
// puts the experience back live.
export function resumeEvent(eventId: string, hostId: string): Promise<unknown> {
  return apiFetch(`/events/${eventId}/resume`, {
    method: 'POST',
    body: { host_id: hostId },
  });
}

// ── Uploads ──────────────────────────────────────────────────────────────────

export interface UploadResult {
  file_name: string;
  url: string;
  size: number;
}

export type UploadFolder = 'events/covers' | 'events/gallery' | 'attendees/id-proofs' | 'general';

// POST /upload/?folder=<prefix> — multipart upload, returns hosted URLs.
export function uploadFiles(files: File[], folder: UploadFolder = 'general'): Promise<UploadResult[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return apiFetch<UploadResult[]>(`/upload/?folder=${encodeURIComponent(folder)}`, {
    method: 'POST',
    body: formData,
  });
}

// ── Experience templates (title/hook-line typeahead) ─────────────────────────

export interface ExperienceTemplate {
  id: string;
  mood: string;
  title: string;
  hook_line: string;
}

export function listExperienceTemplates(mood?: string): Promise<ExperienceTemplate[]> {
  const qs = mood ? `?mood=${encodeURIComponent(mood)}` : '';
  return apiFetch<ExperienceTemplate[]>(`/experience-templates${qs}`);
}

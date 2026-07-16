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
  cancellation_policy?: string;
  meeting_link?: string;
  google_maps_url?: string;
  status?: 'draft' | 'live';
  price_tiers?: PriceTierInput[];
  requires_attendee_details?: boolean;
  attendee_fields?: string[];
  terms_and_conditions?: string;
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
// fields as optional and requires host_id in the body for ownership.
export type EventUpdatePayload = Omit<EventCreatePayload, 'status'>;

export function updateEvent(
  eventId: string,
  body: EventUpdatePayload,
): Promise<unknown> {
  return apiFetch(`/events/${eventId}`, { method: 'PUT', body });
}

// Full event detail (GET /events/{id}) for prefilling the edit form.
export interface EventDetail {
  id: string;
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
  cancellation_policy: string | null;
  price_tiers: { id: string; name: string; price_cents: number }[] | null;
  requires_attendee_details: boolean;
  attendee_fields: string[] | null;
  terms_and_conditions: string | null;
}

export function fetchEventDetail(eventId: string): Promise<EventDetail> {
  return apiFetch<EventDetail>(`/events/${eventId}`);
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

export type UploadFolder = 'events/covers' | 'events/gallery' | 'general';

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

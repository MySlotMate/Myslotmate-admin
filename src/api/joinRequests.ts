// Join requests (RSVP) — guests asking to be let into a private experience.
//
// A private event is gated either by a passkey the guest types or, in RSVP
// mode, by an approved request. Approving UNLOCKS booking: the guest still
// books and still pays, so nothing here moves money.
//
// These are the ADMIN routes (/admin/join-requests/*), behind the admin token
// that client.ts attaches automatically. The host has its own equivalents.

import { apiFetch } from './client';

export type JoinRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

export interface JoinRequest {
  id: string;
  event_id: string;
  user_id: string;
  status: JoinRequestStatus;
  message?: string;
  /** The attendee answers as submitted, for the review screen. */
  answers_snapshot: Record<string, unknown>;
  reviewed_by_kind?: 'host' | 'admin';
  reviewed_by_label?: string;
  reviewed_at?: string;
  review_note?: string;
  created_at: string;
  updated_at: string;
  // Joined for display.
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  user_avatar_url?: string | null;
  event_title?: string;
  event_slug?: string;
}

export function listJoinRequests(params: {
  status?: JoinRequestStatus;
  limit?: number;
  offset?: number;
} = {}): Promise<JoinRequest[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<JoinRequest[]>(`/admin/join-requests${suffix}`);
}

export function approveJoinRequest(
  requestId: string,
  note?: string,
): Promise<JoinRequest> {
  return apiFetch<JoinRequest>(`/admin/join-requests/${requestId}/approve`, {
    method: 'POST',
    body: { note },
  });
}

export function rejectJoinRequest(
  requestId: string,
  note?: string,
): Promise<JoinRequest> {
  return apiFetch<JoinRequest>(`/admin/join-requests/${requestId}/reject`, {
    method: 'POST',
    body: { note },
  });
}

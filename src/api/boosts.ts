import { apiFetch } from './client';

// Event Boost: the admin queue, review and proposal. Money in paise, rates in
// basis points (1500 = 15%).

export type BoostStatus = 'under_review' | 'quote_ready' | 'live' | 'ended' | 'declined' | 'cancelled';

export interface BoostRate {
  ticket_key: string; // '' = the event's single price
  ticket_type_id: string | null;
  ticket_name: string;
  price_cents: number;
  guide_rate_bps: number;
  rate_bps: number;
  reason: string | null;
  band_version: number;
}

export interface Boost {
  id: string;
  event_id: string;
  host_id: string;
  status: BoostStatus;
  rates: BoostRate[];
  admin_note: string | null;
  decline_reason: string | null;
  goal_text: string | null;
  audience_notes: string | null;
  channels: string[];
  requested_at: string;
  proposed_at: string | null;
  planned_from: string | null;
  planned_until: string | null;
  accepted_at: string | null;
  live_from: string | null;
  live_until: string | null;
  ended_reason: string | null;
  reach: number;
  clicks: number;
  tickets_sold: number;
  commission_cents: number;
  event_title: string;
  host_name: string;
}

export interface BoostBand {
  version: number;
  min_price_cents: number;
  max_price_cents: number | null;
  guide_rate_bps: number;
  min_rate_bps: number;
  max_rate_bps: number;
}

export interface BoostLogEntry {
  actor_kind: 'host' | 'admin' | 'system';
  actor: string | null;
  action: string;
  details?: unknown;
  created_at: string;
}

export interface BoostDetail extends Boost {
  event: {
    id: string;
    title: string;
    slug?: string;
    time: string;
    schedule_type?: string;
    status: string;
    location?: string | null;
    is_online?: boolean;
    cover_image_url?: string | null;
    capacity?: number;
  };
  current_ticket_types: BoostRate[];
  bands: BoostBand[];
  eligibility_problem: string;
  host_invited: boolean;
  log: BoostLogEntry[];
}

export const fetchBoosts = (status: BoostStatus | '' = '') =>
  apiFetch<{ items: Boost[]; counts: Partial<Record<BoostStatus, number>> }>(
    `/admin/boosts/${status ? `?status=${status}` : ''}`,
  );

export const fetchBoost = (id: string) => apiFetch<BoostDetail>(`/admin/boosts/${id}`);

export interface ProposalPayload {
  rates: { ticket_key: string; rate_bps: number; reason?: string }[];
  note?: string;
  planned_from?: string | null;
  planned_until?: string | null;
}

export const proposeBoost = (id: string, p: ProposalPayload) =>
  apiFetch<Boost>(`/admin/boosts/${id}/proposal`, { method: 'PUT', body: p });

export const declineBoost = (id: string, reason: string) =>
  apiFetch<Boost>(`/admin/boosts/${id}/decline`, { method: 'POST', body: { reason } });

export const goLiveBoost = (id: string, liveUntil?: string | null) =>
  apiFetch<Boost>(`/admin/boosts/${id}/go-live`, { method: 'POST', body: liveUntil ? { live_until: liveUntil } : {} });

export const endBoost = (id: string) => apiFetch<Boost>(`/admin/boosts/${id}/end`, { method: 'POST', body: {} });

export const logBoostCampaign = (id: string, reach: number, clicks: number) =>
  apiFetch<Boost>(`/admin/boosts/${id}/campaign`, { method: 'PATCH', body: { reach, clicks } });

export const fetchBoostInvite = (hostId: string) =>
  apiFetch<{ invited: boolean }>(`/admin/boost-invites/${hostId}`);

export const setBoostInvite = (hostId: string, invited: boolean) =>
  apiFetch<{ invited: boolean }>(`/admin/boost-invites/${hostId}`, { method: 'PUT', body: { invited } });

/** Commission on one ticket at a rate, half-up to the paisa (matches the backend). */
export const commissionCents = (priceCents: number, bps: number) => Math.floor((priceCents * bps + 5000) / 10000);

export const STATUS_LABEL: Record<BoostStatus, string> = {
  under_review: 'New',
  quote_ready: 'Proposed',
  live: 'Live',
  ended: 'Ended',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

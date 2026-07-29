// Comp coupons — host-issued codes that waive a booking to free (no partial
// discounts in v1). Scoped to a single event (event_id) or all of a host's
// events (event_id null). The backend accepts the acting host via host_id in the
// body, matching the rest of the admin console.

import { apiFetch } from './client';

export interface Coupon {
  id: string;
  host_id: string;
  event_id: string | null;
  code: string;
  max_redemptions: number | null;
  times_redeemed: number;
  per_user_limit: number | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponPayload {
  host_id: string;
  event_id?: string | null;
  code: string;
  max_redemptions?: number | null;
  per_user_limit?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active?: boolean;
}

export function listHostCoupons(hostId: string): Promise<Coupon[]> {
  return apiFetch<Coupon[]>(`/coupons/host/${hostId}`);
}

export function createCoupon(body: CouponPayload): Promise<Coupon> {
  return apiFetch<Coupon>('/coupons/', { method: 'POST', body });
}

export function updateCoupon(couponId: string, body: CouponPayload): Promise<Coupon> {
  return apiFetch<Coupon>(`/coupons/${couponId}`, { method: 'PUT', body });
}

export function deleteCoupon(couponId: string, hostId: string): Promise<unknown> {
  return apiFetch(`/coupons/${couponId}?host_id=${encodeURIComponent(hostId)}`, {
    method: 'DELETE',
  });
}

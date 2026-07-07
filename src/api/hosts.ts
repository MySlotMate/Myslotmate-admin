// Admin host-management actions. These call the backend's /admin/hosts/{id}/*
// endpoints, which accept the admin session token.

import { apiFetch } from './client';
import type { HostApplicationStatus } from '../types';

export function approveHost(hostId: string): Promise<unknown> {
  return apiFetch(`/admin/hosts/${hostId}/approve`, { method: 'POST' });
}

export function rejectHost(hostId: string, reason: string): Promise<unknown> {
  return apiFetch(`/admin/hosts/${hostId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

// updateHostApplicationStatus sets a host's application status to any valid
// value (admin override).
export function updateHostApplicationStatus(
  hostId: string,
  status: HostApplicationStatus,
): Promise<unknown> {
  return apiFetch(`/admin/hosts/${hostId}/application-status`, {
    method: 'PUT',
    body: { status },
  });
}

// setHostPlatformFee overrides this host's commission split — platformPercentage
// is the platform's cut (host keeps the remainder). Pass null to clear the
// override and fall back to the platform-wide default.
export function setHostPlatformFee(
  hostId: string,
  platformPercentage: number | null,
): Promise<unknown> {
  return apiFetch(`/admin/hosts/${hostId}/platform-fee`, {
    method: 'PUT',
    body: { platform_percentage: platformPercentage },
  });
}

export interface PlatformFeeConfig {
  host_percentage: number;
  platform_percentage: number;
}

// fetchPlatformFeeConfig returns the effective global commission split — the
// fallback applied to any host without a per-host override (see
// setHostPlatformFee above).
export function fetchPlatformFeeConfig(): Promise<PlatformFeeConfig> {
  return apiFetch<PlatformFeeConfig>('/admin/platform/fee-config');
}

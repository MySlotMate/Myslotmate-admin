// Admin host-management actions. These call the backend's /admin/hosts/{id}/*
// endpoints, which accept the admin session token.

import { apiFetch } from './client';
import type { HostApplicationStatus } from '../types';
import type { HostRecord } from './directory';

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

// HostProfileUpdate is the admin-editable subset of a host's profile. Every
// field is optional — only the keys sent are changed (partial update). Send an
// empty array to clear a list field. Application status and commission split are
// NOT here; they have their own controls/endpoints.
export interface HostProfileUpdate {
  first_name?: string;
  last_name?: string;
  city?: string;
  phn_number?: string;
  avatar_url?: string;
  tagline?: string;
  bio?: string;
  description?: string;
  experience_desc?: string;
  group_size?: number | null;
  government_id_url?: string;
  gallery_urls?: string[];
  moods?: string[];
  preferred_days?: string[];
  expertise_tags?: string[];
  social_instagram?: string;
  social_linkedin?: string;
  social_website?: string;
  is_identity_verified?: boolean;
  is_super_host?: boolean;
  is_community_champ?: boolean;
}

// updateHostProfile saves an admin edit of a host's profile and returns the
// updated host record.
export function updateHostProfile(
  hostId: string,
  patch: HostProfileUpdate,
): Promise<HostRecord> {
  return apiFetch<HostRecord>(`/admin/hosts/${hostId}/profile`, {
    method: 'PUT',
    body: patch,
  });
}

// uploadHostAvatar uploads a cropped avatar image and returns its hosted URL.
export async function uploadHostAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('files', file);
  const results = await apiFetch<Array<{ url: string }>>(
    '/upload?folder=hosts/avatars',
    { method: 'POST', body: formData },
  );
  return results[0]?.url || '';
}

// uploadHostGallery uploads one or more gallery photos and returns their hosted
// URLs (order preserved).
export async function uploadHostGallery(files: File[]): Promise<string[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  const results = await apiFetch<Array<{ url: string }>>(
    '/upload?folder=hosts/gallery',
    { method: 'POST', body: formData },
  );
  return results.map((r) => r.url).filter(Boolean);
}

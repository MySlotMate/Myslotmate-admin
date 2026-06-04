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

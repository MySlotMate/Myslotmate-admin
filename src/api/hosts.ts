// Admin host-management actions — approve / reject (suspend) a host application.
// These call the backend's /admin/hosts/{id}/* endpoints, which accept the
// admin session token.

import { apiFetch } from './client';

export function approveHost(hostId: string): Promise<unknown> {
  return apiFetch(`/admin/hosts/${hostId}/approve`, { method: 'POST' });
}

export function rejectHost(hostId: string, reason: string): Promise<unknown> {
  return apiFetch(`/admin/hosts/${hostId}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

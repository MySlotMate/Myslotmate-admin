// Admin directory data — Users and Hosts tabs.
// These hit the admin-token-protected /admin/directory/* endpoints and return
// server-paginated, server-filtered data shaped to the dashboard's domain types.

import { apiFetch } from './client';
import type { User, Host } from '../types';

// Paginated is the envelope the backend returns for list endpoints.
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserQuery {
  page: number;
  pageSize: number;
  search?: string;
  city?: string;
  tier?: string; // 'high_value' | 'repeat' | 'new'
}

export interface HostQuery {
  page: number;
  pageSize: number;
  search?: string;
}

function buildParams(base: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

export function fetchUsers(q: UserQuery): Promise<Paginated<User>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    city: q.city,
    tier: q.tier,
  });
  return apiFetch<Paginated<User>>(`/admin/directory/users?${qs}`);
}

export function fetchHosts(q: HostQuery): Promise<Paginated<Host>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
  });
  return apiFetch<Paginated<Host>>(`/admin/directory/hosts?${qs}`);
}

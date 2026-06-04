// Admin authentication API — talks to the backend's /admin/auth/* endpoints.

import { apiFetch, setToken } from './client';

export interface AdminUser {
  username: string;
  name: string;
  role: string;
  scope: string;
}

interface LoginResponse {
  token: string;
  expires_at: string;
  user: AdminUser;
}

// loginRequest exchanges static admin credentials for a session token.
// On success the token is persisted via setToken and the user is returned.
export async function loginRequest(username: string, password: string): Promise<AdminUser> {
  const data = await apiFetch<LoginResponse>('/admin/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });
  setToken(data.token);
  return data.user;
}

// fetchCurrentAdmin validates the stored token and returns the admin identity.
// Throws UnauthorizedError (clearing the token) if the session is invalid.
export async function fetchCurrentAdmin(): Promise<AdminUser> {
  return apiFetch<AdminUser>('/admin/auth/me', { method: 'GET' });
}

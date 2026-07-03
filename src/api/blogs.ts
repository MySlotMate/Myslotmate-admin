// Blog API — talks to the backend's /blogs/* endpoints.
// Admin routes are protected by the static admin JWT that apiFetch attaches automatically.

import { apiFetch } from './client';

// ── Types matching the backend Blog model ────────────────────────────────────

export interface BlogDTO {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content: string;
  cover_image_url: string | null;
  author_id: string;
  author_name: string;
  read_time_minutes: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogCreatePayload {
  title: string;
  description?: string;
  category: string;
  content: string;
  cover_image_url?: string | null;
  read_time_minutes?: number;
}

export interface BlogUpdatePayload {
  title?: string;
  description?: string;
  category?: string;
  content?: string;
  cover_image_url?: string | null;
  read_time_minutes?: number;
}

// ── API functions ───────────────────────────────────────────────────────────

/** GET /blogs/admin — list all blogs including drafts (admin only) */
export function fetchAdminBlogs(limit = 100, offset = 0): Promise<BlogDTO[]> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));
  const qs = params.toString();
  return apiFetch<BlogDTO[]>(`/blogs/admin${qs ? `?${qs}` : ''}`);
}

/** POST /blogs — create a new blog post (admin only) */
export function createBlog(body: BlogCreatePayload): Promise<BlogDTO> {
  return apiFetch<BlogDTO>('/blogs', { method: 'POST', body });
}

/** PUT /blogs/{blogID} — update a blog post (admin only) */
export function updateBlog(blogId: string, body: BlogUpdatePayload): Promise<BlogDTO> {
  return apiFetch<BlogDTO>(`/blogs/${blogId}`, { method: 'PUT', body });
}

/** DELETE /blogs/{blogID} — delete a blog post (admin only) */
export function deleteBlog(blogId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/blogs/${blogId}`, { method: 'DELETE' });
}

/** POST /blogs/{blogID}/publish — publish a blog post (admin only) */
export function publishBlog(blogId: string): Promise<BlogDTO> {
  return apiFetch<BlogDTO>(`/blogs/${blogId}/publish`, { method: 'POST' });
}

/** POST /blogs/{blogID}/unpublish — unpublish a blog post (admin only) */
export function unpublishBlog(blogId: string): Promise<BlogDTO> {
  return apiFetch<BlogDTO>(`/blogs/${blogId}/unpublish`, { method: 'POST' });
}

/** POST /upload?folder=blogs/covers — upload featured image (cover image) */
export async function uploadBlogCover(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('files', file);
  const results = await apiFetch<Array<{ url: string }>>('/upload?folder=blogs/covers', {
    method: 'POST',
    body: formData,
  });
  return results[0]?.url || '';
}


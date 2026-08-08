import { apiFetch } from './client';

export interface AdminWhatsAppNumber {
  label: string;
  phone: string;
  active: boolean;
}

export interface AdminNotificationSettings {
  admin_whatsapp_numbers: AdminWhatsAppNumber[];
}

export async function fetchAdminNotificationSettings(): Promise<AdminNotificationSettings> {
  try {
    const res = await apiFetch<AdminNotificationSettings>('/platform-settings/admin_notification_settings');
    return {
      admin_whatsapp_numbers: res?.admin_whatsapp_numbers ?? [],
    };
  } catch (err) {
    console.warn('Failed to fetch admin_notification_settings', err);
    return { admin_whatsapp_numbers: [] };
  }
}

export function updateAdminNotificationSettings(config: AdminNotificationSettings): Promise<unknown> {
  return apiFetch('/admin/platform-settings/admin_notification_settings', {
    method: 'PUT',
    body: config,
  });
}

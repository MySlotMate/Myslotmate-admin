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

// The guest-paid platform fee, added once to every paid booking: either a flat
// amount (paise) or a percentage of the tickets. 0 (the default) turns it off
// and hides it from the booking screens.
export interface BookingFeeConfig {
  type: 'flat' | 'percentage';
  amount_cents: number;
  percentage: number;
}

export async function fetchBookingFee(): Promise<BookingFeeConfig> {
  const res = await apiFetch<Partial<BookingFeeConfig>>('/platform-settings/booking_fee');
  return {
    type: res?.type === 'percentage' ? 'percentage' : 'flat',
    amount_cents: res?.amount_cents ?? 0,
    percentage: res?.percentage ?? 0,
  };
}

export function updateBookingFee(config: BookingFeeConfig): Promise<unknown> {
  return apiFetch('/admin/platform-settings/booking_fee', { method: 'PUT', body: config });
}

export function updateAdminNotificationSettings(config: AdminNotificationSettings): Promise<unknown> {
  return apiFetch('/admin/platform-settings/admin_notification_settings', {
    method: 'PUT',
    body: config,
  });
}

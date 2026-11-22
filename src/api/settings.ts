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

// Statutory tax on host payouts (GST TCS, income-tax TDS). Rates are basis
// points (50 = 0.5%). Both switches ship off; see the Settings tax card.
export interface TaxSettings {
  enabled: boolean;
  require_pan_for_withdrawal: boolean;
  tcs_bps: number;
  tds_bps: number;
  tds_threshold_cents: number;
}

export async function fetchTaxSettings(): Promise<TaxSettings> {
  const res = await apiFetch<Partial<TaxSettings>>('/platform-settings/tax_settings');
  return {
    enabled: res?.enabled === true,
    require_pan_for_withdrawal: res?.require_pan_for_withdrawal === true,
    tcs_bps: res?.tcs_bps ?? 50,
    tds_bps: res?.tds_bps ?? 10,
    tds_threshold_cents: res?.tds_threshold_cents ?? 50000000,
  };
}

export function updateTaxSettings(config: TaxSettings): Promise<unknown> {
  return apiFetch('/admin/platform-settings/tax_settings', { method: 'PUT', body: config });
}

/** The monthly finance tax report as CSV text (month "2026-11", IST). */
export function fetchTaxReportCSV(month: string): Promise<string> {
  return apiFetch<string>(`/admin/payments/tax-report?month=${encodeURIComponent(month)}`, {
    headers: { Accept: 'text/csv' },
  });
}

export interface PlatformTaxBalance {
  balance_cents: number;
  tax_liability_cents: number;
  withdrawable_cents: number;
}

export function fetchPlatformBalance(): Promise<PlatformTaxBalance> {
  return apiFetch<PlatformTaxBalance>('/admin/platform/balance');
}

/** Log a TCS/TDS challan finance has paid to the government. */
export function addTaxDeposit(body: {
  kind: 'tcs' | 'tds';
  period: string;
  amount_cents: number;
  challan_ref?: string;
  deposited_at: string;
}): Promise<unknown> {
  return apiFetch('/admin/payments/tax-deposits', { method: 'POST', body });
}

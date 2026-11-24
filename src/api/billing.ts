import { apiDownload, apiFetch } from './client';

// Billing core: platform fee invoices and credit notes. Amounts are paise.

export interface BillingSettings {
  enabled: boolean;
  legal_name: string;
  trade_name: string;
  gstin: string;
  pan: string;
  address: string;
  state_code: string; // from the GSTIN, read-only
  email: string;
  sac_code: string;
  gst_rate_bps: number;
  invoice_prefix: string;
  credit_note_prefix: string;
  commission_invoice_prefix: string;
  commission_sac_code: string;
  updated_at?: string;
}

export interface BillingSettingsView {
  settings: BillingSettings;
  issuing: boolean;
  missing: string[];
}

export interface FeeDocument {
  id: string;
  kind: 'invoice' | 'credit_note';
  number: string;
  fy: string;
  issued_at: string;
  source_type: 'booking' | 'pass' | 'host_commission';
  period?: string;
  buyer_gstin?: string;
  source_id: string;
  event_title: string;
  original_number?: string;
  user_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  place_of_supply: string;
  taxable_cents: number;
  cgst_cents: number;
  sgst_cents: number;
  igst_cents: number;
  total_cents: number;
}

export interface GSTTotals {
  documents: number;
  taxable_cents: number;
  cgst_cents: number;
  sgst_cents: number;
  igst_cents: number;
  total_cents: number;
}

export interface B2BRow extends GSTTotals {
  kind: 'invoice' | 'credit_note';
  gstin: string;
  name: string;
  number: string;
  date: string;
  against?: string;
  place_of_supply: string;
  state_name: string;
  rate_bps: number;
}

export interface GSTReport {
  month: string;
  invoices: GSTTotals;
  credit_notes: GSTTotals;
  net: GSTTotals;
  fee_net: GSTTotals;
  boost_net: GSTTotals;
  b2b: B2BRow[];
  cdnr: B2BRow[];
  b2cs: (GSTTotals & { place_of_supply: string; state_name: string; rate_bps: number })[];
  sac: (GSTTotals & { sac_code: string; rate_bps: number; quantity: number })[];
  documents: { nature: string; first: string; last: string; count: number }[];
}

export const fetchBillingSettings = () => apiFetch<BillingSettingsView>('/admin/billing/settings');

export const saveBillingSettings = (s: Partial<BillingSettings>) =>
  apiFetch<BillingSettingsView>('/admin/billing/settings', { method: 'PUT', body: s });

export function fetchFeeDocuments(q: {
  q?: string;
  kind?: '' | 'invoice' | 'credit_note';
  from?: string; // YYYY-MM-DD
  to?: string;
  limit?: number;
  offset?: number;
}) {
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== '') p.set(k, String(v));
  });
  return apiFetch<{ items: FeeDocument[]; total: number }>(`/admin/billing/invoices?${p.toString()}`);
}

export const downloadFeeDocument = (d: FeeDocument) =>
  apiDownload(`/admin/billing/invoices/${d.id}/pdf`, `MySlotMate-${d.number.replaceAll('/', '-')}.pdf`);

export const resendFeeDocument = (id: string, email?: string) =>
  apiFetch<{ sent_to: string }>(`/admin/billing/invoices/${id}/resend`, {
    method: 'POST',
    body: email ? { email } : {},
  });

export const fetchGSTReport = (month: string) =>
  apiFetch<GSTReport>(`/admin/billing/reports/gst?month=${encodeURIComponent(month)}`);

export type GSTTable = 'b2cs' | 'b2b' | 'cdnr' | 'hsn' | 'docs' | 'register';

export const downloadGSTTable = (month: string, table: GSTTable) =>
  apiDownload(
    `/admin/billing/reports/gst?month=${encodeURIComponent(month)}&format=csv&table=${table}`,
    `gst-${table}-${month}.csv`,
  );

export interface HostStatementLine {
  kind: 'booking' | 'pass';
  id: string;
  date: string;
  event_title: string;
  quantity: number;
  ticket_cents: number;
  commission_cents: number;
  tcs_cents: number;
  tds_cents: number;
  payable_cents: number;
  status: string;
  refunded: boolean;
}

export interface HostStatement {
  month: string;
  host: { id: string; name: string; email: string; pan_masked?: string; gstin?: string };
  lines: HostStatementLine[];
  payouts: { id: string; date: string; amount_cents: number; status: string; reference: string }[];
  totals: {
    sales: number;
    ticket_cents: number;
    refunded_cents: number;
    net_ticket_cents: number;
    commission_cents: number;
    tcs_cents: number;
    tds_cents: number;
    boost_commission_cents: number;
    payable_cents: number;
    paid_out_cents: number;
    in_flight_cents: number;
  };
}

export const fetchHostStatement = (hostId: string, month: string) =>
  apiFetch<HostStatement>(
    `/billing/host-statement?host_id=${encodeURIComponent(hostId)}&month=${encodeURIComponent(month)}`,
  );

export const downloadHostStatement = (hostId: string, month: string, hostName: string) =>
  apiDownload(
    `/billing/host-statement?host_id=${encodeURIComponent(hostId)}&month=${encodeURIComponent(month)}&format=pdf`,
    `MySlotMate-statement-${month}-${hostName.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`,
  );

export interface CommissionRunResult {
  month: string;
  invoices: number;
  credit_notes: number;
  skipped?: string;
}

/** Issue a month's Boost commission invoices (and pending credit notes) now. */
export const runCommissionInvoices = (month: string) =>
  apiFetch<CommissionRunResult>('/admin/billing/commission-run', { method: 'POST', body: { month } });

// Admin payments data — payments feed, ledger, balances, reconciliation summary.
// These hit the admin-token-protected /admin/payments/* endpoints. The client
// already unwraps the { success, data } envelope, so these return data directly.

import { apiFetch } from './client';
import type { Paginated } from './directory';

export type { Paginated };

export interface PaymentRow {
  id: string;
  type: 'booking' | 'withdrawal' | 'refund' | 'payout' | 'topup';
  amount_cents: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'reversed';
  display_reference: string;
  reference_id: string;
  owner_type: 'user' | 'host' | 'platform';
  owner_name: string;
  owner_email: string;
  created_at: string;
}

export interface LedgerRow {
  id: string;
  type: string;
  amount_cents: number;
  balance_after_cents: number;
  reference_type: string;
  description: string;
  status: string;
  owner_type: 'user' | 'host' | 'platform';
  owner_name: string;
  created_at: string;
}

export interface BalanceRow {
  account_id: string;
  owner_type: 'user' | 'host' | 'platform';
  owner_name: string;
  balance_cents: number;
  ledger_cents: number;
  drift_cents: number;
}

export interface PaymentsSummary {
  topups_in_cents: number;
  payouts_out_cents: number;
  refunds_cents: number;
  booking_volume_cents: number;
  platform_balance_cents: number;
  pending_count: number;
  failed_count: number;
  drift_accounts: number;
}

export interface PaymentsQuery {
  page: number;
  pageSize: number;
  search?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  ownerType?: string;
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

export function fetchPayments(q: PaymentsQuery): Promise<Paginated<PaymentRow>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    type: q.type,
    status: q.status,
    from: q.from,
    to: q.to,
  });
  return apiFetch<Paginated<PaymentRow>>(`/admin/payments/list?${qs}`);
}

export function fetchLedger(q: PaymentsQuery): Promise<Paginated<LedgerRow>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    type: q.type,
    from: q.from,
    to: q.to,
  });
  return apiFetch<Paginated<LedgerRow>>(`/admin/payments/ledger?${qs}`);
}

export function fetchBalances(q: PaymentsQuery): Promise<Paginated<BalanceRow>> {
  const qs = buildParams({
    page: q.page,
    page_size: q.pageSize,
    search: q.search,
    owner_type: q.ownerType,
  });
  return apiFetch<Paginated<BalanceRow>>(`/admin/payments/balances?${qs}`);
}

export function fetchPaymentsSummary(): Promise<PaymentsSummary> {
  return apiFetch<PaymentsSummary>('/admin/payments/summary');
}

export function sourceRefund(
  paymentId: string,
  body: { amount_cents: number; reason: string },
): Promise<unknown> {
  return apiFetch(`/admin/payments/${paymentId}/source-refund`, {
    method: 'POST',
    body: {
      amount_cents: body.amount_cents,
      reason: body.reason,
      idempotency_key: `src-refund-${paymentId}-${crypto.randomUUID()}`,
    },
  });
}

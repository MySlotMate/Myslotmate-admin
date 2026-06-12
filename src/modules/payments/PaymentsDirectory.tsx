import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import {
  fetchPayments,
  fetchLedger,
  fetchBalances,
  fetchPaymentsSummary,
  sourceRefund,
  type PaymentRow,
  type LedgerRow,
  type BalanceRow,
  type PaymentsSummary,
} from '../../api/payments';

const PAGE_SIZE = 15;

type BadgeColor = 'green' | 'amber' | 'rose' | 'blue';

const fmtCents = (cents: number): string =>
  `${cents < 0 ? '-' : ''}₹${(Math.abs(cents) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (iso: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
};

const statusColor = (status: string): BadgeColor =>
  status === 'completed'
    ? 'green'
    : status === 'pending' || status === 'processing'
      ? 'amber'
      : status === 'failed'
        ? 'rose'
        : 'blue';

const PAYMENT_TYPES = ['topup', 'booking', 'refund', 'payout', 'withdrawal'];
const PAYMENT_STATUSES = ['pending', 'processing', 'completed', 'failed', 'reversed'];
const LEDGER_TYPES = [
  'booking_credit',
  'platform_fee_credit',
  'topup_credit',
  'refund_credit',
  'cancellation_debit',
  'withdrawal_debit',
  'payout_debit',
  'source_refund_debit',
  'manual_credit',
  'manual_debit',
  'webhook_reversal',
];

/* -------------------------------------------------------------- shared bits */

const inputCls =
  'rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400';

const Td: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <td className={`px-6 py-4 align-top ${className}`}>{children}</td>;

function useDebounced(value: string, delay = 350): string {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

const StateCard: React.FC<{
  kind: 'loading' | 'error' | 'empty';
  message: string;
  onRetry?: () => void;
}> = ({ kind, message, onRetry }) => (
  <Card className="p-10 text-center" muted={kind === 'empty'}>
    {kind === 'loading' && (
      <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
    )}
    <p
      className={`mt-3 font-medium ${
        kind === 'error' ? 'font-semibold text-rose-600' : 'text-slate-400'
      }`}
    >
      {message}
    </p>
    {kind === 'error' && onRetry && (
      <Button variant="secondary" className="mt-4" onClick={onRetry}>
        Retry
      </Button>
    )}
  </Card>
);

/* -------------------------------------------------------------- summary */

const SummaryCards: React.FC<{ reloadKey: number }> = ({ reloadKey }) => {
  const [s, setS] = useState<PaymentsSummary | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchPaymentsSummary()
      .then((res) => alive && setS(res))
      .catch(() => alive && setS(null));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const cards = [
    { label: 'Top-ups in', value: fmtCents(s?.topups_in_cents ?? 0) },
    { label: 'Payouts out', value: fmtCents(s?.payouts_out_cents ?? 0) },
    { label: 'Refunds', value: fmtCents(s?.refunds_cents ?? 0) },
    { label: 'Booking volume', value: fmtCents(s?.booking_volume_cents ?? 0) },
    { label: 'Platform balance', value: fmtCents(s?.platform_balance_cents ?? 0) },
    { label: 'Pending', value: String(s?.pending_count ?? 0) },
    { label: 'Failed', value: String(s?.failed_count ?? 0) },
    {
      label: 'Drifted accounts',
      value: String(s?.drift_accounts ?? 0),
      danger: (s?.drift_accounts ?? 0) > 0,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <p className="text-sm font-medium text-slate-500">{c.label}</p>
          <p className={`mt-2 text-2xl font-extrabold ${c.danger ? 'text-rose-600' : 'text-ink'}`}>
            {c.value}
          </p>
        </Card>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------- refund modal */

const RefundModal: React.FC<{
  payment: PaymentRow;
  onClose: () => void;
  onDone: () => void;
}> = ({ payment, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await sourceRefund(payment.id, {
        amount_cents: payment.amount_cents,
        reason: reason.trim() || 'Admin source refund',
      });
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refund failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Refund to source">
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Refund <span className="font-bold text-ink">{fmtCents(payment.amount_cents)}</span> from
          this top-up back to {payment.owner_name || 'the customer'}&apos;s original card/UPI via
          Razorpay. This drains the wallet balance.
        </p>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-600">Reason</label>
          <input
            className={`w-full ${inputCls}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. dispute / chargeback"
          />
        </div>
        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? 'Refunding…' : 'Confirm refund'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/* -------------------------------------------------------------- activity */

const ActivityView: React.FC<{ onMutate: () => void }> = ({ onMutate }) => {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [refundTarget, setRefundTarget] = useState<PaymentRow | null>(null);
  const debouncedSearch = useDebounced(search);

  useEffect(() => setPage(1), [debouncedSearch, type, status, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPayments({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        type: type || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, type, status, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`min-w-[240px] flex-1 ${inputCls}`}
            type="search"
            placeholder="Search by user name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {PAYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {PAYMENT_STATUSES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            type="date"
            aria-label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            className={inputCls}
            type="date"
            aria-label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <StateCard kind="loading" message="Loading payments…" />
      ) : error ? (
        <StateCard kind="error" message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <StateCard kind="empty" message="No payments match these filters." />
      ) : (
        <Table headers={['Owner', 'Type', 'Amount', 'Status', 'Reference', 'When', '']}>
          {rows.map((p) => (
            <tr
              key={p.id}
              className="border-b border-slate-100 transition last:border-b-0 hover:bg-brand-50/40"
            >
              <Td>
                <div className="font-bold text-ink">{p.owner_name || '—'}</div>
                <div className="text-xs text-slate-500">{p.owner_email || p.owner_type}</div>
              </Td>
              <Td>
                <Badge color="blue">{p.type}</Badge>
              </Td>
              <Td className="font-extrabold text-ink">{fmtCents(p.amount_cents)}</Td>
              <Td>
                <Badge color={statusColor(p.status)}>{p.status}</Badge>
              </Td>
              <Td className="text-xs text-slate-500">{p.display_reference || '—'}</Td>
              <Td className="text-xs text-slate-500">{fmtDate(p.created_at)}</Td>
              <Td>
                {p.type === 'topup' && p.status === 'completed' && (
                  <Button variant="action" onClick={() => setRefundTarget(p)}>
                    Refund
                  </Button>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {!loading && !error && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={loading}
        />
      )}

      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onDone={() => {
            void load();
            onMutate();
          }}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------- ledger */

const LedgerView: React.FC = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debouncedSearch = useDebounced(search);

  useEffect(() => setPage(1), [debouncedSearch, type, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLedger({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        type: type || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ledger.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, type, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`min-w-[240px] flex-1 ${inputCls}`}
            type="search"
            placeholder="Search by account owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {LEDGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            className={inputCls}
            type="date"
            aria-label="From"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <input
            className={inputCls}
            type="date"
            aria-label="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <StateCard kind="loading" message="Loading ledger…" />
      ) : error ? (
        <StateCard kind="error" message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <StateCard kind="empty" message="No ledger entries match these filters." />
      ) : (
        <Table headers={['Owner', 'Type', 'Amount', 'Balance after', 'Status', 'When']}>
          {rows.map((l) => (
            <tr
              key={l.id}
              className="border-b border-slate-100 transition last:border-b-0 hover:bg-brand-50/40"
            >
              <Td>
                <div className="font-bold text-ink">{l.owner_name || '—'}</div>
                <div className="text-xs text-slate-500">{l.owner_type}</div>
              </Td>
              <Td>
                <Badge color="blue">{l.type}</Badge>
              </Td>
              <Td
                className={`font-extrabold ${
                  l.amount_cents < 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {fmtCents(l.amount_cents)}
              </Td>
              <Td className="text-slate-600">{fmtCents(l.balance_after_cents)}</Td>
              <Td>
                <Badge color={statusColor(l.status)}>{l.status}</Badge>
              </Td>
              <Td className="text-xs text-slate-500">{fmtDate(l.created_at)}</Td>
            </tr>
          ))}
        </Table>
      )}

      {!loading && !error && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={loading}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------- balances */

const BalancesView: React.FC = () => {
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ownerType, setOwnerType] = useState('');
  const debouncedSearch = useDebounced(search);

  useEffect(() => setPage(1), [debouncedSearch, ownerType]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBalances({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        ownerType: ownerType || undefined,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balances.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, ownerType]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 p-5 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className={`min-w-[240px] flex-1 ${inputCls}`}
            type="search"
            placeholder="Search by account owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={inputCls}
            value={ownerType}
            onChange={(e) => setOwnerType(e.target.value)}
          >
            <option value="">All owner types</option>
            {['user', 'host', 'platform'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <StateCard kind="loading" message="Loading balances…" />
      ) : error ? (
        <StateCard kind="error" message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <StateCard kind="empty" message="No accounts match these filters." />
      ) : (
        <Table headers={['Owner', 'Type', 'Stored balance', 'Ledger sum', 'Drift']}>
          {rows.map((b) => (
            <tr
              key={b.account_id}
              className="border-b border-slate-100 transition last:border-b-0 hover:bg-brand-50/40"
            >
              <Td className="font-bold text-ink">{b.owner_name || '—'}</Td>
              <Td>
                <Badge color="blue">{b.owner_type}</Badge>
              </Td>
              <Td className="font-extrabold text-ink">{fmtCents(b.balance_cents)}</Td>
              <Td className="text-slate-600">{fmtCents(b.ledger_cents)}</Td>
              <Td>
                {b.drift_cents === 0 ? (
                  <Badge color="green">OK</Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {fmtCents(b.drift_cents)}
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}

      {!loading && !error && total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
          disabled={loading}
        />
      )}
    </div>
  );
};

/* -------------------------------------------------------------- page */

const TABS = [
  { key: 'activity', label: 'Activity' },
  { key: 'ledger', label: 'Ledger' },
  { key: 'balances', label: 'Balances & Reconciliation' },
] as const;

export const PaymentsDirectory: React.FC = () => {
  const [view, setView] = useState<(typeof TABS)[number]['key']>('activity');
  const [summaryKey, setSummaryKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">
            Payments &amp; finance
          </p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Every payment, ledger entry, and wallet balance in one place.
          </h3>
        </div>
      </div>

      <SummaryCards reloadKey={summaryKey} />

      <div className="inline-flex rounded-2xl border border-brand-100 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
              view === t.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-brand-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {view === 'activity' && <ActivityView onMutate={() => setSummaryKey((k) => k + 1)} />}
      {view === 'ledger' && <LedgerView />}
      {view === 'balances' && <BalancesView />}
    </div>
  );
};

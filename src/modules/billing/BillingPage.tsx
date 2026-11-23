import React, { useCallback, useEffect, useState } from 'react';
import { Check, Download, FileText, Mail, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  downloadFeeDocument,
  downloadGSTTable,
  fetchBillingSettings,
  fetchFeeDocuments,
  fetchGSTReport,
  resendFeeDocument,
  saveBillingSettings,
  type BillingSettings,
  type BillingSettingsView,
  type FeeDocument,
  type GSTReport,
  type GSTTable,
  type GSTTotals,
} from '../../api/billing';

// Billing: the platform fee invoices and credit notes MySlotMate issues to
// guests (billing core), the monthly GST report finance files GSTR-1 from, and
// the supplier details printed on every invoice.

const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-400';

const lastMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dateIST = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

type Tab = 'invoices' | 'report' | 'settings';

export const BillingPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('invoices');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'invoices', label: 'Invoices' },
    { key: 'report', label: 'GST report' },
    { key: 'settings', label: 'Settings' },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">
          Billing
        </p>
        <p className="mt-2 max-w-3xl text-sm text-mist">
          Tax invoices for the guest platform fee, issued with every paid booking and monthly pass, and credit notes
          when the fee is refunded. The ticket price is the host&apos;s sale and is not invoiced here.
        </p>
      </div>
      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition ${
              tab === t.key ? 'border-brand-600 text-ink' : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'invoices' && <InvoicesTab />}
      {tab === 'report' && <ReportTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Invoices                                                           */
/* ------------------------------------------------------------------ */

const PAGE = 25;

const InvoicesTab: React.FC = () => {
  const [draft, setDraft] = useState({ q: '', kind: '' as '' | 'invoice' | 'credit_note', from: '', to: '' });
  const [filters, setFilters] = useState(draft);
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<{ items: FeeDocument[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchFeeDocuments({ ...filters, limit: PAGE, offset })
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errText(e, 'Could not load invoices.')));
  }, [filters, offset]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (d: FeeDocument) => {
    setBusy(d.id + ':pdf');
    try {
      await downloadFeeDocument(d);
    } catch (e) {
      setError(errText(e, 'Download failed.'));
    } finally {
      setBusy(null);
    }
  };

  const resend = async (d: FeeDocument) => {
    const to = window.prompt(`Email ${d.number} to:`, d.buyer_email);
    if (to === null) return;
    setBusy(d.id + ':mail');
    setNotice(null);
    setError(null);
    try {
      const r = await resendFeeDocument(d.id, to.trim() || undefined);
      setNotice(`${d.number} sent to ${r.sent_to}.`);
    } catch (e) {
      setError(errText(e, 'Could not send the email.'));
    } finally {
      setBusy(null);
    }
  };

  const total = data?.total ?? 0;
  return (
    <Card className="p-6">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setFilters(draft);
        }}
      >
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-bold text-slate-600">
          Search
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`${INPUT} w-full pl-9`}
              placeholder="Number, guest name, email, phone or event"
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
          Type
          <select
            className={INPUT}
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as typeof draft.kind })}
          >
            <option value="">All</option>
            <option value="invoice">Invoices</option>
            <option value="credit_note">Credit notes</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
          From
          <input type="date" className={INPUT} value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
          To
          <input type="date" className={INPUT} value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
        </label>
        <Button variant="primary" size="sm" type="submit">
          Search
        </Button>
      </form>

      {notice && <p className="mt-3 text-xs font-semibold text-emerald-600">{notice}</p>}
      {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Number</th>
              <th className="py-2 pr-3">Date</th>
              <th className="py-2 pr-3">Guest</th>
              <th className="py-2 pr-3">For</th>
              <th className="py-2 pr-3 text-right">Taxable</th>
              <th className="py-2 pr-3 text-right">GST</th>
              <th className="py-2 pr-3 text-right">Total</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {data?.items.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 align-top">
                <td className="py-3 pr-3">
                  <span className="font-bold text-ink">{d.number}</span>
                  <span className="mt-1 block">
                    {d.kind === 'credit_note' ? (
                      <Badge color="amber">Credit note · {d.original_number}</Badge>
                    ) : (
                      <Badge color="green">Invoice</Badge>
                    )}
                  </span>
                </td>
                <td className="py-3 pr-3 whitespace-nowrap text-slate-600">{dateIST(d.issued_at)}</td>
                <td className="py-3 pr-3">
                  <span className="block font-semibold text-ink">{d.buyer_name || 'Guest'}</span>
                  <span className="block text-xs text-mist">{d.buyer_email || d.buyer_phone}</span>
                </td>
                <td className="py-3 pr-3">
                  <span className="block text-ink">{d.event_title}</span>
                  <span className="block text-xs text-mist">{d.source_type === 'pass' ? 'Monthly pass' : 'Booking'}</span>
                </td>
                <td className="py-3 pr-3 text-right tabular-nums">{rupees(d.taxable_cents)}</td>
                <td className="py-3 pr-3 text-right tabular-nums">{rupees(d.cgst_cents + d.sgst_cents + d.igst_cents)}</td>
                <td className="py-3 pr-3 text-right font-bold tabular-nums">{rupees(d.total_cents)}</td>
                <td className="py-3">
                  <span className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" type="button" disabled={busy !== null} onClick={() => void download(d)}>
                      <FileText className="h-4 w-4" /> {busy === d.id + ':pdf' ? '…' : 'PDF'}
                    </Button>
                    <Button variant="ghost" size="sm" type="button" disabled={busy !== null} onClick={() => void resend(d)}>
                      <Mail className="h-4 w-4" /> {busy === d.id + ':mail' ? 'Sending…' : 'Resend'}
                    </Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && (
          <p className="py-10 text-center text-sm text-mist">
            No invoices match. Invoices start once billing is turned on in the Settings tab.
          </p>
        )}
        {!data && !error && <p className="py-10 text-center text-sm text-mist">Loading…</p>}
      </div>

      {total > PAGE && (
        <div className="mt-4 flex items-center justify-between text-xs text-mist">
          <span>
            {offset + 1}–{Math.min(offset + PAGE, total)} of {total}
          </span>
          <span className="flex gap-2">
            <Button variant="outline" size="sm" type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" type="button" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
              Next
            </Button>
          </span>
        </div>
      )}
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  GST report                                                         */
/* ------------------------------------------------------------------ */

const TotalsCard: React.FC<{ title: string; t: GSTTotals; strong?: boolean }> = ({ title, t, strong }) => (
  <div className={`rounded-2xl border p-4 ${strong ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'}`}>
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
      {title}
      {!strong && ` · ${t.documents}`}
    </p>
    <p className="mt-1 text-xl font-black text-ink tabular-nums">{rupees(t.total_cents)}</p>
    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-slate-600">
      <dt>Taxable value</dt>
      <dd className="text-right tabular-nums">{rupees(t.taxable_cents)}</dd>
      <dt>CGST</dt>
      <dd className="text-right tabular-nums">{rupees(t.cgst_cents)}</dd>
      <dt>SGST</dt>
      <dd className="text-right tabular-nums">{rupees(t.sgst_cents)}</dd>
      <dt>IGST</dt>
      <dd className="text-right tabular-nums">{rupees(t.igst_cents)}</dd>
    </dl>
  </div>
);

const CSV_TABLES: { table: GSTTable; label: string; hint: string }[] = [
  { table: 'b2cs', label: 'B2C (small)', hint: 'GSTR-1 table 7' },
  { table: 'hsn', label: 'HSN / SAC summary', hint: 'GSTR-1 table 12' },
  { table: 'docs', label: 'Documents issued', hint: 'GSTR-1 table 13' },
  { table: 'register', label: 'Invoice register', hint: 'Every document' },
];

const ReportTab: React.FC = () => {
  const [month, setMonth] = useState(lastMonth());
  const [rep, setRep] = useState<GSTReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<GSTTable | null>(null);

  useEffect(() => {
    if (!month) return;
    fetchGSTReport(month)
      .then((r) => {
        setRep(r);
        setError(null);
      })
      .catch((e) => setError(errText(e, 'Could not load the report.')));
  }, [month]);

  const download = async (table: GSTTable) => {
    setBusy(table);
    try {
      await downloadGSTTable(month, table);
    } catch (e) {
      setError(errText(e, 'Download failed.'));
    } finally {
      setBusy(null);
    }
  };

  const th = 'py-2 pr-3 text-[11px] font-black uppercase tracking-wider text-slate-500';
  const td = 'py-2 pr-3 tabular-nums';
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-lg font-bold text-ink">GST on the platform fee</h3>
            <p className="mt-0.5 text-xs text-mist">
              For GSTR-1, due by the 11th. Every guest is unregistered, so the fee goes in B2C (small) by place of
              supply, net of credit notes. Host TCS and TDS (GSTR-8, 26Q) are in Settings → Statutory tax.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            Month
            <input type="month" className={INPUT} value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>

        {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}

        {rep && (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <TotalsCard title="Invoices" t={rep.invoices} />
            <TotalsCard title="Credit notes" t={rep.credit_notes} />
            <TotalsCard title="Net fee revenue" t={rep.net} strong />
          </div>
        )}

        <div className="mt-6">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Download CSV</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {CSV_TABLES.map((c) => (
              <Button
                key={c.table}
                variant="outline"
                size="sm"
                type="button"
                title={c.hint}
                disabled={busy !== null || !month}
                onClick={() => void download(c.table)}
              >
                <Download className="h-4 w-4" /> {busy === c.table ? 'Preparing…' : c.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {rep && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h4 className="text-sm font-bold text-ink">B2C (small) · by place of supply</h4>
            {rep.b2cs.length === 0 ? (
              <p className="mt-3 text-sm text-mist">Nothing issued this month.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={th}>State</th>
                    <th className={th}>Rate</th>
                    <th className={`${th} text-right`}>Taxable</th>
                    <th className={`${th} text-right`}>Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.b2cs.map((r) => (
                    <tr key={r.place_of_supply + r.rate_bps} className="border-b border-slate-100">
                      <td className="py-2 pr-3">
                        {r.state_name || r.place_of_supply} ({r.place_of_supply})
                      </td>
                      <td className={td}>{r.rate_bps / 100}%</td>
                      <td className={`${td} text-right`}>{rupees(r.taxable_cents)}</td>
                      <td className={`${td} text-right`}>{rupees(r.cgst_cents + r.sgst_cents + r.igst_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          <Card className="p-6">
            <h4 className="text-sm font-bold text-ink">Documents issued</h4>
            {rep.documents.length === 0 ? (
              <p className="mt-3 text-sm text-mist">Nothing issued this month.</p>
            ) : (
              <table className="mt-3 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={th}>Type</th>
                    <th className={th}>From</th>
                    <th className={th}>To</th>
                    <th className={`${th} text-right`}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {rep.documents.map((d) => (
                    <tr key={d.first} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{d.nature}</td>
                      <td className={td}>{d.first}</td>
                      <td className={td}>{d.last}</td>
                      <td className={`${td} text-right`}>{d.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

const MISSING_LABEL: Record<string, string> = {
  legal_name: 'legal name',
  gstin: 'GSTIN',
  address: 'address',
  state_code: 'GSTIN',
  sac_code: 'SAC code',
};

const SettingsTab: React.FC = () => {
  const [view, setView] = useState<BillingSettingsView | null>(null);
  const [form, setForm] = useState<BillingSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingSettings()
      .then((v) => {
        setView(v);
        setForm(v.settings);
      })
      .catch((e) => setError(errText(e, 'Could not load billing settings.')));
  }, []);

  const save = async (next: BillingSettings) => {
    if (next.enabled && !view?.settings.enabled) {
      const ok = window.confirm(
        'Turn on invoices? From now on every paid booking and monthly pass gets a numbered tax invoice for its platform fee. Numbers cannot be reused.',
      );
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    try {
      const v = await saveBillingSettings(next);
      setView(v);
      setForm(v.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(errText(e, 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  if (!form || !view) {
    return <Card className="p-6 text-sm text-mist">{error ?? 'Loading…'}</Card>;
  }
  const set = (patch: Partial<BillingSettings>) => setForm({ ...form, ...patch });
  const missing = [...new Set(view.missing.map((m) => MISSING_LABEL[m] ?? m))];
  const field = (label: string, key: keyof BillingSettings, hint?: string, placeholder?: string) => (
    <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
      {label}
      <input
        className={INPUT}
        value={String(form[key] ?? '')}
        placeholder={placeholder}
        onChange={(e) => set({ [key]: e.target.value } as Partial<BillingSettings>)}
      />
      {hint && <span className="font-medium text-mist">{hint}</span>}
    </label>
  );

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-bold text-ink">Supplier details on every invoice</h3>
          <p className="mt-0.5 text-xs text-mist">
            Each invoice keeps a copy of these details from the day it was issued, so changing them only affects new
            invoices.
          </p>
        </div>
        <span className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
          {view.issuing ? <Badge color="green" withDot>Issuing invoices</Badge> : <Badge color="slate" withDot>Off</Badge>}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {field('Legal name', 'legal_name', 'As registered for GST.', 'Moodverse Private Limited')}
        {field('Trade name', 'trade_name', 'Printed as "Trading as …".', 'MySlotMate')}
        {field('GSTIN', 'gstin', form.state_code ? `State code ${form.state_code}, from the GSTIN.` : '15 characters.')}
        {field('PAN', 'pan', 'Filled from the GSTIN when left blank.')}
        <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600 md:col-span-2">
          Registered address
          <textarea className={`${INPUT} min-h-[72px]`} value={form.address} onChange={(e) => set({ address: e.target.value })} />
        </label>
        {field('Billing email', 'email', 'Printed on invoices. Optional.')}
        {field('SAC code', 'sac_code', 'Confirm with the CA before turning invoices on.', '998599')}
        <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
          GST rate (%)
          <input
            className={INPUT}
            type="number"
            min={0}
            max={28}
            step={0.5}
            value={form.gst_rate_bps / 100}
            onChange={(e) => set({ gst_rate_bps: Math.round(Number(e.target.value) * 100) })}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          {field('Invoice prefix', 'invoice_prefix', 'e.g. F/2627/0000001')}
          {field('Credit note prefix', 'credit_note_prefix', 'e.g. C/2627/0000001')}
        </div>
      </div>

      <label className="mt-6 flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3">
        <span>
          <span className="block text-sm font-bold text-ink">Issue invoices for the platform fee</span>
          <span className="mt-0.5 block text-xs text-mist">
            {missing.length > 0
              ? `Needs ${missing.join(', ')} first.`
              : 'Every new paid booking and monthly pass gets a numbered tax invoice; refunds get a credit note.'}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="mt-1 h-5 w-5 accent-brand-600"
          checked={form.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
      </label>

      {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button variant="primary" size="sm" type="button" disabled={saving} onClick={() => void save(form)}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  );
};

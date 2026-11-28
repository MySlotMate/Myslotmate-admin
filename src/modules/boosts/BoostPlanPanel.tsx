import React, { useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, FileText, Upload } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, type BadgeColor } from '../../components/ui/Badge';
import { DatePill } from '../../components/event-form/DateTimePills';
import type { BoostDetail } from '../../api/boosts';
import {
  BOOST_PLAN_MOCK,
  CHANNEL_LABEL,
  CREATIVE_STATUS_LABEL,
  CREATIVE_TYPE_LABEL,
  boostPlanApi as api,
  daysBetween,
  mockHostCreative,
  mockHostPays,
  type Channel,
  type Creative,
  type CreativeStatus,
  type CreativeType,
  type PlanState,
  type SpendEntry,
} from '../../api/boostPlan';
import { dateTimeIST, rupees } from './format';

// The paid-budget work on one Boost (PRD: Premium Hosts and paid Boost
// marketing): the budget and its payments, the creatives, the daily spend log,
// the reports shared with the host, and closing with the final report.

const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-400';
const H3 = 'text-lg font-bold text-ink';
const SUB = 'mt-0.5 text-xs text-mist';

const today = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const day = (d: string | null) =>
  d ? new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

const CREATIVE_COLOR: Record<CreativeStatus, BadgeColor> = {
  submitted: 'amber',
  in_use: 'green',
  needs_changes: 'amber',
  not_used: 'slate',
  awaiting_approval: 'blue',
  approved: 'indigo',
  changes_requested: 'amber',
};

interface Props {
  d: BoostDetail;
  plan: PlanState;
  busy: boolean;
  run: (what: string, fn: () => Promise<unknown>) => Promise<void>;
}

// ─── Budget and payments ─────────────────────────────────────────────────────

const Payments: React.FC<Props> = ({ d, plan, busy, run }) => {
  const [link, setLink] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [topUpDays, setTopUpDays] = useState('');
  const [form, setForm] = useState({ amount: '', paid_on: today(), reference: '' });
  const toPay = plan.budget_total_cents + plan.budget_gst_cents;
  const accepted = !!d.accepted_at;
  const live = d.status === 'live';
  const paid = plan.budget_status === 'paid';
  const days = plan.budget_from && plan.budget_until ? daysBetween(plan.budget_from, plan.budget_until) : 0;
  const kind: 'budget' | 'top_up' = paid ? 'top_up' : 'budget';

  const sendLink = () =>
    run('Payment link sent to the host by email and WhatsApp.', async () => {
      const r = await api.sendPaymentLink(d.id, kind, kind === 'top_up' ? Number(topUpDays) || 0 : undefined);
      setLink(r.url);
    });

  const record = () => {
    const amount = Math.round(Number(form.amount) * 100);
    if (!amount || !form.reference.trim()) return;
    void run('Payment recorded.', async () => {
      await api.recordOffline(d.id, {
        amount_cents: amount,
        paid_on: form.paid_on,
        reference: form.reference.trim(),
        kind,
        days_added: kind === 'top_up' ? Number(topUpDays) || 0 : undefined,
      });
      setOffline(false);
      setForm({ amount: '', paid_on: today(), reference: '' });
    });
  };

  const reverse = (paymentId: string) => {
    const reason = window.prompt('Why are we reversing this payment? It goes in the history.');
    if (!reason?.trim()) return;
    void run('Payment reversed.', () => api.reversePayment(d.id, paymentId, reason.trim()));
  };

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={H3}>Ad budget</h3>
          <p className={SUB}>Paid upfront by the host, not refundable. The whole budget goes into the ads.</p>
        </div>
        <Badge color={paid ? 'green' : accepted ? 'amber' : 'slate'} withDot>
          {paid ? 'Paid' : accepted ? 'Awaiting payment' : 'Not yet accepted'}
        </Badge>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-4">
        {[
          ['Daily', rupees(plan.daily_budget_cents ?? 0)],
          ['Dates', `${day(plan.budget_from)} – ${day(plan.budget_until)} · ${days}d`],
          ['Budget + GST', `${rupees(plan.budget_total_cents)} + ${rupees(plan.budget_gst_cents)}`],
          ['Spent', `${rupees(plan.spent_cents)} of ${rupees(plan.budget_total_cents)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 p-3">
            <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{k}</dt>
            <dd className="mt-1 text-sm font-bold text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {accepted && !paid && plan.payment_due_by && (
        <p className="mt-3 text-xs text-amber-700">
          Due by {dateTimeIST(plan.payment_due_by)}. The plan expires if it isn&apos;t paid by then.
        </p>
      )}

      {plan.payments.length > 0 && (
        <table className="mt-4 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <th className="py-2 pr-3">Payment</th>
              <th className="py-2 pr-3">How</th>
              <th className="py-2 pr-3 text-right">Amount</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {plan.payments.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="py-2 pr-3 text-ink">
                  {p.kind === 'budget' ? 'Budget' : `Top-up${p.days_added ? `, ${p.days_added} days` : ''}`}
                  <span className="block text-xs text-mist">{dateTimeIST(p.paid_at ?? p.created_at)}</span>
                </td>
                <td className="py-2 pr-3 text-slate-600">
                  {p.method === 'offline' ? `Recorded · ${p.reference ?? ''}` : p.method === 'payment_link' ? 'Payment link' : 'Checkout'}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{rupees(p.amount_cents)}</td>
                <td className="py-2 pr-3">
                  <Badge color={p.status === 'paid' ? 'green' : p.status === 'reversed' ? 'rose' : 'amber'}>{p.status}</Badge>
                </td>
                <td className="py-2 text-right">
                  {p.status === 'paid' && p.method === 'offline' && !live && d.status !== 'ended' && (
                    <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={() => reverse(p.id)}>
                      Reverse
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {accepted && d.status !== 'ended' && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-600">
            {paid ? 'Top up for the host' : `Collect ${rupees(toPay)} from the host`}
          </p>
          {paid && (
            <label className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600">
              Extra days at {rupees(plan.daily_budget_cents ?? 0)} a day
              <input className={`${INPUT} w-24`} type="number" min={1} value={topUpDays} onChange={(e) => setTopUpDays(e.target.value)} />
            </label>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" type="button" disabled={busy || (paid && !Number(topUpDays))} onClick={() => void sendLink()}>
              Send payment link
            </Button>
            <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => setOffline((v) => !v)}>
              {offline ? 'Cancel' : 'Record a payment made another way'}
            </Button>
            {BOOST_PLAN_MOCK && !paid && (
              <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={() => void run('Test mode: the host paid.', async () => mockHostPays(d.id))}>
                Test: host pays
              </Button>
            )}
          </div>
          {link && (
            <p className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              Link: <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-brand-700">{link} <ExternalLink className="h-3 w-3" /></a>
              <Button variant="ghost" size="sm" type="button" onClick={() => void navigator.clipboard.writeText(link)}>
                <Copy className="mr-1 h-3 w-3" /> Copy
              </Button>
            </p>
          )}
          {offline && (
            <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-3">
              <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                Amount received (₹)
                <input className={`${INPUT} w-36`} type="number" min={1} value={form.amount} placeholder={paid ? '' : String(toPay / 100)} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </label>
              <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                Paid on
                <DatePill value={form.paid_on} onChange={(v) => setForm({ ...form, paid_on: v })} allowPast max={today()} ariaLabel="Paid on" />
              </div>
              <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-bold text-slate-600">
                Reference (UTR or UPI ID)
                <input className={INPUT} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </label>
              <Button variant="primary" size="sm" type="button" disabled={busy || !Number(form.amount) || !form.reference.trim()} onClick={record}>
                Record payment
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Creatives ───────────────────────────────────────────────────────────────

const Creatives: React.FC<Props> = ({ d, plan, busy, run }) => {
  const [type, setType] = useState<CreativeType>('post');
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const ended = d.status === 'ended';

  const setStatus = (c: Creative, status: CreativeStatus) => {
    let note: string | undefined;
    if (status === 'needs_changes' || status === 'not_used') {
      const n = window.prompt(status === 'needs_changes' ? 'What should the host change?' : 'Why isn’t it used? The host sees this.');
      if (!n?.trim()) return;
      note = n.trim();
    }
    void run(`Marked ${CREATIVE_STATUS_LABEL[status].toLowerCase()}.`, () => api.setCreativeStatus(d.id, c.id, status, note));
  };

  const upload = () =>
    run('Uploaded. The host is asked to approve it.', async () => {
      await api.uploadCreative(d.id, files, { type, caption: caption.trim() || undefined });
      setFiles([]);
      setCaption('');
      if (input.current) input.current.value = '';
    });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={H3}>Creatives</h3>
          <p className={SUB}>The host&apos;s uploads to review, and the team&apos;s own for the host to approve. Going live needs one marked In use.</p>
        </div>
        {BOOST_PLAN_MOCK && !ended && (
          <Button variant="ghost" size="sm" type="button" disabled={busy} onClick={() => void run('Test mode: the host uploaded a reel.', async () => mockHostCreative(d.id))}>
            Test: host uploads a reel
          </Button>
        )}
      </div>

      {plan.creatives.length === 0 ? (
        <p className="mt-4 text-sm text-mist">Nothing uploaded yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {plan.creatives.map((c) => {
            const f = c.files[0];
            const img = f && (f.mime_type.startsWith('image/') || !f.mime_type);
            return (
              <li key={c.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                {img ? (
                  <img src={f.url} alt="" className="h-20 w-16 shrink-0 rounded-lg bg-slate-100 object-cover" />
                ) : (
                  <a href={f?.url} target="_blank" rel="noreferrer" className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-mist">
                    {CREATIVE_TYPE_LABEL[c.type]}
                  </a>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-bold text-ink">
                    {CREATIVE_TYPE_LABEL[c.type]}
                    {c.files.length > 1 ? ` · ${c.files.length} files` : ''}
                    <span className="ml-1 text-xs font-medium text-mist">{c.uploaded_by_kind === 'admin' ? 'by the team' : 'by the host'}</span>
                  </p>
                  <Badge color={CREATIVE_COLOR[c.status]}>{CREATIVE_STATUS_LABEL[c.status]}</Badge>
                  {c.caption && <p className="truncate text-xs text-slate-600">{c.caption}</p>}
                  {c.status_note && <p className="text-xs text-amber-700">{c.status_note}</p>}
                  {!ended && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(c.uploaded_by_kind === 'host'
                        ? (['in_use', 'needs_changes', 'not_used'] as CreativeStatus[])
                        : c.status === 'approved'
                          ? (['in_use'] as CreativeStatus[])
                          : []
                      )
                        .filter((s) => s !== c.status)
                        .map((s) => (
                          <Button key={s} variant="action" size="sm" type="button" disabled={busy} onClick={() => setStatus(c, s)}>
                            {CREATIVE_STATUS_LABEL[s]}
                          </Button>
                        ))}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!ended && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            Type
            <select className={INPUT} value={type} onChange={(e) => setType(e.target.value as CreativeType)}>
              {(Object.keys(CREATIVE_TYPE_LABEL) as CreativeType[]).map((t) => (
                <option key={t} value={t}>
                  {CREATIVE_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            Files
            <input ref={input} className="text-xs" type="file" multiple accept="image/jpeg,image/png,video/mp4,video/quicktime,application/pdf,application/zip" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[11px] font-bold text-slate-600">
            Caption or note (optional)
            <input className={INPUT} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </label>
          <Button variant="primary" size="sm" type="button" disabled={busy || files.length === 0} onClick={() => void upload()}>
            <Upload className="mr-1 h-4 w-4" /> Upload for the host
          </Button>
        </div>
      )}
    </Card>
  );
};

// ─── Daily spend ─────────────────────────────────────────────────────────────

type Cell = { spend: string; impressions: string; reach: string; clicks: string };

const Spend: React.FC<Props> = ({ d, plan, busy, run }) => {
  const channels = (d.channels.length ? d.channels : ['instagram']) as Channel[];
  // Today, kept inside the ads' dates.
  const [date, setDate] = useState(() => {
    const t = today();
    if (plan.budget_until && t > plan.budget_until) return plan.budget_until;
    if (plan.budget_from && t < plan.budget_from) return plan.budget_from;
    return t;
  });
  const existing = useMemo(() => new Map(plan.spend.map((e) => [`${e.day}|${e.channel}`, e])), [plan.spend]);
  const blank = (c: Channel): Cell => {
    const e = existing.get(`${date}|${c}`);
    return e
      ? { spend: String(e.spend_cents / 100), impressions: String(e.impressions), reach: String(e.reach), clicks: String(e.clicks) }
      : { spend: '', impressions: '', reach: '', clicks: '' };
  };
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const cell = (c: Channel) => cells[`${date}|${c}`] ?? blank(c);
  const set = (c: Channel, k: keyof Cell, v: string) => setCells({ ...cells, [`${date}|${c}`]: { ...cell(c), [k]: v } });
  const locked = !!plan.closed_at;
  const left = plan.budget_total_cents - plan.spent_cents;

  const saveDay = () =>
    run(`Spend for ${day(date)} saved.`, async () => {
      const entries: SpendEntry[] = channels.map((c) => {
        const x = cell(c);
        return {
          day: date,
          channel: c,
          spend_cents: Math.round((Number(x.spend) || 0) * 100),
          impressions: Number(x.impressions) || 0,
          reach: Number(x.reach) || 0,
          clicks: Number(x.clicks) || 0,
        };
      });
      await api.saveSpend(d.id, entries);
      setCells({});
    });

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    plan.spend.forEach((e) => m.set(e.day, (m.get(e.day) ?? 0) + e.spend_cents));
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [plan.spend]);

  return (
    <Card className="p-6">
      <h3 className={H3}>Daily spend and results</h3>
      <p className={SUB}>
        From each ad platform&apos;s numbers. The host sees these day by day. {rupees(Math.max(0, left))} of the paid budget is left.
        {locked && ' Locked: the Boost is closed.'}
      </p>
      {!locked && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Day
              <DatePill value={date} onChange={(v) => setDate(v)} allowPast min={plan.budget_from ?? undefined} max={plan.budget_until ?? undefined} ariaLabel="Day" />
            </div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Channel</th>
                  <th className="py-2 pr-3">Spend (₹)</th>
                  <th className="py-2 pr-3">Impressions</th>
                  <th className="py-2 pr-3">Reach</th>
                  <th className="py-2">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-semibold text-ink">{CHANNEL_LABEL[c] ?? c}</td>
                    {(['spend', 'impressions', 'reach', 'clicks'] as (keyof Cell)[]).map((k) => (
                      <td key={k} className="py-2 pr-3">
                        <input className={`${INPUT} w-28`} type="number" min={0} aria-label={`${CHANNEL_LABEL[c]} ${k}`} value={cell(c)[k]} onChange={(e) => set(c, k, e.target.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="sm" type="button" disabled={busy || plan.budget_status !== 'paid'} onClick={() => void saveDay()}>
              Save {day(date)}
            </Button>
          </div>
        </>
      )}
      {byDay.length > 0 && (
        <p className="mt-3 text-xs text-mist">
          Logged: {byDay.map(([k, v]) => `${day(k)} ${rupees(v)}`).join(' · ')}
        </p>
      )}
    </Card>
  );
};

// ─── Reports and closing ─────────────────────────────────────────────────────

const Reports: React.FC<Props> = ({ d, plan, busy, run }) => {
  const [file, setFile] = useState<File | null>(null);
  const [f, setF] = useState({ kind: 'update' as 'update' | 'final', title: '', from: plan.budget_from ?? '', until: today(), note: '' });
  const input = useRef<HTMLInputElement>(null);
  const hasFinal = plan.reports.some((r) => r.kind === 'final');

  const add = () =>
    run('Report shared with the host.', async () => {
      if (!file) return;
      await api.addReport(d.id, file, {
        kind: f.kind,
        title: f.title.trim(),
        covers_from: f.from || undefined,
        covers_until: f.until || undefined,
        note: f.note.trim() || undefined,
      });
      setFile(null);
      setF({ ...f, title: '', note: '' });
      if (input.current) input.current.value = '';
    });

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={H3}>Reports for the host</h3>
          <p className={SUB}>Ad platform exports, screenshots and PDFs. The host can view and download them, not delete them.</p>
        </div>
        {d.status === 'ended' && !plan.closed_at && (
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={busy || !hasFinal}
            title={hasFinal ? '' : 'Attach a final report first'}
            onClick={() => {
              if (window.confirm('Close this Boost? Spend entries lock and the host is told the final report is ready.'))
                void run('Closed. The host has the final report.', () => api.close(d.id));
            }}
          >
            Close with final report
          </Button>
        )}
        {plan.closed_at && <Badge color="green">Closed {dateTimeIST(plan.closed_at)}</Badge>}
      </div>

      {plan.reports.length > 0 && (
        <ul className="mt-4 space-y-2">
          {plan.reports.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <FileText className="h-4 w-4 shrink-0 text-brand-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">
                  {r.title} {r.kind === 'final' && <Badge color="green">Final</Badge>}
                </p>
                <p className="truncate text-xs text-mist">
                  {day(r.covers_from)} – {day(r.covers_until)}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              </div>
              <a href={r.file.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand-700 hover:underline">
                Open
              </a>
            </li>
          ))}
        </ul>
      )}

      {!plan.closed_at && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            Kind
            <select className={INPUT} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as 'update' | 'final' })}>
              <option value="update">Update</option>
              <option value="final">Final report</option>
            </select>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[11px] font-bold text-slate-600">
            Title
            <input className={INPUT} value={f.title} placeholder="Week 1 update" onChange={(e) => setF({ ...f, title: e.target.value })} />
          </label>
          <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            Covers from
            <DatePill value={f.from} onChange={(v) => setF({ ...f, from: v })} allowPast ariaLabel="Covers from" />
          </div>
          <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            to
            <DatePill value={f.until} onChange={(v) => setF({ ...f, until: v })} allowPast ariaLabel="Covers until" />
          </div>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-[11px] font-bold text-slate-600">
            Note (optional)
            <input className={INPUT} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            File
            <input ref={input} className="text-xs" type="file" accept=".csv,.xlsx,application/pdf,image/png,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button variant="primary" size="sm" type="button" disabled={busy || !file || !f.title.trim()} onClick={() => void add()}>
            <Upload className="mr-1 h-4 w-4" /> Share report
          </Button>
        </div>
      )}
    </Card>
  );
};

// ─── The panel ───────────────────────────────────────────────────────────────

export const BoostPlanPanel: React.FC<Props> = (p) => {
  if (p.plan.pricing_model !== 'budget') return null;
  const started = p.d.status === 'quote_ready' || p.d.status === 'live' || p.d.status === 'ended';
  return (
    <div className="space-y-6">
      <Payments {...p} />
      {started && <Creatives {...p} />}
      {(p.d.status === 'live' || p.d.status === 'ended') && <Spend {...p} />}
      {(p.d.status === 'live' || p.d.status === 'ended') && <Reports {...p} />}
    </div>
  );
};

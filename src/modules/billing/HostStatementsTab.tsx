import React, { useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { fetchHosts } from '../../api/directory';
import { downloadHostStatement, fetchHostStatement, type HostStatement } from '../../api/billing';
import type { Host } from '../../types';

// A host's monthly payout statement: sales, refunds, commission (only when an
// admin set one), TCS/TDS withheld, what they earned and what was paid out.

const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-400';

const minus = (cents: number) => (cents > 0 ? `−${rupees(cents)}` : rupees(0));

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dayIST = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' });

export const HostStatementsTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [host, setHost] = useState<{ id: string; name: string } | null>(null);
  const [month, setMonth] = useState(thisMonth());
  const [st, setSt] = useState<HostStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const r = await fetchHosts({ page: 1, pageSize: 8, search: query.trim() || undefined });
      setHosts(r.items.filter((h) => h.id));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not search hosts.');
    }
  };

  useEffect(() => {
    if (!host || !month) return;
    fetchHostStatement(host.id, month)
      .then((s) => {
        setSt(s);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the statement.'));
  }, [host, month]);

  const download = async () => {
    if (!host) return;
    setDownloading(true);
    try {
      await downloadHostStatement(host.id, month, host.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const t = st?.totals;
  const summary: [string, string, boolean?][] = t
    ? [
        ['Ticket sales', rupees(t.ticket_cents)],
        ['Refunded or cancelled', minus(t.refunded_cents)],
        ['MySlotMate commission', minus(t.commission_cents)],
        ['TCS withheld', minus(t.tcs_cents)],
        ['TDS withheld', minus(t.tds_cents)],
        ['Earned this month', rupees(t.payable_cents), true],
        ['Paid out this month', rupees(t.paid_out_cents)],
        ['Payouts on the way', rupees(t.in_flight_cents)],
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink">Host payout statements</h3>
        <p className="mt-0.5 max-w-3xl text-xs text-mist">
          Every paid sale on a host&apos;s experiences in the month, what was refunded, any commission, TCS and TDS
          withheld, what they earned and the payouts sent. Hosts can download the same statement from their Earnings
          page.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <form onSubmit={(e) => void search(e)} className="flex min-w-[260px] flex-1 items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-[11px] font-bold text-slate-600">
              Host
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${INPUT} w-full pl-9`}
                  placeholder="Search by name, email or phone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </span>
            </label>
            <Button variant="outline" size="sm" type="submit">
              Find
            </Button>
          </form>
          <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
            Month
            <input type="month" className={INPUT} value={month} onChange={(e) => setMonth(e.target.value)} />
          </label>
        </div>

        {hosts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {hosts.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setHost({ id: h.id!, name: h.name });
                  setHosts([]);
                }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand-400"
              >
                {h.name}
                {h.city ? <span className="text-mist"> · {h.city}</span> : null}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-3 text-xs font-semibold text-rose-600">{error}</p>}
      </Card>

      {host && st && t && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-bold text-ink">{st.host.name}</h4>
              <p className="text-xs text-mist">
                {[st.host.email, st.host.pan_masked && `PAN ${st.host.pan_masked}`, st.host.gstin && `GSTIN ${st.host.gstin}`]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button variant="primary" size="sm" type="button" disabled={downloading} onClick={() => void download()}>
              <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Download PDF'}
            </Button>
          </div>

          <dl className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {summary.map(([k, v, strong]) => (
              <div key={k} className={`flex justify-between gap-4 ${strong ? 'font-bold text-ink' : 'text-slate-600'}`}>
                <dt>{k}</dt>
                <dd className="tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>

          <h5 className="mt-6 text-xs font-black uppercase tracking-wider text-slate-500">Sales ({t.sales})</h5>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Experience</th>
                  <th className="py-2 pr-3 text-right">Ticket</th>
                  <th className="py-2 pr-3 text-right">Commission</th>
                  <th className="py-2 pr-3 text-right">TCS</th>
                  <th className="py-2 pr-3 text-right">TDS</th>
                  <th className="py-2 pr-3 text-right">Earned</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {st.lines.map((l) => (
                  <tr key={l.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">{dayIST(l.date)}</td>
                    <td className="py-2 pr-3">
                      {l.event_title}
                      <span className="text-xs text-mist">
                        {' '}
                        · {l.kind === 'pass' ? 'Pass' : `${l.quantity} ticket${l.quantity === 1 ? '' : 's'}`}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{rupees(l.ticket_cents)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{rupees(l.commission_cents)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{rupees(l.tcs_cents)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{rupees(l.tds_cents)}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                      {l.refunded ? '—' : rupees(l.payable_cents)}
                    </td>
                    <td className="py-2">{l.refunded && <Badge color="amber">Refunded</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {st.lines.length === 0 && <p className="py-6 text-center text-sm text-mist">No paid sales this month.</p>}
          </div>

          {st.payouts.length > 0 && (
            <>
              <h5 className="mt-6 text-xs font-black uppercase tracking-wider text-slate-500">Payouts</h5>
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {st.payouts.map((p) => (
                  <li key={p.id} className="flex justify-between gap-4 py-2">
                    <span className="text-slate-600">
                      {dayIST(p.date)} · {p.reference || p.id.slice(0, 8)} · {p.status}
                    </span>
                    <span className="tabular-nums">{rupees(p.amount_cents)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

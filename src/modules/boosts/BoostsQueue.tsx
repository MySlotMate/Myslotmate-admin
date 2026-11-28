import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { BOOST_CHANNELS, fetchBoosts, startBoost, type Boost } from '../../api/boosts';
import { BOOST_PLAN_ENABLED, boostPlanApi, daysBetween, gstOn } from '../../api/boostPlan';
import { DatePill } from '../../components/event-form/DateTimePills';
import { searchMarketingEvents, type MarketingEventOption } from '../../api/landingPages';
import { dateTimeIST, pct, rupees, statusBadge, tabOf, TABS, type Tab } from './format';

// Event Boost queue: requests from hosts, open proposals, accepted ones
// waiting to go live, live campaigns and finished ones. "Boost an event" opens
// one on any host's event; it joins the queue as a new request.

const inputCls =
  'w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400';

export const BoostsQueue: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Boost[] | null>(null);
  const [tab, setTab] = useState<Tab>('new');
  const [error, setError] = useState<string | null>(null);

  // "Boost an event" picker: lists events right away, search narrows it.
  const [picking, setPicking] = useState(false);
  const [eventQuery, setEventQuery] = useState('');
  const [eventResults, setEventResults] = useState<MarketingEventOption[]>([]);
  const [channels, setChannels] = useState<string[]>(['instagram', 'facebook']);
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  // Paid-budget Boost: the ad budget plan to propose.
  const [plan, setPlan] = useState(() => {
    const d = (n: number) => new Date(Date.now() + 5.5 * 3600 * 1000 + n * 86_400_000).toISOString().slice(0, 10);
    return { daily: '1000', from: d(1), until: d(7) };
  });
  const dailyCents = Math.round((Number(plan.daily) || 0) * 100);
  const planDays = plan.from && plan.until ? daysBetween(plan.from, plan.until) : 0;
  const planOk = !BOOST_PLAN_ENABLED || (dailyCents >= 50_000 && planDays >= 3);

  useEffect(() => {
    if (!picking) return;
    const t = setTimeout(() => {
      searchMarketingEvents(eventQuery.trim() || undefined)
        .then((res) => setEventResults(res.items))
        .catch(() => setEventResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [picking, eventQuery]);

  const togglePicker = () => {
    setPicking((v) => !v);
    setStartError(null);
  };

  const toggleChannel = (key: string) =>
    setChannels((cur) => (cur.includes(key) ? cur.filter((c) => c !== key) : [...cur, key]));

  const handleStart = async (evt: MarketingEventOption) => {
    setStarting(evt.id);
    setStartError(null);
    try {
      const budget = BOOST_PLAN_ENABLED
        ? { daily_budget_cents: dailyCents, budget_from: plan.from, budget_until: plan.until }
        : undefined;
      const b = await startBoost(evt.id, channels, budget);
      if (budget) await boostPlanApi.savePlan(b.id, budget);
      navigate(`/boosts/${b.id}`);
    } catch (e) {
      setStartError(`${evt.title}: ${e instanceof Error ? e.message : 'Could not start the Boost.'}`);
      setStarting(null);
    }
  };

  useEffect(() => {
    fetchBoosts()
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load Boosts.'));
  }, []);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { new: 0, proposed: 0, payment: 0, accepted: 0, live: 0, ended: 0, closed: 0 };
    (items ?? []).forEach((b) => c[tabOf(b)]++);
    return c;
  }, [items]);
  const shown = (items ?? []).filter((b) => tabOf(b) === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">
            Event Boost
          </p>
          <p className="mt-2 max-w-3xl text-sm text-mist">
            Hosts ask to promote one event, or you boost one yourself. Send a proposal per ticket type (the host
            guide&apos;s rate, or 12–20% for tickets of ₹1,000+ with a reason); once the host accepts, go live when the
            ads start. Commission applies only to tickets sold while live. Invite pilot hosts from their profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BOOST_PLAN_ENABLED && (
            <Link to="/boosts/settings">
              <Button variant="outline">Settings</Button>
            </Link>
          )}
          <Button variant={picking ? 'secondary' : 'primary'} onClick={togglePicker} disabled={starting !== null}>
            {picking ? 'Cancel' : 'Boost an event'}
          </Button>
        </div>
      </div>

      {picking && (
        <Card className="p-5 bg-white/95">
          <p className="mb-2 text-xs font-bold text-slate-600">
            Where to promote it
            <span className="ml-2 font-normal text-slate-400">You can change the plan with the host later.</span>
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            {BOOST_CHANNELS.map((ch) => {
              const on = channels.includes(ch.key);
              return (
                <button
                  key={ch.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleChannel(ch.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    on
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-brand-100 bg-white text-slate-600 hover:border-brand-400'
                  }`}
                >
                  {ch.label}
                </button>
              );
            })}
          </div>
          {BOOST_PLAN_ENABLED && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold text-slate-600">
                Ad budget plan
                <span className="ml-2 font-normal text-slate-400">
                  The host pays it upfront once they accept: {planDays} days, {rupees(dailyCents * planDays)} +{' '}
                  {rupees(gstOn(dailyCents * planDays))} GST.
                </span>
              </p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                  Daily (₹)
                  <input
                    className="w-32 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400"
                    type="number"
                    min={500}
                    step={100}
                    value={plan.daily}
                    onChange={(e) => setPlan({ ...plan, daily: e.target.value })}
                  />
                </label>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                  From
                  <DatePill value={plan.from} onChange={(v) => setPlan({ ...plan, from: v })} ariaLabel="Ads from" />
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                  Until
                  <DatePill value={plan.until} onChange={(v) => setPlan({ ...plan, until: v })} min={plan.from} ariaLabel="Ads until" />
                </div>
              </div>
              {!planOk && (
                <p className="mt-2 text-xs font-semibold text-rose-600">At least ₹500 a day for at least 3 days.</p>
              )}
            </div>
          )}
          <label className="mb-2 block text-xs font-bold text-slate-600">
            Select an event
            <span className="ml-2 font-normal text-slate-400">
              It joins the queue as a new request. The host accepts your proposal before anything goes live.
            </span>
          </label>
          <input
            className={inputCls}
            type="search"
            placeholder="Search experiences by title..."
            value={eventQuery}
            onChange={(e) => setEventQuery(e.target.value)}
          />
          {startError && <p className="mt-3 text-sm font-semibold text-rose-600">{startError}</p>}
          {eventResults.length === 0 && <p className="mt-3 text-sm text-slate-400">No events found.</p>}
          {eventResults.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-brand-100">
              {eventResults.map((evt) => (
                <li key={evt.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{evt.title}</p>
                    <p className="text-xs text-slate-500">
                      {evt.hostName} · {evt.city || 'Online'} · {evt.status}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => handleStart(evt)}
                    disabled={starting !== null || channels.length === 0 || !planOk}
                  >
                    {starting === evt.id ? 'Starting…' : 'Boost'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-1 border-b border-slate-200" role="tablist">
        {TABS.filter((t) => BOOST_PLAN_ENABLED || t.key !== 'payment').map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            title={t.hint}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold transition ${
              tab === t.key ? 'border-brand-600 text-ink' : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                  t.key === 'new' || t.key === 'accepted' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Event</th>
              <th className="px-3 py-3">Host</th>
              <th className="px-3 py-3">Rates</th>
              <th className="px-3 py-3">Requested</th>
              <th className="px-3 py-3 text-right">Sold · commission</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => {
              const s = statusBadge(b);
              return (
                <tr
                  key={b.id}
                  onClick={() => navigate(`/boosts/${b.id}`)}
                  className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <span className="block font-semibold text-ink">{b.event_title}</span>
                    <span className="block text-xs text-mist">{b.channels.join(', ')}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{b.host_name}</td>
                  <td className="px-3 py-3 text-slate-600">
                    {b.rates.map((r) => `${r.ticket_name} ${pct(r.rate_bps)}`).join(' · ')}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-slate-600">{dateTimeIST(b.requested_at)}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                    {b.tickets_sold > 0 ? `${b.tickets_sold} · ${rupees(b.commission_cents)}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge color={s.color} withDot>
                      {s.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items && shown.length === 0 && <p className="py-10 text-center text-sm text-mist">Nothing here.</p>}
        {!items && !error && <p className="py-10 text-center text-sm text-mist">Loading…</p>}
      </Card>
    </div>
  );
};

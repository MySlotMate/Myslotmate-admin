import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Check } from 'lucide-react';
import { DateTimePill } from '../../components/event-form/DateTimePills';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  commissionCents,
  declineBoost,
  endBoost,
  fetchBoost,
  goLiveBoost,
  logBoostCampaign,
  proposeBoost,
  type BoostBand,
  type BoostDetail,
  type BoostRate,
} from '../../api/boosts';
import { dateTimeIST, pct, rupees, statusBadge } from './format';

// One Boost: the request, the proposal form, go-live and the campaign.

const INPUT =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-brand-400';

const bandFor = (bands: BoostBand[], price: number) =>
  bands.find((b) => price >= b.min_price_cents && (b.max_price_cents === null || price <= b.max_price_cents));

// datetime-local value (IST) <-> ISO
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(`${v}:00+05:30`).toISOString() : null);

const ACTION_LABEL: Record<string, string> = {
  requested: 'Host requested a Boost',
  started_by_admin: 'Started from the admin',
  proposed: 'Proposal sent',
  accepted: 'Host accepted',
  went_live: 'Went live',
  stopped: 'Host stopped it',
  ended: 'Ended',
  declined: 'Declined',
  cancelled: 'Host withdrew',
  campaign: 'Campaign numbers logged',
};

interface Draft {
  rates: Record<string, { bps: number; reason: string }>;
  note: string;
  from: string;
  until: string;
}

const draftFrom = (d: BoostDetail): Draft => {
  // Start from the Boost's current rates where the ticket still exists, else the guide.
  const quoted = new Map(d.rates.map((r) => [r.ticket_key, r]));
  const rates: Draft['rates'] = {};
  d.current_ticket_types.forEach((t) => {
    const q = quoted.get(t.ticket_key);
    rates[t.ticket_key] =
      q && q.price_cents === t.price_cents
        ? { bps: q.rate_bps, reason: q.reason ?? '' }
        : { bps: t.guide_rate_bps, reason: '' };
  });
  return { rates, note: d.admin_note ?? '', from: toLocal(d.planned_from), until: toLocal(d.planned_until) };
};

export const BoostReview: React.FC = () => {
  const { id = '' } = useParams();
  const [d, setD] = useState<BoostDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveUntil, setLiveUntil] = useState('');
  const [campaign, setCampaign] = useState({ reach: '', clicks: '' });

  const load = useCallback(
    () =>
      fetchBoost(id)
        .then((x) => {
          setD(x);
          setDraft(draftFrom(x));
          setLiveUntil(toLocal(x.planned_until));
          setCampaign({ reach: String(x.reach || ''), clicks: String(x.clicks || '') });
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the Boost.')),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (what: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(what);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (!d || !draft) {
    return <Card className="p-6 text-sm text-mist">{error ?? 'Loading…'}</Card>;
  }

  const s = statusBadge(d);
  const canPropose = d.status === 'under_review' || d.status === 'quote_ready';
  const accepted = d.status === 'quote_ready' && !!d.accepted_at;
  const setRate = (key: string, patch: Partial<{ bps: number; reason: string }>) =>
    setDraft({ ...draft, rates: { ...draft.rates, [key]: { ...draft.rates[key], ...patch } } });

  const problems = d.current_ticket_types
    .map((t) => {
      const r = draft.rates[t.ticket_key];
      return r && r.bps !== t.guide_rate_bps && !r.reason.trim() ? `Give a reason for ${t.ticket_name}.` : null;
    })
    .filter(Boolean) as string[];

  const sendProposal = () =>
    run(accepted ? 'New proposal sent. The host has to accept it again.' : 'Proposal sent to the host.', () =>
      proposeBoost(d.id, {
        rates: d.current_ticket_types.map((t) => ({
          ticket_key: t.ticket_key,
          rate_bps: draft.rates[t.ticket_key].bps,
          reason: draft.rates[t.ticket_key].reason.trim() || undefined,
        })),
        note: draft.note.trim() || undefined,
        planned_from: fromLocal(draft.from),
        planned_until: fromLocal(draft.until),
      }),
    );

  const decline = () => {
    const reason = window.prompt('Why are we declining? The host sees this.');
    if (!reason?.trim()) return;
    void run('Declined.', () => declineBoost(d.id, reason.trim()));
  };

  const goLive = () => {
    if (!window.confirm('Go live? Commission starts on tickets sold from now.')) return;
    void run('Live. Commission applies to tickets sold from now.', () => goLiveBoost(d.id, fromLocal(liveUntil)));
  };

  const end = () => {
    if (!window.confirm('End this Boost now? Tickets sold after this carry no commission.')) return;
    void run('Ended.', () => endBoost(d.id));
  };

  const ratesTable = (rows: BoostRate[]) => (
    <table className="mt-3 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
          <th className="py-2 pr-3">Ticket</th>
          <th className="py-2 pr-3 text-right">Price</th>
          <th className="py-2 pr-3 text-right">Rate</th>
          <th className="py-2 pr-3 text-right">Per ticket</th>
          <th className="py-2">Reason</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ticket_key} className="border-b border-slate-100">
            <td className="py-2 pr-3 font-semibold text-ink">{r.ticket_name}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{rupees(r.price_cents)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {pct(r.rate_bps)}
              {r.rate_bps !== r.guide_rate_bps && <span className="text-xs text-mist"> (guide {pct(r.guide_rate_bps)})</span>}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums">{rupees(commissionCents(r.price_cents, r.rate_bps))}</td>
            <td className="py-2 text-slate-600">{r.reason ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      <Link to="/boosts" className="inline-flex items-center gap-1 text-xs font-bold text-mist hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All Boosts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">{d.event_title}</h2>
          <p className="text-sm text-mist">
            {d.host_name} · requested {dateTimeIST(d.requested_at)}
          </p>
        </div>
        <Badge color={s.color} withDot>
          {s.label}
        </Badge>
      </div>

      {notice && (
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <Check className="h-4 w-4" /> {notice}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">The request</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-mist">Goal</dt>
              <dd className="text-ink">{d.goal_text || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-mist">Channels</dt>
              <dd className="text-ink">{d.channels.join(', ')}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-mist">Audience notes</dt>
              <dd className="whitespace-pre-line text-ink">{d.audience_notes || '—'}</dd>
            </div>
          </dl>
          {d.eligibility_problem && canPropose && (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Today this event would fail the request checks: {d.eligibility_problem}
            </p>
          )}
          {!d.host_invited && (
            <p className="mt-3 text-xs text-mist">This host is no longer in the Boost pilot.</p>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Event</h3>
          {d.event.cover_image_url && (
            <img src={d.event.cover_image_url} alt="" className="mt-3 aspect-video w-full rounded-xl object-cover" />
          )}
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-mist">{d.event.schedule_type === 'one_time' ? 'Date' : 'Starts'}</dt>
              <dd className="text-right text-ink">{dateTimeIST(d.event.time)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mist">Repeats</dt>
              <dd className="text-ink">{d.event.schedule_type === 'one_time' ? 'No' : 'Yes'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mist">Where</dt>
              <dd className="text-right text-ink">{d.event.is_online ? 'Online' : d.event.location || '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-mist">Status</dt>
              <dd className="text-ink">{d.event.status}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {canPropose && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-ink">{d.status === 'under_review' ? 'Proposal' : 'Proposal sent'}</h3>
          <p className="mt-0.5 text-xs text-mist">
            Commission per ticket type, on the ticket price after any discount; the guest&apos;s platform fee is
            separate. Under ₹1,000 is fixed at 20%. From ₹1,000 you can set 12–20%, with a reason the host will see when
            it differs from the guide.
            {accepted && ' The host has accepted; sending a new proposal asks them to accept again.'}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Ticket</th>
                  <th className="py-2 pr-3 text-right">Price</th>
                  <th className="py-2 pr-3 text-right">Guide</th>
                  <th className="py-2 pr-3">Rate</th>
                  <th className="py-2 pr-3 text-right">Per ticket</th>
                  <th className="py-2">Reason (shown to the host)</th>
                </tr>
              </thead>
              <tbody>
                {d.current_ticket_types.map((t) => {
                  const band = bandFor(d.bands, t.price_cents);
                  const r = draft.rates[t.ticket_key];
                  const fixed = !band || band.min_rate_bps === band.max_rate_bps;
                  const options: number[] = [];
                  if (band) for (let b = band.min_rate_bps; b <= band.max_rate_bps; b += 100) options.push(b);
                  return (
                    <tr key={t.ticket_key} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 font-semibold text-ink">{t.ticket_name}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{rupees(t.price_cents)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{pct(t.guide_rate_bps)}</td>
                      <td className="py-2 pr-3">
                        {fixed ? (
                          <span className="tabular-nums">{pct(r.bps)} (fixed)</span>
                        ) : (
                          <select
                            className={INPUT}
                            value={r.bps}
                            disabled={busy}
                            onChange={(e) => setRate(t.ticket_key, { bps: Number(e.target.value) })}
                          >
                            {options.map((o) => (
                              <option key={o} value={o}>
                                {pct(o)}
                                {o === t.guide_rate_bps ? ' (guide)' : ''}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                        {rupees(commissionCents(t.price_cents, r.bps))}
                      </td>
                      <td className="py-2">
                        {!fixed && (
                          <input
                            className={`${INPUT} w-full ${r.bps !== t.guide_rate_bps && !r.reason.trim() ? 'border-rose-300' : ''}`}
                            placeholder={r.bps === t.guide_rate_bps ? 'Optional' : 'Required: why this rate'}
                            value={r.reason}
                            disabled={busy}
                            onChange={(e) => setRate(t.ticket_key, { reason: e.target.value })}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600 md:col-span-3">
              Note to the host
              <textarea
                className={`${INPUT} min-h-[72px]`}
                placeholder="e.g. We'll run Instagram and WhatsApp ads for two weeks before the event."
                value={draft.note}
                disabled={busy}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </label>
            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Planned start (IST)
              <DateTimePill
                label="Planned start"
                clearable
                value={draft.from}
                disabled={busy}
                onChange={(v) => setDraft({ ...draft, from: v })}
              />
            </div>
            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Planned end (IST)
              <DateTimePill
                label="Planned end"
                clearable
                value={draft.until}
                min={draft.from ? draft.from.slice(0, 10) : undefined}
                disabled={busy}
                onChange={(v) => setDraft({ ...draft, until: v })}
              />
            </div>
          </div>

          {problems.length > 0 && <p className="mt-3 text-xs font-semibold text-rose-600">{problems[0]}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="danger" size="sm" type="button" disabled={busy} onClick={decline}>
              Decline
            </Button>
            <Button variant="primary" size="sm" type="button" disabled={busy || problems.length > 0} onClick={() => void sendProposal()}>
              {d.status === 'under_review' ? 'Send proposal' : 'Send new proposal'}
            </Button>
          </div>
        </Card>
      )}

      {d.status === 'quote_ready' && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-ink">Go live</h3>
          {accepted ? (
            <>
              <p className="mt-0.5 text-xs text-mist">
                The host accepted on {dateTimeIST(d.accepted_at)}. Go live when the ads start; commission applies to
                tickets sold from then until the end time
                {d.event.schedule_type === 'one_time' ? ' (or the event start, whichever is first)' : ''}.
              </p>
              {ratesTable(d.rates)}
              <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
                <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
                  Ends (IST, optional)
                  <DateTimePill label="Ends" clearable value={liveUntil} disabled={busy} onChange={setLiveUntil} />
                </div>
                <Button variant="primary" size="sm" type="button" disabled={busy} onClick={goLive}>
                  Go live
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-mist">Waiting for the host to accept the proposal.</p>
          )}
        </Card>
      )}

      {(d.status === 'live' || d.status === 'ended') && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-ink">{d.status === 'live' ? 'Live' : 'Ended'}</h3>
              <p className="text-xs text-mist">
                {dateTimeIST(d.live_from)} → {d.live_until ? dateTimeIST(d.live_until) : 'until ended'}
                {d.ended_reason && ` · ${d.ended_reason.replace(/_/g, ' ')}`}
              </p>
            </div>
            {d.status === 'live' && (
              <Button variant="danger" size="sm" type="button" disabled={busy} onClick={end}>
                End now
              </Button>
            )}
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-4">
            {[
              ['Tickets sold', String(d.tickets_sold)],
              ['Commission', rupees(d.commission_cents)],
              ['Reach', d.reach.toLocaleString('en-IN')],
              ['Clicks', d.clicks.toLocaleString('en-IN')],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-slate-200 p-3">
                <dt className="text-[11px] font-black uppercase tracking-wider text-slate-500">{k}</dt>
                <dd className="mt-1 text-lg font-black text-ink tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-xs text-mist">Tickets and commission are net of refunds.</p>
          {ratesTable(d.rates)}
          <form
            className="mt-4 flex flex-wrap items-end justify-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run('Campaign numbers saved.', () =>
                logBoostCampaign(d.id, Number(campaign.reach) || 0, Number(campaign.clicks) || 0),
              );
            }}
          >
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Reach
              <input className={`${INPUT} w-32`} type="number" min={0} value={campaign.reach} onChange={(e) => setCampaign({ ...campaign, reach: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold text-slate-600">
              Clicks
              <input className={`${INPUT} w-32`} type="number" min={0} value={campaign.clicks} onChange={(e) => setCampaign({ ...campaign, clicks: e.target.value })} />
            </label>
            <Button variant="outline" size="sm" type="submit" disabled={busy}>
              Save numbers
            </Button>
          </form>
        </Card>
      )}

      {(d.status === 'declined' || d.status === 'cancelled') && (
        <Card className="p-6 text-sm">
          {d.status === 'declined' ? (
            <p>
              <span className="font-bold text-ink">Declined:</span> {d.decline_reason}
            </p>
          ) : (
            <p className="text-mist">The host withdrew this request.</p>
          )}
          {d.rates.length > 0 && ratesTable(d.rates)}
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">History</h3>
        <ol className="mt-3 space-y-2 text-sm">
          {d.log.map((e, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-3 border-b border-slate-100 pb-2">
              <span className="text-ink">
                {ACTION_LABEL[e.action] ?? e.action}
                {e.actor_kind === 'admin' && e.actor ? <span className="text-mist"> · {e.actor}</span> : null}
                {e.actor_kind === 'system' ? <span className="text-mist"> · automatic</span> : null}
              </span>
              <span className="text-xs text-mist">{dateTimeIST(e.created_at)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
};

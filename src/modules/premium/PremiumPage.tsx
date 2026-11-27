import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge, type BadgeColor } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fetchHosts } from '../../api/directory';
import {
  BOOST_PLAN_ENABLED,
  BOOST_PLAN_MOCK,
  PREMIUM_STATUS_LABEL,
  boostPlanApi as api,
  mockSampleApplication,
  type PremiumMember,
  type PremiumStatus,
} from '../../api/boostPlan';
import type { Host } from '../../types';
import { dateTimeIST } from '../boosts/format';

// Premium Hosts (PRD: Premium Host program): applications to approve or
// decline, active members with their campaign manager, and granting Premium to
// a host the team handles. Premium is free and is what unlocks Boost.

const INPUT =
  'w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400';

const TABS: { key: PremiumStatus; label: string }[] = [
  { key: 'applied', label: 'Applications' },
  { key: 'active', label: 'Active' },
  { key: 'declined', label: 'Declined' },
  { key: 'removed', label: 'Removed' },
];

const COLOR: Record<PremiumStatus, BadgeColor> = {
  applied: 'amber',
  active: 'green',
  declined: 'slate',
  removed: 'rose',
};

/** Manager fields, shared by Approve and Grant. */
const ManagerForm: React.FC<{
  busy: boolean;
  submitLabel: string;
  onSubmit: (m: { manager_name: string; manager_contact: string }) => void;
  onCancel: () => void;
}> = ({ busy, submitLabel, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-brand-100 p-3">
      <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
        Campaign manager
        <input className={INPUT} value={name} placeholder="Riya Das" onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
        Manager&apos;s email or phone (shown to the host)
        <input className={INPUT} value={contact} placeholder="riya@myslotmate.com" onChange={(e) => setContact(e.target.value)} />
      </label>
      <Button variant="secondary" size="sm" type="button" onClick={onCancel} disabled={busy}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        type="button"
        disabled={busy || !name.trim() || !contact.trim()}
        onClick={() => onSubmit({ manager_name: name.trim(), manager_contact: contact.trim() })}
      >
        {submitLabel}
      </Button>
    </div>
  );
};

export const PremiumPage: React.FC = () => {
  const [tab, setTab] = useState<PremiumStatus>('applied');
  const [items, setItems] = useState<PremiumMember[] | null>(null);
  const [counts, setCounts] = useState<Partial<Record<PremiumStatus, number>>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  // Grant Premium: lists hosts right away, search narrows it.
  const [granting, setGranting] = useState(false);
  const [query, setQuery] = useState('');
  const [hosts, setHosts] = useState<Host[]>([]);
  const [pick, setPick] = useState<Host | null>(null);

  const load = useCallback(
    () =>
      api
        .listPremium('')
        .then((r) => {
          setItems(r.items);
          setCounts(r.counts);
          setError(null);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load Premium hosts.')),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!granting) return;
    const t = setTimeout(() => {
      fetchHosts({ page: 1, pageSize: 10, search: query.trim() || undefined })
        .then((r) => setHosts(r.items))
        .catch(() => setHosts([]));
    }, 300);
    return () => clearTimeout(t);
  }, [granting, query]);

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

  const shown = useMemo(() => (items ?? []).filter((m) => m.status === tab), [items, tab]);

  const decline = (m: PremiumMember) => {
    const reason = window.prompt(`Why isn't ${m.host_name} approved? The host sees this.`);
    if (!reason?.trim()) return;
    void run('Application declined.', () => api.declinePremium(m.host_id, reason.trim()));
  };
  const remove = (m: PremiumMember) => {
    const reason = window.prompt(`Why remove ${m.host_name} from Premium? The host sees this. A live Boost runs to its end date.`);
    if (!reason?.trim()) return;
    void run('Removed from Premium.', () => api.removePremium(m.host_id, reason.trim()));
  };

  if (!BOOST_PLAN_ENABLED) return <Card className="p-6 text-sm text-mist">Premium Hosts isn&apos;t switched on yet.</Card>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">
            Premium Hosts
          </p>
          <p className="mt-2 max-w-3xl text-sm text-mist">
            Premium is free and unlocks Boost. Approve applications with a campaign manager, or grant Premium to a host
            the team handles end to end.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {BOOST_PLAN_MOCK && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              disabled={busy}
              onClick={() =>
                void run('Test mode: a sample application was added.', async () => {
                  const r = await fetchHosts({ page: 1, pageSize: 1 });
                  const h = r.items[0];
                  if (!h?.id) throw new Error('No host found to use for the sample.');
                  mockSampleApplication(h.id, h.name);
                })
              }
            >
              Test: add an application
            </Button>
          )}
          <Button
            variant={granting ? 'secondary' : 'primary'}
            onClick={() => {
              setGranting((v) => !v);
              setPick(null);
            }}
            disabled={busy}
          >
            {granting ? 'Cancel' : 'Grant Premium'}
          </Button>
        </div>
      </div>

      {granting && (
        <Card className="p-5 bg-white/95">
          <label className="mb-2 block text-xs font-bold text-slate-600">
            Select a host
            <span className="ml-2 font-normal text-slate-400">They become Premium at once, with the manager you set.</span>
          </label>
          <input className={INPUT} type="search" placeholder="Search hosts by name..." value={query} onChange={(e) => setQuery(e.target.value)} />
          {hosts.length === 0 && <p className="mt-3 text-sm text-slate-400">No hosts found.</p>}
          {hosts.length > 0 && !pick && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-brand-100">
              {hosts.map((h) => (
                <li key={h.id ?? h.name} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{h.name}</p>
                    <p className="text-xs text-slate-500">
                      {h.city || '—'} · {h.experiencesCreated} events · {h.verificationStatus}
                    </p>
                  </div>
                  <Button variant="primary" size="sm" type="button" disabled={!h.id} onClick={() => setPick(h)}>
                    Select
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {pick?.id && (
            <>
              <p className="mt-3 text-sm text-ink">
                Granting Premium to <span className="font-bold">{pick.name}</span>
              </p>
              <ManagerForm
                busy={busy}
                submitLabel="Grant Premium"
                onCancel={() => setPick(null)}
                onSubmit={(m) =>
                  void run(`${pick.name} is Premium now.`, async () => {
                    await api.grantPremium(pick.id!, pick.name, m);
                    setGranting(false);
                    setPick(null);
                  })
                }
              />
            </>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold transition ${
              tab === t.key ? 'border-brand-600 text-ink' : 'border-transparent text-mist hover:text-ink'
            }`}
          >
            {t.label}
            {(counts[t.key] ?? 0) > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${t.key === 'applied' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
          <Check className="h-4 w-4" /> {notice}
        </p>
      )}
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

      <Card className="p-0">
        {items && shown.length === 0 && <p className="py-10 text-center text-sm text-mist">Nothing here.</p>}
        {!items && !error && <p className="py-10 text-center text-sm text-mist">Loading…</p>}
        <ul className="divide-y divide-slate-100">
          {shown.map((m) => (
            <li key={m.host_id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/hosts/${m.host_id}`} className="text-sm font-bold text-ink hover:underline">
                    {m.host_name}
                  </Link>
                  <p className="text-xs text-mist">
                    {m.status === 'applied'
                      ? `Applied ${dateTimeIST(m.applied_at)}`
                      : `${m.granted ? 'Granted' : PREMIUM_STATUS_LABEL[m.status]} ${dateTimeIST(m.decided_at)}${m.decided_by ? ` by ${m.decided_by}` : ''}`}
                    {m.manager_name && ` · Manager: ${m.manager_name} (${m.manager_contact})`}
                  </p>
                  {m.application_note && <p className="mt-1 max-w-2xl text-sm text-slate-600">“{m.application_note}”</p>}
                  {(m.decline_reason || m.remove_reason) && (
                    <p className="mt-1 text-xs text-slate-500">Reason: {m.decline_reason ?? m.remove_reason}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={COLOR[m.status]} withDot>
                    {PREMIUM_STATUS_LABEL[m.status]}
                  </Badge>
                  {m.status === 'applied' && approving !== m.host_id && (
                    <>
                      <Button variant="danger" size="sm" type="button" disabled={busy} onClick={() => decline(m)}>
                        Decline
                      </Button>
                      <Button variant="primary" size="sm" type="button" disabled={busy} onClick={() => setApproving(m.host_id)}>
                        Approve
                      </Button>
                    </>
                  )}
                  {m.status === 'active' && (
                    <Button variant="outline" size="sm" type="button" disabled={busy} onClick={() => remove(m)}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {approving === m.host_id && (
                <ManagerForm
                  busy={busy}
                  submitLabel="Approve"
                  onCancel={() => setApproving(null)}
                  onSubmit={(mgr) =>
                    void run(`${m.host_name} is Premium now.`, async () => {
                      await api.approvePremium(m.host_id, mgr);
                      setApproving(null);
                    })
                  }
                />
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
};

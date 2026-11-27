import React, { useCallback, useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PREMIUM_STATUS_LABEL, boostPlanApi as api, type PremiumMember } from '../../api/boostPlan';
import { dateTimeIST } from '../boosts/format';

// Premium on a host's profile (PRD: Premium Host program). Replaces the Boost
// pilot invite: Premium is what unlocks Boost now.

const INPUT =
  'w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400';

export const PremiumHostCard: React.FC<{ hostId: string; hostName: string }> = ({ hostId, hostName }) => {
  const [m, setM] = useState<PremiumMember | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');

  const load = useCallback(
    () =>
      api
        .getPremium(hostId)
        .then(setM)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load.')),
    [hostId],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const active = m?.status === 'active';
  const applied = m?.status === 'applied';

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <span>
          <span className="block text-xs font-extrabold uppercase tracking-wider text-brand-700">Premium host</span>
          <span className="mt-1 block text-sm text-slate-500">
            {m === undefined
              ? error
                ? 'Couldn’t load Premium for this host.'
                : 'Loading…'
              : active
                ? `Premium since ${dateTimeIST(m.decided_at)}. Manager: ${m.manager_name ?? '—'}${m.manager_contact ? ` (${m.manager_contact})` : ''}. Boost is unlocked.`
                : applied
                  ? `Applied ${dateTimeIST(m.applied_at)}. Review it under Premium.`
                  : 'Not Premium, so Boost is locked for this host. Grant Premium to boost their events.'}
          </span>
        </span>
        <div className="flex items-center gap-2">
          {m && <Badge color={active ? 'green' : applied ? 'amber' : 'slate'}>{PREMIUM_STATUS_LABEL[m.status]}</Badge>}
          {m !== undefined && !active && !open && (
            <Button variant="primary" size="sm" type="button" disabled={busy} onClick={() => setOpen(true)}>
              {applied ? 'Approve' : 'Grant Premium'}
            </Button>
          )}
          {active && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              disabled={busy}
              onClick={() => {
                const reason = window.prompt('Why remove this host from Premium? The host sees this.');
                if (reason?.trim()) void act(() => api.removePremium(hostId, reason.trim()));
              }}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
            Campaign manager
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-bold text-slate-600">
            Manager&apos;s email or phone
            <input className={INPUT} value={contact} onChange={(e) => setContact(e.target.value)} />
          </label>
          <Button variant="secondary" size="sm" type="button" disabled={busy} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="button"
            disabled={busy || !name.trim() || !contact.trim()}
            onClick={() =>
              void act(() =>
                applied
                  ? api.approvePremium(hostId, { manager_name: name.trim(), manager_contact: contact.trim() })
                  : api.grantPremium(hostId, hostName, { manager_name: name.trim(), manager_contact: contact.trim() }),
              )
            }
          >
            {applied ? 'Approve' : 'Grant Premium'}
          </Button>
        </div>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
    </Card>
  );
};

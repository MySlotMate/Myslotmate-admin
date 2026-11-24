import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { fetchBoostInvite, setBoostInvite } from '../../api/boosts';

// Event Boost pilot: only invited hosts can request a Boost.
export const BoostInviteCard: React.FC<{ hostId: string }> = ({ hostId }) => {
  const [invited, setInvited] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoostInvite(hostId)
      .then((r) => setInvited(r.invited))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load.'));
  }, [hostId]);

  const toggle = async (next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const r = await setBoostInvite(hostId, next);
      setInvited(r.invited);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-xs font-extrabold uppercase tracking-wider text-brand-700">Event Boost pilot</span>
          <span className="mt-1 block text-sm text-slate-500">
            {invited
              ? 'This host can ask to boost their events. Requests show up under Boosts.'
              : 'Invite this host to the pilot so they can ask to boost an event.'}
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="mt-1 h-5 w-5 accent-brand-600"
          checked={!!invited}
          disabled={invited === null || saving}
          onChange={(e) => void toggle(e.target.checked)}
        />
      </label>
      {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
    </Card>
  );
};

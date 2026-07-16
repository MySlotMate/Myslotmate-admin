import React, { useEffect, useState } from 'react';
import { Pause } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { fetchEventOccurrences } from '../../api/events';
import type { EventOccurrence } from '../../api/events';

type PauseOption = 'all' | 'from' | 'date';

interface PauseExperienceModalProps {
  event: { id: string; host_id: string; title: string; is_recurring: boolean };
  onClose: () => void;
  /** Caller runs the pause API + refreshes the list. */
  onConfirm: (options: { pausedFrom?: string; pausedDate?: string }) => void;
  saving?: boolean;
}

/**
 * Admin pause-experience modal. Mirrors the host-facing flow in
 * MySlotmate-Frontend/src/components/PauseExperienceModal.tsx:
 *   - "all"  → pause the whole series (every future session)
 *   - "from" → pause a chosen session and everything after it
 *   - "date" → skip a single occurrence (recurring events only)
 * Pausing auto-cancels + refunds the affected bookings, so the modal says so.
 */
export const PauseExperienceModal: React.FC<PauseExperienceModalProps> = ({
  event,
  onClose,
  onConfirm,
  saving = false,
}) => {
  const [option, setOption] = useState<PauseOption>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [occurrences, setOccurrences] = useState<EventOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchEventOccurrences(event.id, event.host_id);
        if (!cancelled) setOccurrences(res ?? []);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load sessions.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [event.id, event.host_id]);

  const handleConfirm = () => {
    const options: { pausedFrom?: string; pausedDate?: string } = {};
    if (option === 'from') options.pausedFrom = selectedDate;
    if (option === 'date') options.pausedDate = selectedDate;
    onConfirm(options);
  };

  const sessionPicker = (withTime: boolean) => (
    <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-100">
      {loading ? (
        <div className="p-3 text-center text-xs text-slate-400">
          Loading sessions…
        </div>
      ) : error ? (
        <div className="p-3 text-center text-xs text-rose-600">{error}</div>
      ) : occurrences.length === 0 ? (
        <div className="p-3 text-center text-xs text-slate-400">
          No upcoming sessions.
        </div>
      ) : (
        occurrences.map((o) => (
          <div
            key={o.date}
            onClick={() => !o.is_paused && setSelectedDate(o.date)}
            className={`p-2 text-xs transition ${
              o.is_paused
                ? 'cursor-not-allowed text-slate-400 line-through'
                : selectedDate === o.date
                  ? 'cursor-pointer bg-brand-50 font-bold text-brand-700'
                  : 'cursor-pointer hover:bg-slate-50'
            }`}
          >
            {new Date(o.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
            })}
            {o.is_paused && (
              <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                paused
              </span>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Pause className="h-6 w-6 text-amber-600" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900">
          Pause {event.title}?
        </h2>
        <p className="mb-4 text-sm text-slate-500">
          Select how you would like to pause this experience.
        </p>

        <div className="mb-5 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Affected bookings are automatically cancelled and refunded to the
          guests&apos; wallets.
        </div>

        <div className="mb-6 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50">
            <input
              type="radio"
              name="admin-pause-type"
              checked={option === 'all'}
              onChange={() => setOption('all')}
              className="mt-1 h-4 w-4"
            />
            <div>
              <p className="text-sm font-bold text-slate-900">Pause entirely</p>
              <p className="text-xs text-slate-400">
                Hide the whole experience. Refunds every future session.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50">
            <input
              type="radio"
              name="admin-pause-type"
              checked={option === 'from'}
              onChange={() => setOption('from')}
              className="mt-1 h-4 w-4"
            />
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">
                Pause from a specific session onwards
              </p>
              <p className="text-xs text-slate-400">
                Keep earlier sessions; pause this one and all after it.
              </p>
              {option === 'from' && sessionPicker(true)}
            </div>
          </label>

          {event.is_recurring && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 p-3 transition hover:bg-slate-50">
              <input
                type="radio"
                name="admin-pause-type"
                checked={option === 'date'}
                onChange={() => setOption('date')}
                className="mt-1 h-4 w-4"
              />
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Pause specific session
                </p>
                <p className="text-xs text-slate-400">
                  Skip just one occurrence of this series.
                </p>
                {option === 'date' && sessionPicker(false)}
              </div>
            </label>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1 bg-amber-600 shadow-amber-600/25 hover:bg-amber-700"
            disabled={saving || ((option === 'from' || option === 'date') && !selectedDate)}
            onClick={handleConfirm}
          >
            {saving ? 'Pausing…' : 'Pause Now'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Everyone booked on an experience, grouped by session, from
// GET /events/{id}/attendees (admins skip the host-ownership check).

import { useEffect, useState } from 'react';
import { fetchEventAttendees, type EventAttendee } from '../../api/events';
import { formatISTDateTime } from '../../lib/datetime';

const STATUS: Record<EventAttendee['status'], string> = {
  confirmed: 'bg-emerald-400/15 text-emerald-300',
  pending: 'bg-amber-400/15 text-amber-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
  refunded: 'bg-white/10 text-white/60',
};

const SOURCE: Record<string, string> = {
  walk_in: 'On-spot',
  bulk_import: 'Imported',
};

export function GuestList({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<EventAttendee[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEventAttendees(eventId)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Failed to load guests.'));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (error) return <p className="text-sm text-rose-300">{error}</p>;
  if (!rows) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#A020F0] border-t-transparent" />
      </div>
    );
  }
  if (rows.length === 0) return <p className="text-sm text-white/50">No bookings yet.</p>;

  // A late guest cancel keeps a confirmed row with cancelled_at: the seat is
  // released (not a guest) but the money stays collected.
  const kept = rows.filter((b) => b.status === 'confirmed' || b.status === 'pending');
  const guests = kept.filter((b) => !b.cancelled_at).reduce((n, b) => n + b.quantity, 0);
  const revenue = kept.reduce((n, b) => n + (b.amount_cents ?? 0), 0);

  const bySession = new Map<string, EventAttendee[]>();
  for (const b of rows) {
    const list = bySession.get(b.occurrence_date) ?? [];
    list.push(b);
    bySession.set(b.occurrence_date, list);
  }
  const sessions = [...bySession.keys()].sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          ['Bookings', rows.length.toString()],
          ['Guests', guests.toString()],
          ['Collected', `₹${(revenue / 100).toLocaleString('en-IN')}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/[0.06] bg-[#131328] px-4 py-3">
            <p className="text-xs text-white/45">{k}</p>
            <p className="font-outfit mt-0.5 text-lg font-semibold text-white">{v}</p>
          </div>
        ))}
      </div>

      {sessions.map((s) => (
        <div key={s} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131328]">
          {sessions.length > 1 && (
            <p className="border-b border-white/[0.06] px-4 py-2.5 text-xs font-semibold text-white/60">
              {formatISTDateTime(s)}
            </p>
          )}
          <div className="divide-y divide-white/[0.06]">
            {bySession.get(s)!.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                {b.user_avatar_url ? (
                  <img src={b.user_avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {(b.user_name ?? '?')[0]!.toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{b.user_name || 'Guest'}</p>
                  <p className="truncate text-xs text-white/45">
                    {[b.user_email, b.user_phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm text-white">
                    ×{b.quantity}
                    {b.amount_cents ? (
                      <span className="ml-2 text-white/55">₹{(b.amount_cents / 100).toLocaleString('en-IN')}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex items-center justify-end gap-1.5">
                    {b.pass_id && (
                      <span className="rounded-full bg-[#9B30FF]/15 px-2 py-0.5 text-[11px] font-semibold text-[#D8B4FE]">
                        Pass
                      </span>
                    )}
                    {b.source && SOURCE[b.source] && (
                      <span className="text-[11px] text-white/40">{SOURCE[b.source]}</span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS[b.cancelled_at ? 'cancelled' : b.status]}`}
                    >
                      {b.cancelled_at && b.status === 'confirmed' ? 'cancelled late' : b.status}
                    </span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

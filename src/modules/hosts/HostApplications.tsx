// Host applications: everyone who applied through the website's two-path
// /become-host form and is waiting for review. Approving verifies the host
// (they can sell tickets and get paid); rejecting sends them the reason.

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Inbox, RefreshCw, X } from 'lucide-react';
import { fetchPendingApplications, approveHost, rejectHost } from '../../api/hosts';
import type { HostRecord } from '../../api/directory';
import { toast } from '../../lib/toast';
import { ApplicationAnswers, HostTypePill } from './ApplicationAnswers';

const GRADIENT = 'bg-gradient-to-r from-[#7038F5] to-[#B724EA]';

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
    : '—';

const fullName = (h: HostRecord) => `${h.first_name ?? ''} ${h.last_name ?? ''}`.trim() || 'Unnamed host';

export const HostApplications: React.FC = () => {
  const navigate = useNavigate();
  const [apps, setApps] = useState<HostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<HostRecord | null>(null);
  const [reason, setReason] = useState('');
  const [filter, setFilter] = useState<'all' | 'community' | 'professional'>('all');

  // Bumping reloadKey refetches; state is only set in the request callbacks.
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  };
  useEffect(() => {
    let cancelled = false;
    fetchPendingApplications()
      .then((list) => {
        if (cancelled) return;
        // Oldest first: they've waited longest.
        list.sort((a, b) =>
          (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at),
        );
        setApps(list);
        setOpen((cur) => cur ?? list[0]?.id ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load applications.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const typeOf = (h: HostRecord) =>
    h.host_type ?? (h.is_professional ? 'professional' : 'community');
  const shown = apps.filter((h) => filter === 'all' || typeOf(h) === filter);

  const approve = async (h: HostRecord, asCommunity = false) => {
    const what = asCommunity ? 'a community host (no 1:1 sessions)' : 'a verified host';
    if (!window.confirm(`Approve ${fullName(h)} as ${what}? They'll be able to sell tickets and receive payouts.`)) return;
    setBusy(h.id);
    try {
      await approveHost(h.id, asCommunity);
      toast.success(`${fullName(h)} approved${asCommunity ? ' as a community host' : ''}`);
      setApps((prev) => prev.filter((x) => x.id !== h.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed.');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    const h = rejecting;
    setBusy(h.id);
    try {
      await rejectHost(h.id, reason.trim());
      toast.success(`${fullName(h)} rejected`);
      setApps((prev) => prev.filter((x) => x.id !== h.id));
      setRejecting(null);
      setReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1080px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-outfit text-3xl font-bold text-white">Host applications</h1>
          <p className="mt-1 text-sm text-white/50">
            People who applied on the website to become verified hosts. Approving lets them sell
            tickets and get paid.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', `All · ${apps.length}`],
            ['community', 'Community'],
            ['professional', 'Professional'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              filter === k
                ? `border-transparent ${GRADIENT} text-white`
                : 'border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-12 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#A020F0] border-t-transparent" />
          <p className="mt-3 text-sm text-white/50">Loading applications…</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-12 text-center">
          <p className="font-semibold text-rose-300">{error}</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-12 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.06]">
            <Inbox className="h-5 w-5 text-white/50" />
          </span>
          <p className="mt-4 font-semibold text-white">Nothing waiting for review</p>
          <p className="mt-1 text-sm text-white/50">
            New applications from the website's “Become a host” form appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((h) => {
            const isOpen = open === h.id;
            return (
              <div
                key={h.id}
                className="overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121426]/80 backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : h.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
                >
                  {h.avatar_url ? (
                    <img src={h.avatar_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${GRADIENT}`}>
                      {fullName(h)[0]!.toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{fullName(h)}</span>
                    <span className="block truncate text-xs text-white/45">
                      {[h.city, h.phn_number, `Applied ${fmtDate(h.submitted_at ?? h.created_at)}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  <HostTypePill host={h} />
                  <ChevronDown className={`h-4 w-4 shrink-0 text-white/40 transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="space-y-5 border-t border-white/[0.06] px-5 py-5">
                    <ApplicationAnswers host={h} />
                    <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/hosts/${h.id}`)}
                        className="rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                      >
                        Open full profile
                      </button>
                      <span className="flex-1" />
                      <button
                        type="button"
                        disabled={busy === h.id}
                        onClick={() => {
                          setRejecting(h);
                          setReason('');
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-500/[0.08] px-5 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/[0.15] disabled:opacity-50"
                      >
                        <X className="h-4 w-4" /> Reject
                      </button>
                      {typeOf(h) === 'professional' && (
                        <button
                          type="button"
                          disabled={busy === h.id}
                          onClick={() => void approve(h, true)}
                          className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/[0.06] disabled:opacity-50"
                        >
                          Approve as community
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busy === h.id}
                        onClick={() => void approve(h)}
                        className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 ${GRADIENT}`}
                      >
                        <Check className="h-4 w-4" /> {busy === h.id ? 'Saving…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#121426] p-7">
            <h2 className="font-outfit text-xl font-bold text-white">Reject {fullName(rejecting)}?</h2>
            <p className="mt-1.5 text-sm text-white/55">
              Tell them why, so they know what to fix if they apply again.
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="e.g. The ID photo is unreadable. Please upload a clear photo of your Aadhaar."
              className="mt-4 w-full resize-y rounded-2xl border border-white/10 bg-[#0d0e1c] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#B57BFF]"
            />
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setRejecting(null)}
                className="flex-1 rounded-full bg-white/[0.06] py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || busy === rejecting.id}
                onClick={() => void reject()}
                className="flex-1 rounded-full bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {busy === rejecting.id ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

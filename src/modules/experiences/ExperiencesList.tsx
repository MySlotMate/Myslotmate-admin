import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import { Chip, GRADIENT } from '../../components/event-form/EventFormKit';
import { fetchEvents } from '../../api/directory';
import type { AdminEvent } from '../../api/directory';
import { cancelEvent, deleteEvent, pauseEvent, resumeEvent } from '../../api/events';
import { formatISTDateTime } from '../../lib/datetime';
import { OnSpotBookingModal } from './OnSpotBookingModal';
import { PauseExperienceModal } from './PauseExperienceModal';

interface ExperiencesListProps {
  searchQuery: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['live', 'draft', 'paused', 'expired', 'cancelled'];

// Status pills in the brand palette (dark).
const STATUS_STYLE: Record<string, string> = {
  live: 'bg-emerald-400/15 text-emerald-300',
  draft: 'bg-white/10 text-white/70',
  paused: 'bg-amber-400/15 text-amber-300',
  cancelled: 'bg-rose-500/15 text-rose-300',
  expired: 'bg-white/[0.06] text-white/45',
};

// A published event (live/paused) whose time has passed shows as "expired" — its
// stored status would otherwise read a misleading "live". Draft and cancelled keep
// their own status (they communicate their state already).
const displayStatus = (exp: { status: string; is_expired: boolean }): string =>
  exp.is_expired && (exp.status === 'live' || exp.status === 'paused')
    ? 'expired'
    : exp.status;

export const ExperiencesList: React.FC<ExperiencesListProps> = ({ searchQuery }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('live');
  const [bookingEvent, setBookingEvent] = useState<AdminEvent | null>(null);

  // Effective search comes from the header global search or the local input.
  const effectiveSearch = (searchQuery || localSearch).trim();
  const [debouncedSearch, setDebouncedSearch] = useState(effectiveSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(effectiveSearch), 350);
    return () => clearTimeout(t);
  }, [effectiveSearch]);

  const statusParam = statusFilter === 'All statuses' ? '' : statusFilter;

  // Any filter/search change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusParam]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchEvents({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusParam || undefined,
      });
      setEvents(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiences.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusParam]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  // Pause / resume. Pausing auto-refunds affected bookings (backend does it),
  // so the modal spells that out before confirming.
  const [pauseTarget, setPauseTarget] = useState<AdminEvent | null>(null);
  const [pausing, setPausing] = useState(false);
  const [resumingId, setResumingId] = useState<string | null>(null);

  const handlePauseConfirm = async (opts: {
    pausedFrom?: string;
    pausedDate?: string;
  }) => {
    if (!pauseTarget) return;
    setPausing(true);
    setError(null);
    try {
      await pauseEvent(
        pauseTarget.id,
        pauseTarget.host_id,
        opts.pausedFrom,
        opts.pausedDate,
      );
      setPauseTarget(null);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause experience.');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async (exp: AdminEvent) => {
    if (
      !window.confirm(
        `Resume "${exp.title}"? It goes back live and all paused sessions are restored.`,
      )
    )
      return;
    setResumingId(exp.id);
    setError(null);
    try {
      await resumeEvent(exp.id, exp.host_id);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume experience.');
    } finally {
      setResumingId(null);
    }
  };

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const handleCancel = async (exp: AdminEvent) => {
    if (
      !window.confirm(
        `Cancel "${exp.title}"? Every upcoming booking is refunded to the guest's wallet. This can't be undone.`,
      )
    )
      return;
    setCancellingId(exp.id);
    setError(null);
    try {
      await cancelEvent(exp.id, exp.host_id);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel experience.');
    } finally {
      setCancellingId(null);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const handleDelete = async (exp: AdminEvent) => {
    if (
      !window.confirm(
        `Delete "${exp.title}" permanently? This can't be undone. (Blocked if it still has active bookings — cancel it first.)`,
      )
    )
      return;
    setDeletingId(exp.id);
    setError(null);
    try {
      await deleteEvent(exp.id, exp.host_id);
      await loadEvents();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete experience.',
      );
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ghostBtn =
    'whitespace-nowrap rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50';

  return (
    // Full-bleed dark page inside the admin shell, in the website's look.
    <div className="msm-dark relative -mx-4 -my-6 min-h-[calc(100vh-4rem)] overflow-x-clip px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/3 h-[480px] w-[480px] rounded-full bg-[#7B2FFF]/15 blur-[140px]"
      />
      <div className="relative mx-auto max-w-[1280px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-outfit text-3xl font-bold text-white">Experiences</h1>
            <p className="mt-1 text-sm text-white/50">
              {loading ? 'Loading…' : `${total.toLocaleString()} ${statusParam || 'total'}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => alert('Creating featured category landing page...')}
              className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              Featured collection
            </button>
            <button
              type="button"
              onClick={() => navigate('/experiences/new')}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(183,36,234,0.7)] transition hover:opacity-90 ${GRADIENT}`}
            >
              <FiPlus size={16} /> New experience
            </button>
          </div>
        </div>

        {/* Search + status */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#121426] px-4 transition focus-within:border-[#B57BFF]">
            <FiSearch className="shrink-0 text-white/40" size={16} />
            <input
              className="row-input w-full bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/30"
              type="search"
              placeholder="Search experiences, hosts, cities or categories"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['All statuses', ...STATUS_OPTIONS].map((s) => (
              <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s === 'All statuses' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Chip>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-12 text-center">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#A020F0] border-t-transparent" />
            <p className="mt-3 text-sm text-white/50">Loading experiences…</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-12 text-center">
            <p className="font-semibold text-rose-300">{error}</p>
            <button type="button" className={`mt-4 ${ghostBtn}`} onClick={() => void loadEvents()}>
              Retry
            </button>
          </div>
        ) : events.length > 0 ? (
          <div className="overflow-x-auto rounded-3xl border border-white/[0.08] bg-[#121426]/80 backdrop-blur-xl">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-[11px] font-semibold tracking-wider text-white/40 uppercase">
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-4 py-4">City</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Bookings</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((exp) => {
                  const st = displayStatus(exp);
                  return (
                    <tr
                      key={exp.id}
                      className="border-b border-white/[0.06] transition last:border-b-0 hover:bg-white/[0.03]"
                    >
                      <td className="max-w-[300px] px-6 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => navigate(`/experiences/${exp.id}/edit`)}
                          className="block text-left font-semibold text-white transition hover:text-[#D8B4FE]"
                        >
                          {exp.title}
                        </button>
                        <p className="mt-0.5 truncate text-xs text-white/45">by {exp.hostName}</p>
                      </td>
                      <td className="px-4 py-4 align-top text-white/70">{exp.city || '—'}</td>
                      <td className="px-4 py-4 align-top whitespace-nowrap text-white/70">
                        {exp.date ? formatISTDateTime(exp.date) : '—'}
                        {exp.is_recurring && (
                          <div className="text-xs text-white/40">Next · recurring</div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top font-semibold text-white">
                        {exp.isFree ? (
                          <span className="text-emerald-300">Free</span>
                        ) : (
                          `₹${exp.price.toLocaleString()}`
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-white/70">{exp.bookings}</td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${STATUS_STYLE[st] ?? STATUS_STYLE.draft}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                          {st}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/experiences/${exp.id}/edit`)}
                            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 ${GRADIENT}`}
                          >
                            Edit
                          </button>
                          {exp.status === 'paused' ? (
                            <button
                              type="button"
                              disabled={resumingId === exp.id}
                              onClick={() => void handleResume(exp)}
                              className={`${ghostBtn} !text-emerald-300`}
                            >
                              {resumingId === exp.id ? 'Resuming…' : 'Resume'}
                            </button>
                          ) : (
                            exp.status === 'live' && (
                              <button
                                type="button"
                                onClick={() => setPauseTarget(exp)}
                                className={`${ghostBtn} !text-amber-300`}
                              >
                                Pause
                              </button>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => setBookingEvent(exp)}
                            className={ghostBtn}
                          >
                            On-spot booking
                          </button>
                          {exp.status !== 'cancelled' && !exp.is_expired && (
                            <button
                              type="button"
                              disabled={cancellingId === exp.id}
                              onClick={() => void handleCancel(exp)}
                              className={`${ghostBtn} !text-amber-300/90`}
                              title="Cancel and refund guests"
                            >
                              {cancellingId === exp.id ? 'Cancelling…' : 'Cancel'}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={deletingId === exp.id}
                            onClick={() => void handleDelete(exp)}
                            aria-label={`Delete ${exp.title}`}
                            title="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                          >
                            {deletingId === exp.id ? (
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-transparent" />
                            ) : (
                              <FiTrash2 size={15} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-12 text-center">
            <p className="text-sm text-white/50">No experiences found.</p>
          </div>
        )}

        {/* Server-side pagination */}
        {!loading && !error && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-xs text-white/45">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                aria-label="Previous page"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/10 disabled:opacity-30"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-semibold text-white/70">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                aria-label="Next page"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/10 disabled:opacity-30"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {bookingEvent && (
          <OnSpotBookingModal
            event={bookingEvent}
            isOpen={bookingEvent !== null}
            onClose={() => setBookingEvent(null)}
            onBooked={() => void loadEvents()}
          />
        )}

        {pauseTarget && (
          <PauseExperienceModal
            event={pauseTarget}
            saving={pausing}
            onClose={() => setPauseTarget(null)}
            onConfirm={(opts) => void handlePauseConfirm(opts)}
          />
        )}
      </div>
    </div>
  );
};

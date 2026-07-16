import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { fetchEvents } from '../../api/directory';
import type { AdminEvent } from '../../api/directory';
import { deleteEvent, pauseEvent, resumeEvent } from '../../api/events';
import { OnSpotBookingModal } from './OnSpotBookingModal';
import { PauseExperienceModal } from './PauseExperienceModal';

interface ExperiencesListProps {
  searchQuery: string;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS = ['live', 'draft', 'paused', 'cancelled'];

const statusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
  switch (status) {
    case 'live': return 'green';
    case 'draft': return 'blue';
    case 'paused': return 'amber';
    case 'cancelled': return 'rose';
    default: return 'blue';
  }
};

export const ExperiencesList: React.FC<ExperiencesListProps> = ({ searchQuery }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All statuses');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Experiences management</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Review listings, feature standout sessions, and suspend risky inventory.
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => alert('Creating featured category landing page...')}>
            Create featured collection
          </Button>
          <Button variant="primary" onClick={() => navigate('/experiences/new')}>
            + Create experience
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
        <div className="grid gap-4 lg:grid-cols-[1.6fr_minmax(0,1fr)]">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
            </svg>
            <input
              className="w-full bg-transparent text-sm outline-none"
              type="search"
              placeholder="Search experiences, hosts, cities, or categories..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
          <select
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <Card className="p-10 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="mt-3 text-slate-400 font-medium">Loading experiences…</p>
        </Card>
      ) : error ? (
        <Card className="p-10 text-center">
          <p className="text-rose-600 font-semibold">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void loadEvents()}>Retry</Button>
        </Card>
      ) : events.length > 0 ? (
        <Table headers={['Title', 'Host Name', 'City', 'Category', 'Price', 'Bookings', 'Rating', 'Status', 'Actions']}>
          {events.map((exp) => (
            <tr key={exp.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-bold text-ink max-w-[220px]">{exp.title}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-medium">{exp.hostName}</td>
              <td className="px-6 py-4 align-top text-slate-600">{exp.city}</td>
              <td className="px-6 py-4 align-top text-slate-600 capitalize">{exp.category}</td>
              <td className="px-6 py-4 align-top font-extrabold text-ink">
                {exp.isFree ? (
                  <span className="text-emerald-600">Free</span>
                ) : (
                  <span className="inline-flex items-center gap-0.5">
                    <IndianRupee className="h-3.5 w-3.5 stroke-[2.5]" />
                    {exp.price.toLocaleString()}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 align-top text-slate-600 font-medium">{exp.bookings}</td>
              <td className="px-6 py-4 align-top font-extrabold text-brand-600">{exp.rating ? `${exp.rating} ★` : '—'}</td>
              <td className="px-6 py-4 align-top">
                <Badge color={statusColor(exp.status)}>{exp.status}</Badge>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex items-center gap-2">
                  <Button variant="action" onClick={() => navigate(`/experiences/${exp.id}/edit`)}>Edit</Button>
                  {exp.status === 'paused' ? (
                    <Button
                      variant="action"
                      className="border-emerald-200 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800"
                      disabled={resumingId === exp.id}
                      onClick={() => void handleResume(exp)}
                    >
                      {resumingId === exp.id ? 'Resuming…' : 'Resume'}
                    </Button>
                  ) : (
                    exp.status === 'live' && (
                      <Button
                        variant="action"
                        className="border-amber-200 text-amber-700 hover:border-amber-300 hover:text-amber-800"
                        onClick={() => setPauseTarget(exp)}
                      >
                        Pause
                      </Button>
                    )
                  )}
                  <Button variant="action" onClick={() => setBookingEvent(exp)}>On-spot booking</Button>
                  <Button
                    variant="action"
                    className="border-red-200 text-red-600 hover:border-red-300 hover:text-red-700"
                    disabled={deletingId === exp.id}
                    onClick={() => void handleDelete(exp)}
                  >
                    {deletingId === exp.id ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium">No experience listings found.</p>
        </Card>
      )}

      {/* Server-side pagination */}
      {!loading && !error && total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} disabled={loading} />
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
  );
};

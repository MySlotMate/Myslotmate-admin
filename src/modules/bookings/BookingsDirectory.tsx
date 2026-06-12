import React, { useState, useEffect, useCallback } from 'react';
import { IndianRupee } from 'lucide-react';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { fetchBookings, fetchEvents } from '../../api/directory';
import type { AdminBooking, AdminEvent } from '../../api/directory';

interface BookingsDirectoryProps {
  searchQuery: string;
}

const PAGE_SIZE = 10;

const BOOKING_STATUSES = ['confirmed', 'pending', 'cancelled', 'refunded'];

const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
  switch (status) {
    case 'Confirmed': return 'green';
    case 'Paid': return 'blue';
    case 'Pending': return 'amber';
    case 'Cancelled': return 'rose';
    case 'Refunded': return 'rose';
    case 'Failed': return 'rose';
    default: return 'blue';
  }
};

export const BookingsDirectory: React.FC<BookingsDirectoryProps> = ({ searchQuery }) => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All booking statuses');
  const [eventFilter, setEventFilter] = useState(''); // '' = all experiences
  const [events, setEvents] = useState<AdminEvent[]>([]);

  // Load the experiences once to populate the event filter dropdown.
  useEffect(() => {
    let alive = true;
    void fetchEvents({ page: 1, pageSize: 100 })
      .then((res) => {
        if (alive) setEvents(res.items);
      })
      .catch(() => {
        /* non-fatal: the event filter just stays empty */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Effective search comes from the header global search or the local input.
  const effectiveSearch = (searchQuery || localSearch).trim();
  const [debouncedSearch, setDebouncedSearch] = useState(effectiveSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(effectiveSearch), 350);
    return () => clearTimeout(t);
  }, [effectiveSearch]);

  const statusParam = statusFilter === 'All booking statuses' ? '' : statusFilter;

  // Any filter/search change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusParam, eventFilter]);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBookings({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: statusParam || undefined,
        eventId: eventFilter || undefined,
      });
      setBookings(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusParam, eventFilter]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleClear = () => {
    setLocalSearch('');
    setStatusFilter('All booking statuses');
    setEventFilter('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Bookings management</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Follow every reservation from checkout to attendance.
          </h3>
        </div>
        <Button variant="primary" onClick={() => alert('Opening payments/bookings dispute exceptions dashboard...')}>
          Open exception queue
        </Button>
      </div>

      {/* Filter panel */}
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
        <div className="grid gap-4 md:grid-cols-[1.6fr_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
            </svg>
            <input
              className="w-full bg-transparent text-sm outline-none"
              type="search"
              placeholder="Search guest, experience, or host..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <select
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All booking statuses</option>
            {BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <select
            className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-brand-400"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">All experiences</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>

          <Button variant="secondary" onClick={handleClear}>
            Clear
          </Button>
        </div>
      </div>

      {/* Bookings table */}
      {loading ? (
        <Card className="p-10 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="mt-3 text-slate-400 font-medium">Loading bookings…</p>
        </Card>
      ) : error ? (
        <Card className="p-10 text-center">
          <p className="text-rose-600 font-semibold">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void loadBookings()}>Retry</Button>
        </Card>
      ) : bookings.length > 0 ? (
        <Table headers={['Booking ID', 'User', 'Experience', 'Host', 'City', 'Date', 'Qty', 'Amount', 'Payment Status', 'Booking Status']}>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-extrabold text-ink" title={booking.id}>{booking.id.slice(0, 8)}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-medium">{booking.user}</td>
              <td className="px-6 py-4 align-top text-slate-700 max-w-[200px] font-medium">{booking.experience}</td>
              <td className="px-6 py-4 align-top text-slate-600">{booking.host}</td>
              <td className="px-6 py-4 align-top text-slate-600">{booking.city}</td>
              <td className="px-6 py-4 align-top text-slate-500">{booking.date}</td>
              <td className="px-6 py-4 align-top text-slate-600 font-medium">{booking.quantity}</td>
              <td className="px-6 py-4 align-top font-extrabold text-ink">
                <span className="inline-flex items-center gap-0.5">
                  <IndianRupee className="h-3.5 w-3.5 stroke-[2.5]" />
                  {booking.amount.toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 align-top">
                <Badge color={getStatusColor(booking.paymentStatus)}>{booking.paymentStatus}</Badge>
              </td>
              <td className="px-6 py-4 align-top">
                <Badge color={getStatusColor(booking.bookingStatus)}>{booking.bookingStatus}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium">No bookings found matching your parameters.</p>
        </Card>
      )}

      {/* Server-side pagination */}
      {!loading && !error && total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} disabled={loading} />
      )}
    </div>
  );
};

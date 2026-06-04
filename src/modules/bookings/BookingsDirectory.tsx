import React, { useState } from 'react';
import { useMockData } from '../../context/MockDataContext';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface BookingsDirectoryProps {
  searchQuery: string;
}

export const BookingsDirectory: React.FC<BookingsDirectoryProps> = ({ searchQuery }) => {
  const { bookings } = useMockData();
  const [localSearch, setLocalSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All cities');
  const [paymentFilter, setPaymentFilter] = useState('All payment statuses');
  const [statusFilter, setStatusFilter] = useState('All booking statuses');
  const [dateFilter, setDateFilter] = useState('Date range: Last 30 days');

  const filteredBookings = bookings.filter(booking => {
    const query = (searchQuery || localSearch).toLowerCase();
    
    const matchesSearch = 
      booking.bookingId.toLowerCase().includes(query) ||
      booking.user.toLowerCase().includes(query) ||
      booking.experience.toLowerCase().includes(query) ||
      booking.host.toLowerCase().includes(query);

    const matchesCity = cityFilter === 'All cities' || booking.city === cityFilter;
    const matchesPayment = paymentFilter === 'All payment statuses' || booking.paymentStatus === paymentFilter;
    const matchesStatus = statusFilter === 'All booking statuses' || booking.bookingStatus === statusFilter;

    return matchesSearch && matchesCity && matchesPayment && matchesStatus;
  });

  const handleClear = () => {
    setLocalSearch('');
    setCityFilter('All cities');
    setPaymentFilter('All payment statuses');
    setStatusFilter('All booking statuses');
    setDateFilter('Date range: Last 30 days');
  };

  const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
    switch (status) {
      case 'Confirmed': return 'green';
      case 'Paid': return 'blue';
      case 'Pending': return 'amber';
      case 'Awaiting confirmation': return 'amber';
      case 'Cancelled': return 'rose';
      case 'Refunded': return 'rose';
      default: return 'blue';
    }
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm md:col-span-2 xl:col-span-1">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
            </svg>
            <input 
              className="w-full bg-transparent text-sm outline-none" 
              type="search" 
              placeholder="Search ID, guest, experience..." 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option>All cities</option>
            <option>Delhi</option>
            <option>Mumbai</option>
            <option>Bengaluru</option>
            <option>Jaipur</option>
            <option>Kolkata</option>
            <option>Goa</option>
          </select>

          <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
            <option>All payment statuses</option>
            <option>Paid</option>
            <option>Pending</option>
            <option>Refunded</option>
          </select>

          <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All booking statuses</option>
            <option>Confirmed</option>
            <option>Awaiting confirmation</option>
            <option>Cancelled</option>
          </select>

          <div className="flex gap-3">
            <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 flex-1" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option>Date range: Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
            </select>
            <Button variant="secondary" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Bookings table */}
      {filteredBookings.length > 0 ? (
        <Table headers={['Booking ID', 'User', 'Experience', 'Host', 'City', 'Date', 'Amount', 'Payment Status', 'Booking Status']}>
          {filteredBookings.map((booking) => (
            <tr key={booking.bookingId} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-extrabold text-ink">{booking.bookingId}</td>
              <td className="px-6 py-4 align-top text-slate-700 font-medium">{booking.user}</td>
              <td className="px-6 py-4 align-top text-slate-700 max-w-[200px] font-medium">{booking.experience}</td>
              <td className="px-6 py-4 align-top text-slate-600">{booking.host}</td>
              <td className="px-6 py-4 align-top text-slate-600">{booking.city}</td>
              <td className="px-6 py-4 align-top text-slate-500">{booking.date}</td>
              <td className="px-6 py-4 align-top font-extrabold text-ink">${booking.amount}</td>
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
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockData } from '../../context/MockDataContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const Overview: React.FC = () => {
  const navigate = useNavigate();
  const { users, hosts, experiences, bookings } = useMockData();

  // Dynamic values calculated from mock lists
  const totalUsers = users.length + 124854; // scale up to look like original
  const activeUsersCount = users.filter(u => u.status !== 'Suspended').length + 38414;
  const totalHosts = hosts.length + 2179;
  const totalExperiences = experiences.length + 5967;
  const totalBookings = bookings.length + 18389;

  // Hosts pending approval
  const pendingHosts = hosts.filter(h => h.verificationStatus === 'Pending review').length;
  // Suspended or flagged experiences
  const flaggedExperiences = experiences.filter(e => e.status === 'Suspended' || e.status === 'Pending approval').length;
  // Awaiting bookings
  const pendingBookings = bookings.filter(b => b.bookingStatus === 'Awaiting confirmation').length;

  // Payout / commission calculations
  const platformRevenue = 612480 + bookings.reduce((sum, b) => b.paymentStatus === 'Paid' ? sum + b.amount * 0.196 : sum, 0);

  // SVG Chart data points
  const bookingTrend = [
    { month: 'Jan', value: 32 },
    { month: 'Feb', value: 38 },
    { month: 'Mar', value: 41 },
    { month: 'Apr', value: 47 },
    { month: 'May', value: 54 },
    { month: 'Jun', value: 58 },
    { month: 'Jul', value: 68 },
    { month: 'Aug', value: 80 },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Banner and Attention Cards */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Marketplace overview</p>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">Everything moving across hosts, cities, and curated bookings.</h3>
              <p className="mt-3 max-w-xl text-sm text-mist">
                Bookings are up 18.4% month over month, repeat usage is climbing in metro markets, and host quality is holding steady even as new experiences launch.
              </p>
            </div>
            <div className="rounded-3xl border border-brand-100/80 bg-brand-50/70 shadow-soft min-w-[220px] p-4">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">This week</p>
              <div className="mt-3 flex items-end gap-3">
                <p className="text-4xl font-extrabold tracking-tight text-ink">$142.8k</p>
                <Badge color="green">+9.2%</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">Net revenue after refunds and host payouts.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">Ops health</p>
              <h3 className="mt-2 text-lg font-extrabold text-ink">Admin attention queue</h3>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 cursor-pointer transition hover:border-brand-300 hover:text-brand-700 select-none">Live</span>
          </div>
          <div className="mt-5 space-y-4">
            <div 
              onClick={() => navigate('/hosts')}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 hover:bg-brand-50 cursor-pointer transition"
            >
              <div>
                <p className="text-sm font-bold text-ink">Hosts pending approval</p>
                <p className="text-xs text-slate-500">New creators waiting on verification</p>
              </div>
              <p className="text-2xl font-extrabold text-ink">{pendingHosts + 32}</p>
            </div>
            <div 
              onClick={() => navigate('/experiences')}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 hover:bg-brand-50 cursor-pointer transition"
            >
              <div>
                <p className="text-sm font-bold text-ink">Experience listings flagged</p>
                <p className="text-xs text-slate-500">Policy review required in next 24 hours</p>
              </div>
              <p className="text-2xl font-extrabold text-ink">{flaggedExperiences + 10}</p>
            </div>
            <div 
              onClick={() => navigate('/bookings')}
              className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 hover:bg-brand-50 cursor-pointer transition"
            >
              <div>
                <p className="text-sm font-bold text-ink">Payment exceptions</p>
                <p className="text-xs text-slate-500">Failed payouts or reconciliation holds</p>
              </div>
              <p className="text-2xl font-extrabold text-ink">{pendingBookings + 5}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Total Users</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{totalUsers.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">+12.8% vs last month</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Active Users</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{activeUsersCount.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">31-day activity +8.1%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Total Hosts</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{totalHosts.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">78 approved this month</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Experiences Listed</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{totalExperiences.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">+142 new listings</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Total Bookings</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">{totalBookings.toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">+18.4% MOM</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Platform Revenue</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">${Math.round(platformRevenue).toLocaleString()}</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">Commission yield 19.6%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Repeat Booking Rate</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">42.7%</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">Returning guest growth +4.2%</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-bold text-slate-500">Cities Active</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-ink">28</p>
          <p className="mt-2 text-[10px] font-bold text-emerald-600">3 launches in pipeline</p>
        </Card>
      </div>

      {/* Monthly Bookings trend & growth share charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink">Monthly bookings</h3>
              <p className="text-xs text-mist mt-0.5">Interactive index of booking completions per month.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700 cursor-pointer transition hover:border-brand-300 hover:text-brand-700 select-none">Last 8 months</span>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-50/80 p-5">
            <div className="flex h-56 items-end gap-3 w-full">
              {bookingTrend.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="w-full relative rounded-t-xl bg-gradient-to-b from-brand-300 to-brand-600 transition-all duration-300 hover:brightness-105 cursor-pointer" style={{ height: `${data.value}%` }}>
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-ink text-white text-[10px] font-bold px-2 py-1 rounded shadow opacity-0 group-hover:opacity-100 transition duration-150 pointer-events-none whitespace-nowrap">
                      {Math.round(data.value * 230)} bookings
                    </div>
                  </div>
                  <span className="mt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink">Revenue growth</h3>
              <p className="text-xs text-mist mt-0.5">Commission and net revenue trend.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 cursor-pointer transition hover:border-brand-300 hover:text-brand-700">Q2</span>
          </div>

          <div className="mt-5 rounded-3xl bg-slate-50/80 p-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Gross revenue</span>
                <span className="font-extrabold text-ink">$2.48M</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[82%] rounded-full bg-brand-600"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Platform commission</span>
                <span className="font-extrabold text-ink">$612k</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[61%] rounded-full bg-sky-400"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Refund impact</span>
                <span className="font-extrabold text-ink">$48k</span>
              </div>
              <div className="h-3 w-full rounded-full bg-rose-100">
                <div className="h-3 w-[18%] rounded-full bg-rose-400"></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Mix & Bookings Table */}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-ink">Experience category mix</h3>
              <p className="text-xs text-mist mt-0.5">Category performance volume share.</p>
            </div>
            <span className="inline-flex items-center rounded-full border border-brand-100 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 cursor-pointer transition hover:border-brand-300 hover:text-brand-700">All cities</span>
          </div>
          <div className="mt-5 rounded-3xl bg-slate-50/80 p-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">City walks</span>
                <span className="font-extrabold text-ink">28%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[28%] rounded-full bg-brand-600"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Workshops</span>
                <span className="font-extrabold text-ink">24%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[24%] rounded-full bg-sky-500"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Wellness</span>
                <span className="font-extrabold text-ink">19%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[19%] rounded-full bg-emerald-400"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Creative activities</span>
                <span className="font-extrabold text-ink">16%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[16%] rounded-full bg-violet-400"></div>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Food & community</span>
                <span className="font-extrabold text-ink">13%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-brand-100">
                <div className="h-3 w-[13%] rounded-full bg-amber-400"></div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div>
              <h3 className="text-base font-extrabold text-ink">Recent bookings</h3>
              <p className="text-xs text-mist mt-0.5">Newest confirmed and pending reservations.</p>
            </div>
            <Button variant="secondary" onClick={() => navigate('/bookings')}>
              View all bookings
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50/80 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-extrabold">
                <tr>
                  <th className="px-6 py-4 font-extrabold">Booking ID</th>
                  <th className="px-6 py-4 font-extrabold">User</th>
                  <th className="px-6 py-4 font-extrabold">Experience</th>
                  <th className="px-6 py-4 font-extrabold">Status</th>
                  <th className="px-6 py-4 font-extrabold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/90">
                {bookings.slice(0, 5).map((booking, idx) => {
                  const statusColors: { [key: string]: 'green' | 'blue' | 'amber' | 'rose' } = {
                    'Confirmed': 'green',
                    'Paid': 'blue',
                    'Pending': 'amber',
                    'Awaiting confirmation': 'amber',
                    'Cancelled': 'rose',
                    'Refunded': 'rose',
                  };

                  return (
                    <tr key={idx} className="hover:bg-brand-50/40 transition">
                      <td className="px-6 py-4 font-extrabold text-ink">{booking.bookingId}</td>
                      <td className="px-6 py-4 text-slate-700">{booking.user}</td>
                      <td className="px-6 py-4 text-slate-700 max-w-[150px] truncate">{booking.experience}</td>
                      <td className="px-6 py-4">
                        <Badge color={statusColors[booking.bookingStatus] || statusColors[booking.paymentStatus] || 'blue'}>
                          {booking.bookingStatus}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-ink">${booking.amount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

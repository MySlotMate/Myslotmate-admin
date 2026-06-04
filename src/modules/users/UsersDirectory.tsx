import React, { useState, useEffect, useCallback } from 'react';
import { fetchUsers } from '../../api/directory';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import type { User } from '../../types';

interface UsersDirectoryProps {
  searchQuery: string;
}

const PAGE_SIZE = 10;

export const UsersDirectory: React.FC<UsersDirectoryProps> = ({ searchQuery }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All cities');
  const [tierFilter, setTierFilter] = useState('All spending tiers');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Effective search comes from the header global search or the local input.
  const effectiveSearch = (searchQuery || localSearch).trim();
  const [debouncedSearch, setDebouncedSearch] = useState(effectiveSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(effectiveSearch), 350);
    return () => clearTimeout(t);
  }, [effectiveSearch]);

  // Map UI filter labels to backend query params.
  const cityParam = cityFilter === 'All cities' ? '' : cityFilter;
  const tierParam =
    tierFilter === 'High value' ? 'high_value'
    : tierFilter === 'Repeat booker' ? 'repeat'
    : tierFilter === 'New user' ? 'new'
    : '';

  // Any filter/search change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, cityParam, tierParam]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        city: cityParam || undefined,
        tier: tierParam || undefined,
      });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, cityParam, tierParam]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  // The server already applies search/city/tier filters — render the page as-is.
  const filteredUsers = users;

  const handleReset = () => {
    setLocalSearch('');
    setCityFilter('All cities');
    setTierFilter('All spending tiers');
  };

  // NOTE: Suspend/VIP are not yet modelled in the backend (no status column on
  // the users table), so these toggles update local state only and do not persist.
  const handleToggleStatus = (userId: string, currentStatus: string) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
        return { ...user, status: nextStatus };
      }
      return user;
    }));
  };

  const handleToggleVip = (userId: string, currentStatus: string) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        const nextStatus = currentStatus === 'VIP' ? 'Active' : 'VIP';
        return { ...user, status: nextStatus };
      }
      return user;
    }));
  };

  const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
    switch (status) {
      case 'Active': return 'green';
      case 'VIP': return 'blue';
      case 'Watchlist': return 'amber';
      case 'Suspended': return 'rose';
      default: return 'blue';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Users directory</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Track high-value guests, activity levels, and account health.
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => alert('Import user spreadsheet integration...')}>
            Import users
          </Button>
          <Button variant="primary" onClick={() => alert('Opening internal workspace notes tool...')}>
            Add note
          </Button>
        </div>
      </div>

      {/* Filter Surface */}
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
            </svg>
            <input 
              className="w-full bg-transparent text-sm outline-none" 
              type="search" 
              placeholder="Filter by name, email, ID..." 
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

          <select className="w-full rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
            <option>All spending tiers</option>
            <option>High value</option>
            <option>Repeat booker</option>
            <option>New user</option>
          </select>

          <Button variant="secondary" onClick={handleReset}>
            Reset filters
          </Button>
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <Card className="p-10 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="mt-3 text-slate-400 font-medium">Loading users…</p>
        </Card>
      ) : error ? (
        <Card className="p-10 text-center">
          <p className="text-rose-600 font-semibold">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void loadUsers()}>
            Retry
          </Button>
        </Card>
      ) : filteredUsers.length > 0 ? (
        <Table headers={['Name', 'Email', 'City', 'Bookings', 'Spent', 'Join Date', 'Actions']}>
          {filteredUsers.map((user) => (
            <tr key={user.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-bold text-ink">{user.name}</td>
              <td className="px-6 py-4 align-top text-slate-600">{user.email}</td>
              <td className="px-6 py-4 align-top text-slate-600">{user.city}</td>
              <td className="px-6 py-4 align-top text-slate-600 font-medium">{user.totalBookings}</td>
              <td className="px-6 py-4 align-top font-extrabold text-ink">₹{user.totalSpent}</td>
              <td className="px-6 py-4 align-top text-slate-500">{user.joinDate}</td>
              <td className="px-6 py-4 align-top">
                <div className="flex gap-2">
                  <Button variant="action" onClick={() => setSelectedUser(user)}>
                    View
                  </Button>
                  <Button 
                    variant="action" 
                    onClick={() => handleToggleStatus(user.id, user.status)}
                    className={user.status === 'Suspended' ? 'hover:text-emerald-600 hover:border-emerald-300' : 'hover:text-rose-600 hover:border-rose-300'}
                  >
                    {user.status === 'Suspended' ? 'Activate' : 'Suspend'}
                  </Button>
                  <Button 
                    variant="action"
                    onClick={() => handleToggleVip(user.id, user.status)}
                    className={user.status === 'VIP' ? 'hover:text-slate-600 hover:border-slate-300' : 'hover:text-sky-600 hover:border-sky-300'}
                  >
                    {user.status === 'VIP' ? 'Standard' : 'VIP'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium">No users found matching your search and filter criteria.</p>
          <Button variant="secondary" className="mt-4" onClick={handleReset}>
            Reset All Filters
          </Button>
        </Card>
      )}

      {/* Server-side pagination */}
      {!loading && !error && total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} disabled={loading} />
      )}

      {/* User Details Modal */}
      <Modal 
        isOpen={selectedUser !== null} 
        onClose={() => setSelectedUser(null)} 
        title={`User Account Profile - ${selectedUser?.name}`}
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-400">User ID</p>
                <p className="text-lg font-extrabold text-ink">{selectedUser.id}</p>
              </div>
              <Badge color={getStatusColor(selectedUser.status)} className="px-4 py-1.5 text-sm">
                {selectedUser.status}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Email Address</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedUser.email}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Base Market City</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedUser.city}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Total Reservations Completed</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedUser.totalBookings}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Total Platform Spend</p>
                <p className="mt-1 text-sm font-extrabold text-ink">₹{selectedUser.totalSpent}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Account Created Date</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedUser.joinDate}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <Button 
                variant={selectedUser.status === 'Suspended' ? 'primary' : 'secondary'}
                onClick={() => {
                  handleToggleStatus(selectedUser.id, selectedUser.status);
                  setSelectedUser(null);
                }}
              >
                {selectedUser.status === 'Suspended' ? 'Activate Account' : 'Suspend Account'}
              </Button>
              <Button variant="secondary" onClick={() => setSelectedUser(null)}>
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

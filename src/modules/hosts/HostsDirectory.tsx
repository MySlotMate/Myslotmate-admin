import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee } from 'lucide-react';
import { fetchHosts } from '../../api/directory';
import { updateHostApplicationStatus } from '../../api/hosts';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import type { Host, HostApplicationStatus } from '../../types';
import { APPLICATION_STATUSES, STATUS_LABELS, statusColor } from './hostStatus';

interface HostsDirectoryProps {
  searchQuery: string;
}

const PAGE_SIZE = 10;

export const HostsDirectory: React.FC<HostsDirectoryProps> = ({ searchQuery }) => {
  const navigate = useNavigate();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  // Effective search comes from the header global search or the local input.
  const effectiveSearch = (searchQuery || localSearch).trim();
  const [debouncedSearch, setDebouncedSearch] = useState(effectiveSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(effectiveSearch), 350);
    return () => clearTimeout(t);
  }, [effectiveSearch]);

  // A new search returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadHosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHosts({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setHosts(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosts.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void loadHosts();
  }, [loadHosts]);

  // The server already applies the search filter — render the page as-is.
  const filteredHosts = hosts;

  const pendingVerificationCount = hosts.filter(h => h.verificationStatus === 'Pending review').length;
  const topHostRevenue = hosts.length ? Math.max(...hosts.map(h => h.revenueGenerated)) : 0;
  const topHostName = hosts.find(h => h.revenueGenerated === topHostRevenue)?.name || 'N/A';

  // Update a host's application status on the backend, then refresh the list.
  const updateStatus = useCallback(async (host: Host, status: HostApplicationStatus) => {
    if (!host.id) {
      setActionError('This host record has no ID and cannot be updated.');
      return;
    }
    if (status === host.applicationStatus) {
      return; // no change
    }
    setActioningId(host.id);
    setActionError(null);
    try {
      await updateHostApplicationStatus(host.id, status);
      await loadHosts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update host status.');
    } finally {
      setActioningId(null);
    }
  }, [loadHosts]);

  const openProfile = (host: Host) => {
    if (host.id) navigate(`/hosts/${host.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-700">Host management</p>
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
            Approve high-signal creators and maintain host quality.
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => alert('Downloading KYC batches...')}>Download KYC queue</Button>
          <Button variant="primary" onClick={() => alert('Showing hosts flagged for quality review...')}>Review pending hosts</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Pending verification</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">{pendingVerificationCount}</p>
          <p className="mt-2 text-xs font-bold text-amber-600">Needs attention today</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Top host revenue</p>
          <div className="mt-3 flex items-center gap-0.5 text-3xl font-extrabold text-ink">
            <IndianRupee className="h-7 w-7 stroke-[2.5]" />
            <span>{topHostRevenue.toLocaleString()}</span>
          </div>
          <p className="mt-2 text-xs font-bold text-emerald-600">{topHostName} this quarter</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 font-medium">Avg host rating</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">4.82</p>
          <p className="mt-2 text-xs font-bold text-emerald-600">Quality baseline maintained</p>
        </Card>
      </div>

      {/* Filter inputs */}
      <div className="rounded-3xl border border-brand-100/80 bg-white/95 shadow-soft backdrop-blur-md p-5">
        <div className="max-w-md">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
            <svg className="h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5" stroke-linecap="round"></path>
            </svg>
            <input 
              className="w-full bg-transparent text-sm outline-none" 
              type="search" 
              placeholder="Filter hosts by name or city..." 
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Action error banner */}
      {actionError && (
        <Card className="border-rose-100 bg-rose-50/70 p-4">
          <p className="text-sm font-semibold text-rose-700">{actionError}</p>
        </Card>
      )}

      {/* Hosts Table */}
      {loading ? (
        <Card className="p-10 text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="mt-3 text-slate-400 font-medium">Loading hosts…</p>
        </Card>
      ) : error ? (
        <Card className="p-10 text-center">
          <p className="text-rose-600 font-semibold">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void loadHosts()}>
            Retry
          </Button>
        </Card>
      ) : filteredHosts.length > 0 ? (
        <Table headers={['Host Name', 'City', 'Experiences', 'Bookings', 'Rating', 'Revenue', 'Status', 'Actions']}>
          {filteredHosts.map((host, index) => (
            <tr key={host.id ?? index} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-bold text-ink">{host.name}</td>
              <td className="px-6 py-4 align-top text-slate-600">{host.city}</td>
              <td className="px-6 py-4 align-top text-slate-600 font-medium">{host.experiencesCreated}</td>
              <td className="px-6 py-4 align-top text-slate-600 font-medium">{host.bookingsGenerated}</td>
              <td className="px-6 py-4 align-top font-extrabold text-brand-600">{host.averageRating} ★</td>
              <td className="px-6 py-4 align-top font-extrabold text-ink">
                <span className="inline-flex items-center gap-0.5">
                  <IndianRupee className="h-3.5 w-3.5 stroke-[2.5]" />
                  {host.revenueGenerated.toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 align-top">
                <Badge color={statusColor(host.applicationStatus)}>
                  {host.applicationStatus ? STATUS_LABELS[host.applicationStatus] : '—'}
                </Badge>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Update application status"
                    className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                    value={host.applicationStatus ?? ''}
                    disabled={actioningId === host.id}
                    onChange={(e) => void updateStatus(host, e.target.value as HostApplicationStatus)}
                  >
                    {APPLICATION_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                  <Button variant="action" onClick={() => openProfile(host)}>
                    View profile
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-slate-400 font-medium">No hosts found matching your criteria.</p>
        </Card>
      )}

      {/* Server-side pagination */}
      {!loading && !error && total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} disabled={loading} />
      )}

    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { IndianRupee } from 'lucide-react';
import { fetchHosts } from '../../api/directory';
import { approveHost, rejectHost } from '../../api/hosts';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import type { Host } from '../../types';

interface HostsDirectoryProps {
  searchQuery: string;
}

export const HostsDirectory: React.FC<HostsDirectoryProps> = ({ searchQuery }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  const loadHosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setHosts(await fetchHosts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hosts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHosts();
  }, [loadHosts]);

  // Filter hosts based on search query
  const filteredHosts = hosts.filter(host => {
    const query = (searchQuery || localSearch).toLowerCase();
    return (
      host.name.toLowerCase().includes(query) ||
      host.city.toLowerCase().includes(query)
    );
  });

  const pendingVerificationCount = hosts.filter(h => h.verificationStatus === 'Pending review').length;
  const topHostRevenue = hosts.length ? Math.max(...hosts.map(h => h.revenueGenerated)) : 0;
  const topHostName = hosts.find(h => h.revenueGenerated === topHostRevenue)?.name || 'N/A';

  // Approve / suspend hit the backend, then refresh the list. "Suspend" maps to
  // the host "reject" action server-side.
  const runHostAction = useCallback(async (host: Host, action: 'approve' | 'suspend') => {
    if (!host.id) {
      setActionError('This host record has no ID and cannot be updated.');
      return;
    }
    setActioningId(host.id);
    setActionError(null);
    try {
      if (action === 'approve') {
        await approveHost(host.id);
      } else {
        await rejectHost(host.id, 'Suspended by admin');
      }
      await loadHosts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} host.`);
    } finally {
      setActioningId(null);
    }
  }, [loadHosts]);

  const handleApprove = (host: Host) => { void runHostAction(host, 'approve'); };
  const handleSuspend = (host: Host) => { void runHostAction(host, 'suspend'); };

  const getStatusColor = (status: string): 'green' | 'blue' | 'amber' | 'rose' => {
    switch (status) {
      case 'Verified': return 'green';
      case 'Pending review': return 'amber';
      case 'Re-verification': return 'blue';
      case 'Suspended': return 'rose';
      default: return 'blue';
    }
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
        <Table headers={['Host Name', 'City', 'Social Followers', 'Experiences', 'Bookings', 'Rating', 'Revenue', 'Status', 'Actions']}>
          {filteredHosts.map((host, index) => (
            <tr key={host.id ?? index} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
              <td className="px-6 py-4 align-top font-bold text-ink">{host.name}</td>
              <td className="px-6 py-4 align-top text-slate-600">{host.city}</td>
              <td className="px-6 py-4 align-top text-slate-600 font-semibold">{host.socialFollowers}</td>
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
                <Badge color={getStatusColor(host.verificationStatus)}>{host.verificationStatus}</Badge>
              </td>
              <td className="px-6 py-4 align-top">
                <div className="flex gap-2">
                  {host.verificationStatus !== 'Verified' && (
                    <Button variant="action" disabled={actioningId === host.id} onClick={() => handleApprove(host)} className="hover:text-emerald-600 hover:border-emerald-300">
                      {actioningId === host.id ? 'Working…' : 'Approve'}
                    </Button>
                  )}
                  {host.verificationStatus !== 'Suspended' && (
                    <Button variant="action" disabled={actioningId === host.id} onClick={() => handleSuspend(host)} className="hover:text-rose-600 hover:border-rose-300">
                      {actioningId === host.id ? 'Working…' : 'Suspend'}
                    </Button>
                  )}
                  <Button variant="action" onClick={() => setSelectedHost(host)}>
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

      {/* Host KYC Profile Modal */}
      <Modal
        isOpen={selectedHost !== null}
        onClose={() => setSelectedHost(null)}
        title={`Host verification & KYC - ${selectedHost?.name}`}
      >
        {selectedHost && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-sm font-bold text-slate-400">Primary Channel</p>
                <p className="text-lg font-extrabold text-ink">{selectedHost.name} ({selectedHost.city})</p>
              </div>
              <Badge color={getStatusColor(selectedHost.verificationStatus)} className="px-4 py-1.5 text-sm">
                {selectedHost.verificationStatus}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Social Media Reach</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedHost.socialFollowers} Followers</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Active Listings</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedHost.experiencesCreated} Experiences</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Overall Guest Bookings</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedHost.bookingsGenerated} bookings</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Cumulative Net Revenue</p>
                <div className="mt-1 flex items-center gap-0.5 text-sm font-extrabold text-ink">
                  <IndianRupee className="h-4 w-4 stroke-[2.5]" />
                  <span>{selectedHost.revenueGenerated.toLocaleString()}</span>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Average Quality Rating</p>
                <p className="mt-1 text-sm font-extrabold text-ink">{selectedHost.averageRating} / 5.0</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400 font-bold">Background Check ID</p>
                <p className="mt-1 text-sm font-extrabold text-ink">KYC-9428-SECURE</p>
              </div>
            </div>

            <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-brand-700">Verification checklist</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-700">
                <li className="flex items-center gap-2">✓ Aadhaar Card / ID Document Verified</li>
                <li className="flex items-center gap-2">✓ Instagram Creator Link Verified</li>
                <li className="flex items-center gap-2">✓ Phone number and email match social domain</li>
                <li className="flex items-center gap-2">{selectedHost.verificationStatus === 'Verified' ? '✓ Checked by Aarav Sharma' : '⏱ Awaiting manual verification check'}</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              {selectedHost.verificationStatus !== 'Verified' && (
                <Button 
                  variant="primary"
                  onClick={() => {
                    handleApprove(selectedHost);
                    setSelectedHost(null);
                  }}
                >
                  Approve Host
                </Button>
              )}
              {selectedHost.verificationStatus !== 'Suspended' && (
                <Button 
                  variant="secondary"
                  onClick={() => {
                    handleSuspend(selectedHost);
                    setSelectedHost(null);
                  }}
                  className="hover:text-rose-600"
                >
                  Suspend Host
                </Button>
              )}
              <Button variant="secondary" onClick={() => setSelectedHost(null)}>
                Close KYC
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

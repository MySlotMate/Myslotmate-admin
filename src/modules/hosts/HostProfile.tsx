import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, IndianRupee, ExternalLink, Pencil } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { fetchHostDetail, fetchHostEvents } from '../../api/directory';
import type { HostDetail, HostEvent } from '../../api/directory';
import { updateHostApplicationStatus, setHostPlatformFee, fetchPlatformFeeConfig, setHostActive } from '../../api/hosts';
import type { PlatformFeeConfig } from '../../api/hosts';
import type { HostApplicationStatus } from '../../types';
import { APPLICATION_STATUSES, STATUS_LABELS, statusColor } from './hostStatus';
import { EditHostProfileModal } from './EditHostProfileModal';

type Tab = 'details' | 'events';

export const HostProfile: React.FC = () => {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<HostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  const [feeInput, setFeeInput] = useState('');
  const [savingFee, setSavingFee] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [defaultFee, setDefaultFee] = useState<PlatformFeeConfig | null>(null);

  const [editing, setEditing] = useState(false);

  const [tab, setTab] = useState<Tab>('details');
  const [events, setEvents] = useState<HostEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!hostId) return;
    setLoading(true);
    setError(null);
    try {
      setDetail(await fetchHostDetail(hostId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load host.');
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  const loadEvents = useCallback(async () => {
    if (!hostId) return;
    setEventsLoading(true);
    setEventsError(null);
    try {
      // The `events === null` check below distinguishes "not fetched yet" from
      // "fetched, zero results" — normalize away any null/undefined response
      // (e.g. a host with no events) so a real empty result doesn't get
      // mistaken for "still needs fetching" and re-trigger forever.
      setEvents((await fetchHostEvents(hostId)) ?? []);
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : 'Failed to load events.');
    } finally {
      setEventsLoading(false);
    }
  }, [hostId]);

  useEffect(() => { void loadDetail(); }, [loadDetail]);

  // The global default split is the same for every host — fetch it once so
  // "using default" can show actual numbers instead of just a label.
  useEffect(() => {
    fetchPlatformFeeConfig().then(setDefaultFee).catch(() => setDefaultFee(null));
  }, []);

  // Keep the fee input in sync with the loaded host (e.g. after a save).
  useEffect(() => {
    setFeeInput(detail?.host.platform_fee_percentage != null ? String(detail.host.platform_fee_percentage) : '');
  }, [detail]);

  // Lazily load events the first time the Events tab is opened.
  useEffect(() => {
    if (tab === 'events' && events === null && !eventsLoading) {
      void loadEvents();
    }
  }, [tab, events, eventsLoading, loadEvents]);

  const handleStatusChange = async (status: HostApplicationStatus) => {
    if (!hostId || !detail || status === detail.host.application_status) return;
    setSavingStatus(true);
    setError(null);
    try {
      await updateHostApplicationStatus(hostId, status);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setSavingStatus(false);
    }
  };

  const [togglingActive, setTogglingActive] = useState(false);
  const handleToggleActive = async () => {
    if (!hostId || !detail) return;
    const currentlyActive = detail.host.is_active !== false;
    const confirmMsg = currentlyActive
      ? 'Deactivate this host? They and their experiences will be hidden from the public site. Bookings and history are kept, and you can reactivate anytime.'
      : 'Reactivate this host? They and their experiences will be visible on the public site again.';
    if (!window.confirm(confirmMsg)) return;
    setTogglingActive(true);
    setError(null);
    try {
      await setHostActive(hostId, !currentlyActive);
      await loadDetail();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update host.');
    } finally {
      setTogglingActive(false);
    }
  };

  const handleSaveFee = async () => {
    if (!hostId) return;
    const trimmed = feeInput.trim();
    const pct = trimmed === '' ? null : Number(trimmed);
    if (pct !== null && (!Number.isInteger(pct) || pct < 0 || pct > 100)) {
      setFeeError('Enter a whole number between 0 and 100.');
      return;
    }
    setSavingFee(true);
    setFeeError(null);
    try {
      await setHostPlatformFee(hostId, pct);
      await loadDetail();
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : 'Failed to update commission split.');
    } finally {
      setSavingFee(false);
    }
  };

  const handleResetFee = async () => {
    if (!hostId) return;
    setSavingFee(true);
    setFeeError(null);
    try {
      await setHostPlatformFee(hostId, null);
      await loadDetail();
    } catch (err) {
      setFeeError(err instanceof Error ? err.message : 'Failed to reset commission split.');
    } finally {
      setSavingFee(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-mist">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          <p className="text-xs font-bold uppercase tracking-[0.22em]">Loading host…</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-6">
        <BackButton onClick={() => navigate('/hosts')} />
        <Card className="p-10 text-center">
          <p className="text-rose-600 font-semibold">{error ?? 'Host not found.'}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void loadDetail()}>Retry</Button>
        </Card>
      </div>
    );
  }

  const { host, user, stats } = detail;
  const fullName = `${host.first_name} ${host.last_name}`.trim() || 'Unnamed host';
  const rating = host.avg_rating ? host.avg_rating.toFixed(2) : '—';

  return (
    <div className="space-y-6">
      <BackButton onClick={() => navigate('/hosts')} />

      {/* Header */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-brand-50 text-xl font-extrabold text-brand-700">
              {host.avatar_url
                ? <img src={host.avatar_url} alt={fullName} className="h-full w-full object-cover" />
                : fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">{fullName}</h2>
              <p className="text-sm text-slate-500">{host.city || '—'}</p>
              {host.tagline && <p className="mt-1 text-sm text-slate-600 italic">“{host.tagline}”</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil className="mr-1.5 h-4 w-4" /> Edit profile
              </Button>
              <Button
                variant={host.is_active === false ? 'primary' : 'secondary'}
                className={
                  host.is_active === false
                    ? ''
                    : 'border-red-200 text-red-600 hover:border-red-300 hover:text-red-700'
                }
                disabled={togglingActive}
                onClick={() => void handleToggleActive()}
              >
                {host.is_active === false ? 'Reactivate' : 'Deactivate'}
              </Button>
              <Badge color={statusColor(host.application_status)} className="px-4 py-1.5 text-sm">
                {STATUS_LABELS[host.application_status] ?? host.application_status}
              </Badge>
              {host.is_active === false && (
                <Badge color="rose" className="px-4 py-1.5 text-sm">
                  Deactivated
                </Badge>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500">
              Set status
              <select
                className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-brand-400 disabled:opacity-50"
                value={host.application_status}
                disabled={savingStatus}
                onChange={(e) => void handleStatusChange(e.target.value as HostApplicationStatus)}
              >
                {APPLICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Experiences" value={stats.experiencesCreated.toLocaleString()} />
        <StatCard label="Bookings" value={stats.bookingsGenerated.toLocaleString()} />
        <StatCard label="Net revenue" value={stats.revenueGenerated.toLocaleString()} rupee />
        <StatCard label="Avg rating" value={`${rating}${host.total_reviews ? ` · ${host.total_reviews} reviews` : ''}`} />
      </div>

      {/* Commission split */}
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-700">Commission split</h4>
            <p className="mt-1 text-sm text-slate-500">
              {host.platform_fee_percentage != null
                ? `Custom split: host keeps ${100 - host.platform_fee_percentage}% · platform keeps ${host.platform_fee_percentage}%`
                : defaultFee
                ? `Using the platform default: host keeps ${defaultFee.host_percentage}% · platform keeps ${defaultFee.platform_percentage}%`
                : 'Using the platform-wide default split for this host.'}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-500">
              Platform %
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={feeInput}
                onChange={(e) => setFeeInput(e.target.value)}
                placeholder="Default"
                disabled={savingFee}
                className="w-24 rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-brand-400 disabled:opacity-50"
              />
            </label>
            <Button variant="primary" disabled={savingFee} onClick={() => void handleSaveFee()}>Save</Button>
            {host.platform_fee_percentage != null && (
              <Button variant="action" disabled={savingFee} onClick={() => void handleResetFee()}>Reset to default</Button>
            )}
          </div>
        </div>
        {feeError && <p className="mt-3 text-sm font-semibold text-rose-600">{feeError}</p>}
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <TabButton active={tab === 'details'} onClick={() => setTab('details')}>Details</TabButton>
        <TabButton active={tab === 'events'} onClick={() => setTab('events')}>
          Events{events ? ` (${events.length})` : ''}
        </TabButton>
      </div>

      {tab === 'details' ? (
        <DetailsTab host={host} user={user} />
      ) : (
        <EventsTab events={events} loading={eventsLoading} error={eventsError} onRetry={() => void loadEvents()} />
      )}

      {editing && (
        <EditHostProfileModal
          host={host}
          isOpen={editing}
          onClose={() => setEditing(false)}
          onSaved={() => void loadDetail()}
        />
      )}
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const BackButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button onClick={onClick} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-brand-700">
    <ArrowLeft className="h-4 w-4" /> Back to hosts
  </button>
);

const StatCard: React.FC<{ label: string; value: string; rupee?: boolean }> = ({ label, value, rupee }) => (
  <Card className="p-5">
    <p className="text-sm text-slate-500 font-medium">{label}</p>
    <div className="mt-3 flex items-center gap-0.5 text-2xl font-extrabold text-ink">
      {rupee && <IndianRupee className="h-5 w-5 stroke-[2.5]" />}
      <span>{value}</span>
    </div>
  </Card>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition ${
      active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'
    }`}
  >
    {children}
  </button>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="rounded-2xl bg-slate-50 p-4">
    <p className="text-xs text-slate-400 font-bold">{label}</p>
    <p className="mt-1 text-sm font-extrabold text-ink break-words">{children}</p>
  </div>
);

const DetailsTab: React.FC<{ host: HostDetail['host']; user: HostDetail['user'] }> = ({ host, user }) => {
  const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : '—');
  const socials: Array<[string, string | undefined]> = [
    ['Instagram', host.social_instagram],
    ['LinkedIn', host.social_linkedin],
    ['Website', host.social_website],
  ];

  return (
    <div className="space-y-6">
      <section>
        <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">Contact</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Account email">{user?.email || '—'}</Field>
          <Field label="Phone">{host.phn_number || user?.phone || '—'}</Field>
          <Field label="Account verified">{user?.isVerified ? 'Yes' : 'No'}</Field>
        </div>
      </section>

      <section>
        <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">Application</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Status">{STATUS_LABELS[host.application_status] ?? host.application_status}</Field>
          <Field label="Identity verified">{host.is_identity_verified ? 'Yes' : 'No'}</Field>
          <Field label="Approx group size">{host.group_size ?? '—'}</Field>
          <Field label="Submitted">{fmtDate(host.submitted_at)}</Field>
          <Field label="Approved">{fmtDate(host.approved_at)}</Field>
          <Field label="Rejected">{fmtDate(host.rejected_at)}</Field>
          <Field label="Joined">{fmtDate(host.created_at)}</Field>
          <Field label="Government ID">
            {host.government_id_url
              ? <a className="inline-flex items-center gap-1 text-brand-700 underline" href={host.government_id_url} target="_blank" rel="noreferrer">View document <ExternalLink className="h-3 w-3" /></a>
              : '—'}
          </Field>
        </div>
      </section>

      {(host.bio || host.description || host.experience_desc) && (
        <section>
          <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">About</h4>
          <Card className="p-5 space-y-3">
            {host.bio && <p className="text-sm text-slate-700">{host.bio}</p>}
            {host.description && <p className="text-sm text-slate-600">{host.description}</p>}
            {host.experience_desc && <p className="text-sm text-slate-600"><span className="font-bold">Experiences they host: </span>{host.experience_desc}</p>}
          </Card>
        </section>
      )}

      {(host.expertise_tags?.length || host.moods?.length || host.preferred_days?.length) ? (
        <section>
          <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">Profile tags</h4>
          <div className="space-y-3">
            <TagRow label="Expertise" tags={host.expertise_tags} />
            <TagRow label="Moods" tags={host.moods} />
            <TagRow label="Preferred days" tags={host.preferred_days} />
          </div>
        </section>
      ) : null}

      <section>
        <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-brand-700">Social</h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {socials.map(([label, url]) => (
            <Field key={label} label={label}>
              {url
                ? <a className="inline-flex items-center gap-1 text-brand-700 underline" href={url} target="_blank" rel="noreferrer">Open <ExternalLink className="h-3 w-3" /></a>
                : '—'}
            </Field>
          ))}
        </div>
      </section>
    </div>
  );
};

const TagRow: React.FC<{ label: string; tags?: string[] }> = ({ label, tags }) => {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-slate-400">{label}:</span>
      {tags.map((t) => (
        <span key={t} className="rounded-full border border-brand-100 bg-brand-50/50 px-3 py-1 text-xs font-bold text-brand-700">{t}</span>
      ))}
    </div>
  );
};

const EventsTab: React.FC<{ events: HostEvent[] | null; loading: boolean; error: string | null; onRetry: () => void }> = ({ events, loading, error, onRetry }) => {
  if (loading) {
    return (
      <Card className="p-10 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
        <p className="mt-3 text-slate-400 font-medium">Loading events…</p>
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="p-10 text-center">
        <p className="text-rose-600 font-semibold">{error}</p>
        <Button variant="secondary" className="mt-4" onClick={onRetry}>Retry</Button>
      </Card>
    );
  }
  if (!events || events.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-slate-400 font-medium">This host hasn’t created any experiences yet.</p>
      </Card>
    );
  }

  const price = (e: HostEvent) =>
    e.is_free ? 'Free' : e.price_cents != null ? `₹${Math.round(e.price_cents / 100).toLocaleString()}` : '—';

  return (
    <Table headers={['Title', 'Status', 'Format', 'Price', 'Bookings', 'Rating', 'Date']}>
      {events.map((e) => (
        <tr key={e.id} className="border-b border-slate-100 last:border-b-0 hover:bg-brand-50/40 transition">
          <td className="px-6 py-4 align-top font-bold text-ink">{e.title}</td>
          <td className="px-6 py-4 align-top"><Badge color={e.status === 'published' ? 'green' : e.status === 'paused' ? 'amber' : 'blue'}>{e.status}</Badge></td>
          <td className="px-6 py-4 align-top text-slate-600">{e.is_online ? 'Online' : (e.location || 'In person')}</td>
          <td className="px-6 py-4 align-top font-extrabold text-ink">{price(e)}</td>
          <td className="px-6 py-4 align-top text-slate-600 font-medium">{e.total_bookings}</td>
          <td className="px-6 py-4 align-top font-extrabold text-brand-600">{e.avg_rating ? `${e.avg_rating.toFixed(1)} ★` : '—'}</td>
          <td className="px-6 py-4 align-top text-slate-500">{e.time ? new Date(e.time).toLocaleDateString() : '—'}</td>
        </tr>
      ))}
    </Table>
  );
};

import { useCallback, useEffect, useState } from 'react';
import { Check, X, Inbox, Loader2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  approveJoinRequest,
  listJoinRequests,
  rejectJoinRequest,
  type JoinRequest,
  type JoinRequestStatus,
} from '../../api/joinRequests';
import { ATTENDEE_FIELDS } from '../../lib/attendeeFields';
import { toast } from '../../lib/toast';

/**
 * Platform-wide queue of guests asking to join RSVP-gated private experiences.
 *
 * Hosts see and decide their own requests in the host dashboard; this is the
 * same queue across every host, so support can act when a host doesn't.
 * Approving UNLOCKS booking for that guest — it does not book or charge.
 */

const TABS: { key: JoinRequestStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Declined' },
  { key: 'all', label: 'All' },
];

const fieldLabel = (key: string) =>
  ATTENDEE_FIELDS.find((f) => f.key === key)?.label ?? key;

// Snapshot values are whatever JSON the guest submitted — narrow before render.
const answerText = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
};

const statusColor = (
  status: JoinRequestStatus,
): 'green' | 'amber' | 'rose' | 'slate' => {
  switch (status) {
    case 'approved':
      return 'green';
    case 'pending':
      return 'amber';
    case 'rejected':
      return 'rose';
    default:
      return 'slate';
  }
};

export function JoinRequestsDirectory() {
  const [tab, setTab] = useState<JoinRequestStatus | 'all'>('pending');
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listJoinRequests(
        tab === 'all' ? {} : { status: tab },
      );
      setRequests(data ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not load join requests',
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (req: JoinRequest, approve: boolean) => {
    setBusyId(req.id);
    try {
      if (approve) {
        await approveJoinRequest(req.id);
        toast.success(`${req.user_name ?? 'Guest'} can now book`);
      } else {
        await rejectJoinRequest(req.id);
        toast.success('Request declined');
      }
      await load();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save that decision',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Join requests</h1>
        <p className="mt-1 text-sm text-slate-500">
          Guests applying to request-only private experiences. Approving lets
          them book — it doesn&apos;t hold a spot or take payment.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.key
                ? 'bg-[#0094CA] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#0094CA]" />
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <div className="px-6 py-16 text-center">
            <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {tab === 'pending' ? 'Nothing waiting for review' : 'Nothing here yet'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Requests appear when a guest applies to a private experience set to
              &ldquo;Request to join&rdquo;.
            </p>
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => {
            const answers = Object.entries(req.answers_snapshot ?? {});
            const isBusy = busyId === req.id;
            return (
              <li key={req.id}>
                <Card>
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {req.user_name ?? 'Guest'}
                        </p>
                        <p className="truncate text-sm text-slate-500">
                          {req.user_email}
                          {req.user_phone ? ` · ${req.user_phone}` : ''}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {req.event_title}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge color={statusColor(req.status)}>
                          {req.status}
                        </Badge>
                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    {answers.length > 0 && (
                      <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        {answers.map(([key, value]) => (
                          <div key={key} className="min-w-0">
                            <dt className="text-xs text-slate-400">
                              {fieldLabel(key)}
                            </dt>
                            <dd className="truncate text-sm text-slate-800">
                              {key === 'govt_id_url' && value ? (
                                <a
                                  href={answerText(value)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#0094CA] hover:underline"
                                >
                                  View ID
                                </a>
                              ) : (
                                answerText(value)
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {req.message && (
                      <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-700">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}

                    {req.status === 'pending' ? (
                      <div className="mt-4 flex gap-3">
                        <Button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void decide(req, true)}
                        >
                          {isBusy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isBusy}
                          onClick={() => void decide(req, false)}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    ) : (
                      req.reviewed_at && (
                        <p className="mt-4 text-xs text-slate-400">
                          Decided by{' '}
                          {req.reviewed_by_kind === 'admin'
                            ? (req.reviewed_by_label ?? 'an admin')
                            : 'the host'}
                        </p>
                      )
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

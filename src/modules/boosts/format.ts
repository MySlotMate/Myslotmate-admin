import type { BadgeColor } from '../../components/ui/Badge';
import type { Boost } from '../../api/boosts';

// Shared formatting for the Boost queue and review page.

// Whole rupees print without paise; anything else shows two decimals (₹159.80).
export const rupees = (cents: number) =>
  `₹${(cents / 100).toLocaleString('en-IN', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export const dateTimeIST = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      })
    : '—';

export type Tab = 'new' | 'proposed' | 'payment' | 'accepted' | 'live' | 'ended' | 'closed';

export const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'new', label: 'New', hint: 'Waiting for a proposal' },
  { key: 'proposed', label: 'Proposed', hint: 'Waiting for the host to accept' },
  { key: 'payment', label: 'Awaiting payment', hint: 'Accepted; the ad budget isn’t paid yet' },
  { key: 'accepted', label: 'Accepted', hint: 'Ready to go live' },
  { key: 'live', label: 'Live', hint: 'Commission on tickets sold now' },
  { key: 'ended', label: 'Ended', hint: '' },
  { key: 'closed', label: 'Declined / cancelled', hint: '' },
];

export const tabOf = (b: Boost): Tab => {
  switch (b.status) {
    case 'under_review':
      return 'new';
    case 'quote_ready':
      if (!b.accepted_at) return 'proposed';
      return b.budget_status === 'unpaid' ? 'payment' : 'accepted';
    case 'live':
      return 'live';
    case 'ended':
      return 'ended';
    default:
      return 'closed';
  }
};

export const statusBadge = (b: Boost): { label: string; color: BadgeColor } => {
  switch (tabOf(b)) {
    case 'new':
      return { label: 'New', color: 'amber' };
    case 'proposed':
      return { label: 'Proposed', color: 'blue' };
    case 'payment':
      return { label: 'Awaiting payment', color: 'amber' };
    case 'accepted':
      return { label: 'Accepted', color: 'indigo' };
    case 'live':
      return { label: 'Live', color: 'green' };
    case 'ended':
      return { label: b.closed_at === null ? 'To close' : 'Ended', color: 'slate' };
    default:
      return { label: b.status === 'declined' ? 'Declined' : 'Cancelled', color: 'rose' };
  }
};

export const pct = (bps: number) => `${bps / 100}%`;


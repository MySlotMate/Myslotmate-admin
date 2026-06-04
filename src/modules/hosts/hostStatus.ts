import type { HostApplicationStatus } from '../../types';

// The host application lifecycle, with display labels and badge colors,
// shared across the Hosts directory and the host profile page.
export const APPLICATION_STATUSES: HostApplicationStatus[] = [
  'draft',
  'pending',
  'under_review',
  'approved',
  'rejected',
];

export const STATUS_LABELS: Record<HostApplicationStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export const statusColor = (status?: HostApplicationStatus): 'green' | 'blue' | 'amber' | 'rose' => {
  switch (status) {
    case 'approved': return 'green';
    case 'pending': return 'amber';
    case 'under_review': return 'blue';
    case 'rejected': return 'rose';
    default: return 'blue';
  }
};

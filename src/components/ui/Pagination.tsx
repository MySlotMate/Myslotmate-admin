import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

// Server-pagination footer: shows the current window and total, with
// Previous/Next controls bounded to the available pages.
export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  disabled = false,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const canPrev = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100/80 bg-white/95 px-5 py-3 shadow-soft">
      <p className="text-xs font-semibold text-slate-500">
        Showing <span className="text-ink font-bold">{start}</span>–
        <span className="text-ink font-bold">{end}</span> of{' '}
        <span className="text-ink font-bold">{total}</span>
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="action"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="gap-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-xs font-bold text-slate-600">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="action"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="gap-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

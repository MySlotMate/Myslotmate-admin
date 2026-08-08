import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3 shadow-soft backdrop-blur-md">
      <p className="text-xs font-semibold text-slate-500">
        Showing <span className="font-extrabold text-ink">{start}</span>–
        <span className="font-extrabold text-ink">{end}</span> of{' '}
        <span className="font-extrabold text-ink">{total}</span> items
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="action"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          Previous
        </Button>
        <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
          {page} / {totalPages}
        </span>
        <Button
          variant="action"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};


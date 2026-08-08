import React from 'react';

export type BadgeColor = 'green' | 'amber' | 'rose' | 'blue' | 'slate' | 'indigo' | 'purple';

export interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  withDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'blue',
  withDot = true,
  className = '',
}) => {
  const colorMap: Record<BadgeColor, { bg: string; dot: string }> = {
    green: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
      dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/60',
      dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/60',
      dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]',
    },
    blue: {
      bg: 'bg-sky-50 text-sky-700 border-sky-200/60',
      dot: 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)]',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200/60',
      dot: 'bg-slate-400',
    },
    indigo: {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
      dot: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-700 border-purple-200/60',
      dot: 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]',
    },
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold tracking-tight transition-all ${style.bg} ${className}`}
    >
      {withDot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
};


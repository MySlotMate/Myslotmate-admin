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
      bg: 'bg-emerald-400/15 text-emerald-300 border-transparent',
      dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]',
    },
    amber: {
      bg: 'bg-amber-400/15 text-amber-300 border-transparent',
      dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    },
    rose: {
      bg: 'bg-rose-500/15 text-rose-300 border-transparent',
      dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]',
    },
    blue: {
      bg: 'bg-sky-400/15 text-sky-300 border-transparent',
      dot: 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)]',
    },
    slate: {
      bg: 'bg-white/10 text-white/70 border-transparent',
      dot: 'bg-slate-400',
    },
    indigo: {
      bg: 'bg-indigo-400/15 text-indigo-300 border-transparent',
      dot: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.4)]',
    },
    purple: {
      bg: 'bg-[#7B2FFF]/20 text-[#D8B4FE] border-transparent',
      dot: 'bg-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]',
    },
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-all ${style.bg} ${className}`}
    >
      {withDot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${style.dot}`} aria-hidden="true" />
      )}
      <span>{children}</span>
    </span>
  );
};


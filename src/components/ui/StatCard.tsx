import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  trend?: {
    value: number;
    label?: string;
  };
  iconBg?: string;
  iconColor?: string;
  prefix?: string | React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  hint,
  trend,
  iconBg = 'bg-brand-50',
  iconColor = 'text-brand-600',
  prefix,
  onClick,
  className = '',
}) => {
  const isUp = trend && trend.value > 0;
  const isDown = trend && trend.value < 0;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-soft transition-all duration-200 backdrop-blur-md ${
        onClick
          ? 'hover:-translate-y-1 hover:border-brand-300 hover:shadow-panel cursor-pointer'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${iconBg} ${iconColor} transition-transform duration-200 group-hover:scale-110`}
        >
          <Icon className="h-5 w-5 stroke-[2.2]" />
        </span>

        {trend && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-tight ${
              isUp
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : isDown
                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                : 'bg-slate-100 text-slate-600 border border-slate-200/60'
            }`}
          >
            {isUp && <TrendingUp className="h-3 w-3" />}
            {isDown && <TrendingDown className="h-3 w-3" />}
            {isUp ? '+' : ''}
            {trend.value}%
          </span>
        )}

        {onClick && !trend && (
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand-500" />
        )}
      </div>

      <div className="mt-4">
        <p className="flex items-baseline gap-1 font-display text-2xl font-extrabold tracking-tight text-ink">
          {prefix && <span className="text-xl font-bold">{prefix}</span>}
          <span>{value}</span>
        </p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        {hint && (
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
};

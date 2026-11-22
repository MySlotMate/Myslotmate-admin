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
  iconBg = 'bg-[#7B2FFF]/15',
  iconColor = 'text-[#D8B4FE]',
  prefix,
  onClick,
  className = '',
}) => {
  const isUp = trend && trend.value > 0;
  const isDown = trend && trend.value < 0;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#121426]/80 p-5 transition-all duration-200 backdrop-blur-xl ${
        onClick
          ? 'hover:-translate-y-1 hover:border-white/20 cursor-pointer'
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
                ? 'bg-emerald-400/15 text-emerald-300'
                : isDown
                ? 'bg-rose-500/15 text-rose-300'
                : 'bg-white/10 text-white/60'
            }`}
          >
            {isUp && <TrendingUp className="h-3 w-3" />}
            {isDown && <TrendingDown className="h-3 w-3" />}
            {isUp ? '+' : ''}
            {trend.value}%
          </span>
        )}

        {onClick && !trend && (
          <ArrowUpRight className="h-4 w-4 text-white/30 transition-colors group-hover:text-[#D8B4FE]" />
        )}
      </div>

      <div className="mt-4">
        <p className="flex items-baseline gap-1 font-outfit text-2xl font-bold text-white">
          {prefix && <span className="text-xl font-bold">{prefix}</span>}
          <span>{value}</span>
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/45">
          {title}
        </p>
        {hint && (
          <p className="mt-1 text-[11px] text-white/40">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
};

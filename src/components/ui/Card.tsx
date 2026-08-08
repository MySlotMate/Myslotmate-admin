import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  muted = false,
  hoverable = false,
}) => {
  const base = muted
    ? 'rounded-3xl border border-brand-100/70 bg-brand-50/60 shadow-soft'
    : 'rounded-3xl border border-slate-200/70 bg-white/95 shadow-soft backdrop-blur-md';

  const hover = hoverable
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-panel hover:border-brand-200'
    : '';

  return <div className={`${base} ${hover} ${className}`}>{children}</div>;
};


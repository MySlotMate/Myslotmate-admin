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
    ? 'rounded-3xl border border-white/[0.06] bg-white/[0.03]'
    : 'rounded-3xl border border-white/[0.08] bg-[#121426]/80 backdrop-blur-xl';

  const hover = hoverable
    ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20'
    : '';

  return <div className={`${base} ${hover} ${className}`}>{children}</div>;
};


import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', muted = false }) => {
  return (
    <div className={`${muted ? 'rounded-3xl border border-brand-100/80 bg-brand-50/70 shadow-soft' : 'rounded-3xl border border-brand-100/80 bg-white/90 shadow-soft backdrop-blur-md'} ${className}`}>
      {children}
    </div>
  );
};

import React from 'react';

type BadgeColor = 'green' | 'amber' | 'rose' | 'blue';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, color = 'blue', className = '' }) => {
  const colorMap = {
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    blue: 'bg-sky-50 text-sky-700',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${colorMap[color]} ${className}`}>
      {children}
    </span>
  );
};

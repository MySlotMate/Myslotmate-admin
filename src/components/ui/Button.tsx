import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'action';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  children,
  className = '',
  ...props
}) => {
  let baseClass = 'inline-flex items-center justify-center rounded-xl border border-brand-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 cursor-pointer';
  if (variant === 'primary') {
    baseClass = 'inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-700 cursor-pointer';
  } else if (variant === 'action') {
    baseClass = 'inline-flex items-center justify-center rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 cursor-pointer';
  }

  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
};

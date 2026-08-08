import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'action' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold tracking-tight rounded-xl transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:transform-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/20 hover:from-brand-700 hover:to-brand-600 hover:shadow-lg hover:shadow-brand-500/30 border border-brand-500/30',
    secondary: 'border border-slate-200/80 bg-white/90 text-slate-700 shadow-xs hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700',
    action: 'border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
    outline: 'border border-brand-200 bg-transparent text-brand-700 hover:bg-brand-50 hover:border-brand-300',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent',
  };

  // Override size for legacy 'action' variant if size wasn't explicitly set
  const effectiveSize = variant === 'action' && size === 'md' ? 'sm' : size;

  return (
    <button
      className={`${baseStyles} ${sizeStyles[effectiveSize]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0 text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};


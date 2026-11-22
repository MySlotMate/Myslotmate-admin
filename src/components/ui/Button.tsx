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
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 cursor-pointer select-none active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:transform-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-[#7038F5] to-[#B724EA] text-white shadow-[0_10px_30px_-12px_rgba(183,36,234,0.7)] hover:opacity-90 border border-transparent',
    secondary: 'border border-white/10 bg-white/[0.06] text-white/85 hover:bg-white/10 hover:text-white',
    action: 'border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white',
    outline: 'border border-[#B57BFF]/50 bg-transparent text-[#D8B4FE] hover:bg-[#7B2FFF]/15',
    danger: 'border border-rose-400/25 bg-rose-500/[0.08] text-rose-300 hover:bg-rose-500/[0.15]',
    ghost: 'border border-transparent bg-transparent text-white/60 hover:bg-white/[0.06] hover:text-white',
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


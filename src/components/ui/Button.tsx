import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'warning' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, disabled, type = 'button', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500';

    const variants: Record<string, string> = {
      default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs shadow-blue-500/20',
      secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 shadow-2xs',
      outline: 'border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs',
      ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
      destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs shadow-rose-500/20',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs shadow-emerald-500/20',
      warning: 'bg-amber-500 text-white hover:bg-amber-600 shadow-xs shadow-amber-500/20',
      link: 'text-blue-600 underline-offset-4 hover:underline p-0 h-auto font-medium',
    };

    const sizes: Record<string, string> = {
      sm: 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5',
      md: 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2',
      lg: 'px-5 py-2.5 text-sm font-bold rounded-xl gap-2',
      icon: 'w-8 h-8 p-1.5 rounded-lg flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

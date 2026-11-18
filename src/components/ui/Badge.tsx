import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors';

  const variants = {
    default: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200/50',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    outline: 'border border-slate-200 text-slate-600 bg-white',
  };

  return (
    <div className={cn(base, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};

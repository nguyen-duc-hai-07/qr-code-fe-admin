import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      />

      {/* Content */}
      <div
        className={cn(
          'relative w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 z-50 animate-in zoom-in-95 duration-150 space-y-4 max-h-[90vh] overflow-y-auto',
          maxWidthClasses[maxWidth]
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div>
              {title && <h3 className="font-bold text-base text-slate-900">{title}</h3>}
              {description && (
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
};

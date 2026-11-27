import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  isWarning?: boolean;
}

export const Toast: React.FC<ToastProps> = React.memo(({ show, message, isWarning }) => {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 transform transition-all duration-200"
    >
      <div className="bg-charcoal border border-white/15 text-zinc-100 px-4 py-3 rounded-sm shadow-2xl flex items-center gap-3">
        {isWarning ? (
          <AlertTriangle aria-hidden="true" className="w-4 h-4 text-brass shrink-0" />
        ) : (
          <Check aria-hidden="true" className="w-4 h-4 text-brass shrink-0" />
        )}
        <span className="text-xs sm:text-sm font-medium">{message}</span>
      </div>
    </div>
  );
});

Toast.displayName = 'Toast';

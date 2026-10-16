import React from 'react';

interface ToastProps {
  show: boolean;
  message: string;
  isWarning?: boolean;
}

export const Toast: React.FC<ToastProps> = ({ show, message, isWarning }) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 transform transition-all duration-300 animate-in slide-in-from-bottom-3">
      <div className="bg-charcoal border border-amber-500/40 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
        <i
          className={
            isWarning
              ? 'fa-solid fa-triangle-exclamation text-amber-400'
              : 'fa-solid fa-circle-check text-emerald-400'
          }
        ></i>
        <span className="text-xs sm:text-sm font-medium">{message}</span>
      </div>
    </div>
  );
};

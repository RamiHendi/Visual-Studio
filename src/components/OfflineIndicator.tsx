import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="print-hidden fixed bottom-5 left-5 z-50 bg-charcoal border border-brass/40 text-zinc-100 px-3.5 py-2 rounded-sm shadow-2xl flex items-center gap-2.5 text-xs"
    >
      <WifiOff aria-hidden="true" className="w-3.5 h-3.5 text-brass shrink-0" />
      <span className="font-medium">Offline Mode — Showing cached studio</span>
    </div>
  );
};

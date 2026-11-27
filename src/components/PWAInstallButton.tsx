import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);

  useEffect(() => {
    if (!showIOSGuide) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowIOSGuide(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showIOSGuide]);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        aria-label="Install studio app"
        className="px-3 py-2 rounded-sm bg-charcoal hover:bg-panel border border-white/15 hover:border-brass/60 text-zinc-200 hover:text-brass text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
      >
        <Download aria-hidden="true" className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install app on iOS"
          className="px-3 py-2 rounded-sm bg-charcoal hover:bg-panel border border-white/15 hover:border-brass/60 text-zinc-200 hover:text-brass text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
        >
          <Download aria-hidden="true" className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            onClick={() => setShowIOSGuide(false)}
            className="fixed inset-0 z-50 bg-darkroom/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-obsidian border border-white/[0.12] rounded-sm shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] text-brass tracking-wide">
                    Offline Studio App
                  </p>
                  <h3
                    id="ios-install-title"
                    className="font-display text-lg font-semibold text-zinc-100 mt-0.5"
                  >
                    Add to Home Screen
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close installation guide"
                  className="w-8 h-8 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X aria-hidden="true" className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-2.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono text-brass shrink-0">01.</span>
                  <span>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 text-zinc-100 font-medium">
                      <Share aria-hidden="true" className="w-3.5 h-3.5 text-brass inline" />
                      Share
                    </span>{' '}
                    button in Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono text-brass shrink-0">02.</span>
                  <span>
                    Scroll down and select{' '}
                    <strong className="text-zinc-100 font-medium">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-sm bg-brass hover:bg-brassHover text-obsidian text-xs font-semibold transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

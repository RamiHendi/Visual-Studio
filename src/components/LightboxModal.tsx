import React, { useEffect, useState } from 'react';
import { PortfolioItem } from '../types';

interface LightboxModalProps {
  isOpen: boolean;
  itemIndex: number;
  items: PortfolioItem[];
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  itemIndex,
  items,
  onClose,
  onNavigate,
}) => {
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const currentItem = items[itemIndex];

  // Reset zoom on item change
  useEffect(() => {
    setIsZoomed(false);
  }, [itemIndex]);

  // Keyboard navigation & body lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNavigate((itemIndex + 1) % items.length);
      } else if (e.key === 'ArrowLeft') {
        onNavigate((itemIndex - 1 + items.length) % items.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, itemIndex, items.length, onClose, onNavigate]);

  if (!isOpen || !currentItem) return null;

  const isVideo = currentItem.type === 'video';
  const openUrl = isVideo ? currentItem.embedUrl : (currentItem.fullUrl || currentItem.thumbUrl);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate((itemIndex - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate((itemIndex + 1) % items.length);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200"
    >
      {/* Top Lightbox Bar */}
      <div className="flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono">
            {currentItem.category || 'Render'}
          </span>
          <span className="text-xs font-mono text-gray-400">
            {itemIndex + 1} / {items.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isVideo && (
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'Zoom Out' : 'Zoom 4K View'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-all cursor-pointer"
            >
              <i className={isZoomed ? 'fa-solid fa-magnifying-glass-minus' : 'fa-solid fa-magnifying-glass-plus'}></i>
            </button>
          )}

          {openUrl && (
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Full Resolution in New Tab"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm transition-all flex items-center justify-center cursor-pointer"
            >
              <i className="fa-solid fa-up-right-from-square"></i>
            </a>
          )}

          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500/80 text-white text-sm transition-all cursor-pointer"
          >
            <i className="fa-solid fa-xmark text-base px-0.5"></i>
          </button>
        </div>
      </div>

      {/* Center Media Stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-4">
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-lg"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>
        )}

        {/* Media Container */}
        <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
          {isVideo ? (
            <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl">
              <iframe
                src={currentItem.embedUrl}
                title={currentItem.title}
                className="w-full h-full"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <img
              src={currentItem.fullUrl || currentItem.thumbUrl}
              alt={currentItem.title}
              onClick={() => setIsZoomed(!isZoomed)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = currentItem.thumbUrl;
              }}
              className={`max-h-full max-w-full object-contain rounded-xl transition-transform duration-300 shadow-2xl ${
                isZoomed ? 'lightbox-img-zoomed' : 'lightbox-img-normal'
              }`}
            />
          )}
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-lg"
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>
        )}
      </div>

      {/* Bottom Caption & Metadata Bar */}
      <div className="max-w-4xl mx-auto w-full bg-charcoal/90 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-20">
        <div>
          <h3 className="font-display text-lg font-bold text-white">
            {currentItem.title}
          </h3>
          <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
            {currentItem.description || "Rendered in Rami Hendi's Visual Studio."}
          </p>
        </div>
        <div className="text-[11px] font-mono text-gray-400 shrink-0">
          Use <kbd className="px-1.5 py-0.5 bg-obsidian rounded border border-white/10 text-gray-300">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 bg-obsidian rounded border border-white/10 text-gray-300">→</kbd> keys to navigate
        </div>
      </div>
    </div>
  );
};

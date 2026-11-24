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

  // Keyboard navigation, silent Ctrl/Cmd+S guard & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        return;
      }
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
  const categoryLabel = (currentItem.category || 'Selected Work').replace(/_/g, ' ');
  const paddedIndex = String(itemIndex + 1).padStart(2, '0');
  const paddedTotal = String(items.length).padStart(2, '0');
  const videoEmbedUrl = (currentItem.embedUrl || '').trim();
  const imageDisplayUrl = (currentItem.fullUrl || currentItem.thumbUrl || '').trim();

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate((itemIndex - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigate((itemIndex + 1) % items.length);
  };

  const blockMediaAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onContextMenu={blockMediaAction}
      onDragStart={blockMediaAction}
      className="fixed inset-0 z-50 bg-darkroom/98 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 protected-media"
    >
      {/* Top Darkroom Bar (Clean Unboxed Metadata, No New-Tab Button) */}
      <div className="flex items-center justify-between gap-4 z-20 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-medium text-zinc-100">{categoryLabel}</span>
          <span aria-hidden="true" className="text-zinc-600">
            ·
          </span>
          <span className="font-mono text-zinc-400 tabular-nums">
            {paddedIndex} / {paddedTotal}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isVideo && (
            <button
              type="button"
              onClick={() => setIsZoomed(!isZoomed)}
              title={isZoomed ? 'Zoom Out' : 'Zoom 4K View'}
              aria-label={isZoomed ? 'Zoom Out' : 'Zoom 4K View'}
              className="w-9 h-9 rounded-sm bg-charcoal hover:bg-panel border border-white/10 text-zinc-200 hover:text-zinc-100 text-xs flex items-center justify-center transition-colors duration-150 cursor-pointer"
            >
              <i
                className={
                  isZoomed
                    ? 'fa-solid fa-magnifying-glass-minus'
                    : 'fa-solid fa-magnifying-glass-plus'
                }
              ></i>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close fullscreen viewer"
            className="w-9 h-9 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-zinc-200 text-sm flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      {/* Center Darkroom Media Stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-4">
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous work"
            className="absolute left-2 sm:left-4 z-20 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
        )}

        {/* Protected Media Container */}
        <div
          onContextMenu={blockMediaAction}
          onDragStart={blockMediaAction}
          className="w-full h-full flex items-center justify-center overflow-auto p-2 protected-media"
        >
          {isVideo ? (
            <div className="w-full max-w-5xl aspect-video rounded-sm overflow-hidden border border-white/10 bg-black flex items-center justify-center">
              {videoEmbedUrl ? (
                <iframe
                  src={videoEmbedUrl}
                  title={`${categoryLabel} video`}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                ></iframe>
              ) : (
                <span className="font-mono text-xs text-zinc-500">
                  Video preview unavailable
                </span>
              )}
            </div>
          ) : imageDisplayUrl ? (
            <div
              onClick={() => setIsZoomed(!isZoomed)}
              onContextMenu={blockMediaAction}
              onDragStart={blockMediaAction}
              className={`relative inline-flex items-center justify-center rounded-sm overflow-hidden transition-transform duration-300 protected-media ${
                isZoomed ? 'lightbox-img-zoomed' : 'lightbox-img-normal'
              }`}
            >
              <img
                src={imageDisplayUrl}
                alt={`${categoryLabel} showcase`}
                draggable={false}
                referrerPolicy="no-referrer"
                onContextMenu={blockMediaAction}
                onDragStart={blockMediaAction}
                onError={(e) => {
                  const fallback = (currentItem.thumbUrl || '').trim();
                  if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                    (e.target as HTMLImageElement).src = fallback;
                  }
                }}
                className="block max-h-[calc(100vh-13rem)] sm:max-h-[calc(100vh-12rem)] max-w-full w-auto h-auto object-contain protected-img"
              />
              {/* Transparent protective shield above the full-resolution image */}
              <div
                aria-hidden="true"
                onContextMenu={blockMediaAction}
                onDragStart={blockMediaAction}
                className="absolute inset-0 z-10 bg-transparent protected-media"
              />
            </div>
          ) : (
            <div className="px-8 py-12 bg-charcoal border border-white/10 rounded-sm text-center">
              <span className="font-mono text-xs text-zinc-500">
                Image preview unavailable
              </span>
            </div>
          )}
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next work"
            className="absolute right-2 sm:right-4 z-20 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        )}
      </div>

      {/* Bottom Hairline Caption Bar */}
      <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 z-20">
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {currentItem.description || "Rami Hendi's Visual Studio"}
        </p>
        <div className="text-[11px] font-mono text-zinc-500 shrink-0">
          Use ← / → keys to navigate · Esc to close
        </div>
      </div>
    </div>
  );
};

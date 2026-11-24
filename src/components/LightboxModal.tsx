import React, { useEffect, useRef, useState } from 'react';
import { PortfolioItem } from '../types';

type SlideDirection = 'next' | 'prev' | 'fade';

interface LightboxModalProps {
  isOpen: boolean;
  itemIndex: number;
  items: PortfolioItem[];
  projectTitle?: string;
  projectIndex?: number;
  totalProjects?: number;
  prevProjectName?: string;
  nextProjectName?: string;
  onPrevProject?: () => void;
  onNextProject?: () => void;
  onClose: () => void;
  onNavigate: (newIndex: number) => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  itemIndex,
  items,
  projectTitle,
  projectIndex,
  totalProjects = 0,
  prevProjectName,
  nextProjectName,
  onPrevProject,
  onNextProject,
  onClose,
  onNavigate,
}) => {
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('fade');
  const prevItemsRef = useRef<PortfolioItem[]>(items);

  const currentItem = items[itemIndex];

  // Reset zoom on item or project change; use gentle fade when switching projects
  useEffect(() => {
    setIsZoomed(false);
    if (prevItemsRef.current !== items) {
      prevItemsRef.current = items;
      setSlideDirection('fade');
    }
  }, [itemIndex, items]);

  // Reset to gentle fade each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSlideDirection('fade');
    }
  }, [isOpen]);

  // Preload adjacent project images for instant, smooth transitions
  useEffect(() => {
    if (!isOpen || items.length <= 1) return;
    const neighborIndices = [
      (itemIndex + 1) % items.length,
      (itemIndex - 1 + items.length) % items.length,
    ];
    neighborIndices.forEach((idx) => {
      const neighbor = items[idx];
      if (!neighbor || neighbor.type === 'video') return;
      const preloadUrl = (neighbor.fullUrl || neighbor.thumbUrl || '').trim();
      if (!preloadUrl) return;
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = preloadUrl;
    });
  }, [isOpen, itemIndex, items]);

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
        setSlideDirection('next');
        onNavigate((itemIndex + 1) % items.length);
      } else if (e.key === 'ArrowLeft') {
        setSlideDirection('prev');
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
  const activeProjectTitle = (projectTitle || currentItem.projectName || '').trim();
  const paddedIndex = String(itemIndex + 1).padStart(2, '0');
  const paddedTotal = String(items.length).padStart(2, '0');
  const videoEmbedUrl = (currentItem.embedUrl || '').trim();
  const imageDisplayUrl = (currentItem.fullUrl || currentItem.thumbUrl || '').trim();
  const showFilmstrip = Boolean(activeProjectTitle && items.length > 1);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('prev');
    onNavigate((itemIndex - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSlideDirection('next');
    onNavigate((itemIndex + 1) % items.length);
  };

  const handleFilmstripSelect = (targetIdx: number) => {
    if (targetIdx === itemIndex) return;
    setSlideDirection(targetIdx > itemIndex ? 'next' : 'prev');
    onNavigate(targetIdx);
  };

  const transitionClass =
    slideDirection === 'next'
      ? 'lightbox-slide-next'
      : slideDirection === 'prev'
        ? 'lightbox-slide-prev'
        : 'lightbox-slide-fade';

  const stageKey = `${activeProjectTitle}::${currentItem.id || itemIndex}`;

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
      {/* Top Darkroom Bar (Project Name + Unboxed Metadata, No File Names, No New-Tab Button) */}
      <div className="flex items-center justify-between gap-4 z-20 pb-3 border-b border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs min-w-0">
          {activeProjectTitle && (
            <>
              <span className="font-display text-sm sm:text-base font-medium text-zinc-100 truncate">
                {activeProjectTitle}
              </span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
            </>
          )}
          <span
            className={
              activeProjectTitle ? 'text-zinc-400' : 'font-medium text-zinc-100'
            }
          >
            {categoryLabel}
          </span>
          <span aria-hidden="true" className="text-zinc-600">
            ·
          </span>
          <span className="font-mono text-zinc-400 tabular-nums">
            {paddedIndex} / {paddedTotal}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
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
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-3 sm:my-4">
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous view"
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
          <div
            key={stageKey}
            className={`w-full h-full flex items-center justify-center ${transitionClass}`}
          >
            {isVideo ? (
              <div className="w-full max-w-5xl aspect-video rounded-sm overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                {videoEmbedUrl ? (
                  <iframe
                    src={videoEmbedUrl}
                    title={
                      activeProjectTitle
                        ? `${activeProjectTitle} video`
                        : `${categoryLabel} video`
                    }
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
                  alt={
                    activeProjectTitle
                      ? `${activeProjectTitle} — ${categoryLabel}`
                      : `${categoryLabel} showcase`
                  }
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
                  className={`block max-w-full w-auto h-auto object-contain protected-img ${
                    showFilmstrip
                      ? 'max-h-[calc(100vh-17rem)] sm:max-h-[calc(100vh-16rem)]'
                      : 'max-h-[calc(100vh-13rem)] sm:max-h-[calc(100vh-12rem)]'
                  }`}
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
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next view"
            className="absolute right-2 sm:right-4 z-20 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        )}
      </div>

      {/* Bottom Project Filmstrip + Hairline Caption Bar */}
      <div className="space-y-3 z-20">
        {showFilmstrip && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
            {items.map((thumbItem, idx) => {
              const isActive = idx === itemIndex;
              const thumbSrc = (thumbItem.thumbUrl || thumbItem.fullUrl || '').trim();
              return (
                <button
                  key={thumbItem.id || idx}
                  type="button"
                  onClick={() => handleFilmstripSelect(idx)}
                  onContextMenu={blockMediaAction}
                  onDragStart={blockMediaAction}
                  aria-label={`View ${idx + 1} of ${items.length}`}
                  className={`relative h-11 w-16 sm:h-12 sm:w-20 rounded-sm overflow-hidden shrink-0 bg-charcoal transition-all duration-150 cursor-pointer protected-media ${
                    isActive
                      ? 'ring-1 ring-brass opacity-100'
                      : 'opacity-45 hover:opacity-85 border border-white/10'
                  }`}
                >
                  {thumbSrc ? (
                    <img
                      src={thumbSrc}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover protected-img"
                    />
                  ) : (
                    <div className="w-full h-full bg-panel" />
                  )}
                  {thumbItem.type === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-zinc-100">
                      <i className="fa-solid fa-play text-[9px]"></i>
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-transparent protected-media"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed min-w-0 truncate">
            {currentItem.description || "Rami Hendi's Visual Studio"}
          </p>

          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
            {totalProjects > 1 && onPrevProject && onNextProject && (
              <div className="inline-flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onPrevProject}
                  title={
                    prevProjectName
                      ? `Previous Project: ${prevProjectName}`
                      : 'Previous Project'
                  }
                  className="px-3 py-1.5 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-xs font-medium text-zinc-200 transition-colors duration-150 whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]"></i>
                  <span>Previous Project</span>
                </button>

                {typeof projectIndex === 'number' && (
                  <span className="hidden md:inline font-mono text-[11px] text-zinc-500 tabular-nums px-1">
                    {String(projectIndex + 1).padStart(2, '0')} /{' '}
                    {String(totalProjects).padStart(2, '0')}
                  </span>
                )}

                <button
                  type="button"
                  onClick={onNextProject}
                  title={
                    nextProjectName
                      ? `Next Project: ${nextProjectName}`
                      : 'Next Project'
                  }
                  className="px-3 py-1.5 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-xs font-medium text-zinc-200 transition-colors duration-150 whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next Project</span>
                  <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            )}

            <div className="hidden lg:block text-[11px] font-mono text-zinc-500 shrink-0">
              ← / → navigate · Esc close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PortfolioItem } from '../types';

type SlideDirection = 'next' | 'prev' | 'fade';

interface ActiveSlide {
  item: PortfolioItem;
  index: number;
  projectTitle: string;
  src: string;
  key: number;
  direction: SlideDirection;
}

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

const EXIT_ANIMATION_MS = 480;
const ZOOM_SCALE = 1.85;

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
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [displayedSlide, setDisplayedSlide] = useState<ActiveSlide | null>(null);
  const [exitingSlide, setExitingSlide] = useState<ActiveSlide | null>(null);
  const [isTransitioningImage, setIsTransitioningImage] = useState<boolean>(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const zoomWrapperRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const didDragRef = useRef<boolean>(false);

  const displayedSlideRef = useRef<ActiveSlide | null>(null);
  const prevItemsRef = useRef<PortfolioItem[]>(items);
  const pendingDirectionRef = useRef<SlideDirection>('fade');
  const transitionCounterRef = useRef<number>(0);
  const loadRequestIdRef = useRef<number>(0);
  const exitTimerRef = useRef<number | null>(null);
  const preloadedCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const inFlightLoadsRef = useRef<Map<string, Promise<string>>>(new Map());

  const currentItem = items[itemIndex];
  const activeProjectTitle = (projectTitle || currentItem?.projectName || '').trim();

  // Keep decoded image bitmaps warm in memory so transitions start with 0ms decode delay
  const loadAndDecodeUrl = useCallback((url: string): Promise<string> => {
    const cleanUrl = url.trim();
    if (!cleanUrl) return Promise.resolve('');

    const cached = preloadedCacheRef.current.get(cleanUrl);
    if (cached && cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cleanUrl);
    }

    const existingPromise = inFlightLoadsRef.current.get(cleanUrl);
    if (existingPromise) return existingPromise;

    const promise = new Promise<string>((resolve) => {
      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.decoding = 'async';

      const finishSuccess = () => {
        preloadedCacheRef.current.set(cleanUrl, img);
        inFlightLoadsRef.current.delete(cleanUrl);
        resolve(cleanUrl);
      };

      const finishError = () => {
        inFlightLoadsRef.current.delete(cleanUrl);
        resolve('');
      };

      img.onload = () => {
        if (typeof img.decode === 'function') {
          img.decode().then(finishSuccess, finishSuccess);
        } else {
          finishSuccess();
        }
      };
      img.onerror = finishError;
      img.src = cleanUrl;
    });

    inFlightLoadsRef.current.set(cleanUrl, promise);
    return promise;
  }, []);

  const getCachedImageSrc = useCallback((item: PortfolioItem): string | null => {
    const primary = (item.fullUrl || item.thumbUrl || '').trim();
    const fallback = (item.thumbUrl || '').trim();

    if (primary) {
      const cachedPrimary = preloadedCacheRef.current.get(primary);
      if (cachedPrimary && cachedPrimary.complete && cachedPrimary.naturalWidth > 0) {
        return primary;
      }
    }
    if (fallback && fallback !== primary) {
      const cachedFallback = preloadedCacheRef.current.get(fallback);
      if (cachedFallback && cachedFallback.complete && cachedFallback.naturalWidth > 0) {
        return fallback;
      }
    }
    return null;
  }, []);

  const resolveImageSrc = useCallback(
    async (item: PortfolioItem): Promise<string> => {
      const primary = (item.fullUrl || item.thumbUrl || '').trim();
      const fallback = (item.thumbUrl || '').trim();

      if (primary) {
        const primaryLoaded = await loadAndDecodeUrl(primary);
        if (primaryLoaded) return primaryLoaded;
      }
      if (fallback && fallback !== primary) {
        const fallbackLoaded = await loadAndDecodeUrl(fallback);
        if (fallbackLoaded) return fallbackLoaded;
      }
      return primary || fallback;
    },
    [loadAndDecodeUrl]
  );

  // Reset state cleanly when modal closes
  useEffect(() => {
    if (!isOpen) {
      loadRequestIdRef.current += 1;
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      displayedSlideRef.current = null;
      setDisplayedSlide(null);
      setExitingSlide(null);
      setIsTransitioningImage(false);
      setIsZoomed(false);
      setIsPanning(false);
      panRef.current = { x: 0, y: 0 };
      dragStateRef.current = null;
      didDragRef.current = false;
      pendingDirectionRef.current = 'fade';
    }
  }, [isOpen]);

  // Reset pan offset whenever zoom turns off or active slide changes
  useEffect(() => {
    if (!isZoomed) {
      panRef.current = { x: 0, y: 0 };
      dragStateRef.current = null;
      didDragRef.current = false;
      setIsPanning(false);
      if (zoomWrapperRef.current) {
        zoomWrapperRef.current.style.transform = '';
      }
    }
  }, [isZoomed, displayedSlide?.key]);

  // Cleanup exit timer on unmount
  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  // Preload & decode project images in priority order (adjacent first, then rest of project)
  useEffect(() => {
    if (!isOpen || items.length <= 1) return;

    const orderedIndices: number[] = [];
    const seen = new Set<number>([itemIndex]);

    for (let offset = 1; offset < items.length; offset++) {
      const nextIdx = (itemIndex + offset) % items.length;
      if (!seen.has(nextIdx)) {
        seen.add(nextIdx);
        orderedIndices.push(nextIdx);
      }
      const prevIdx = (itemIndex - offset + items.length) % items.length;
      if (!seen.has(prevIdx)) {
        seen.add(prevIdx);
        orderedIndices.push(prevIdx);
      }
    }

    let cancelled = false;
    const warmQueue = async () => {
      // Preload immediate neighbors in parallel first for instant responsiveness
      const immediate = orderedIndices.slice(0, 2);
      await Promise.all(
        immediate.map((idx) => {
          const item = items[idx];
          if (!item || item.type === 'video') return Promise.resolve('');
          const url = (item.fullUrl || item.thumbUrl || '').trim();
          return url ? loadAndDecodeUrl(url) : Promise.resolve('');
        })
      );

      // Then gently warm remaining images in the active project sequentially
      for (let i = 2; i < orderedIndices.length; i++) {
        if (cancelled) return;
        const item = items[orderedIndices[i]];
        if (!item || item.type === 'video') continue;
        const url = (item.fullUrl || item.thumbUrl || '').trim();
        if (url) {
          await loadAndDecodeUrl(url);
        }
      }
    };

    warmQueue();
    return () => {
      cancelled = true;
    };
  }, [isOpen, itemIndex, items, loadAndDecodeUrl]);

  // Synchronize slide transitions: decode before swapping so outgoing & incoming glide simultaneously with zero flash
  useEffect(() => {
    if (!isOpen || !currentItem) return;

    const isProjectSwitch = prevItemsRef.current !== items;
    if (isProjectSwitch) {
      prevItemsRef.current = items;
    }

    const currentDisplayed = displayedSlideRef.current;
    if (
      currentDisplayed &&
      currentDisplayed.item === currentItem &&
      currentDisplayed.index === itemIndex &&
      currentDisplayed.projectTitle === activeProjectTitle
    ) {
      return;
    }

    const direction: SlideDirection =
      !currentDisplayed || isProjectSwitch
        ? 'fade'
        : pendingDirectionRef.current;

    const requestId = ++loadRequestIdRef.current;

    const commitSlide = (resolvedSrc: string) => {
      if (requestId !== loadRequestIdRef.current) return;

      setIsTransitioningImage(false);
      setIsZoomed(false);

      const previous = displayedSlideRef.current;
      const nextSlide: ActiveSlide = {
        item: currentItem,
        index: itemIndex,
        projectTitle: activeProjectTitle,
        src: resolvedSrc,
        key: ++transitionCounterRef.current,
        direction,
      };

      if (previous) {
        if (exitTimerRef.current !== null) {
          window.clearTimeout(exitTimerRef.current);
        }
        setExitingSlide({
          ...previous,
          direction,
        });
        exitTimerRef.current = window.setTimeout(() => {
          setExitingSlide(null);
          exitTimerRef.current = null;
        }, EXIT_ANIMATION_MS);
      } else {
        setExitingSlide(null);
      }

      displayedSlideRef.current = nextSlide;
      setDisplayedSlide(nextSlide);
    };

    if (currentItem.type === 'video') {
      commitSlide((currentItem.embedUrl || '').trim());
      return;
    }

    // Fast synchronous path if image is already decoded in memory
    const cachedSrc = getCachedImageSrc(currentItem);
    if (cachedSrc) {
      commitSlide(cachedSrc);
      return;
    }

    // Otherwise keep the current slide rock-solid while decoding the incoming image
    setIsTransitioningImage(true);
    resolveImageSrc(currentItem).then((resolvedSrc) => {
      commitSlide(resolvedSrc);
    });
  }, [
    isOpen,
    currentItem,
    itemIndex,
    items,
    activeProjectTitle,
    getCachedImageSrc,
    resolveImageSrc,
  ]);

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
      } else if (e.key === 'ArrowRight' && items.length > 1) {
        pendingDirectionRef.current = 'next';
        onNavigate((itemIndex + 1) % items.length);
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        pendingDirectionRef.current = 'prev';
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
  const showFilmstrip = Boolean(activeProjectTitle && items.length > 1);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    pendingDirectionRef.current = 'prev';
    onNavigate((itemIndex - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    pendingDirectionRef.current = 'next';
    onNavigate((itemIndex + 1) % items.length);
  };

  const handleFilmstripSelect = (targetIdx: number) => {
    if (targetIdx === itemIndex) return;
    pendingDirectionRef.current = targetIdx > itemIndex ? 'next' : 'prev';
    onNavigate(targetIdx);
  };

  const handlePrevProjectClick = () => {
    pendingDirectionRef.current = 'fade';
    onPrevProject?.();
  };

  const handleNextProjectClick = () => {
    pendingDirectionRef.current = 'fade';
    onNextProject?.();
  };

  const getEnterClass = (dir: SlideDirection) =>
    dir === 'next'
      ? 'lightbox-enter-next'
      : dir === 'prev'
        ? 'lightbox-enter-prev'
        : 'lightbox-enter-fade';

  const getExitClass = (dir: SlideDirection) =>
    dir === 'next'
      ? 'lightbox-exit-next'
      : dir === 'prev'
        ? 'lightbox-exit-prev'
        : 'lightbox-exit-fade';

  const blockMediaAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const clampPan = (x: number, y: number): { x: number; y: number } => {
    const stageEl = stageRef.current;
    const mediaEl = zoomWrapperRef.current;
    if (!stageEl || !mediaEl) return { x, y };

    const stageW = stageEl.clientWidth;
    const stageH = stageEl.clientHeight;
    const scaledW = mediaEl.offsetWidth * ZOOM_SCALE;
    const scaledH = mediaEl.offsetHeight * ZOOM_SCALE;

    const maxPanX = scaledW > stageW ? (scaledW - stageW) / 2 + 32 : 0;
    const maxPanY = scaledH > stageH ? (scaledH - stageH) / 2 + 32 : 0;

    return {
      x: Math.max(-maxPanX, Math.min(maxPanX, x)),
      y: Math.max(-maxPanY, Math.min(maxPanY, y)),
    };
  };

  const handleZoomPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    didDragRef.current = false;
    dragStateRef.current = {
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      startX: panRef.current.x,
      startY: panRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
  };

  const handleZoomPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !isZoomed) return;

    const dx = e.clientX - drag.clientX;
    const dy = e.clientY - drag.clientY;
    if (!didDragRef.current && Math.hypot(dx, dy) > 4) {
      didDragRef.current = true;
    }

    const next = clampPan(drag.startX + dx, drag.startY + dy);
    panRef.current = next;
    if (zoomWrapperRef.current) {
      zoomWrapperRef.current.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) scale(${ZOOM_SCALE})`;
    }
  };

  const handleZoomPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStateRef.current = null;
    setIsPanning(false);
  };

  const handleImageClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }
    setIsZoomed((z) => !z);
  };

  const renderSlideMedia = (slide: ActiveSlide, interactive: boolean) => {
    const slideIsVideo = slide.item.type === 'video';
    const slideCategory = (slide.item.category || 'Selected Work').replace(/_/g, ' ');

    if (slideIsVideo) {
      const embedUrl = slide.src.trim();
      return (
        <div className="w-full max-w-5xl aspect-video rounded-sm overflow-hidden border border-white/10 bg-black flex items-center justify-center">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={
                slide.projectTitle
                  ? `${slide.projectTitle} video`
                  : `${slideCategory} video`
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
      );
    }

    if (!slide.src) {
      return (
        <div className="px-8 py-12 bg-charcoal border border-white/10 rounded-sm text-center">
          <span className="font-mono text-xs text-zinc-500">
            Image preview unavailable
          </span>
        </div>
      );
    }

    return (
      <div
        ref={interactive ? zoomWrapperRef : undefined}
        onClick={interactive ? handleImageClick : undefined}
        onPointerDown={interactive ? handleZoomPointerDown : undefined}
        onPointerMove={interactive ? handleZoomPointerMove : undefined}
        onPointerUp={interactive ? handleZoomPointerEnd : undefined}
        onPointerCancel={interactive ? handleZoomPointerEnd : undefined}
        onContextMenu={blockMediaAction}
        onDragStart={blockMediaAction}
        className={`relative inline-flex items-center justify-center rounded-sm overflow-hidden protected-media ${
          interactive && isPanning
            ? 'transition-none'
            : 'transition-transform duration-300 ease-out'
        } ${
          interactive && isZoomed
            ? `lightbox-img-zoomed touch-none ${
                isPanning ? 'lightbox-img-zoomed-panning' : ''
              }`
            : 'lightbox-img-normal'
        }`}
      >
        <img
          src={slide.src}
          alt={
            slide.projectTitle
              ? `${slide.projectTitle} — ${slideCategory}`
              : `${slideCategory} showcase`
          }
          draggable={false}
          decoding="sync"
          referrerPolicy="no-referrer"
          onContextMenu={blockMediaAction}
          onDragStart={blockMediaAction}
          onError={(e) => {
            const fallback = (slide.item.thumbUrl || '').trim();
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
    );
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
      <div className="relative flex items-center justify-between gap-4 z-20 pb-3 border-b border-white/[0.08]">
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

        {/* Hairline loading progress accent when decoding an uncached 4K frame */}
        {isTransitioningImage && (
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 -bottom-px h-px overflow-hidden pointer-events-none"
          >
            <div className="w-1/3 h-full bg-brass/80 lightbox-loading-bar" />
          </div>
        )}
      </div>

      {/* Center Darkroom Dual-Layer Cross-Slide Media Stage */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-3 sm:my-4">
        {/* Previous Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous view"
            className="absolute left-2 sm:left-4 z-30 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-left text-xs"></i>
          </button>
        )}

        {/* Dual-Layer Protected Media Stage (Outgoing & Incoming Animate Simultaneously) */}
        <div
          ref={stageRef}
          onContextMenu={blockMediaAction}
          onDragStart={blockMediaAction}
          className="relative w-full h-full overflow-hidden protected-media"
        >
          {/* Outgoing Slide Layer */}
          {exitingSlide && (
            <div
              key={`exit-${exitingSlide.key}`}
              aria-hidden="true"
              className={`absolute inset-0 z-10 flex items-center justify-center p-2 pointer-events-none ${getExitClass(
                exitingSlide.direction
              )}`}
            >
              {renderSlideMedia(exitingSlide, false)}
            </div>
          )}

          {/* Active / Incoming Slide Layer */}
          {displayedSlide ? (
            <div
              key={`active-${displayedSlide.key}`}
              className={`absolute inset-0 z-20 flex items-center justify-center p-2 overflow-hidden ${getEnterClass(
                displayedSlide.direction
              )}`}
            >
              {renderSlideMedia(displayedSlide, true)}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-white/15 border-t-brass animate-spin" />
            </div>
          )}
        </div>

        {/* Next Button */}
        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next view"
            className="absolute right-2 sm:right-4 z-30 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <i className="fa-solid fa-chevron-right text-xs"></i>
          </button>
        )}

        {/* Corner Reset Zoom Button (visible while zoomed in) */}
        {!isVideo && isZoomed && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
            aria-label="Reset zoom to default view"
            className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-30 px-2.5 py-1.5 rounded-sm bg-obsidian/85 hover:bg-brass hover:text-obsidian backdrop-blur-md border border-white/15 hover:border-brass text-xs font-medium text-zinc-200 inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer shadow-lg"
          >
            <i className="fa-solid fa-rotate-left text-[10px]"></i>
            <span>Reset Zoom</span>
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
                  className={`relative h-11 w-16 sm:h-12 sm:w-20 rounded-sm overflow-hidden shrink-0 bg-charcoal transition-all duration-200 cursor-pointer protected-media ${
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
                  onClick={handlePrevProjectClick}
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
                  onClick={handleNextProjectClick}
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

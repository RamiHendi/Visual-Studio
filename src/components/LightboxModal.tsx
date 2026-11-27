import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PortfolioItem } from '../types';
import {
  getYouTubeFallbackThumbUrl,
  sanitizeMediaImageUrl,
  sanitizeVideoEmbedUrl,
} from '../utils/urlSecurity';

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
const MAX_PRELOAD_CACHE_ENTRIES = 24;

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
  const touchSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const displayedSlideRef = useRef<ActiveSlide | null>(null);
  const prevItemsRef = useRef<PortfolioItem[]>(items);
  const pendingDirectionRef = useRef<SlideDirection>('fade');
  const transitionCounterRef = useRef<number>(0);
  const loadRequestIdRef = useRef<number>(0);
  const exitTimerRef = useRef<number | null>(null);
  const preloadedCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const inFlightLoadsRef = useRef<Map<string, Promise<string>>>(new Map());

  const safeIndex = items.length > 0 ? Math.max(0, Math.min(itemIndex, items.length - 1)) : 0;
  const currentItem = items[safeIndex];
  const activeProjectTitle = (projectTitle || currentItem?.projectName || '').trim();

  const touchCacheEntry = useCallback((url: string, img: HTMLImageElement) => {
    const cache = preloadedCacheRef.current;
    if (cache.has(url)) {
      cache.delete(url);
    }
    cache.set(url, img);
    while (cache.size > MAX_PRELOAD_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }, []);

  const loadAndDecodeUrl = useCallback(
    (url: string): Promise<string> => {
      const cleanUrl = url.trim();
      if (!cleanUrl) return Promise.resolve('');

      const cached = preloadedCacheRef.current.get(cleanUrl);
      if (cached && cached.complete && cached.naturalWidth > 0) {
        touchCacheEntry(cleanUrl, cached);
        return Promise.resolve(cleanUrl);
      }

      const existingPromise = inFlightLoadsRef.current.get(cleanUrl);
      if (existingPromise) return existingPromise;

      const promise = new Promise<string>((resolve) => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.decoding = 'async';

        const finishSuccess = () => {
          touchCacheEntry(cleanUrl, img);
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
    },
    [touchCacheEntry]
  );

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
      touchSwipeStartRef.current = null;
      pendingDirectionRef.current = 'fade';
    }
  }, [isOpen]);

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

  useEffect(() => {
    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || items.length <= 1) return;

    const orderedIndices: number[] = [];
    const seen = new Set<number>([safeIndex]);

    for (let offset = 1; offset < items.length; offset++) {
      const nextIdx = (safeIndex + offset) % items.length;
      if (!seen.has(nextIdx)) {
        seen.add(nextIdx);
        orderedIndices.push(nextIdx);
      }
      const prevIdx = (safeIndex - offset + items.length) % items.length;
      if (!seen.has(prevIdx)) {
        seen.add(prevIdx);
        orderedIndices.push(prevIdx);
      }
    }

    let cancelled = false;
    const warmQueue = async () => {
      const immediate = orderedIndices.slice(0, 2);
      await Promise.all(
        immediate.map((idx) => {
          const item = items[idx];
          if (!item || item.type === 'video') return Promise.resolve('');
          const url = (item.fullUrl || item.thumbUrl || '').trim();
          return url ? loadAndDecodeUrl(url) : Promise.resolve('');
        })
      );

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
  }, [isOpen, safeIndex, items, loadAndDecodeUrl]);

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
      currentDisplayed.index === safeIndex &&
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
        index: safeIndex,
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

    const cachedSrc = getCachedImageSrc(currentItem);
    if (cachedSrc) {
      commitSlide(cachedSrc);
      return;
    }

    setIsTransitioningImage(true);
    resolveImageSrc(currentItem).then((resolvedSrc) => {
      commitSlide(resolvedSrc);
    });
  }, [
    isOpen,
    currentItem,
    safeIndex,
    items,
    activeProjectTitle,
    getCachedImageSrc,
    resolveImageSrc,
  ]);

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
        onNavigate((safeIndex + 1) % items.length);
      } else if (e.key === 'ArrowLeft' && items.length > 1) {
        pendingDirectionRef.current = 'prev';
        onNavigate((safeIndex - 1 + items.length) % items.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, safeIndex, items.length, onClose, onNavigate]);

  if (!isOpen || !currentItem) return null;

  const isVideo = currentItem.type === 'video';
  const categoryLabel = (currentItem.category || 'Selected Work').replace(/_/g, ' ');
  const paddedIndex = String(safeIndex + 1).padStart(2, '0');
  const paddedTotal = String(items.length).padStart(2, '0');
  const showFilmstrip = Boolean(activeProjectTitle && items.length > 1);
  const dialogLabel = activeProjectTitle
    ? `${activeProjectTitle} — ${categoryLabel}`
    : `${categoryLabel} viewer`;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    pendingDirectionRef.current = 'prev';
    onNavigate((safeIndex - 1 + items.length) % items.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    pendingDirectionRef.current = 'next';
    onNavigate((safeIndex + 1) % items.length);
  };

  const handleFilmstripSelect = (targetIdx: number) => {
    if (targetIdx === safeIndex) return;
    pendingDirectionRef.current = targetIdx > safeIndex ? 'next' : 'prev';
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

  const handleStageTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isZoomed || items.length <= 1 || e.touches.length !== 1) return;
    touchSwipeStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleStageTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchSwipeStartRef.current;
    touchSwipeStartRef.current = null;
    if (!start || isZoomed || items.length <= 1 || e.changedTouches.length === 0) return;

    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
      if (dx < 0) {
        pendingDirectionRef.current = 'next';
        onNavigate((safeIndex + 1) % items.length);
      } else {
        pendingDirectionRef.current = 'prev';
        onNavigate((safeIndex - 1 + items.length) % items.length);
      }
    }
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
      const embedUrl = sanitizeVideoEmbedUrl(slide.src);
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
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
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

    const safeImageSrc = sanitizeMediaImageUrl(slide.src);
    if (!safeImageSrc) {
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
          src={safeImageSrc}
          alt={
            slide.projectTitle
              ? `${slide.projectTitle} — ${slideCategory} by Rami Hendi`
              : `${slideCategory} 3D showcase by Rami Hendi`
          }
          draggable={false}
          decoding="sync"
          referrerPolicy="no-referrer"
          onContextMenu={blockMediaAction}
          onDragStart={blockMediaAction}
          onError={(e) => {
            const imgEl = e.currentTarget;
            if (imgEl.dataset.fallbackTried === '1') return;
            const fallback = sanitizeMediaImageUrl(slide.item.thumbUrl);
            if (fallback && imgEl.src !== fallback) {
              imgEl.dataset.fallbackTried = '1';
              imgEl.src = fallback;
            }
          }}
          className={`block max-w-full w-auto h-auto object-contain protected-img ${
            showFilmstrip
              ? 'max-h-[calc(100vh-17rem)] sm:max-h-[calc(100vh-16rem)]'
              : 'max-h-[calc(100vh-13rem)] sm:max-h-[calc(100vh-12rem)]'
          }`}
        />
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
      aria-label={dialogLabel}
      onContextMenu={blockMediaAction}
      onDragStart={blockMediaAction}
      className="fixed inset-0 z-50 bg-darkroom/98 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6 protected-media"
    >
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
              {isZoomed ? (
                <ZoomOut aria-hidden="true" className="w-4 h-4" />
              ) : (
                <ZoomIn aria-hidden="true" className="w-4 h-4" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close fullscreen viewer"
            className="w-9 h-9 rounded-sm bg-charcoal hover:bg-brass hover:text-obsidian border border-white/10 text-zinc-200 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {isTransitioningImage && (
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 -bottom-px h-px overflow-hidden pointer-events-none"
          >
            <div className="w-1/3 h-full bg-brass/80 lightbox-loading-bar" />
          </div>
        )}
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-3 sm:my-4">
        {items.length > 1 && (
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous view"
            className="absolute left-2 sm:left-4 z-30 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <ChevronLeft aria-hidden="true" className="w-4 h-4" />
          </button>
        )}

        <div
          ref={stageRef}
          onTouchStart={handleStageTouchStart}
          onTouchEnd={handleStageTouchEnd}
          onContextMenu={blockMediaAction}
          onDragStart={blockMediaAction}
          className="relative w-full h-full overflow-hidden protected-media"
        >
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

        {items.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next view"
            className="absolute right-2 sm:right-4 z-30 w-10 h-10 rounded-sm bg-obsidian/80 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
          >
            <ChevronRight aria-hidden="true" className="w-4 h-4" />
          </button>
        )}

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
            <RotateCcw aria-hidden="true" className="w-3 h-3" />
            <span>Reset Zoom</span>
          </button>
        )}
      </div>

      <div className="space-y-3 z-20">
        {showFilmstrip && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
            {items.map((thumbItem, idx) => {
              const isActive = idx === safeIndex;
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
                      width={80}
                      height={48}
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onLoad={(e) => {
                        const imgEl = e.currentTarget;
                        if (imgEl.dataset.ytFallback === '1') return;
                        const fallback = getYouTubeFallbackThumbUrl(imgEl.src);
                        if (fallback && imgEl.naturalWidth <= 120 && imgEl.naturalHeight <= 90) {
                          imgEl.dataset.ytFallback = '1';
                          imgEl.src = fallback;
                        }
                      }}
                      onError={(e) => {
                        const imgEl = e.currentTarget;
                        if (imgEl.dataset.ytFallback === '1') return;
                        const fallback = getYouTubeFallbackThumbUrl(imgEl.src);
                        if (fallback) {
                          imgEl.dataset.ytFallback = '1';
                          imgEl.src = fallback;
                        }
                      }}
                      className="w-full h-full object-cover protected-img"
                    />
                  ) : (
                    <div className="w-full h-full bg-panel" />
                  )}
                  {thumbItem.type === 'video' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-zinc-100">
                      <Play aria-hidden="true" className="w-3 h-3 fill-current" />
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
                  <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5" />
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
                  <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
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

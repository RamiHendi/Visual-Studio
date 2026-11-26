import React, { useEffect, useRef, useState } from 'react';
import { getYouTubeFallbackThumbUrl } from '../utils/urlSecurity';

interface LazyThumbnailProps {
  src: string;
  alt: string;
  eager?: boolean;
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
}

export const LazyThumbnail: React.FC<LazyThumbnailProps> = React.memo(
  ({ src, alt, eager = false, loading = 'lazy', decoding = 'async' }) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [activeSrc, setActiveSrc] = useState<string>(() => src.trim());
    const [shouldLoad, setShouldLoad] = useState<boolean>(eager);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
      setActiveSrc(src.trim());
      setIsLoaded(false);
      setHasError(false);
      if (eager) {
        setShouldLoad(true);
      }
    }, [src, eager]);

    useEffect(() => {
      if (shouldLoad) return;

      const node = containerRef.current;
      if (!node || typeof IntersectionObserver === 'undefined') {
        setShouldLoad(true);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        {
          rootMargin: '250px 0px',
          threshold: 0.01,
        }
      );

      observer.observe(node);
      return () => observer.disconnect();
    }, [shouldLoad]);

    useEffect(() => {
      if (!shouldLoad) return;
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        const ytFallback = getYouTubeFallbackThumbUrl(activeSrc);
        if (ytFallback && img.naturalWidth <= 120 && img.naturalHeight <= 90) {
          setActiveSrc(ytFallback);
        } else {
          setIsLoaded(true);
        }
      }
    }, [shouldLoad, activeSrc]);

    return (
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        className="relative w-full aspect-[16/10] overflow-hidden bg-charcoal protected-media"
      >
        {!isLoaded && !hasError && Boolean(activeSrc) && (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-charcoal via-panel to-obsidian animate-pulse motion-reduce:animate-none"
            />
            <div
              role="status"
              aria-label="Loading image"
              className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none"
            >
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span
                  aria-hidden="true"
                  className="absolute inline-flex h-full w-full rounded-full border border-brass/45 bg-brass/10 animate-ping motion-reduce:animate-none opacity-60"
                />
                <span
                  aria-hidden="true"
                  className="relative inline-flex h-5 w-5 rounded-full bg-obsidian/80 backdrop-blur-sm border border-brass/70 items-center justify-center animate-pulse motion-reduce:animate-none"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brass" />
                </span>
              </span>
            </div>
          </>
        )}

        {hasError || !activeSrc ? (
          <div className="w-full min-h-[240px] h-full bg-gradient-to-br from-charcoal via-obsidian to-panel flex flex-col items-center justify-center gap-1.5 p-6 text-center">
            <span className="font-display text-xs font-medium text-zinc-300">
              Studio Render
            </span>
            <span className="text-[11px] font-mono text-zinc-500">
              Preview unavailable
            </span>
          </div>
        ) : (
          shouldLoad && (
            <img
              ref={imgRef}
              src={activeSrc}
              alt={alt}
              width={1000}
              height={625}
              draggable={false}
              loading={loading}
              decoding={decoding}
              fetchPriority={eager ? 'high' : 'low'}
              referrerPolicy="no-referrer"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onLoad={(e) => {
                const imgEl = e.currentTarget;
                const ytFallback = getYouTubeFallbackThumbUrl(activeSrc);
                if (ytFallback && imgEl.naturalWidth <= 120 && imgEl.naturalHeight <= 90) {
                  setActiveSrc(ytFallback);
                  return;
                }
                setIsLoaded(true);
              }}
              onError={() => {
                const ytFallback = getYouTubeFallbackThumbUrl(activeSrc);
                if (ytFallback && activeSrc !== ytFallback) {
                  setActiveSrc(ytFallback);
                  return;
                }
                setHasError(true);
                setIsLoaded(true);
              }}
              className={`w-full h-full object-cover block protected-img transform group-hover:scale-[1.03] transition-[transform,opacity] duration-500 ease-out ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )
        )}

        <div
          aria-hidden="true"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="absolute inset-0 z-[1] bg-transparent protected-media"
        />
      </div>
    );
  }
);

LazyThumbnail.displayName = 'LazyThumbnail';

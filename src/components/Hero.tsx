import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../types';

interface HeroProps {
  title: string;
  subtitle: string;
  categoriesCount: number;
  worksCount: number;
  spotlightItems: PortfolioItem[];
  onOpenSpotlight: (index: number) => void;
  onExploreWorks: () => void;
  onOpenCV: () => void;
}

const STUDIO_TOOLS = [
  'Autodesk 3ds Max',
  'Vray',
  'Blender',
  'KeyShot',
  'Autodesk Fusion',
  'Solidworks',
  'Plasticity',
  'ArtCam',
];

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  categoriesCount,
  worksCount,
  spotlightItems,
  onOpenSpotlight,
  onExploreWorks,
  onOpenCV,
}) => {
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const safeIndex =
    spotlightItems.length > 0 ? spotlightIndex % spotlightItems.length : 0;
  const activeSpotlight = spotlightItems[safeIndex] || null;
  const resolvedSpotlightSrc = (
    activeSpotlight?.fullUrl ||
    activeSpotlight?.thumbUrl ||
    ''
  ).trim();

  const [imgSrc, setImgSrc] = useState<string>(resolvedSpotlightSrc);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (spotlightItems.length > 0 && spotlightIndex >= spotlightItems.length) {
      setSpotlightIndex(0);
    }
  }, [spotlightItems.length, spotlightIndex]);

  useEffect(() => {
    setHasError(false);
    setImgSrc(resolvedSpotlightSrc);
  }, [resolvedSpotlightSrc]);

  const handlePrevSpotlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spotlightItems.length <= 1) return;
    setSpotlightIndex(
      (prev) => (prev - 1 + spotlightItems.length) % spotlightItems.length
    );
  };

  const handleNextSpotlight = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spotlightItems.length <= 1) return;
    setSpotlightIndex((prev) => (prev + 1) % spotlightItems.length);
  };

  const blockMediaAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
  };

  const formatIndex = (num: number) => String(num).padStart(2, '0');
  const activeCategoryLabel = (activeSpotlight?.category || 'Selected Work').replace(
    /_/g,
    ' '
  );

  return (
    <section className="relative z-10 pt-10 sm:pt-14 lg:pt-16 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Split Architectural Monograph Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Column: Identity, Discipline & Core Toolset */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-8 py-1">
            <div className="space-y-5">
              <p className="text-xs font-mono text-zinc-400 tracking-wide">
                3D Design · Architectural Visualization · Industrial Design · More
              </p>

              <h1 className="font-display text-[clamp(2.5rem,4.4vw,4rem)] font-semibold tracking-tight text-zinc-100 leading-[1.05] [text-wrap:balance]">
                {title}
              </h1>

              <p className="text-base sm:text-lg text-zinc-200 font-normal leading-relaxed max-w-lg">
                {subtitle}
              </p>

              <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                I help brands, studios, and manufacturing firms across the GCC and
                globally transform complex engineering concepts and creative
                visions into photorealistic 3D assets, high-impact CGI marketing
                visuals, and precision production-ready models that accelerate
                time-to-market.
              </p>
            </div>

            <div className="space-y-6 pt-2">
              {/* Unboxed Core Toolset Line */}
              <div className="border-t border-white/[0.08] pt-5">
                <div className="text-xs font-mono text-zinc-500 mb-2">
                  Core Toolset
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {STUDIO_TOOLS.map((tool, idx) => (
                    <React.Fragment key={tool}>
                      <span className="whitespace-nowrap">{tool}</span>
                      {idx < STUDIO_TOOLS.length - 1 && (
                        <span aria-hidden="true" className="text-zinc-600">
                          ·
                        </span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Hero Actions */}
              <div className="flex flex-wrap items-center gap-5 pt-1">
                <button
                  type="button"
                  onClick={onExploreWorks}
                  className="px-5 py-2.5 bg-brass hover:bg-brassHover text-obsidian text-sm font-semibold rounded-sm transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
                >
                  Explore Selected Works
                </button>

                <button
                  type="button"
                  onClick={onOpenCV}
                  className="py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 border-b border-white/20 hover:border-brass transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Curriculum Vitae
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Protected Featured Render Spotlight */}
          <div className="lg:col-span-7 flex flex-col">
            <div
              role="button"
              tabIndex={activeSpotlight ? 0 : -1}
              aria-label="Open featured render in fullscreen viewer"
              onClick={() => activeSpotlight && onOpenSpotlight(safeIndex)}
              onKeyDown={(e) => {
                if (activeSpotlight && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onOpenSpotlight(safeIndex);
                }
              }}
              onContextMenu={blockMediaAction}
              onDragStart={blockMediaAction}
              className="relative flex-1 min-h-[290px] sm:min-h-[400px] lg:min-h-[450px] bg-charcoal overflow-hidden rounded-sm protected-media group cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
            >
              {activeSpotlight && imgSrc && !hasError ? (
                <img
                  src={imgSrc}
                  alt={`${activeCategoryLabel} featured render`}
                  draggable={false}
                  loading="eager"
                  fetchPriority="high"
                  referrerPolicy="no-referrer"
                  onContextMenu={blockMediaAction}
                  onDragStart={blockMediaAction}
                  onError={() => {
                    if (
                      activeSpotlight.thumbUrl &&
                      imgSrc !== activeSpotlight.thumbUrl
                    ) {
                      setImgSrc(activeSpotlight.thumbUrl);
                    } else {
                      setHasError(true);
                    }
                  }}
                  className="w-full h-full object-cover protected-img transform group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                />
              ) : (
                <div className="w-full h-full min-h-[290px] sm:min-h-[400px] bg-gradient-to-br from-charcoal via-panel to-obsidian flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <span className="font-display text-sm font-medium text-zinc-300">
                    Selected Studio Monograph
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    Architectural Visualization &amp; 3D Design
                  </span>
                </div>
              )}

              {/* Transparent protective shield above the spotlight image */}
              <div
                aria-hidden="true"
                onContextMenu={blockMediaAction}
                onDragStart={blockMediaAction}
                className="absolute inset-0 z-[1] bg-transparent protected-media"
              />

              {/* Measured bottom contrast scrim with quiet unboxed metadata & spotlight switcher */}
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 sm:px-6 pb-4 pt-14 flex items-end justify-between gap-4 pointer-events-none">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-zinc-300">
                    <span className="text-brass font-medium">Featured Spotlight</span>
                    <span aria-hidden="true" className="text-zinc-500">
                      ·
                    </span>
                    <span className="truncate text-zinc-200">
                      {activeCategoryLabel}
                    </span>
                  </div>
                  {activeSpotlight?.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1 max-w-md">
                      {activeSpotlight.description}
                    </p>
                  )}
                </div>

                {spotlightItems.length > 1 && (
                  <div
                    className="flex items-center gap-2 shrink-0 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="font-mono text-[11px] text-zinc-300 tabular-nums mr-1">
                      {formatIndex(safeIndex + 1)} / {formatIndex(spotlightItems.length)}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrevSpotlight}
                      aria-label="Previous featured render"
                      className="w-8 h-8 rounded-sm bg-obsidian/75 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
                    >
                      <i className="fa-solid fa-chevron-left text-[10px]"></i>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSpotlight}
                      aria-label="Next featured render"
                      className="w-8 h-8 rounded-sm bg-obsidian/75 hover:bg-brass hover:text-obsidian text-zinc-200 border border-white/15 flex items-center justify-center transition-colors duration-150 cursor-pointer"
                    >
                      <i className="fa-solid fa-chevron-right text-[10px]"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Architectural Index Strip Below Hero Split */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-b border-white/[0.08] mt-10 lg:mt-14">
          <div className="py-5 pr-4 border-r border-b lg:border-b-0 border-white/[0.08]">
            <div className="font-display text-2xl sm:text-3xl font-medium text-zinc-100 tabular-nums">
              10+ Years
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              3D Generalist Experience
            </div>
          </div>

          <div className="py-5 pl-4 lg:px-6 lg:border-r border-b lg:border-b-0 border-white/[0.08]">
            <div className="font-display text-2xl sm:text-3xl font-medium text-zinc-100 tabular-nums">
              {worksCount}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Selected Studio Works
            </div>
          </div>

          <div className="py-5 pr-4 lg:px-6 border-r border-white/[0.08]">
            <div className="font-display text-2xl sm:text-3xl font-medium text-zinc-100 tabular-nums">
              {categoriesCount}
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Visual Disciplines
            </div>
          </div>

          <div className="py-5 pl-4 lg:pl-6">
            <div className="font-display text-2xl sm:text-3xl font-medium text-brass">
              Open to Roles
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Studio &amp; Senior Opportunities
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React, { useEffect, useRef, useState } from 'react';

interface HeroProps {
  title: string;
  subtitle: string;
  projectsCount: number;
  visitorsCount: number | null;
  isLoading?: boolean;
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

const HERO_PORTRAIT_SRC =
  './assets/aistudio/Realistic_Portrait_Cutout_on_Transparency_14d78153.png';

export const Hero: React.FC<HeroProps> = React.memo(
  ({
    title,
    subtitle,
    projectsCount,
    visitorsCount,
    isLoading = false,
    onExploreWorks,
    onOpenCV,
  }) => {
    const portraitImgRef = useRef<HTMLImageElement | null>(null);
    const [imgLoaded, setImgLoaded] = useState<boolean>(false);
    const [hasError, setHasError] = useState<boolean>(false);

    useEffect(() => {
      const img = portraitImgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        setImgLoaded(true);
      }
    }, []);

    const blockMediaAction = (e: React.SyntheticEvent) => {
      e.preventDefault();
    };

    return (
      <section aria-label="Introduction" className="print-hidden relative z-10 pt-10 sm:pt-14 lg:pt-16 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between gap-8 py-1">
              <div className="space-y-5">
                <p className="text-xs font-mono text-zinc-400 tracking-wide">
                  3D Design · Architectural Visualization · Industrial Design · More
                </p>

                <h1 className="font-display text-[clamp(2.5rem,4.4vw,4.15rem)] font-semibold tracking-tight text-zinc-100 leading-[1.05] [text-wrap:balance]">
                  {title}
                </h1>

                <p className="text-base sm:text-lg text-zinc-200 font-normal leading-relaxed max-w-2xl">
                  {subtitle}
                </p>

                <p className="text-sm sm:text-[15px] text-zinc-400 leading-relaxed max-w-2xl text-justify">
                  I help brands, studios, and manufacturing firms across the GCC and
                  globally transform complex engineering concepts and creative
                  visions into photorealistic 3D assets, high-impact CGI marketing
                  visuals, and precision production-ready models that accelerate
                  time-to-market.
                </p>
              </div>

              <div className="space-y-6 pt-2">
                <div className="border-t border-white/[0.08] pt-5 max-w-2xl">
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

            <div className="lg:col-span-5 flex items-end justify-center">
              <div
                onContextMenu={blockMediaAction}
                onDragStart={blockMediaAction}
                className="relative aspect-[1086/1633] w-[260px] sm:w-[290px] lg:w-auto lg:h-[460px] overflow-hidden protected-media"
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_48%,rgba(82,209,255,0.12)_0%,rgba(255,255,255,0.035)_42%,transparent_72%)]"
                />

                {!hasError ? (
                  <>
                    {!imgLoaded && (
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-br from-charcoal/50 via-panel/40 to-transparent rounded-sm animate-pulse motion-reduce:animate-none"
                      />
                    )}
                    <img
                      ref={portraitImgRef}
                      src={HERO_PORTRAIT_SRC}
                      alt={`${title} — 3D Artist and Architectural Visualizer`}
                      width={1086}
                      height={1633}
                      draggable={false}
                      loading="eager"
                      decoding="async"
                      fetchPriority="high"
                      onContextMenu={blockMediaAction}
                      onDragStart={blockMediaAction}
                      onLoad={() => setImgLoaded(true)}
                      onError={() => {
                        setHasError(true);
                        setImgLoaded(true);
                      }}
                      className={`relative z-[1] w-full h-full object-contain object-bottom protected-img transition-opacity duration-500 ease-out ${
                        imgLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-charcoal via-panel/80 to-obsidian border border-white/[0.08] rounded-sm flex flex-col items-center justify-center gap-2.5 p-6 text-center">
                    <div className="w-12 h-12 rounded-sm border border-white/[0.1] bg-obsidian/70 flex items-center justify-center text-zinc-500">
                      <i aria-hidden="true" className="fa-regular fa-user text-lg"></i>
                    </div>
                    <span className="font-display text-sm font-medium text-zinc-200">
                      {title}
                    </span>
                  </div>
                )}

                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent pointer-events-none"
                />

                <div
                  aria-hidden="true"
                  onContextMenu={blockMediaAction}
                  onDragStart={blockMediaAction}
                  className="absolute inset-0 z-[3] bg-transparent protected-media"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-b border-white/[0.08] mt-10 lg:mt-14">
            <div className="py-5 pr-4 sm:pr-6 border-r border-white/[0.08]">
              <div className="font-display text-2xl sm:text-3xl font-medium text-zinc-100 tabular-nums">
                {isLoading && projectsCount === 0 ? '—' : projectsCount.toLocaleString()}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Survived Projects
              </div>
            </div>

            <div className="py-5 pl-4 sm:pl-6">
              <div className="font-display text-2xl sm:text-3xl font-medium text-zinc-100 tabular-nums">
                {typeof visitorsCount === 'number'
                  ? visitorsCount.toLocaleString()
                  : '—'}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Site Visitors
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
);

Hero.displayName = 'Hero';

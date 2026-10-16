import React from 'react';

interface HeroProps {
  title: string;
  subtitle: string;
  categoriesCount: number;
  worksCount: number;
  isLive: boolean;
}

export const Hero: React.FC<HeroProps> = ({
  title,
  subtitle,
  categoriesCount,
  worksCount,
  isLive,
}) => {
  return (
    <section className="relative z-10 pt-10 pb-8 sm:pt-14 sm:pb-12 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          
          {/* Left Hero Intro */}
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-cyan-400">
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              <span>ARCHITECTURAL VISUALIZATION • 3D DESIGN • TECHNICAL ART</span>
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-none">
              {title}
            </h1>
            
            <p className="text-base sm:text-lg text-gray-300 font-normal leading-relaxed max-w-2xl">
              {subtitle}
            </p>

            {/* Studio Software Badges */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-charcoal border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> 3ds Max
              </span>
              <span className="px-3 py-1 rounded-lg bg-charcoal border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Corona Renderer
              </span>
              <span className="px-3 py-1 rounded-lg bg-charcoal border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span> V-Ray
              </span>
              <span className="px-3 py-1 rounded-lg bg-charcoal border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span> Blender
              </span>
              <span className="px-3 py-1 rounded-lg bg-charcoal border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Autodesk Inventor
              </span>
              <span className="px-3 py-1 rounded-lg bg-charcoal border border-white/10 text-xs font-mono text-gray-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Python / MaxScript
              </span>
            </div>
          </div>

          {/* Right Studio Quick Stats Bar */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 bg-charcoal/90 border border-white/10 p-4 rounded-2xl backdrop-blur-md self-start lg:self-end w-full lg:w-auto">
            <div className="px-3 py-1 border-r border-white/10">
              <div className="text-xs font-mono text-gray-400 uppercase">Categories</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
                {categoriesCount}
              </div>
            </div>
            <div className="px-3 py-1 border-r border-white/10">
              <div className="text-xs font-mono text-gray-400 uppercase">Studio Works</div>
              <div className="font-display text-2xl sm:text-3xl font-bold text-amber-400 mt-0.5">
                {worksCount}
              </div>
            </div>
            <div className="px-3 py-1">
              <div className="text-xs font-mono text-gray-400 uppercase">CMS Source</div>
              <div className="font-mono text-xs sm:text-sm font-semibold mt-2 flex items-center gap-1.5">
                {isLive ? (
                  <>
                    <i className="fa-brands fa-google-drive text-emerald-400"></i>
                    <span className="text-emerald-400">Live Sync</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-sparkles text-amber-400"></i>
                    <span className="text-amber-300">Demo Mode</span>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

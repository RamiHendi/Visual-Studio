import React, { useState, useMemo } from 'react';
import { PortfolioCategory, PortfolioItem, GalleryLayout } from '../types';

interface StudioShowcaseProps {
  categories: PortfolioCategory[];
  isLoading: boolean;
  onOpenLightbox: (itemIndex: number, filteredItems: PortfolioItem[]) => void;
}

export const StudioShowcase: React.FC<StudioShowcaseProps> = ({
  categories,
  isLoading,
  onOpenLightbox,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [layout, setLayout] = useState<GalleryLayout>('masonry');

  const totalWorks = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (cat.items ? cat.items.length : 0), 0);
  }, [categories]);

  // Flatten and filter items
  const filteredItems: PortfolioItem[] = useMemo(() => {
    const items: PortfolioItem[] = [];
    const query = searchQuery.trim().toLowerCase();

    categories.forEach((cat) => {
      if (activeCategory !== 'ALL' && cat.category !== activeCategory) return;
      (cat.items || []).forEach((item) => {
        const matchesSearch =
          !query ||
          item.title.toLowerCase().includes(query) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          cat.category.toLowerCase().includes(query);

        if (matchesSearch) {
          items.push({
            ...item,
            category: cat.category,
          });
        }
      });
    });

    return items;
  }, [categories, activeCategory, searchQuery]);

  const handleResetFilters = () => {
    setActiveCategory('ALL');
    setSearchQuery('');
  };

  if (isLoading) {
    return (
      <div className="space-y-8 py-8 animate-pulse">
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-28 bg-charcoal rounded-xl"></div>
          <div className="h-10 w-48 bg-charcoal rounded-xl"></div>
          <div className="h-10 w-44 bg-charcoal rounded-xl"></div>
          <div className="h-10 w-40 bg-charcoal rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-charcoal rounded-2xl border border-white/5"></div>
          <div className="h-72 bg-charcoal rounded-2xl border border-white/5"></div>
          <div className="h-72 bg-charcoal rounded-2xl border border-white/5"></div>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      {/* Filter Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-charcoal/80 p-3 sm:p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        
        {/* Dynamic Category Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeCategory === 'ALL'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                : 'bg-obsidian/70 text-gray-300 hover:text-white border border-white/10'
            }`}
          >
            <span>All Works</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                activeCategory === 'ALL' ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
              }`}
            >
              {totalWorks}
            </span>
          </button>

          {categories.map((cat) => {
            const count = cat.items ? cat.items.length : 0;
            const isActive = activeCategory === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                    : 'bg-obsidian/70 text-gray-300 hover:text-white border border-white/10'
                }`}
              >
                <i className={`fa-regular fa-folder text-xs ${isActive ? 'text-black' : 'text-amber-400'}`}></i>
                <span>{cat.category}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                    isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Grid/Masonry Toggle */}
        <div className="flex items-center gap-3 self-end lg:self-auto w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search renders, rooms, tools..."
              className="w-full pl-9 pr-8 py-2 bg-obsidian/90 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Layout Switcher (Masonry vs Uniform Grid) */}
          <div className="flex items-center bg-obsidian/90 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              onClick={() => setLayout('masonry')}
              title="Masonry Studio Layout"
              className={`p-2 rounded-lg text-xs transition-all ${
                layout === 'masonry'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-table-columns"></i>
            </button>
            <button
              onClick={() => setLayout('grid')}
              title="Uniform Grid Layout"
              className={`p-2 rounded-lg text-xs transition-all ${
                layout === 'grid'
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-border-all"></i>
            </button>
          </div>
        </div>

      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-charcoal/40 rounded-2xl border border-dashed border-white/10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 mb-4">
            <i className="fa-solid fa-folder-open text-2xl"></i>
          </div>
          <h3 className="font-display text-lg font-semibold text-white">No Matching Studio Works Found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mt-1">
            Try clearing your search filter or selecting another Google Drive folder category above.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-black font-semibold text-xs hover:bg-amber-400 transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Gallery Container */
        <div className={layout === 'masonry' ? 'masonry-grid' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'}>
          {filteredItems.map((item, idx) => {
            const isVideo = item.type === 'video';
            const itemWrapperClass = layout === 'masonry' ? 'masonry-item' : '';
            const imageAspectClass = layout === 'grid' ? 'aspect-[16/10] object-cover' : 'w-full h-auto object-cover';

            return (
              <article
                key={item.id || idx}
                onClick={() => onOpenLightbox(idx, filteredItems)}
                className={`${itemWrapperClass} group relative rounded-2xl overflow-hidden bg-charcoal border border-white/10 hover:border-amber-500/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-amber-500/10`}
              >
                {/* Media Thumbnail */}
                <div className="relative overflow-hidden bg-obsidian">
                  <img
                    src={item.thumbUrl}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://placehold.co/800x600/12151E/F59E0B?text=3D+Studio+Render';
                    }}
                    className={`w-full ${imageAspectClass} transform group-hover:scale-105 transition-transform duration-500 ease-out`}
                  />

                  {/* Top Badge (Category + Video Play) */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-obsidian/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-gray-200">
                      {item.category}
                    </span>
                    {isVideo ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-mono font-bold text-[11px] flex items-center gap-1 shadow-lg">
                        <i className="fa-solid fa-play text-[10px]"></i> VIDEO
                      </span>
                    ) : (
                      <span className="w-8 h-8 rounded-lg bg-obsidian/75 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <i className="fa-solid fa-expand text-xs"></i>
                      </span>
                    )}
                  </div>

                  {/* Center Play Button Overlay for Videos */}
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/15 transition-all">
                      <div className="w-14 h-14 rounded-full bg-amber-500/95 text-black flex items-center justify-center shadow-xl shadow-amber-500/30 transform group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-play text-lg ml-0.5"></i>
                      </div>
                    </div>
                  )}

                  {/* Hover Gradient & Details Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian via-obsidian/90 to-transparent p-4 sm:p-5 pt-12">
                    <h3 className="font-display font-bold text-base sm:text-lg text-white group-hover:text-amber-400 transition-colors leading-snug">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-gray-300 mt-1.5 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

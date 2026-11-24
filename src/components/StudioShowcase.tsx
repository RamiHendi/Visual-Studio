import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  PortfolioCategory,
  PortfolioItem,
  PortfolioProject,
  GalleryLayout,
} from '../types';
import { getCategoryProjects } from '../utils/portfolioProjects';
import { LazyThumbnail } from './LazyThumbnail';

interface StudioShowcaseProps {
  categories: PortfolioCategory[];
  isLoading: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  onOpenLightbox: (
    itemIndex: number,
    items: PortfolioItem[],
    projectTitle?: string,
    projectList?: PortfolioProject[],
    projectIndex?: number
  ) => void;
  onShowToast: (message: string, isWarning?: boolean) => void;
}

function formatMediaCountLabel(items: PortfolioItem[]): string {
  const imageCount = items.filter((i) => i.type !== 'video').length;
  const videoCount = items.filter((i) => i.type === 'video').length;

  if (imageCount > 0 && videoCount > 0) {
    return `${imageCount} ${imageCount === 1 ? 'Image' : 'Images'} · ${videoCount} ${
      videoCount === 1 ? 'Video' : 'Videos'
    }`;
  }
  if (videoCount > 0) {
    return `${videoCount} ${videoCount === 1 ? 'Video' : 'Videos'}`;
  }
  return `${imageCount} ${imageCount === 1 ? 'View' : 'Views'}`;
}

export const StudioShowcase: React.FC<StudioShowcaseProps> = ({
  categories,
  isLoading,
  loadError = false,
  onRetry,
  onOpenLightbox,
  onShowToast,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyFeatured, setOnlyFeatured] = useState<boolean>(false);
  const [layout, setLayout] = useState<GalleryLayout>('masonry');
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const getProjectDirectLink = (project: PortfolioProject): string => {
    const url = new URL(window.location.href);
    url.hash = '';
    if (project.isProjectGroup && project.id) {
      url.searchParams.delete('work');
      url.searchParams.set('project', project.id);
      return url.toString();
    }
    const firstItem = project.items[0];
    if (firstItem?.id) {
      url.searchParams.delete('project');
      url.searchParams.set('work', firstItem.id);
      return url.toString();
    }
    return window.location.href;
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to execCommand fallback
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textArea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShareProject = async (
    e: React.MouseEvent,
    project: PortfolioProject
  ) => {
    e.stopPropagation();
    const directLink = getProjectDirectLink(project);
    const copied = await copyTextToClipboard(directLink);

    if (copied) {
      setCopiedProjectId(project.id);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedProjectId(null);
        copiedTimerRef.current = null;
      }, 2000);
      onShowToast('Direct link copied to clipboard!');
    } else {
      onShowToast('Could not copy link to clipboard.', true);
    }
  };

  // Precompute normalized projects per category
  const categoryEntries = useMemo(() => {
    return categories.map((cat) => ({
      category: cat.category,
      projects: getCategoryProjects(cat),
    }));
  }, [categories]);

  const totalEntries = useMemo(() => {
    return categoryEntries.reduce((acc, entry) => acc + entry.projects.length, 0);
  }, [categoryEntries]);

  const hasExplicitProjectGroups = useMemo(() => {
    return categoryEntries.some((entry) =>
      entry.projects.some((proj) => proj.isProjectGroup)
    );
  }, [categoryEntries]);

  const totalFeaturedCount = useMemo(() => {
    let count = 0;
    categoryEntries.forEach((entry) => {
      entry.projects.forEach((proj) => {
        if (proj.featured) count++;
      });
    });
    return count;
  }, [categoryEntries]);

  // Filter projects by active category, Featured checkbox, and search query
  const filteredProjects: PortfolioProject[] = useMemo(() => {
    const results: PortfolioProject[] = [];
    const query = searchQuery.trim().toLowerCase();

    categoryEntries.forEach((entry) => {
      if (activeCategory !== 'ALL' && entry.category !== activeCategory) return;

      entry.projects.forEach((project) => {
        if (onlyFeatured && !project.featured) return;

        const matchesSearch =
          !query ||
          project.name.toLowerCase().includes(query) ||
          project.category.toLowerCase().includes(query) ||
          (project.description && project.description.toLowerCase().includes(query)) ||
          project.items.some(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              (item.description && item.description.toLowerCase().includes(query))
          );

        if (matchesSearch) {
          results.push(project);
        }
      });
    });

    return results;
  }, [categoryEntries, activeCategory, searchQuery, onlyFeatured]);

  // Standalone loose items in current filter (for smooth cycling when clicking a non-grouped item)
  const standaloneFilteredItems = useMemo(() => {
    const items: PortfolioItem[] = [];
    filteredProjects.forEach((proj) => {
      if (!proj.isProjectGroup && proj.items[0]) {
        items.push(proj.items[0]);
      }
    });
    return items;
  }, [filteredProjects]);

  const handleOpenProjectCard = (project: PortfolioProject, projIdx: number) => {
    if (project.isProjectGroup || project.items.length > 1) {
      onOpenLightbox(
        0,
        project.items,
        project.name || undefined,
        filteredProjects,
        projIdx
      );
      return;
    }
    const singleItem = project.items[0];
    if (!singleItem) return;
    const standaloneIdx = standaloneFilteredItems.findIndex(
      (i) => i.id === singleItem.id
    );
    if (standaloneIdx !== -1 && standaloneFilteredItems.length > 0) {
      onOpenLightbox(
        standaloneIdx,
        standaloneFilteredItems,
        undefined,
        filteredProjects,
        projIdx
      );
    } else {
      onOpenLightbox(0, [singleItem], undefined, filteredProjects, projIdx);
    }
  };

  const handleResetFilters = () => {
    setActiveCategory('ALL');
    setSearchQuery('');
    setOnlyFeatured(false);
  };

  if (isLoading) {
    return (
      <section id="studio-showcase" className="space-y-8 py-6 animate-pulse">
        <div className="flex flex-wrap gap-3">
          <div className="h-9 w-28 bg-charcoal rounded-sm"></div>
          <div className="h-9 w-40 bg-charcoal rounded-sm"></div>
          <div className="h-9 w-36 bg-charcoal rounded-sm"></div>
          <div className="h-9 w-36 bg-charcoal rounded-sm"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="h-72 bg-charcoal rounded-sm"></div>
          <div className="h-72 bg-charcoal rounded-sm"></div>
          <div className="h-72 bg-charcoal rounded-sm"></div>
        </div>
      </section>
    );
  }

  if (loadError && categories.length === 0) {
    return (
      <section id="studio-showcase" className="py-12 scroll-mt-20">
        <div className="text-center py-20 border border-white/[0.08] bg-charcoal/50 rounded-sm px-6">
          <h3 className="font-display text-lg font-medium text-zinc-100">
            Unable to Load Studio Works
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2">
            The live portfolio gallery took too long to respond. Please try loading again.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-5 px-5 py-2.5 rounded-sm bg-brass hover:bg-brassHover text-obsidian font-semibold text-xs transition-colors duration-150 cursor-pointer"
            >
              Retry Loading
            </button>
          )}
        </div>
      </section>
    );
  }

  const unitLabel = hasExplicitProjectGroups ? 'projects' : 'works';

  return (
    <section id="studio-showcase" className="space-y-8 scroll-mt-20">
      {/* Editorial Section Heading */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-medium tracking-tight text-zinc-100">
            {hasExplicitProjectGroups ? 'Selected Projects' : 'Selected Works'}
          </h2>
        </div>
        <p className="font-mono text-xs text-zinc-400 tabular-nums">
          Showing {filteredProjects.length} of {totalEntries} {unitLabel}
        </p>
      </div>

      {/* Hairline Adaptive Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        {/* Mobile View: Dedicated Category Dropdown Menu */}
        <div className="block sm:hidden w-full">
          <div className="relative">
            <select
              aria-label="Filter projects by category"
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full h-11 pl-3.5 pr-12 bg-charcoal border border-white/15 focus:border-brass rounded-sm text-sm font-medium text-zinc-100 appearance-none cursor-pointer focus:outline-none transition-colors"
            >
              <option value="ALL" className="bg-[#111114] text-zinc-100">
                All {hasExplicitProjectGroups ? 'Projects' : 'Works'} ({totalEntries})
              </option>
              {categoryEntries.map((entry) => {
                const count = entry.projects.length;
                const displayName = entry.category.replace(/_/g, ' ');
                return (
                  <option
                    key={entry.category}
                    value={entry.category}
                    className="bg-[#111114] text-zinc-100"
                  >
                    {displayName} ({count})
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 text-xs flex items-center gap-2">
              <span className="font-mono text-[11px] text-brass tabular-nums">
                {activeCategory === 'ALL'
                  ? totalEntries
                  : categoryEntries.find((c) => c.category === activeCategory)
                      ?.projects.length || 0}
              </span>
              <i className="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
          </div>
        </div>

        {/* Tablet & PC View: Clean Wrap-Enabled Architectural Filter Tabs */}
        <div className="hidden sm:flex sm:flex-wrap items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setActiveCategory('ALL')}
            className={`h-9 px-3.5 rounded-sm text-xs font-medium transition-colors duration-150 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
              activeCategory === 'ALL'
                ? 'bg-brass text-obsidian font-semibold'
                : 'bg-transparent text-zinc-400 hover:text-zinc-100 border border-white/[0.08] hover:border-white/25'
            }`}
          >
            <span>All {hasExplicitProjectGroups ? 'Projects' : 'Works'}</span>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                activeCategory === 'ALL' ? 'text-obsidian/80' : 'text-zinc-500'
              }`}
            >
              {totalEntries}
            </span>
          </button>

          {categoryEntries.map((entry) => {
            const count = entry.projects.length;
            const isActive = activeCategory === entry.category;
            const displayName = entry.category.replace(/_/g, ' ');
            return (
              <button
                type="button"
                key={entry.category}
                onClick={() => setActiveCategory(entry.category)}
                className={`h-9 px-3.5 rounded-sm text-xs font-medium transition-colors duration-150 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-brass text-obsidian font-semibold'
                    : 'bg-transparent text-zinc-400 hover:text-zinc-100 border border-white/[0.08] hover:border-white/25'
                }`}
              >
                <span>{displayName}</span>
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive ? 'text-obsidian/80' : 'text-zinc-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Controls: Featured Checkbox, Search & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto">
          {/* Featured Checkbox Filter */}
          <label
            title="Show only featured projects"
            className={`flex items-center gap-2 px-3 h-9 rounded-sm border text-xs font-medium cursor-pointer select-none transition-colors duration-150 whitespace-nowrap shrink-0 ${
              onlyFeatured
                ? 'bg-brass/15 border-brass text-brass'
                : 'bg-charcoal border-white/[0.09] text-zinc-300 hover:text-zinc-100 hover:border-white/25'
            }`}
          >
            <input
              type="checkbox"
              checked={onlyFeatured}
              onChange={(e) => setOnlyFeatured(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#52D1FF] rounded-sm cursor-pointer"
            />
            <span>Featured</span>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                onlyFeatured ? 'text-brass' : 'text-zinc-500'
              }`}
            >
              {totalFeaturedCount}
            </span>
          </label>

          {/* Search Field */}
          <div className="relative flex-1 sm:flex-none sm:w-44 lg:w-48">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[11px]"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                hasExplicitProjectGroups ? 'Search projects...' : 'Search works...'
              }
              aria-label="Search projects"
              className="w-full h-9 pl-8 pr-7 bg-charcoal border border-white/[0.09] rounded-sm text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-brass transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 text-xs cursor-pointer p-0.5"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Layout Switcher (Masonry vs Uniform Grid) */}
          <div className="flex items-center bg-charcoal p-0.5 h-9 rounded-sm border border-white/[0.09] shrink-0">
            <button
              type="button"
              onClick={() => setLayout('masonry')}
              title="Masonry Layout"
              aria-label="Masonry Layout"
              className={`h-8 w-8 flex items-center justify-center rounded-[1px] text-xs transition-colors duration-150 cursor-pointer ${
                layout === 'masonry'
                  ? 'bg-brass text-obsidian font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <i className="fa-solid fa-table-columns text-[11px]"></i>
            </button>
            <button
              type="button"
              onClick={() => setLayout('grid')}
              title="Grid Layout"
              aria-label="Grid Layout"
              className={`h-8 w-8 flex items-center justify-center rounded-[1px] text-xs transition-colors duration-150 cursor-pointer ${
                layout === 'grid'
                  ? 'bg-brass text-obsidian font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <i className="fa-solid fa-border-all text-[11px]"></i>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 ? (
        <div
          key={`empty::${activeCategory}::${onlyFeatured}::${layout}`}
          className="studio-card-enter text-center py-20 border border-white/[0.08] bg-charcoal/50 rounded-sm px-6"
        >
          <h3 className="font-display text-lg font-medium text-zinc-100">
            {onlyFeatured
              ? 'No Matching Featured Projects'
              : 'No Matching Projects Found'}
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2">
            {onlyFeatured
              ? 'Uncheck the Featured filter, clear your search query, or choose another discipline above.'
              : 'Try clearing your search query or selecting another discipline above.'}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="mt-5 px-5 py-2.5 rounded-sm bg-brass hover:bg-brassHover text-obsidian font-semibold text-xs transition-colors duration-150 cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Edge-to-Edge Frameless Project Gallery */
        <div
          key={`${activeCategory}::${onlyFeatured}::${layout}`}
          className={
            layout === 'masonry'
              ? 'masonry-grid'
              : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'
          }
        >
          {filteredProjects.map((project, idx) => {
            const itemWrapperClass = layout === 'masonry' ? 'masonry-item' : '';
            const categoryLabel = (project.category || 'Portfolio').replace(/_/g, ' ');
            const isVideoOnly =
              project.items.length > 0 &&
              project.items.every((item) => item.type === 'video');
            const isMultiItem = project.items.length > 1;
            const mediaCountText = formatMediaCountLabel(project.items);
            const showProjectTitle = Boolean(project.isProjectGroup && project.name);

            return (
              <article
                key={project.id || idx}
                onClick={() => handleOpenProjectCard(project, idx)}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                className={`${itemWrapperClass} studio-card-enter protected-media group relative rounded-sm overflow-hidden bg-charcoal cursor-pointer`}
              >
                {/* Edge-to-Edge Protected Project Cover Media */}
                <div className="relative overflow-hidden bg-charcoal">
                  <LazyThumbnail
                    src={project.coverUrl}
                    alt={
                      showProjectTitle
                        ? `${project.name} — ${categoryLabel}`
                        : `${categoryLabel} showcase`
                    }
                    layout={layout}
                    eager={idx < 3}
                  />

                  {/* Subtle Center Play Emblem for Video-Only Projects */}
                  {isVideoOnly && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 group-hover:bg-black/15 transition-colors duration-200 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-obsidian/80 backdrop-blur-sm border border-white/25 text-zinc-100 group-hover:bg-brass group-hover:text-obsidian group-hover:border-brass flex items-center justify-center transition-all duration-200 transform group-hover:scale-105">
                        <i className="fa-solid fa-play text-sm ml-0.5"></i>
                      </div>
                    </div>
                  )}

                  {/* Measured Contrast Scrim (Always shows clean Project Name for folder projects; hover reveal for loose items & actions) */}
                  <div
                    className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3.5 pt-16 flex items-end justify-between gap-3 transition-opacity duration-200 pointer-events-none ${
                      showProjectTitle
                        ? 'opacity-100'
                        : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      {/* Project Subfolder Name (Never individual image filenames) */}
                      {showProjectTitle && (
                        <h3 className="font-display text-sm sm:text-base font-medium text-zinc-100 tracking-tight leading-snug truncate">
                          {project.name}
                        </h3>
                      )}

                      {/* Clean Unboxed Metadata */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-300">
                        <span className="truncate">{categoryLabel}</span>
                        {(showProjectTitle || isMultiItem) && (
                          <>
                            <span aria-hidden="true" className="text-zinc-500">
                              ·
                            </span>
                            <span className="font-mono text-[11px] text-zinc-300 tabular-nums">
                              {mediaCountText}
                            </span>
                          </>
                        )}
                        {project.featured && (
                          <>
                            <span aria-hidden="true" className="text-zinc-500">
                              ·
                            </span>
                            <span className="text-brass font-medium">Featured</span>
                          </>
                        )}
                        {isVideoOnly && !showProjectTitle && (
                          <>
                            <span aria-hidden="true" className="text-zinc-500">
                              ·
                            </span>
                            <span className="font-mono text-[11px] text-zinc-300">
                              Video
                            </span>
                          </>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed hidden sm:group-hover:block">
                          {project.description}
                        </p>
                      )}
                    </div>

                    {/* Minimal Functional Share Button */}
                    <div
                      className={`flex items-center gap-1.5 shrink-0 pointer-events-auto transition-opacity duration-150 ${
                        showProjectTitle
                          ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'
                          : 'opacity-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => handleShareProject(e, project)}
                        title="Copy direct link"
                        aria-label="Copy direct link"
                        className={`w-8 h-8 rounded-sm backdrop-blur-sm border flex items-center justify-center transition-colors duration-150 cursor-pointer ${
                          copiedProjectId === project.id
                            ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
                            : 'bg-obsidian/75 border-white/20 text-zinc-200 hover:text-obsidian hover:bg-brass hover:border-brass'
                        }`}
                      >
                        <i
                          className={`fa-solid ${
                            copiedProjectId === project.id ? 'fa-check' : 'fa-share-nodes'
                          } text-xs`}
                        ></i>
                      </button>
                    </div>
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

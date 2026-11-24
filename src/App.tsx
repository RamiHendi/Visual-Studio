import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StudioData, MainTab, PortfolioItem, PortfolioProject, ToastState } from './types';
import {
  DEFAULT_APPS_SCRIPT_URL,
  CACHE_KEY,
  SAVED_URL_KEY,
  DEMO_STUDIO_DATA,
} from './data/demoData';
import { getAllPortfolioProjects } from './utils/portfolioProjects';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StudioShowcase } from './components/StudioShowcase';
import { InteractiveCV } from './components/InteractiveCV';
import { LightboxModal } from './components/LightboxModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { AmbientGeometry } from './components/AmbientGeometry';

const LIVE_PERSISTENT_CACHE_KEY = 'rami_hendi_visual_studio_live_cache_v3';

const isValidLiveStudioData = (data: unknown): data is StudioData => {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as StudioData;
  if (!Array.isArray(candidate.portfolio)) return false;
  const hasDemoItems = candidate.portfolio.some((cat) =>
    (cat.items || []).some(
      (item) => typeof item.id === 'string' && item.id.startsWith('demo-')
    )
  );
  return !hasDemoItems;
};

const readCachedLiveData = (): { data: StudioData | null; isSessionFresh: boolean } => {
  try {
    const sessionRaw = sessionStorage.getItem(CACHE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (isValidLiveStudioData(parsed) && parsed.portfolio.length > 0) {
        return { data: parsed, isSessionFresh: true };
      }
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
  }

  try {
    const localRaw = localStorage.getItem(LIVE_PERSISTENT_CACHE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (isValidLiveStudioData(parsed) && parsed.portfolio.length > 0) {
        return { data: parsed, isSessionFresh: false };
      }
      localStorage.removeItem(LIVE_PERSISTENT_CACHE_KEY);
    }
  } catch {
    localStorage.removeItem(LIVE_PERSISTENT_CACHE_KEY);
  }

  return { data: null, isSessionFresh: false };
};

export const App: React.FC = () => {
  const initialCacheRef = useRef<{ data: StudioData | null; isSessionFresh: boolean } | null>(null);
  if (initialCacheRef.current === null) {
    initialCacheRef.current = readCachedLiveData();
  }

  const [currentTab, setCurrentTab] = useState<MainTab>('portfolio');
  const [studioData, setStudioData] = useState<StudioData>(
    () => initialCacheRef.current?.data ?? DEMO_STUDIO_DATA
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !initialCacheRef.current?.data
  );
  const [loadError, setLoadError] = useState<boolean>(false);

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    isWarning: false,
  });
  const toastTimerRef = useRef<number | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);
  const hasLiveDataRef = useRef<boolean>(Boolean(initialCacheRef.current?.data));

  // Lightbox state
  const [lightbox, setLightbox] = useState<{
    isOpen: boolean;
    itemIndex: number;
    items: PortfolioItem[];
    projectTitle?: string;
    projectList: PortfolioProject[];
    projectIndex: number;
  }>({
    isOpen: false,
    itemIndex: 0,
    items: [],
    projectTitle: undefined,
    projectList: [],
    projectIndex: -1,
  });

  const showToast = useCallback((message: string, isWarning = false) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ show: true, message, isWarning });
    toastTimerRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
      toastTimerRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const getActiveAppsScriptUrl = useCallback((): string => {
    const saved = localStorage.getItem(SAVED_URL_KEY);
    return saved && saved.trim() !== '' ? saved.trim() : DEFAULT_APPS_SCRIPT_URL.trim();
  }, []);

  const loadData = useCallback(async (_forceRefresh = false) => {
    const targetUrl = getActiveAppsScriptUrl();
    if (!targetUrl) {
      setIsLoading(false);
      return;
    }

    if (!hasLiveDataRef.current) {
      setIsLoading(true);
    }
    setLoadError(false);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        cache: 'no-store',
      });
      window.clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const liveData = (await response.json()) as StudioData;

      if (isValidLiveStudioData(liveData)) {
        const hasNewPortfolioItems = liveData.portfolio.length > 0;
        if (hasNewPortfolioItems || !hasLiveDataRef.current) {
          if (hasNewPortfolioItems) {
            hasLiveDataRef.current = true;
          }
          setStudioData(liveData);
          setLoadError(false);
          if (hasNewPortfolioItems) {
            try {
              const serialized = JSON.stringify(liveData);
              sessionStorage.setItem(CACHE_KEY, serialized);
              localStorage.setItem(LIVE_PERSISTENT_CACHE_KEY, serialized);
            } catch {
              // Ignore storage quota errors
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch live Google Drive studio data:', err);
      if (!hasLiveDataRef.current) {
        setLoadError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getActiveAppsScriptUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Normalized projects list across all categories
  const allProjects: PortfolioProject[] = useMemo(
    () => getAllPortfolioProjects(studioData.portfolio || []),
    [studioData.portfolio]
  );

  // Open shared project (`?project=<id>`) or individual item (`?work=<id>`) directly
  useEffect(() => {
    if (isLoading || allProjects.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const sharedProjectId = params.get('project');
    const sharedWorkId = params.get('work');
    const deepLinkKey = sharedProjectId
      ? `project:${sharedProjectId}`
      : sharedWorkId
        ? `work:${sharedWorkId}`
        : null;

    if (!deepLinkKey || handledDeepLinkRef.current === deepLinkKey) return;

    if (sharedProjectId) {
      const matchProjectIdx = allProjects.findIndex((p) => p.id === sharedProjectId);
      const matchProject = matchProjectIdx !== -1 ? allProjects[matchProjectIdx] : null;
      if (matchProject && matchProject.items.length > 0) {
        handledDeepLinkRef.current = deepLinkKey;
        setCurrentTab('portfolio');
        setLightbox({
          isOpen: true,
          itemIndex: 0,
          items: matchProject.items,
          projectTitle: matchProject.isProjectGroup ? matchProject.name : undefined,
          projectList: allProjects,
          projectIndex: matchProjectIdx,
        });
        return;
      }
    }

    if (sharedWorkId) {
      for (let projIdx = 0; projIdx < allProjects.length; projIdx++) {
        const proj = allProjects[projIdx];
        const idx = proj.items.findIndex((item) => item.id === sharedWorkId);
        if (idx !== -1) {
          handledDeepLinkRef.current = deepLinkKey;
          setCurrentTab('portfolio');
          setLightbox({
            isOpen: true,
            itemIndex: idx,
            items: proj.items,
            projectTitle: proj.isProjectGroup ? proj.name : undefined,
            projectList: allProjects,
            projectIndex: projIdx,
          });
          return;
        }
      }
    }
  }, [allProjects, isLoading]);

  const handleSelectTab = (tab: MainTab) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExploreWorks = () => {
    setCurrentTab('portfolio');
    const showcase = document.getElementById('studio-showcase');
    if (showcase) {
      showcase.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOpenLightbox = (
    itemIndex: number,
    items: PortfolioItem[],
    projectTitle?: string,
    projectList?: PortfolioProject[],
    projectIndex?: number
  ) => {
    const resolvedList = projectList ?? allProjects;
    const resolvedIndex = typeof projectIndex === 'number' ? projectIndex : -1;
    setLightbox({
      isOpen: true,
      itemIndex,
      items,
      projectTitle,
      projectList: resolvedList,
      projectIndex: resolvedIndex,
    });
  };

  const handleCloseLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
    const url = new URL(window.location.href);
    let changed = false;
    if (url.searchParams.has('work')) {
      url.searchParams.delete('work');
      changed = true;
    }
    if (url.searchParams.has('project')) {
      url.searchParams.delete('project');
      changed = true;
    }
    if (changed) {
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleNavigateLightbox = (newIndex: number) => {
    setLightbox((prev) => ({ ...prev, itemIndex: newIndex }));
  };

  const handleJumpProject = (delta: -1 | 1) => {
    setLightbox((prev) => {
      const list = prev.projectList;
      if (!list || list.length <= 1 || prev.projectIndex < 0) return prev;
      const nextIdx = (prev.projectIndex + delta + list.length) % list.length;
      const targetProject = list[nextIdx];
      if (!targetProject || targetProject.items.length === 0) return prev;
      return {
        ...prev,
        projectIndex: nextIdx,
        itemIndex: 0,
        items: targetProject.items,
        projectTitle: targetProject.isProjectGroup ? targetProject.name : undefined,
      };
    });
  };

  // Derive Hero information and curated Featured Spotlight entries
  const {
    heroTitle,
    heroSubtitle,
    totalCategories,
    totalWorks,
    spotlightEntries,
  } = useMemo(() => {
    const cvElements = studioData.cv || [];
    const titleEl = cvElements.find((e) => e.heading === 'TITLE');
    const subtitleEl = cvElements.find((e) => e.heading === 'SUBTITLE');

    const title = titleEl?.text || 'Rami Hendi';
    const rawSubtitle = subtitleEl?.text?.trim();
    const subtitle =
      !rawSubtitle ||
      rawSubtitle ===
        'Senior 3D Visualizer, Architectural Renderer & Technical Artist | 6+ Years Experience'
        ? '3D Artist (Generalist) | 10+ Years of Experience'
        : rawSubtitle;

    const categories = studioData.portfolio || [];
    const worksCount = allProjects.reduce((sum, proj) => sum + proj.items.length, 0);

    type SpotlightEntry = {
      item: PortfolioItem;
      project: PortfolioProject;
      itemIndex: number;
    };

    const featuredEntries: SpotlightEntry[] = [];
    const fallbackEntries: SpotlightEntry[] = [];

    allProjects.forEach((project) => {
      const firstImageIdx = project.items.findIndex((i) => i.type !== 'video');
      if (firstImageIdx === -1) return;
      const entry: SpotlightEntry = {
        item: project.items[firstImageIdx],
        project,
        itemIndex: firstImageIdx,
      };
      if (project.featured) {
        featuredEntries.push(entry);
      } else {
        fallbackEntries.push(entry);
      }
    });

    const spotlight = (
      featuredEntries.length > 0 ? featuredEntries : fallbackEntries
    ).slice(0, 6);

    return {
      heroTitle: title,
      heroSubtitle: subtitle,
      totalCategories: categories.length,
      totalWorks: worksCount,
      spotlightEntries: spotlight,
    };
  }, [studioData, allProjects]);

  const spotlightItems = useMemo(
    () => spotlightEntries.map((entry) => entry.item),
    [spotlightEntries]
  );

  const handleOpenSpotlight = (index: number) => {
    const entry = spotlightEntries[index];
    if (!entry) return;
    const projectIndexInAll = allProjects.findIndex((p) => p.id === entry.project.id);
    if (entry.project.isProjectGroup || entry.project.items.length > 1) {
      handleOpenLightbox(
        entry.itemIndex,
        entry.project.items,
        entry.project.name || undefined,
        allProjects,
        projectIndexInAll
      );
    } else {
      handleOpenLightbox(index, spotlightItems, undefined, allProjects, projectIndexInAll);
    }
  };

  const prevProject =
    lightbox.projectList.length > 1 && lightbox.projectIndex >= 0
      ? lightbox.projectList[
          (lightbox.projectIndex - 1 + lightbox.projectList.length) %
            lightbox.projectList.length
        ]
      : null;

  const nextProject =
    lightbox.projectList.length > 1 && lightbox.projectIndex >= 0
      ? lightbox.projectList[(lightbox.projectIndex + 1) % lightbox.projectList.length]
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-obsidian text-[#F4F4F5] relative">
      {/* Subtle Ambient Glowing Geometric Background Layer */}
      <AmbientGeometry />

      {/* Top Sticky 3-Zone Monograph Navigation Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        cvPdfUrl={studioData.cvPdfUrl}
      />

      {/* Split Monograph Hero on Portfolio View */}
      {currentTab === 'portfolio' && (
        <Hero
          title={heroTitle}
          subtitle={heroSubtitle}
          categoriesCount={totalCategories}
          worksCount={totalWorks}
          spotlightItems={spotlightItems}
          isLoading={isLoading}
          onOpenSpotlight={handleOpenSpotlight}
          onExploreWorks={handleExploreWorks}
          onOpenCV={() => handleSelectTab('cv')}
        />
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {currentTab === 'portfolio' && (
          <StudioShowcase
            categories={studioData.portfolio || []}
            isLoading={isLoading}
            loadError={loadError}
            onRetry={() => loadData(true)}
            onOpenLightbox={handleOpenLightbox}
            onShowToast={showToast}
          />
        )}

        {currentTab === 'cv' && (
          <InteractiveCV
            elements={studioData.cv || []}
            cvPdfUrl={studioData.cvPdfUrl}
          />
        )}
      </main>

      {/* Full-Screen Darkroom 4K Lightbox & Project Filmstrip Modal */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        itemIndex={lightbox.itemIndex}
        items={lightbox.items}
        projectTitle={lightbox.projectTitle}
        projectIndex={lightbox.projectIndex >= 0 ? lightbox.projectIndex : undefined}
        totalProjects={
          lightbox.projectIndex >= 0 ? lightbox.projectList.length : 0
        }
        prevProjectName={prevProject?.isProjectGroup ? prevProject.name : undefined}
        nextProjectName={nextProject?.isProjectGroup ? nextProject.name : undefined}
        onPrevProject={() => handleJumpProject(-1)}
        onNextProject={() => handleJumpProject(1)}
        onClose={handleCloseLightbox}
        onNavigate={handleNavigateLightbox}
      />

      {/* Toast Notification */}
      <Toast
        show={toast.show}
        message={toast.message}
        isWarning={toast.isWarning}
      />

      {/* Quiet Architectural Footer */}
      <Footer onSelectTab={handleSelectTab} />
    </div>
  );
};

export default App;

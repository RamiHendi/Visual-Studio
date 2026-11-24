import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  StudioData,
  MainTab,
  PortfolioItem,
  PortfolioProject,
  ToastState,
  NavigationMetadata,
} from './types';
import {
  DEFAULT_APPS_SCRIPT_URL,
  CACHE_KEY,
  SAVED_URL_KEY,
  DEMO_STUDIO_DATA,
} from './data/demoData';
import { getAllPortfolioProjects } from './utils/portfolioProjects';
import { getUniqueVisitorIpHash } from './utils/visitorTracker';
import { syncPageSeo } from './utils/seo';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StudioShowcase } from './components/StudioShowcase';
import { InteractiveCV } from './components/InteractiveCV';
import { LightboxModal } from './components/LightboxModal';
import { ContactModal } from './components/ContactModal';
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

const safeStorageRemove = (storage: Storage, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {
    void 0;
  }
};

const readCachedLiveData = (): { data: StudioData | null; isSessionFresh: boolean } => {
  try {
    const sessionRaw = sessionStorage.getItem(CACHE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      if (isValidLiveStudioData(parsed) && parsed.portfolio.length > 0) {
        return { data: parsed, isSessionFresh: true };
      }
      safeStorageRemove(sessionStorage, CACHE_KEY);
    }
  } catch {
    safeStorageRemove(sessionStorage, CACHE_KEY);
  }

  try {
    const localRaw = localStorage.getItem(LIVE_PERSISTENT_CACHE_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (isValidLiveStudioData(parsed) && parsed.portfolio.length > 0) {
        return { data: parsed, isSessionFresh: false };
      }
      safeStorageRemove(localStorage, LIVE_PERSISTENT_CACHE_KEY);
    }
  } catch {
    safeStorageRemove(localStorage, LIVE_PERSISTENT_CACHE_KEY);
  }

  return { data: null, isSessionFresh: false };
};

const getInitialTabFromUrl = (): MainTab => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'cv' || window.location.hash.toLowerCase() === '#cv') {
      return 'cv';
    }
  } catch {
    void 0;
  }
  return 'portfolio';
};

export const App: React.FC = () => {
  const initialCacheRef = useRef<{ data: StudioData | null; isSessionFresh: boolean } | null>(null);
  if (initialCacheRef.current === null) {
    initialCacheRef.current = readCachedLiveData();
  }

  const [currentTab, setCurrentTab] = useState<MainTab>(getInitialTabFromUrl);
  const [studioData, setStudioData] = useState<StudioData>(
    () => initialCacheRef.current?.data ?? DEMO_STUDIO_DATA
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !initialCacheRef.current?.data
  );
  const [loadError, setLoadError] = useState<boolean>(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(() => {
    const cachedCount = initialCacheRef.current?.data?.visitorCount;
    return typeof cachedCount === 'number' && Number.isFinite(cachedCount)
      ? cachedCount
      : null;
  });
  const [isContactOpen, setIsContactOpen] = useState<boolean>(false);
  const [portfolioNav, setPortfolioNav] = useState<NavigationMetadata>({
    section: 'Portfolio',
  });
  const [cvNav, setCvNav] = useState<NavigationMetadata>({
    section: 'Curriculum Vitae',
  });
  const [clearSubCategoryTrigger, setClearSubCategoryTrigger] = useState<number>(0);

  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    isWarning: false,
  });
  const toastTimerRef = useRef<number | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);
  const hasLiveDataRef = useRef<boolean>(Boolean(initialCacheRef.current?.data));
  const activeFetchControllerRef = useRef<AbortController | null>(null);

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
      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
      }
    };
  }, []);

  const getActiveAppsScriptUrl = useCallback((): string => {
    try {
      const saved = localStorage.getItem(SAVED_URL_KEY);
      if (saved && saved.trim() !== '') {
        return saved.trim();
      }
    } catch {
      void 0;
    }
    return DEFAULT_APPS_SCRIPT_URL.trim();
  }, []);

  const loadData = useCallback(async () => {
    const targetUrl = getActiveAppsScriptUrl();
    if (!targetUrl) {
      setIsLoading(false);
      return;
    }

    if (activeFetchControllerRef.current) {
      activeFetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    activeFetchControllerRef.current = controller;

    if (!hasLiveDataRef.current) {
      setIsLoading(true);
    }
    setLoadError(false);

    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const liveData = (await response.json()) as StudioData;

      if (controller.signal.aborted) return;

      if (isValidLiveStudioData(liveData)) {
        if (
          typeof liveData.visitorCount === 'number' &&
          Number.isFinite(liveData.visitorCount)
        ) {
          setVisitorCount((prev) =>
            prev === null ? liveData.visitorCount! : Math.max(prev, liveData.visitorCount!)
          );
        }
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
              void 0;
            }
          }
        }
      }
    } catch {
      if (!controller.signal.aborted && !hasLiveDataRef.current) {
        setLoadError(true);
      }
    } finally {
      window.clearTimeout(timeoutId);
      if (activeFetchControllerRef.current === controller) {
        activeFetchControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }, [getActiveAppsScriptUrl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;

    const recordUniqueVisit = async () => {
      const targetUrl = getActiveAppsScriptUrl();
      if (!targetUrl) return;

      const visitorHash = await getUniqueVisitorIpHash();
      if (cancelled || !visitorHash) return;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);
      try {
        const visitUrl = new URL(targetUrl);
        visitUrl.searchParams.set('action', 'visit');
        visitUrl.searchParams.set('visitor', visitorHash);

        const res = await fetch(visitUrl.toString(), {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as { visitorCount?: unknown };
        if (
          typeof payload?.visitorCount === 'number' &&
          Number.isFinite(payload.visitorCount) &&
          !cancelled
        ) {
          const liveCount = payload.visitorCount;
          setVisitorCount((prev) => (prev === null ? liveCount : Math.max(prev, liveCount)));
          try {
            const localRaw = localStorage.getItem(LIVE_PERSISTENT_CACHE_KEY);
            if (localRaw) {
              const parsed = JSON.parse(localRaw) as StudioData;
              parsed.visitorCount = liveCount;
              const serialized = JSON.stringify(parsed);
              localStorage.setItem(LIVE_PERSISTENT_CACHE_KEY, serialized);
              sessionStorage.setItem(CACHE_KEY, serialized);
            }
          } catch {
            void 0;
          }
        }
      } catch {
        void 0;
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    recordUniqueVisit();
    return () => {
      cancelled = true;
    };
  }, [getActiveAppsScriptUrl]);

  const allProjects: PortfolioProject[] = useMemo(
    () => getAllPortfolioProjects(studioData.portfolio || []),
    [studioData.portfolio]
  );

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

  const activeLightboxItem = lightbox.isOpen
    ? lightbox.items[lightbox.itemIndex]
    : undefined;
  const activePortfolioCategory = (
    activeLightboxItem?.category ||
    portfolioNav.category ||
    ''
  )
    .replace(/_/g, ' ')
    .trim();
  const activeLightboxProject = lightbox.isOpen
    ? (lightbox.projectTitle || activeLightboxItem?.projectName || '').trim()
    : '';

  useEffect(() => {
    syncPageSeo({
      tab: currentTab,
      category: currentTab === 'portfolio' ? activePortfolioCategory : undefined,
      projectTitle: currentTab === 'portfolio' ? activeLightboxProject : undefined,
      cvSection: currentTab === 'cv' ? cvNav.category : undefined,
      projects: allProjects,
    });
  }, [currentTab, activePortfolioCategory, activeLightboxProject, cvNav.category, allProjects]);

  const handleSelectTab = useCallback((tab: MainTab) => {
    setCurrentTab(tab);
    try {
      const url = new URL(window.location.href);
      if (tab === 'cv') {
        url.searchParams.set('view', 'cv');
      } else {
        url.searchParams.delete('view');
      }
      if (url.hash.toLowerCase() === '#cv') {
        url.hash = '';
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      void 0;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleExploreWorks = useCallback(() => {
    setCurrentTab('portfolio');
    const showcase = document.getElementById('studio-showcase');
    if (showcase) {
      showcase.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleOpenContact = useCallback(() => {
    setIsContactOpen(true);
  }, []);

  const handleCloseContact = useCallback(() => {
    setIsContactOpen(false);
  }, []);

  const handleOpenCVTab = useCallback(() => {
    handleSelectTab('cv');
  }, [handleSelectTab]);

  const handleOpenLightbox = useCallback(
    (
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
    },
    [allProjects]
  );

  const handleCloseLightbox = useCallback(() => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
    try {
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
    } catch {
      void 0;
    }
  }, []);

  const handleNavigateLightbox = useCallback((newIndex: number) => {
    setLightbox((prev) => ({ ...prev, itemIndex: newIndex }));
  }, []);

  const handleJumpProject = useCallback((delta: -1 | 1) => {
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
  }, []);

  const { heroTitle, heroSubtitle } = useMemo(() => {
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

    return {
      heroTitle: title,
      heroSubtitle: subtitle,
    };
  }, [studioData]);

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

  const breadcrumbItems = useMemo(() => {
    type Crumb = { label: string; onClick?: () => void };
    const crumbs: Crumb[] = [];

    if (currentTab === 'portfolio') {
      const resolvedSubCategory =
        activeLightboxProject || portfolioNav.subCategory || '';

      crumbs.push({
        label: 'Portfolio',
        onClick: () => {
          if (lightbox.isOpen) handleCloseLightbox();
          setClearSubCategoryTrigger((n) => n + 1);
          handleSelectTab('portfolio');
        },
      });

      if (activePortfolioCategory) {
        crumbs.push({
          label: activePortfolioCategory,
          onClick: resolvedSubCategory
            ? () => {
                if (lightbox.isOpen) handleCloseLightbox();
                setClearSubCategoryTrigger((n) => n + 1);
                handleExploreWorks();
              }
            : undefined,
        });
      }

      if (resolvedSubCategory) {
        crumbs.push({
          label: resolvedSubCategory,
        });
      }
    } else {
      crumbs.push({
        label: 'Portfolio',
        onClick: () => handleSelectTab('portfolio'),
      });
      crumbs.push({
        label: cvNav.section || 'Curriculum Vitae',
        onClick: cvNav.category
          ? () => window.scrollTo({ top: 0, behavior: 'smooth' })
          : undefined,
      });
      if (cvNav.category) {
        crumbs.push({
          label: cvNav.category,
        });
      }
      if (cvNav.subCategory) {
        crumbs.push({
          label: cvNav.subCategory,
        });
      }
    }

    return crumbs;
  }, [
    currentTab,
    activePortfolioCategory,
    activeLightboxProject,
    portfolioNav.subCategory,
    cvNav.section,
    cvNav.category,
    cvNav.subCategory,
    lightbox.isOpen,
    handleCloseLightbox,
    handleSelectTab,
    handleExploreWorks,
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-obsidian text-[#F4F4F5] relative">
      <a
        href="#main-content"
        className="print-hidden sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-brass focus:text-obsidian focus:text-xs focus:font-semibold focus:rounded-sm"
      >
        Skip to main content
      </a>

      <AmbientGeometry />

      <Header
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        cvPdfUrl={studioData.cvPdfUrl}
        onOpenContact={handleOpenContact}
      />

      {currentTab === 'portfolio' && (
        <Hero
          title={heroTitle}
          subtitle={heroSubtitle}
          projectsCount={allProjects.length}
          visitorsCount={visitorCount}
          isLoading={isLoading}
          onExploreWorks={handleExploreWorks}
          onOpenCV={handleOpenCVTab}
        />
      )}

      <main
        id="main-content"
        className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
      >
        <nav
          aria-label="Breadcrumb"
          className="mb-6 pb-3 border-b border-white/[0.06] overflow-x-auto no-scrollbar"
        >
          <ol className="flex items-center gap-2 font-mono text-[11px] sm:text-xs text-zinc-500 tracking-wide">
            {breadcrumbItems.map((crumb, idx) => {
              const isLast = idx === breadcrumbItems.length - 1;
              return (
                <li key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-2 min-w-0">
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-zinc-600 select-none shrink-0">
                      &gt;
                    </span>
                  )}
                  {crumb.onClick && !isLast ? (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      className="hover:text-brass transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span
                      aria-current={isLast ? 'page' : undefined}
                      className={`${
                        isLast ? 'text-zinc-200' : 'text-zinc-400'
                      } whitespace-nowrap truncate`}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {currentTab === 'portfolio' && (
          <StudioShowcase
            categories={studioData.portfolio || []}
            isLoading={isLoading}
            loadError={loadError}
            onRetry={loadData}
            onOpenLightbox={handleOpenLightbox}
            onShowToast={showToast}
            onNavigationChange={setPortfolioNav}
            clearSubCategoryTrigger={clearSubCategoryTrigger}
          />
        )}

        {currentTab === 'cv' && (
          <InteractiveCV
            elements={studioData.cv || []}
            cvPdfUrl={studioData.cvPdfUrl}
            onNavigationChange={setCvNav}
          />
        )}
      </main>

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

      <ContactModal
        isOpen={isContactOpen}
        onClose={handleCloseContact}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        isWarning={toast.isWarning}
      />

      <Footer onSelectTab={handleSelectTab} />
    </div>
  );
};

export default App;

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
  DEMO_STUDIO_DATA,
} from './data/demoData';
import { getAllPortfolioProjects } from './utils/portfolioProjects';
import {
  getAnonymousVisitorPing,
  markAnonymousVisitReported,
} from './utils/visitorTracker';
import {
  isValidLiveStudioData,
  readStudioCache,
  writeStudioCache,
  updateCachedVisitorCount,
} from './utils/studioCache';
import { sanitizeAppsScriptUrl, sanitizeStudioData } from './utils/urlSecurity';
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

const LIVE_FETCH_TIMEOUT_MS = 45000;
const SNAPSHOT_FETCH_TIMEOUT_MS = 8000;
const VERSION_CHECK_TIMEOUT_MS = 8000;
const AUTO_REVALIDATE_INTERVAL_MS = 60000;
const VISIBILITY_REVALIDATE_COOLDOWN_MS = 20000;
const STATIC_SNAPSHOT_URL = './studio-snapshot.json';

const parseUpdatedAtMs = (updatedAt?: string): number => {
  if (!updatedAt) return 0;
  const parsed = Date.parse(updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getStudioContentFingerprint = (data: StudioData | null): string => {
  if (!data) return '';
  try {
    return JSON.stringify({
      cvPdfUrl: data.cvPdfUrl || '',
      cv: data.cv || [],
      portfolio: data.portfolio || [],
    });
  } catch {
    return '';
  }
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
  const [currentTab, setCurrentTab] = useState<MainTab>(getInitialTabFromUrl);
  const [studioData, setStudioData] = useState<StudioData>(DEMO_STUDIO_DATA);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
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
  const retryTimerRef = useRef<number | null>(null);
  const handledDeepLinkRef = useRef<string | null>(null);
  const hasLiveDataRef = useRef<boolean>(false);
  const hydrationRankRef = useRef<number>(0);
  const hydratedUpdatedAtRef = useRef<number>(0);
  const hydratedVersionRef = useRef<string>('');
  const contentFingerprintRef = useRef<string>('');
  const activeFetchControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const isCheckingVersionRef = useRef<boolean>(false);
  const lastSyncTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

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
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }
      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
      }
    };
  }, []);

  const getActiveAppsScriptUrl = useCallback((): string => {
    return sanitizeAppsScriptUrl(DEFAULT_APPS_SCRIPT_URL);
  }, []);

  const loadData = useCallback(
    async (options?: { force?: boolean; attempt?: number }) => {
      const force = Boolean(options?.force);
      const attempt = options?.attempt ?? 0;
      const targetUrl = getActiveAppsScriptUrl();
      if (!targetUrl) {
        setIsLoading(false);
        return;
      }

      if (isFetchingRef.current && !force) {
        return;
      }

      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }

      if (activeFetchControllerRef.current) {
        activeFetchControllerRef.current.abort();
      }

      const controller = new AbortController();
      activeFetchControllerRef.current = controller;
      isFetchingRef.current = true;

      if (!hasLiveDataRef.current) {
        setIsLoading(true);
      }
      setLoadError(false);

      let didTimeout = false;
      let willRetry = false;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, LIVE_FETCH_TIMEOUT_MS);

      try {
        const requestUrl = new URL(targetUrl);
        requestUrl.searchParams.set('_ts', String(Date.now()));

        const response = await fetch(requestUrl.toString(), {
          signal: controller.signal,
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const rawLiveData = (await response.json()) as unknown;

        if (controller.signal.aborted || !isMountedRef.current) return;

        if (isValidLiveStudioData(rawLiveData)) {
          const liveData = sanitizeStudioData(rawLiveData);
          lastSyncTimeRef.current = Date.now();
          if (
            typeof liveData.visitorCount === 'number' &&
            Number.isFinite(liveData.visitorCount)
          ) {
            setVisitorCount((prev) =>
              prev === null ? liveData.visitorCount! : Math.max(prev, liveData.visitorCount!)
            );
          }

          const hasNewPortfolioItems = liveData.portfolio.length > 0;
          const nextFingerprint = getStudioContentFingerprint(liveData);
          const contentChanged = nextFingerprint !== contentFingerprintRef.current;

          if (hasNewPortfolioItems || !hasLiveDataRef.current) {
            if (hasNewPortfolioItems) {
              hasLiveDataRef.current = true;
              hydrationRankRef.current = 3;
              hydratedUpdatedAtRef.current = parseUpdatedAtMs(liveData.updatedAt);
              if (liveData.version) {
                hydratedVersionRef.current = liveData.version;
              }
            }
            if (contentChanged || !contentFingerprintRef.current) {
              contentFingerprintRef.current = nextFingerprint;
              setStudioData(liveData);
            }
            setLoadError(false);
            if (hasNewPortfolioItems) {
              void writeStudioCache(liveData);
            }
          }
        }
      } catch {
        const wasReplacedOrUnmounted = controller.signal.aborted && !didTimeout;
        if (!wasReplacedOrUnmounted && isMountedRef.current) {
          if (attempt < 1) {
            willRetry = true;
            retryTimerRef.current = window.setTimeout(() => {
              retryTimerRef.current = null;
              if (isMountedRef.current) {
                loadData({ force: true, attempt: attempt + 1 });
              }
            }, 1500);
          } else if (!hasLiveDataRef.current) {
            setLoadError(true);
          }
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (activeFetchControllerRef.current === controller) {
          activeFetchControllerRef.current = null;
          isFetchingRef.current = false;
        }
        if (isMountedRef.current && !willRetry) {
          setIsLoading(false);
        }
      }
    },
    [getActiveAppsScriptUrl]
  );

  const checkRemoteVersion = useCallback(async (): Promise<string | null> => {
    const targetUrl = getActiveAppsScriptUrl();
    if (!targetUrl || isCheckingVersionRef.current) return null;

    isCheckingVersionRef.current = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), VERSION_CHECK_TIMEOUT_MS);

    try {
      const versionUrl = new URL(targetUrl);
      versionUrl.searchParams.set('action', 'version');
      versionUrl.searchParams.set('_ts', String(Date.now()));

      const res = await fetch(versionUrl.toString(), {
        signal: controller.signal,
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      });
      if (!res.ok || !isMountedRef.current) return null;

      const payload = (await res.json()) as {
        version?: unknown;
        visitorCount?: unknown;
      };

      if (
        typeof payload?.visitorCount === 'number' &&
        Number.isFinite(payload.visitorCount) &&
        isMountedRef.current
      ) {
        const liveCount = payload.visitorCount;
        setVisitorCount((prev) => (prev === null ? liveCount : Math.max(prev, liveCount)));
        void updateCachedVisitorCount(liveCount);
      }

      if (typeof payload?.version === 'string' && payload.version.trim().length > 0) {
        return payload.version.trim();
      }
      return null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
      isCheckingVersionRef.current = false;
    }
  }, [getActiveAppsScriptUrl]);

  const revalidateStudioData = useCallback(
    async (options?: { forceFull?: boolean }) => {
      if (isFetchingRef.current && !options?.forceFull) return;

      if (
        options?.forceFull ||
        !hasLiveDataRef.current ||
        !hydratedVersionRef.current
      ) {
        await loadData({ force: Boolean(options?.forceFull) });
        return;
      }

      const remoteVersion = await checkRemoteVersion();
      if (!isMountedRef.current) return;

      if (remoteVersion && remoteVersion === hydratedVersionRef.current) {
        lastSyncTimeRef.current = Date.now();
        return;
      }

      await loadData({ force: true });
    },
    [checkRemoteVersion, loadData]
  );

  const handleRetryLoad = useCallback(() => {
    void revalidateStudioData({ forceFull: true });
  }, [revalidateStudioData]);

  useEffect(() => {
    let cancelled = false;
    const snapshotController = new AbortController();

    const applyTierData = (data: StudioData, rank: 1 | 2) => {
      if (cancelled || !isMountedRef.current) return;
      if (hydrationRankRef.current >= 3) return;

      const incomingTs = parseUpdatedAtMs(data.updatedAt);
      if (rank < hydrationRankRef.current) {
        if (!(rank === 1 && hydrationRankRef.current === 2 && incomingTs > hydratedUpdatedAtRef.current)) {
          return;
        }
      }

      hydrationRankRef.current = Math.max(hydrationRankRef.current, rank);
      hydratedUpdatedAtRef.current = Math.max(hydratedUpdatedAtRef.current, incomingTs);
      if (data.version) {
        hydratedVersionRef.current = data.version;
      }
      hasLiveDataRef.current = true;

      const nextFingerprint = getStudioContentFingerprint(data);
      if (nextFingerprint !== contentFingerprintRef.current) {
        contentFingerprintRef.current = nextFingerprint;
        setStudioData(data);
      }

      if (typeof data.visitorCount === 'number' && Number.isFinite(data.visitorCount)) {
        setVisitorCount((prev) =>
          prev === null ? data.visitorCount! : Math.max(prev, data.visitorCount!)
        );
      }
      setLoadError(false);
      setIsLoading(false);
    };

    const hydrateFromIndexedDB = async () => {
      const cached = await readStudioCache();
      if (cached) {
        applyTierData(cached, 2);
      }
    };

    const hydrateFromStaticSnapshot = async () => {
      const timeoutId = window.setTimeout(
        () => snapshotController.abort(),
        SNAPSHOT_FETCH_TIMEOUT_MS
      );
      try {
        const res = await fetch(STATIC_SNAPSHOT_URL, {
          signal: snapshotController.signal,
          cache: 'no-cache',
        });
        if (!res.ok) return;
        const rawSnapshot = (await res.json()) as unknown;
        if (isValidLiveStudioData(rawSnapshot) && rawSnapshot.portfolio.length > 0) {
          const cleanSnapshot = sanitizeStudioData(rawSnapshot);
          const wasEmpty = hydrationRankRef.current === 0;
          applyTierData(cleanSnapshot, 1);
          if (wasEmpty) {
            void writeStudioCache(cleanSnapshot);
          }
        }
      } catch {
        void 0;
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    const startupSync = async () => {
      const localHydration = Promise.allSettled([
        hydrateFromIndexedDB(),
        hydrateFromStaticSnapshot(),
      ]);
      await Promise.race([
        localHydration,
        new Promise<void>((resolve) => window.setTimeout(resolve, 400)),
      ]);
      if (!cancelled && isMountedRef.current) {
        void revalidateStudioData();
      }
    };

    void startupSync();

    return () => {
      cancelled = true;
      snapshotController.abort();
    };
  }, [revalidateStudioData]);

  useEffect(() => {
    const triggerBackgroundSync = (ignoreCooldown = false) => {
      if (document.visibilityState !== 'visible') return;
      if (isFetchingRef.current || isCheckingVersionRef.current) return;
      const elapsed = Date.now() - lastSyncTimeRef.current;
      if (!ignoreCooldown && elapsed < VISIBILITY_REVALIDATE_COOLDOWN_MS) return;
      void revalidateStudioData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerBackgroundSync(false);
      }
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        triggerBackgroundSync(true);
      }
    };

    const handleOnline = () => {
      triggerBackgroundSync(true);
    };

    const intervalId = window.setInterval(() => {
      triggerBackgroundSync(false);
    }, AUTO_REVALIDATE_INTERVAL_MS);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('online', handleOnline);
    };
  }, [revalidateStudioData]);

  useEffect(() => {
    let cancelled = false;

    const recordUniqueVisit = async () => {
      const targetUrl = getActiveAppsScriptUrl();
      if (!targetUrl) return;

      const { token, shouldReport } = getAnonymousVisitorPing();
      if (cancelled || !token || !shouldReport) return;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      try {
        const visitUrl = new URL(targetUrl);
        visitUrl.searchParams.set('action', 'visit');
        visitUrl.searchParams.set('visitor', token);
        visitUrl.searchParams.set('_ts', String(Date.now()));

        const res = await fetch(visitUrl.toString(), {
          signal: controller.signal,
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
        });

        if (!res.ok || cancelled) return;
        markAnonymousVisitReported();
        const payload = (await res.json()) as { visitorCount?: unknown };
        if (
          typeof payload?.visitorCount === 'number' &&
          Number.isFinite(payload.visitorCount) &&
          !cancelled
        ) {
          const liveCount = payload.visitorCount;
          setVisitorCount((prev) => (prev === null ? liveCount : Math.max(prev, liveCount)));
          void updateCachedVisitorCount(liveCount);
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
            onRetry={handleRetryLoad}
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
        onShowToast={showToast}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        isWarning={toast.isWarning}
      />

      <Footer onSelectTab={handleSelectTab} onOpenContact={handleOpenContact} />
    </div>
  );
};

export default App;

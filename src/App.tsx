import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StudioData, MainTab, PortfolioItem, ToastState } from './types';
import {
  DEFAULT_APPS_SCRIPT_URL,
  CACHE_KEY,
  SAVED_URL_KEY,
  DEMO_STUDIO_DATA,
} from './data/demoData';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { StudioShowcase } from './components/StudioShowcase';
import { InteractiveCV } from './components/InteractiveCV';
import { LightboxModal } from './components/LightboxModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { AmbientGeometry } from './components/AmbientGeometry';

const LIVE_PERSISTENT_CACHE_KEY = 'rami_hendi_visual_studio_live_cache_v2';

const isFeaturedPortfolioItem = (item: PortfolioItem): boolean => {
  if (item.featured === true) return true;
  const title = (item.title || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  return (
    title.includes('[featured]') ||
    desc.includes('#featured') ||
    desc.includes('featured: true')
  );
};

const isValidLiveStudioData = (data: unknown): data is StudioData => {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as StudioData;
  if (!Array.isArray(candidate.portfolio)) return false;
  // Reject any stale demo placeholder entries
  const hasDemoItems = candidate.portfolio.some((cat) =>
    (cat.items || []).some((item) => typeof item.id === 'string' && item.id.startsWith('demo-'))
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
  }>({
    isOpen: false,
    itemIndex: 0,
    items: [],
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

  const loadData = useCallback(async (forceRefresh = false) => {
    const targetUrl = getActiveAppsScriptUrl();
    if (!targetUrl) {
      setIsLoading(false);
      return;
    }

    // If sessionStorage already has fresh live data and this isn't a forced retry, skip network fetch
    if (!forceRefresh && initialCacheRef.current?.isSessionFresh && hasLiveDataRef.current) {
      setIsLoading(false);
      return;
    }

    // Only show loading shimmer when we don't already have real cached Google Drive data on screen
    if (!hasLiveDataRef.current) {
      setIsLoading(true);
    }
    setLoadError(false);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      const response = await fetch(targetUrl, { signal: controller.signal });
      window.clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const liveData = (await response.json()) as StudioData;

      if (isValidLiveStudioData(liveData)) {
        hasLiveDataRef.current = true;
        setStudioData(liveData);
        setLoadError(false);
        try {
          const serialized = JSON.stringify(liveData);
          sessionStorage.setItem(CACHE_KEY, serialized);
          localStorage.setItem(LIVE_PERSISTENT_CACHE_KEY, serialized);
        } catch {
          // Ignore storage quota errors
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

  // Open shared portfolio item directly if `?work=<id>` is present in the URL
  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    const sharedWorkId = params.get('work');
    if (!sharedWorkId || handledDeepLinkRef.current === sharedWorkId) return;

    const allItems: PortfolioItem[] = [];
    (studioData.portfolio || []).forEach((cat) => {
      (cat.items || []).forEach((item) => {
        allItems.push({ ...item, category: cat.category });
      });
    });

    const matchIndex = allItems.findIndex((item) => item.id === sharedWorkId);
    if (matchIndex !== -1) {
      handledDeepLinkRef.current = sharedWorkId;
      setCurrentTab('portfolio');
      setLightbox({
        isOpen: true,
        itemIndex: matchIndex,
        items: allItems,
      });
    }
  }, [studioData, isLoading]);

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

  const handleOpenLightbox = (itemIndex: number, filteredItems: PortfolioItem[]) => {
    setLightbox({
      isOpen: true,
      itemIndex,
      items: filteredItems,
    });
  };

  const handleCloseLightbox = () => {
    setLightbox((prev) => ({ ...prev, isOpen: false }));
    const url = new URL(window.location.href);
    if (url.searchParams.has('work')) {
      url.searchParams.delete('work');
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleNavigateLightbox = (newIndex: number) => {
    setLightbox((prev) => ({ ...prev, itemIndex: newIndex }));
  };

  // Derive Hero information and curated Featured Spotlight items (real Google Drive works only)
  const {
    heroTitle,
    heroSubtitle,
    totalCategories,
    totalWorks,
    spotlightItems,
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
    const worksCount = categories.reduce(
      (acc, cat) => acc + (cat.items ? cat.items.length : 0),
      0
    );

    const featuredImages: PortfolioItem[] = [];
    const fallbackImages: PortfolioItem[] = [];

    categories.forEach((cat) => {
      (cat.items || []).forEach((item) => {
        if (item.type === 'video') return;
        const enriched: PortfolioItem = {
          ...item,
          category: cat.category,
          featured: isFeaturedPortfolioItem(item),
        };
        if (enriched.featured) {
          featuredImages.push(enriched);
        } else {
          fallbackImages.push(enriched);
        }
      });
    });

    const spotlight = (
      featuredImages.length > 0 ? featuredImages : fallbackImages
    ).slice(0, 6);

    return {
      heroTitle: title,
      heroSubtitle: subtitle,
      totalCategories: categories.length,
      totalWorks: worksCount,
      spotlightItems: spotlight,
    };
  }, [studioData]);

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
          onOpenSpotlight={(index) => handleOpenLightbox(index, spotlightItems)}
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

      {/* Full-Screen Darkroom 4K Lightbox & Video Theater Modal */}
      <LightboxModal
        isOpen={lightbox.isOpen}
        itemIndex={lightbox.itemIndex}
        items={lightbox.items}
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

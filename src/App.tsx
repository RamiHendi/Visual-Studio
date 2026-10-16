import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { CMSConnection } from './components/CMSConnection';
import { LightboxModal } from './components/LightboxModal';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<MainTab>('portfolio');
  const [studioData, setStudioData] = useState<StudioData>(DEMO_STUDIO_DATA);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [syncLabel, setSyncLabel] = useState<string>('Demo Studio Mode');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Toast state
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    isWarning: false,
  });

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
    setToast({ show: true, message, isWarning });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3800);
  }, []);

  const getActiveAppsScriptUrl = useCallback((): string => {
    const saved = localStorage.getItem(SAVED_URL_KEY);
    return saved && saved.trim() !== '' ? saved.trim() : DEFAULT_APPS_SCRIPT_URL.trim();
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    const targetUrl = getActiveAppsScriptUrl();

    // 1. Check sessionStorage cache first if not forcing refresh
    if (!forceRefresh && targetUrl) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as StudioData;
          if (parsed && Array.isArray(parsed.portfolio)) {
            setStudioData(parsed);
            setIsLive(true);
            setSyncLabel('Live Google Drive (Cached)');
            return;
          }
        } catch {
          sessionStorage.removeItem(CACHE_KEY);
        }
      }
    }

    // 2. Fetch live data if URL available
    if (targetUrl) {
      setIsLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(targetUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const liveData = (await response.json()) as StudioData;

        if (!liveData || !Array.isArray(liveData.portfolio)) {
          throw new Error('Invalid JSON structure from Google Apps Script');
        }

        setStudioData(liveData);
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(liveData));
        setIsLive(true);
        setSyncLabel('Live Google Drive Sync');
        showToast('Synced live with Google Drive & CV Doc!');
      } catch (err) {
        console.warn('Falling back to Demo Studio Mode:', err);
        setStudioData(DEMO_STUDIO_DATA);
        setIsLive(false);
        setSyncLabel('Demo Fallback (Check URL)');
        showToast('Could not reach Apps Script URL. Showing Demo Studio works.', true);
      } finally {
        setIsLoading(false);
      }
    } else {
      setStudioData(DEMO_STUDIO_DATA);
      setIsLive(false);
      setSyncLabel('Demo Studio Mode');
    }
  }, [getActiveAppsScriptUrl, showToast]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    sessionStorage.removeItem(CACHE_KEY);
    await loadData(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSaveUrl = async (url: string) => {
    localStorage.setItem(SAVED_URL_KEY, url);
    sessionStorage.removeItem(CACHE_KEY);
    await loadData(true);
    setCurrentTab('portfolio');
  };

  const handleResetDemo = async () => {
    localStorage.removeItem(SAVED_URL_KEY);
    sessionStorage.removeItem(CACHE_KEY);
    await loadData(true);
    showToast('Reset to built-in Demo Studio Mode.');
    setCurrentTab('portfolio');
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
  };

  const handleNavigateLightbox = (newIndex: number) => {
    setLightbox((prev) => ({ ...prev, itemIndex: newIndex }));
  };

  // Derive Hero information
  const { heroTitle, heroSubtitle, totalCategories, totalWorks } = useMemo(() => {
    const cvElements = studioData.cv || [];
    const titleEl = cvElements.find((e) => e.heading === 'TITLE');
    const subtitleEl = cvElements.find((e) => e.heading === 'SUBTITLE');

    const title = titleEl?.text || 'Rami Hendi';
    const subtitle =
      subtitleEl?.text ||
      'Senior 3D Visualizer, Architectural Renderer & Technical Artist | 6+ Years Experience';

    const categories = studioData.portfolio || [];
    const worksCount = categories.reduce(
      (acc, cat) => acc + (cat.items ? cat.items.length : 0),
      0
    );

    return {
      heroTitle: title,
      heroSubtitle: subtitle,
      totalCategories: categories.length,
      totalWorks: worksCount,
    };
  }, [studioData]);

  return (
    <div className="min-h-screen flex flex-col studio-grid-bg text-[#F3F4F6] relative">
      {/* Ambient Rim Lighting Layer */}
      <div className="fixed inset-0 pointer-events-none studio-radial-glow z-0"></div>

      {/* Top Sticky Navigation Bar */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isLive={isLive}
        syncLabel={syncLabel}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        cvPdfUrl={studioData.cvPdfUrl}
        onOpenCMS={() => setCurrentTab('cms')}
      />

      {/* Hero Section */}
      <Hero
        title={heroTitle}
        subtitle={heroSubtitle}
        categoriesCount={totalCategories}
        worksCount={totalWorks}
        isLive={isLive}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {currentTab === 'portfolio' && (
          <StudioShowcase
            categories={studioData.portfolio || []}
            isLoading={isLoading}
            onOpenLightbox={handleOpenLightbox}
          />
        )}

        {currentTab === 'cv' && (
          <InteractiveCV
            elements={studioData.cv || []}
            cvPdfUrl={studioData.cvPdfUrl}
          />
        )}

        {currentTab === 'cms' && (
          <CMSConnection
            currentUrl={getActiveAppsScriptUrl()}
            onSaveUrl={handleSaveUrl}
            onResetDemo={handleResetDemo}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Full-Screen 4K Lightbox & Video Theater Modal */}
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

      {/* Footer */}
      <Footer onSelectTab={setCurrentTab} />
    </div>
  );
};

export default App;

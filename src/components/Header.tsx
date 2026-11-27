import React from 'react';
import { MainTab } from '../types';
import { sanitizeHttpsUrl } from '../utils/urlSecurity';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  cvPdfUrl: string;
  onOpenContact: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(
  ({ currentTab, onSelectTab, cvPdfUrl, onOpenContact }) => {
    const safeCvPdfUrl = sanitizeHttpsUrl(cvPdfUrl);
    const isDemoPdf =
      !safeCvPdfUrl ||
      safeCvPdfUrl.includes('DEMO_DOC_ID') ||
      safeCvPdfUrl.includes('PASTE_YOUR_');

    const handlePdfClick = (e: React.MouseEvent) => {
      if (isDemoPdf) {
        e.preventDefault();
        onSelectTab('cv');
      }
    };

    return (
      <header className="sticky top-0 z-40 bg-obsidian/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-[72px] flex items-center justify-between gap-4 sm:gap-8">
          <button
            type="button"
            onClick={() => onSelectTab('portfolio')}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            aria-label="Rami Hendi's Visual Studio — Home"
            className="inline-flex items-center gap-2.5 sm:gap-3 font-display text-base sm:text-lg font-semibold tracking-tight text-zinc-100 hover:text-brass transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer protected-media focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass rounded-sm"
          >
            <picture className="shrink-0">
              <source srcSet="./assets/aistudio/logo.webp" type="image/webp" />
              <img
                src="./assets/aistudio/Logo_9abd8455.png"
                alt=""
                aria-hidden="true"
                width={32}
                height={32}
                decoding="async"
                draggable={false}
                className="h-7 sm:h-8 w-auto object-contain shrink-0 protected-img"
              />
            </picture>
            <span>Rami Hendi</span>
          </button>

          <nav aria-label="Primary navigation" className="flex items-center gap-4 sm:gap-7">
            <button
              type="button"
              onClick={() => onSelectTab('portfolio')}
              aria-current={currentTab === 'portfolio' ? 'page' : undefined}
              className={`py-1 text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer border-b ${
                currentTab === 'portfolio'
                  ? 'text-zinc-100 border-brass'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100'
              }`}
            >
              Portfolio
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('cv')}
              aria-current={currentTab === 'cv' ? 'page' : undefined}
              className={`py-1 text-xs sm:text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer border-b ${
                currentTab === 'cv'
                  ? 'text-zinc-100 border-brass'
                  : 'text-zinc-400 border-transparent hover:text-zinc-100'
              }`}
            >
              <span className="hidden sm:inline">Interactive CV</span>
              <span className="sm:hidden">CV</span>
            </button>

            <a
              href={isDemoPdf ? '#cv' : safeCvPdfUrl}
              target={isDemoPdf ? '_self' : '_blank'}
              rel="noopener noreferrer"
              download={!isDemoPdf}
              onClick={handlePdfClick}
              className="hidden md:inline-block py-1 text-sm font-medium text-zinc-400 hover:text-zinc-100 border-b border-transparent hover:border-white/30 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Download CV
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={onOpenContact}
              className="px-3.5 sm:px-5 py-2 bg-brass hover:bg-brassHover text-obsidian text-xs sm:text-sm font-semibold rounded-sm transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass/70"
            >
              <span className="hidden sm:inline">Get in Touch</span>
              <span className="sm:hidden">Contact</span>
            </button>
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';

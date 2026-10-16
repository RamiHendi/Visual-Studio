import React from 'react';
import { MainTab } from '../types';

interface HeaderProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  isLive: boolean;
  syncLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  cvPdfUrl: string;
  onOpenCMS: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  isLive,
  syncLabel,
  isRefreshing,
  onRefresh,
  cvPdfUrl,
  onOpenCMS,
}) => {
  const isDemoPdf = !cvPdfUrl || cvPdfUrl.includes('DEMO_DOC_ID');

  const handlePdfClick = (e: React.MouseEvent) => {
    if (isDemoPdf) {
      e.preventDefault();
      onSelectTab('cv');
    }
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-obsidian/80 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <button
          onClick={() => onSelectTab('portfolio')}
          className="flex items-center gap-3 group focus:outline-none text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-cyan-600 p-[1px] shadow-lg shadow-amber-500/10 group-hover:shadow-amber-500/30 transition-all">
            <div className="w-full h-full bg-obsidian rounded-[11px] flex items-center justify-center">
              <span className="font-display font-bold text-lg tracking-wider bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent">
                RH
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5">
            <span className="font-display font-bold text-base sm:text-lg tracking-widest text-white group-hover:text-amber-400 transition-colors">
              RAMI HENDI
            </span>
            <span className="hidden sm:inline text-white/25 font-light">|</span>
            <span className="text-xs sm:text-sm font-medium text-amber-400/90 tracking-wide">
              Visual Studio
            </span>
          </div>
        </button>

        {/* Center View Switcher Tabs (Desktop) */}
        <nav className="hidden md:flex items-center bg-charcoal/90 p-1.5 rounded-xl border border-white/10">
          <button
            onClick={() => onSelectTab('portfolio')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === 'portfolio'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-cubes"></i>
            <span>Studio Showcase</span>
          </button>
          
          <button
            onClick={() => onSelectTab('cv')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === 'cv'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-file-lines"></i>
            <span>Interactive CV</span>
          </button>

          <button
            onClick={() => onSelectTab('cms')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              currentTab === 'cms'
                ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <i className="fa-brands fa-google-drive"></i>
            <span>CMS Connection</span>
          </button>
        </nav>

        {/* Right Actions: Sync Status Pill, Refresh, CV Download */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Data Source Status Pill */}
          <button
            onClick={onOpenCMS}
            title="Click to configure Google Drive CMS link"
            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              isLive
                ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'
              }`}
            ></span>
            <span>{syncLabel}</span>
            <i className="fa-solid fa-sliders text-[10px] opacity-75 ml-0.5"></i>
          </button>

          {/* Force Refresh Button */}
          <button
            onClick={onRefresh}
            title="Force Refresh from Google Drive"
            className="p-2.5 rounded-xl bg-charcoal hover:bg-panel text-gray-300 hover:text-amber-400 border border-white/10 transition-all"
          >
            <i
              className={`fa-solid fa-arrows-rotate text-sm ${
                isRefreshing ? 'animate-spin text-amber-400' : ''
              }`}
            ></i>
          </button>

          {/* Live Download CV PDF Button */}
          <a
            href={isDemoPdf ? '#cv' : cvPdfUrl}
            target={isDemoPdf ? '_self' : '_blank'}
            rel="noopener noreferrer"
            onClick={handlePdfClick}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/20 transition-all"
          >
            <i className="fa-solid fa-file-arrow-down"></i>
            <span className="hidden sm:inline">Download CV</span>
            <span className="sm:hidden">CV</span>
          </a>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="flex md:hidden border-t border-white/10 bg-charcoal/95 px-2 py-1.5 justify-around">
        <button
          onClick={() => onSelectTab('portfolio')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            currentTab === 'portfolio' ? 'bg-amber-500 text-black' : 'text-gray-300'
          }`}
        >
          <i className="fa-solid fa-cubes"></i> Showcase
        </button>
        <button
          onClick={() => onSelectTab('cv')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            currentTab === 'cv' ? 'bg-amber-500 text-black' : 'text-gray-300'
          }`}
        >
          <i className="fa-solid fa-file-lines"></i> Interactive CV
        </button>
        <button
          onClick={() => onSelectTab('cms')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 ${
            currentTab === 'cms' ? 'bg-amber-500 text-black' : 'text-gray-300'
          }`}
        >
          <i className="fa-brands fa-google-drive"></i> Drive CMS
        </button>
      </div>
    </header>
  );
};

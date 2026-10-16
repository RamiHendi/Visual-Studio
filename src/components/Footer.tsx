import React from 'react';
import { MainTab } from '../types';

interface FooterProps {
  onSelectTab: (tab: MainTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-obsidian/90 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-white tracking-wider">
            RAMI HENDI&apos;S VISUAL STUDIO
          </span>
          <span>•</span>
          <span>Powered by GitHub Pages &amp; Google Drive CMS</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => onSelectTab('portfolio')}
            className="hover:text-amber-400 transition-colors cursor-pointer"
          >
            Showcase
          </button>
          <button
            onClick={() => onSelectTab('cv')}
            className="hover:text-amber-400 transition-colors cursor-pointer"
          >
            Interactive CV
          </button>
          <button
            onClick={() => onSelectTab('cms')}
            className="hover:text-amber-400 transition-colors cursor-pointer"
          >
            Drive CMS Setup
          </button>
        </div>
      </div>
    </footer>
  );
};

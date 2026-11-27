import React from 'react';
import { MainTab } from '../types';

interface FooterProps {
  onSelectTab: (tab: MainTab) => void;
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = React.memo(({ onSelectTab, onOpenContact }) => {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-obsidian/80 backdrop-blur-sm mt-16 sm:mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 protected-media"
        >
          <span className="inline-flex items-center gap-2">
            <picture className="shrink-0">
              <source srcSet="./assets/aistudio/logo.webp" type="image/webp" />
              <img
                src="./assets/aistudio/Logo_9abd8455.png"
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                loading="lazy"
                decoding="async"
                draggable={false}
                className="h-5 sm:h-6 w-auto object-contain shrink-0 protected-img"
              />
            </picture>
            <span className="font-display font-medium text-zinc-200 tracking-tight">
              Rami Hendi
            </span>
          </span>
          <span aria-hidden="true" className="text-zinc-700">·</span>
          <span>3D Design · Architectural Visualization · Industrial Design · More</span>
        </div>

        <nav aria-label="Footer navigation" className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('portfolio')}
            className="text-zinc-400 hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('cv')}
            className="text-zinc-400 hover:text-zinc-100 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Interactive CV
          </button>
          <button
            type="button"
            onClick={onOpenContact}
            className="text-zinc-400 hover:text-brass transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Direct Contact
          </button>
        </nav>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

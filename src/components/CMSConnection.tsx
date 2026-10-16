import React, { useState } from 'react';
import { APPS_SCRIPT_TEMPLATE } from '../data/demoData';

interface CMSConnectionProps {
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  onResetDemo: () => void;
  onShowToast: (msg: string, isWarning?: boolean) => void;
}

export const CMSConnection: React.FC<CMSConnectionProps> = ({
  currentUrl,
  onSaveUrl,
  onResetDemo,
  onShowToast,
}) => {
  const [urlInput, setUrlInput] = useState<string>(currentUrl);
  const [copied, setCopied] = useState<boolean>(false);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = urlInput.trim();
    if (!trimmed) {
      onShowToast('Please paste a valid Google Apps Script Web App URL.', true);
      return;
    }
    onSaveUrl(trimmed);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE).then(() => {
      setCopied(true);
      onShowToast('Google Apps Script code copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = APPS_SCRIPT_TEMPLATE;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      onShowToast('Google Apps Script code copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <section className="space-y-8">
      <div className="bg-charcoal/90 border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              HEADLESS GOOGLE WORKSPACE CMS
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-2">
              Connect Your Google Drive &amp; CV Doc
            </h2>
            <p className="text-sm text-gray-400 mt-1 max-w-2xl">
              Your website reads your CV directly from a Google Doc and builds your portfolio gallery from your Google Drive subfolders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onResetDemo}
              className="px-4 py-2.5 rounded-xl bg-panel hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 transition-all cursor-pointer"
            >
              Reset to Demo Mode
            </button>
          </div>
        </div>

        {/* Live URL Input Tester */}
        <form onSubmit={handleConnect} className="bg-obsidian/90 border border-amber-500/30 rounded-2xl p-5 space-y-4">
          <label className="block text-xs font-mono uppercase tracking-wider text-amber-400">
            Step 1: Paste Your Deployed Google Apps Script Web App URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              className="flex-1 px-4 py-3 rounded-xl bg-charcoal border border-white/15 text-sm font-mono text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <i className="fa-solid fa-plug-circle-check"></i>
              <span>Connect &amp; Sync Now</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">
            <i className="fa-solid fa-circle-info text-cyan-400 mr-1"></i>
            For permanent publishing, configure this URL in your environment or use the connection field above.
          </p>
        </form>

        {/* Architecture & Folder Setup Guide */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left: Folder Structure Blueprint */}
          <div className="bg-obsidian/70 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-folder-tree text-amber-400"></i>
              <span>1. Your Google Drive Folder Structure</span>
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Share your master folder as <strong>&quot;Anyone with the link can view&quot;</strong>. Add numbers (<code className="text-gray-200">01_</code>, <code className="text-gray-200">02_</code>) to control the tab order—the website strips them automatically.
            </p>
            <pre className="bg-charcoal p-4 rounded-xl border border-white/5 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
📁 Rami_Hendi_Visual_Studio_CMS
 ├── 📄 Rami_Hendi_CV (Google Doc)
 └── 📁 Portfolio (Main Folder)
      ├── 📁 01_Architectural_Visualization
      │    ├── 🖼️ Villa_Dusk_Render.jpg
      │    └── 🖼️ Commercial_Tower.png
      ├── 📁 02_Interior_&_Kitchen_Design
      │    └── 🖼️ Luxury_Kitchen_Island.jpg
      ├── 📁 03_Product_&_3D_Modeling
      │    └── 🖼️ Mechanical_Assembly.jpg
      └── 📁 04_Animations_&_Technical_Tools
           └── 🎬 Studio_Showreel.mp4
            </pre>
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-200">
              <strong>Pro Tip:</strong> Right-click any image or video in Google Drive → <em>File Information → Details</em> and type software notes in the <strong>Description</strong> field. They will appear automatically in your 4K Lightbox!
            </div>
          </div>

          {/* Right: Ready-to-Copy Google Apps Script Code */}
          <div className="bg-obsidian/70 border border-white/10 rounded-2xl p-5 space-y-4 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                <i className="fa-solid fa-code text-cyan-400"></i>
                <span>2. Google Apps Script Code (script.google.com)</span>
              </h3>
              <button
                type="button"
                onClick={handleCopyScript}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'}></i>
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Paste this at{' '}
              <a
                href="https://script.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline"
              >
                script.google.com
              </a>
              , insert your Doc ID and Folder ID, and click <strong>Deploy → New Deployment → Web App (Anyone)</strong>.
            </p>
            <pre className="flex-1 bg-charcoal p-4 rounded-xl border border-white/5 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-64 leading-relaxed">
              {APPS_SCRIPT_TEMPLATE}
            </pre>
          </div>

        </div>
      </div>
    </section>
  );
};

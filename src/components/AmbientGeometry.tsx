import React from 'react';

export const AmbientGeometry: React.FC = React.memo(() => {
  return (
    <div
      aria-hidden="true"
      className="ambient-geometry fixed inset-0 z-0 pointer-events-none overflow-hidden select-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_46%_at_83%_13%,rgba(255,255,255,0.06),transparent_69%),radial-gradient(ellipse_52%_42%_at_13%_87%,rgba(255,255,255,0.045),transparent_69%)]" />

      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-75"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="whiteGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="whiteGlowStrong" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4.5" result="wideBlur" />
            <feGaussianBlur stdDeviation="1.5" result="tightBlur" />
            <feMerge>
              <feMergeNode in="wideBlur" />
              <feMergeNode in="tightBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <linearGradient id="lineFadeHorizontal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="22%" stopColor="#F4F4F5" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.12" />
            <stop offset="82%" stopColor="#F4F4F5" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="lineFadeDiagonal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="72%" stopColor="#E4E4E7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="lineFadeVertical" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="30%" stopColor="#F4F4F5" stopOpacity="0.16" />
            <stop offset="70%" stopColor="#E4E4E7" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
          </linearGradient>

          <linearGradient id="wireframeFacet" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#E4E4E7" stopOpacity="0.17" />
            <stop offset="100%" stopColor="#D4D4D8" stopOpacity="0.07" />
          </linearGradient>
        </defs>

        <g strokeWidth="1" fill="none">
          <line x1="0" y1="168" x2="1440" y2="168" stroke="url(#lineFadeHorizontal)" />
          <line x1="0" y1="540" x2="1440" y2="540" stroke="url(#lineFadeHorizontal)" opacity="0.65" />
          <line x1="0" y1="774" x2="1440" y2="774" stroke="url(#lineFadeHorizontal)" opacity="0.55" />

          <path d="M -80 320 L 640 -40" stroke="url(#lineFadeDiagonal)" />
          <path d="M 840 -40 L 1520 355" stroke="url(#lineFadeDiagonal)" />
          <path d="M -60 880 L 760 440 L 1500 840" stroke="url(#lineFadeDiagonal)" opacity="0.8" />
          <path d="M 1060 0 L 1060 900" stroke="url(#lineFadeVertical)" />
          <path d="M 380 0 L 380 900" stroke="url(#lineFadeVertical)" opacity="0.65" />
        </g>

        <g
          className="geo-float-slow"
          stroke="url(#wireframeFacet)"
          strokeWidth="1.05"
          fill="none"
          filter="url(#whiteGlow)"
        >
          <polygon points="1180,68 1345,162 1345,350 1180,444 1015,350 1015,162" />
          <line x1="1180" y1="68" x2="1180" y2="256" />
          <line x1="1180" y1="256" x2="1345" y2="350" />
          <line x1="1180" y1="256" x2="1015" y2="350" />
          <line x1="1015" y1="162" x2="1180" y2="256" strokeOpacity="0.55" />
          <line x1="1345" y1="162" x2="1180" y2="256" strokeOpacity="0.55" />
          <polygon
            points="1180,148 1272,201 1272,307 1180,360 1088,307 1088,201"
            strokeOpacity="0.65"
          />
          <circle
            cx="1180"
            cy="256"
            r="215"
            stroke="#FFFFFF"
            strokeOpacity="0.13"
            strokeDasharray="4 10"
          />
        </g>

        <g
          className="geo-float-reverse"
          stroke="url(#wireframeFacet)"
          strokeWidth="1.05"
          fill="none"
          filter="url(#whiteGlow)"
        >
          <polygon points="180,570 320,650 320,810 180,890 40,810 40,650" />
          <line x1="180" y1="570" x2="180" y2="730" />
          <line x1="180" y1="730" x2="320" y2="810" />
          <line x1="180" y1="730" x2="40" y2="810" />
          <polyline points="-40,730 180,730 430,585" strokeOpacity="0.5" />
          <circle
            cx="180"
            cy="730"
            r="175"
            stroke="#FFFFFF"
            strokeOpacity="0.11"
            strokeDasharray="3 9"
          />
        </g>

        <g filter="url(#whiteGlowStrong)" fill="none" strokeLinecap="round">
          <path
            d="M 0 168 L 1440 168"
            stroke="#FFFFFF"
            strokeOpacity="0.72"
            strokeWidth="1.45"
            className="geo-trace geo-trace-1"
          />
          <path
            d="M 840 -40 L 1180 148 L 1345 162 L 1345 350 L 1180 444 L 1015 350"
            stroke="#FFFFFF"
            strokeOpacity="0.7"
            strokeWidth="1.4"
            className="geo-trace geo-trace-2"
          />
          <path
            d="M -60 880 L 320 676 L 760 440 L 1500 840"
            stroke="#F4F4F5"
            strokeOpacity="0.65"
            strokeWidth="1.35"
            className="geo-trace geo-trace-3"
          />
          <path
            d="M 1060 0 L 1060 900"
            stroke="#FFFFFF"
            strokeOpacity="0.55"
            strokeWidth="1.25"
            className="geo-trace geo-trace-4"
          />
          <path
            d="M -80 320 L 640 -40"
            stroke="#FFFFFF"
            strokeOpacity="0.65"
            strokeWidth="1.35"
            className="geo-trace geo-trace-5"
          />
        </g>

        <g filter="url(#whiteGlow)">
          <circle cx="1180" cy="256" r="2.4" fill="#FFFFFF" className="geo-node geo-node-1" />
          <circle cx="1345" cy="162" r="2" fill="#E4E4E7" className="geo-node geo-node-2" />
          <circle cx="1060" cy="168" r="2.2" fill="#FFFFFF" className="geo-node geo-node-3" />
          <circle cx="180" cy="730" r="2.2" fill="#E4E4E7" className="geo-node geo-node-2" />
          <circle cx="380" cy="540" r="1.9" fill="#FFFFFF" className="geo-node geo-node-1" />
        </g>
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_52%,rgba(5,5,6,0.48)_100%)]" />
    </div>
  );
});

AmbientGeometry.displayName = 'AmbientGeometry';

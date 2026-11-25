import React from 'react';

const LOGO_LEFT_ARROW_H =
  'M 200 0 L 200 239 L 158 215 L 158 140 L 108 140 L 107 186 L 0 119.5 L 107 53 L 108 99 L 158 99 L 158 24 Z';

const LOGO_R_UPPER_COUNTER =
  'M 244 83 L 273 83 A 12 12 0 0 1 273 107 L 244 107 Z';

const LOGO_R_LOWER_SHARD =
  'M 243 149 L 259 149 L 278 195 L 244 216 Z';

const LOGO_RIGHT_WING =
  'M 321 71 L 400 119.5 L 315 172 L 302 142 C 322 128 331 98 321 71 Z';

interface LogoWireframeProps {
  translateX: number;
  translateY: number;
  scale: number;
  floatClass: string;
  compassRadius: number;
  compassDash: string;
  compassOpacity: number;
  primaryTraceClass: string;
  secondaryTraceClass: string;
  primaryNodeClass: string;
  secondaryNodeClass: string;
  accentNodeClass: string;
}

const LogoWireframe: React.FC<LogoWireframeProps> = ({
  translateX,
  translateY,
  scale,
  floatClass,
  compassRadius,
  compassDash,
  compassOpacity,
  primaryTraceClass,
  secondaryTraceClass,
  primaryNodeClass,
  secondaryNodeClass,
  accentNodeClass,
}) => {
  const baseStroke = 1.05 / scale;
  const traceStroke = 1.4 / scale;
  const secondaryTraceStroke = 1.3 / scale;
  const nodeRadiusLg = 2.3 / scale;
  const nodeRadiusMd = 2.0 / scale;

  return (
    <g className={floatClass}>
      <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
        <g
          stroke="url(#wireframeFacet)"
          strokeWidth={baseStroke}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          filter="url(#whiteGlow)"
        >
          <path d={LOGO_LEFT_ARROW_H} />
          <path d={LOGO_R_UPPER_COUNTER} />
          <path d={LOGO_R_LOWER_SHARD} />
          <path d={LOGO_RIGHT_WING} />

          <circle
            cx="200"
            cy="119.5"
            r={compassRadius}
            stroke="#FFFFFF"
            strokeWidth={1 / scale}
            strokeOpacity={compassOpacity}
            strokeDasharray={compassDash}
          />
        </g>

        <g filter="url(#whiteGlowStrong)" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path
            d={LOGO_LEFT_ARROW_H}
            pathLength={1400}
            stroke="#FFFFFF"
            strokeOpacity="0.72"
            strokeWidth={traceStroke}
            className={`geo-trace ${primaryTraceClass}`}
          />
          <path
            d={`${LOGO_RIGHT_WING} ${LOGO_R_LOWER_SHARD}`}
            pathLength={1400}
            stroke="#F4F4F5"
            strokeOpacity="0.65"
            strokeWidth={secondaryTraceStroke}
            className={`geo-trace ${secondaryTraceClass}`}
          />
        </g>

        <g filter="url(#whiteGlow)">
          <circle cx="0" cy="119.5" r={nodeRadiusLg} fill="#FFFFFF" className={`geo-node ${primaryNodeClass}`} />
          <circle cx="200" cy="0" r={nodeRadiusMd} fill="#E4E4E7" className={`geo-node ${secondaryNodeClass}`} />
          <circle cx="400" cy="119.5" r={nodeRadiusLg} fill="#FFFFFF" className={`geo-node ${accentNodeClass}`} />
        </g>
      </g>
    </g>
  );
};

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
          <line x1="0" y1="256" x2="1440" y2="256" stroke="url(#lineFadeHorizontal)" />
          <line x1="0" y1="540" x2="1440" y2="540" stroke="url(#lineFadeHorizontal)" opacity="0.6" />
          <line x1="0" y1="725" x2="1440" y2="725" stroke="url(#lineFadeHorizontal)" opacity="0.55" />

          <path d="M -80 320 L 640 -40" stroke="url(#lineFadeDiagonal)" />
          <path d="M 840 -40 L 1520 355" stroke="url(#lineFadeDiagonal)" />
          <path d="M -60 880 L 760 440 L 1500 840" stroke="url(#lineFadeDiagonal)" opacity="0.8" />
          <path d="M 1180 0 L 1180 900" stroke="url(#lineFadeVertical)" />
          <path d="M 380 0 L 380 900" stroke="url(#lineFadeVertical)" opacity="0.65" />
        </g>

        <LogoWireframe
          translateX={980}
          translateY={136}
          scale={1}
          floatClass="geo-float-slow"
          compassRadius={228}
          compassDash="4 10"
          compassOpacity={0.13}
          primaryTraceClass="geo-trace-2"
          secondaryTraceClass="geo-trace-5"
          primaryNodeClass="geo-node-1"
          secondaryNodeClass="geo-node-2"
          accentNodeClass="geo-node-3"
        />

        <LogoWireframe
          translateX={45}
          translateY={629}
          scale={0.8}
          floatClass="geo-float-reverse"
          compassRadius={218}
          compassDash="3 9"
          compassOpacity={0.11}
          primaryTraceClass="geo-trace-3"
          secondaryTraceClass="geo-trace-2"
          primaryNodeClass="geo-node-2"
          secondaryNodeClass="geo-node-1"
          accentNodeClass="geo-node-3"
        />

        <g filter="url(#whiteGlowStrong)" fill="none" strokeLinecap="round">
          <path
            d="M 0 256 L 1440 256"
            stroke="#FFFFFF"
            strokeOpacity="0.72"
            strokeWidth="1.45"
            className="geo-trace geo-trace-1"
          />
          <path
            d="M 1180 0 L 1180 900"
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
          <circle cx="1180" cy="256" r="2.2" fill="#FFFFFF" className="geo-node geo-node-3" />
          <circle cx="380" cy="540" r="1.9" fill="#FFFFFF" className="geo-node geo-node-1" />
        </g>
      </svg>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_52%,rgba(5,5,6,0.48)_100%)]" />
    </div>
  );
});

AmbientGeometry.displayName = 'AmbientGeometry';

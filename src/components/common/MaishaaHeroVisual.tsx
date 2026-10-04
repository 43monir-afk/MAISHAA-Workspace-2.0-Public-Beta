import React from 'react';

export const MaishaaHeroVisual: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[420px] h-auto',
}) => {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      {/* Soft Ambient Backdrop Glow */}
      <div className="absolute -inset-4 bg-gradient-to-tr from-teal-500/15 via-blue-500/10 to-purple-500/15 rounded-3xl blur-2xl -z-10" />

      <svg
        viewBox="0 0 520 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xl"
      >
        <defs>
          {/* Base Workspace Surface Gradient */}
          <linearGradient id="hero-base-surface" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f1d38" />
            <stop offset="100%" stopColor="#081020" />
          </linearGradient>

          {/* Card Gradients */}
          <linearGradient id="hero-pdf-card" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#fff1f2" />
          </linearGradient>
          <linearGradient id="hero-doc-card" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#eff6ff" />
          </linearGradient>
          <linearGradient id="hero-sheet-card" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#ecfdf5" />
          </linearGradient>
          <linearGradient id="hero-ai-chip" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Drop Shadows */}
          <filter id="hero-card-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#040914" floodOpacity="0.35" />
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#040914" floodOpacity="0.2" />
          </filter>
          <filter id="hero-ai-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#7c3aed" floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Isometric Base Plate */}
        <g transform="translate(10, 20)">
          {/* Main Workspace 3D Layer (Doc Intel / Word) */}
          <g filter="url(#hero-card-shadow)" transform="translate(60, 40)">
            <rect width="280" height="190" rx="16" fill="url(#hero-doc-card)" stroke="#cbd5e1" strokeWidth="1.5" />
            {/* Header bar */}
            <rect x="20" y="20" width="40" height="8" rx="4" fill="#2563eb" />
            <rect x="70" y="22" width="70" height="5" rx="2.5" fill="#94a3b8" />
            <circle cx="250" cy="24" r="5" fill="#10b981" />
            {/* Document Lines */}
            <rect x="20" y="44" width="220" height="4" rx="2" fill="#e2e8f0" />
            <rect x="20" y="56" width="190" height="4" rx="2" fill="#e2e8f0" />
            <rect x="20" y="68" width="210" height="4" rx="2" fill="#e2e8f0" />
            <rect x="20" y="80" width="160" height="4" rx="2" fill="#e2e8f0" />
            {/* Embedded Table Motif */}
            <rect x="20" y="100" width="240" height="65" rx="8" fill="#f8fafc" stroke="#e2e8f0" />
            <line x1="20" y1="122" x2="260" y2="122" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="20" y1="144" x2="260" y2="144" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="90" y1="100" x2="90" y2="165" stroke="#e2e8f0" strokeWidth="1" />
            <line x1="170" y1="100" x2="170" y2="165" stroke="#e2e8f0" strokeWidth="1" />
          </g>

          {/* Elevated Front Card (Spreadsheet / Analytics) */}
          <g filter="url(#hero-card-shadow)" transform="translate(190, 110)">
            <rect width="250" height="160" rx="16" fill="url(#hero-sheet-card)" stroke="#a7f3d0" strokeWidth="1.5" />
            {/* Green Header */}
            <rect x="18" y="18" width="36" height="8" rx="4" fill="#059669" />
            <rect x="62" y="20" width="80" height="5" rx="2.5" fill="#6ee7b7" />
            <rect x="200" y="16" width="32" height="12" rx="4" fill="#d1fae5" />
            <text x="216" y="25" fill="#047857" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">100%</text>

            {/* Mini Bar Chart Graphic */}
            <g transform="translate(20, 45)">
              <rect x="10" y="45" width="18" height="35" rx="3" fill="#10b981" />
              <rect x="36" y="25" width="18" height="55" rx="3" fill="#059669" />
              <rect x="62" y="10" width="18" height="70" rx="3" fill="#047857" />
              <rect x="88" y="30" width="18" height="50" rx="3" fill="#10b981" />
              <rect x="114" y="15" width="18" height="65" rx="3" fill="#059669" />
              <line x1="0" y1="80" x2="140" y2="80" stroke="#cbd5e1" strokeWidth="1" />
            </g>

            {/* Data rows beside chart */}
            <rect x="165" y="50" width="65" height="10" rx="3" fill="#d1fae5" />
            <rect x="165" y="66" width="55" height="6" rx="2" fill="#e2e8f0" />
            <rect x="165" y="78" width="60" height="6" rx="2" fill="#e2e8f0" />
            <rect x="165" y="90" width="50" height="6" rx="2" fill="#e2e8f0" />
          </g>

          {/* Elevated Floating PDF Pill Tag */}
          <g filter="url(#hero-card-shadow)" transform="translate(30, 160)">
            <rect width="130" height="65" rx="14" fill="url(#hero-pdf-card)" stroke="#fecdd3" strokeWidth="1.5" />
            <circle cx="30" cy="32" r="14" fill="#ffe4e6" />
            <path d="M25 25 H35 L38 28 V39 H25 Z" fill="#e11d48" />
            <text x="31.5" y="34.5" fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">PDF</text>
            <text x="54" y="28" fill="#881337" fontSize="10" fontWeight="bold" fontFamily="sans-serif">Verified</text>
            <text x="54" y="42" fill="#be123c" fontSize="8" fontFamily="sans-serif">Client-Side</text>
          </g>

          {/* AI Intelligence Floating Orb / Badge */}
          <g filter="url(#hero-ai-shadow)" transform="translate(360, 20)">
            <rect width="115" height="56" rx="14" fill="url(#hero-ai-chip)" />
            <circle cx="28" cy="28" r="14" fill="#ffffff" fillOpacity="0.2" />
            {/* Sparkle icon */}
            <path d="M28 19 L30 25 L36 28 L30 31 L28 37 L26 31 L20 28 L26 25 Z" fill="#ffffff" />
            <text x="50" y="26" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="sans-serif">MAISHAA</text>
            <text x="50" y="38" fill="#e9d5ff" fontSize="8" fontWeight="600" fontFamily="sans-serif">AI Powered</text>
          </g>

          {/* Connection Curves (Subtle 3D routing lines) */}
          <path
            d="M160 190 C 220 220, 260 210, 310 180"
            stroke="#2dd4bf"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeOpacity="0.6"
          />
        </g>
      </svg>
    </div>
  );
};

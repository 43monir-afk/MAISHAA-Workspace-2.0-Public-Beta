import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'badge' | 'circular';
}

export const Logo: React.FC<LogoProps> = ({
  className = 'w-9 h-9',
  size = 36,
  variant = 'circular',
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-label="MAISHAA ANNEXTURE TOOLS Official Logo"
    >
      <defs>
        {/* Shadow filter for depth */}
        <filter id="msh-logo-sh" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#091e3a" floodOpacity="0.2" />
        </filter>
        <clipPath id="msh-inner-circle-clip">
          <circle cx="250" cy="250" r="222" />
        </clipPath>
      </defs>

      {/* --- Outer Circular Double Ring Frame --- */}
      <circle cx="250" cy="250" r="240" stroke="#091e3a" strokeWidth="12" fill="#ffffff" filter="url(#msh-logo-sh)" />
      <circle cx="250" cy="250" r="222" stroke="#091e3a" strokeWidth="3" fill="#ffffff" />

      {/* --- Inner Clipped Artwork Area --- */}
      <g clipPath="url(#msh-inner-circle-clip)">
        {/* 1. Grand Dark Navy "M" Watermark Architectural Crest */}
        <path
          d="M 130 70 L 195 70 L 250 180 L 305 70 L 370 70 L 360 290 L 320 290 L 325 130 L 265 240 L 235 240 L 175 130 L 180 290 L 140 290 Z"
          fill="#091e3a"
          opacity="0.95"
        />

        {/* 2. Left Background: Stack of Document Format Cards (PDF, DOCX, JPG, PNG) */}
        <g transform="translate(60, 110)">
          {/* Back document shadow outline */}
          <rect x="15" y="10" width="65" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
          <rect x="25" y="0" width="65" height="120" rx="8" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />

          {/* Blue PDF Card */}
          <g transform="translate(0, 30)">
            <rect width="68" height="34" rx="6" fill="#0284c7" />
            <path d="M10 10 H22 V24 H10 Z" fill="#ffffff" fillOpacity="0.3" />
            <text x="38" y="22" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle">PDF</text>
          </g>

          {/* Green DOCX Card */}
          <g transform="translate(6, 68)">
            <rect width="72" height="34" rx="6" fill="#10b981" />
            <text x="40" y="22" fill="#ffffff" fontSize="12" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle">DOCX</text>
          </g>

          {/* Purple JPG Card */}
          <g transform="translate(12, 106)">
            <rect width="68" height="34" rx="6" fill="#8b5cf6" />
            <text x="38" y="22" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle">JPG</text>
          </g>

          {/* Cyan PNG Card */}
          <g transform="translate(16, 144)">
            <rect width="68" height="34" rx="6" fill="#06b6d4" />
            <text x="38" y="22" fill="#ffffff" fontSize="13" fontWeight="900" fontFamily="system-ui, sans-serif" textAnchor="middle">PNG</text>
          </g>
        </g>

        {/* Potted Plant on Left Desk */}
        <g transform="translate(35, 195)">
          {/* White Pot */}
          <polygon points="12,75 38,75 34,95 16,95" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Leaves */}
          <path d="M25 75 Q25 45 10 40 Q25 55 25 75 Z" fill="#10b981" />
          <path d="M25 70 Q35 40 45 42 Q30 55 25 70 Z" fill="#059669" />
          <path d="M25 60 Q20 30 25 20 Q30 35 25 60 Z" fill="#34d399" />
        </g>

        {/* 3. Right Background: Document with Checkboxes & Gears */}
        <g transform="translate(365, 160)">
          {/* Document Base */}
          <rect width="85" height="120" rx="8" fill="#ffffff" stroke="#0284c7" strokeWidth="2.5" />
          {/* Header Lines */}
          <rect x="12" y="18" width="45" height="4" rx="2" fill="#cbd5e1" />
          <rect x="12" y="26" width="38" height="4" rx="2" fill="#cbd5e1" />
          {/* Checkboxes with checks */}
          <rect x="58" y="38" width="14" height="14" rx="3" fill="#0284c7" />
          <path d="M62 45 L65 48 L70 42" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          <rect x="58" y="58" width="14" height="14" rx="3" fill="#0284c7" />
          <path d="M62 65 L65 68 L70 62" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          <rect x="58" y="78" width="14" height="14" rx="3" fill="#0284c7" />
          <path d="M62 85 L65 88 L70 82" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Text Placeholder Lines */}
          <rect x="12" y="44" width="38" height="3" rx="1.5" fill="#e2e8f0" />
          <rect x="12" y="64" width="38" height="3" rx="1.5" fill="#e2e8f0" />
          <rect x="12" y="84" width="38" height="3" rx="1.5" fill="#e2e8f0" />

          {/* Gear Motif Top-Right */}
          <g transform="translate(45, -12)">
            <circle cx="20" cy="20" r="14" fill="#091e3a" />
            <circle cx="20" cy="20" r="6" fill="#ffffff" />
            {/* Gear teeth */}
            <rect x="18" y="2" width="4" height="6" rx="1" fill="#091e3a" />
            <rect x="18" y="32" width="4" height="6" rx="1" fill="#091e3a" />
            <rect x="2" y="18" width="6" height="4" rx="1" fill="#091e3a" />
            <rect x="32" y="18" width="6" height="4" rx="1" fill="#091e3a" />
          </g>
        </g>

        {/* Pencil Cup & Books on Right Desk */}
        <g transform="translate(385, 235)">
          {/* Books Stack */}
          <rect x="10" y="30" width="70" height="12" rx="2" fill="#0f766e" />
          <rect x="10" y="16" width="65" height="12" rx="2" fill="#0284c7" />
          {/* Navy Pen Holder */}
          <rect x="0" y="8" width="28" height="34" rx="3" fill="#091e3a" />
          {/* Pens */}
          <line x1="8" y1="8" x2="5" y2="-8" stroke="#091e3a" strokeWidth="3" strokeLinecap="round" />
          <line x1="14" y1="8" x2="14" y2="-12" stroke="#091e3a" strokeWidth="3" strokeLinecap="round" />
          <line x1="20" y1="8" x2="23" y2="-6" stroke="#091e3a" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* 4. Desk Surface Foreground Base */}
        <rect x="30" y="280" width="440" height="30" fill="#ffffff" stroke="#e2e8f0" strokeWidth="2" />
        <line x1="20" y1="282" x2="480" y2="282" stroke="#cbd5e1" strokeWidth="2.5" />

        {/* 5. Center Characters: Maishaa (Girl) & Medhaat (Boy) */}

        {/* Maishaa (Left Character) */}
        <g id="msh-girl" transform="translate(125, 110)">
          {/* Dark Blue Dress / Body */}
          <path d="M 5 170 Q 20 70 70 70 Q 120 70 135 170 Z" fill="#0c4a6e" />
          {/* Embroidered White Motif on Neckline */}
          <path d="M 60 75 Q 70 95 80 75" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeDasharray="2 2" />
          <path d="M 55 90 Q 70 120 85 90" stroke="#ffffff" strokeWidth="2" fill="none" strokeDasharray="3 2" />

          {/* Neck */}
          <rect x="62" y="55" width="16" height="20" fill="#fed7aa" rx="4" />

          {/* Maishaa Face */}
          <ellipse cx="70" cy="45" rx="22" ry="26" fill="#fed7aa" />

          {/* Beautiful White Headscarf / Dupatta Draped with delicate shading */}
          <path
            d="M 40 40 C 35 -10, 105 -10, 100 40 C 102 75, 115 110, 135 170 L 60 170 C 45 130, 38 80, 40 40 Z"
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="1.5"
          />
          {/* Delicate Lace Edging on Dupatta */}
          <path
            d="M 46 25 Q 70 5 94 25 Q 100 55 95 85 Q 70 100 50 85 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1"
            strokeDasharray="3 2"
          />

          {/* Inner Face Opening */}
          <ellipse cx="72" cy="46" rx="18" ry="22" fill="#fed7aa" />

          {/* Hair Framing Face */}
          <path d="M 56 42 Q 68 28 86 36 Q 88 46 86 52 Q 74 38 56 42 Z" fill="#1e293b" />

          {/* Beautiful Eyes with Eyelashes */}
          <ellipse cx="66" cy="44" rx="3.5" ry="4" fill="#0f172a" />
          <circle cx="65" cy="42.5" r="1.3" fill="#ffffff" />
          <path d="M 62 39 Q 67 36 71 39" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />

          <ellipse cx="80" cy="44" rx="3.5" ry="4" fill="#0f172a" />
          <circle cx="79" cy="42.5" r="1.3" fill="#ffffff" />
          <path d="M 76 39 Q 81 36 85 39" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />

          {/* Warm Rosy Cheeks */}
          <ellipse cx="61" cy="51" rx="4" ry="2.2" fill="#fda4af" opacity="0.6" />
          <ellipse cx="85" cy="51" rx="4" ry="2.2" fill="#fda4af" opacity="0.6" />

          {/* Sweet Smile */}
          <path d="M 68 53 Q 73 59 78 53" stroke="#b91c1c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>

        {/* Medhaat (Boy Character on Right) */}
        <g id="msh-boy" transform="translate(265, 140)">
          {/* Teal Hoodie / Body */}
          <path d="M 5 140 Q 25 45 65 45 Q 105 45 115 140 Z" fill="#0f766e" />
          {/* White Hoodie Drawstrings */}
          <line x1="58" y1="65" x2="58" y2="105" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="72" y1="65" x2="72" y2="105" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

          {/* Neck */}
          <rect x="57" y="35" width="16" height="18" fill="#fde68a" rx="4" />

          {/* Medhaat Face */}
          <ellipse cx="65" cy="28" rx="20" ry="23" fill="#fde68a" />

          {/* Black Short Hair */}
          <path d="M 45 22 Q 65 2 85 22 Q 86 32 82 36 Q 65 14 47 28 Z" fill="#0f172a" />

          {/* Dark Teal Baseball Cap (Visor facing forward) */}
          <path d="M 42 18 C 42 -5, 88 -5, 88 18 Z" fill="#0f766e" />
          <ellipse cx="65" cy="18" rx="24" ry="7" fill="#0d9488" />
          {/* Cap Visor Bill */}
          <path d="M 40 18 Q 20 22 28 30 Q 55 24 65 20 Z" fill="#094e4a" />

          {/* Boy Cheerful Eyes */}
          <ellipse cx="58" cy="27" rx="3.2" ry="3.8" fill="#0f172a" />
          <circle cx="57" cy="25.5" r="1.3" fill="#ffffff" />
          <path d="M 54 22 Q 58 19 62 22" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />

          <ellipse cx="71" cy="27" rx="3.2" ry="3.8" fill="#0f172a" />
          <circle cx="70" cy="25.5" r="1.3" fill="#ffffff" />
          <path d="M 68 22 Q 72 19 76 22" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" />

          {/* Cheerful Friendly Smile */}
          <path d="M 60 35 Q 66 42 72 35" stroke="#991b1b" strokeWidth="2.2" strokeLinecap="round" fill="none" />

          {/* Writing Hand & Notebook on Desk */}
          <rect x="30" y="110" width="70" height="22" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="38" y1="118" x2="85" y2="118" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="38" y1="124" x2="75" y2="124" stroke="#cbd5e1" strokeWidth="1.5" />
          {/* Pen in Hand */}
          <line x1="50" y1="95" x2="68" y2="115" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
          <circle cx="54" cy="102" r="5" fill="#fde68a" />
        </g>

        {/* 6. Modern Laptop on Center Desk */}
        <g transform="translate(165, 225)">
          {/* Laptop Base */}
          <polygon points="5,56 140,56 148,65 -3,65" fill="#94a3b8" />
          <polygon points="6,57 138,57 144,63 0,63" fill="#cbd5e1" />
          {/* Laptop Open Screen */}
          <polygon points="35,0 145,0 140,56 30,56" fill="#0f172a" />
          <polygon points="38,3 142,3 138,53 34,53" fill="#f8fafc" />
          {/* Glowing Laptop Emblem on back */}
          <circle cx="88" cy="26" r="6" fill="#cbd5e1" />
        </g>
      </g>

      {/* --- 7. Lower Official Brand Typography --- */}
      {/* "MAISHAA" in bold dark navy */}
      <text
        x="250"
        y="355"
        fill="#091e3a"
        fontSize="54"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="2.5"
        textAnchor="middle"
      >
        MAISHAA
      </text>

      {/* "ANNEXTURE TOOLS" Navy Rounded Pill */}
      <rect x="95" y="372" width="310" height="34" rx="17" fill="#091e3a" />
      <text
        x="250"
        y="395"
        fill="#ffffff"
        fontSize="17"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="3"
        textAnchor="middle"
      >
        ANNEXTURE TOOLS
      </text>

      {/* Decorative Bottom Balance Lines + Document Gear Icon */}
      <g transform="translate(135, 416)">
        <line x1="0" y1="12" x2="85" y2="12" stroke="#091e3a" strokeWidth="2.5" strokeLinecap="round" />
        {/* Document Icon with Gear Motif */}
        <g transform="translate(92, -2)">
          <rect x="2" y="2" width="28" height="34" rx="4" fill="#ffffff" stroke="#091e3a" strokeWidth="2.5" />
          <line x1="8" y1="10" x2="24" y2="10" stroke="#091e3a" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="16" x2="24" y2="16" stroke="#091e3a" strokeWidth="2" strokeLinecap="round" />
          <line x1="8" y1="22" x2="18" y2="22" stroke="#091e3a" strokeWidth="2" strokeLinecap="round" />
          {/* Gear overlay */}
          <circle cx="28" cy="28" r="9" fill="#091e3a" />
          <circle cx="28" cy="28" r="4" fill="#ffffff" />
        </g>
        <line x1="145" y1="12" x2="230" y2="12" stroke="#091e3a" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
};

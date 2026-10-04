import React from 'react';

export const MaishaaHeroStudents: React.FC<{ className?: string }> = ({
  className = 'w-full max-w-[480px] h-auto',
}) => {
  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      {/* Cinematic Studio Backdrop Glow */}
      <div className="absolute -inset-3 bg-gradient-to-tr from-blue-600/20 via-teal-500/15 to-indigo-600/20 rounded-3xl blur-2xl -z-10" />

      <svg
        viewBox="0 0 680 370"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xl"
        role="img"
        aria-label="MAISHAA & Medhaat - Professional Workspace Showcase"
      >
        <defs>
          {/* Studio Backdrop Gradient */}
          <linearGradient id="studio-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#f8fafc" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.98" />
          </linearGradient>

          {/* Desk Surface & Specular Highlights */}
          <linearGradient id="desk-mat-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="25%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="desk-wood-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* 3D Blazer Gradients (Tailored Navy Fabric with Specular Highlights) */}
          <linearGradient id="blazer-maishaa" x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="35%" stopColor="#172554" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          <linearGradient id="blazer-medhaat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="30%" stopColor="#1e3a8a" />
            <stop offset="75%" stopColor="#172554" />
            <stop offset="100%" stopColor="#0b1329" />
          </linearGradient>
          <linearGradient id="lapel-dark" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0a0f1d" />
          </linearGradient>

          {/* Skin Tones with 3D Subsurface Glow */}
          <radialGradient id="skin-maishaa" cx="45%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff1eb" />
            <stop offset="55%" stopColor="#fed7aa" />
            <stop offset="90%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#fb923c" stopOpacity="0.8" />
          </radialGradient>
          <radialGradient id="skin-medhaat" cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#fff3e8" />
            <stop offset="60%" stopColor="#fde68a" />
            <stop offset="90%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.75" />
          </radialGradient>

          {/* Hair Gloss and Volume */}
          <linearGradient id="hair-maishaa" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="25%" stopColor="#1e293b" />
            <stop offset="65%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="hair-highlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" stopOpacity="0" />
            <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#64748b" stopOpacity="0" />
          </linearGradient>

          {/* Tie Gradients */}
          <linearGradient id="tie-maishaa" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
          <linearGradient id="tie-medhaat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="50%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#075985" />
          </linearGradient>

          {/* Laptop 3D Aluminum & Screen */}
          <linearGradient id="laptop-case" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#e2e8f0" />
            <stop offset="85%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="laptop-screen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="40%" stopColor="#0369a1" />
            <stop offset="100%" stopColor="#0a192f" />
          </linearGradient>
          <linearGradient id="laptop-glow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </linearGradient>

          {/* Ceramic Mug Cylindrical Gradient */}
          <linearGradient id="mug-cylinder" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#f8fafc" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="90%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          {/* Drop Shadows */}
          <filter id="soft-3d-shadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#091e3a" floodOpacity="0.18" />
          </filter>
          <filter id="badge-3d-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.22" />
          </filter>
          <filter id="desk-cast-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#091e3a" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* --- 1. Background Rounded Showcase Canvas --- */}
        <rect width="680" height="370" rx="28" fill="url(#studio-bg)" />

        {/* Ambient Studio Lighting Mesh */}
        <circle cx="160" cy="110" r="140" fill="#3b82f6" fillOpacity="0.06" />
        <circle cx="340" cy="190" r="160" fill="#14b8a6" fillOpacity="0.05" />
        <circle cx="530" cy="90" r="130" fill="#6366f1" fillOpacity="0.05" />

        {/* --- 2. Executive Study Desk & Horizon --- */}
        {/* Soft shadow under desk */}
        <ellipse cx="340" cy="318" rx="310" ry="18" fill="#091e3a" fillOpacity="0.08" />

        {/* Desk Horizon Surface */}
        <g id="executive-desk" filter="url(#desk-cast-shadow)">
          {/* Main Desk Beveled Top Surface */}
          <polygon points="18,300 662,300 644,352 36,352" fill="url(#desk-wood-grad)" />
          {/* Specular Front Rim */}
          <polygon points="36,352 644,352 640,358 40,358" fill="#334155" />
          <line x1="20" y1="300" x2="660" y2="300" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.5" />
          {/* Executive Leather Desk Blotter */}
          <polygon points="140,303 540,303 528,348 152,348" fill="#0f172a" />
          <polygon points="142,305 538,305 526,346 154,346" fill="#1e293b" />
          {/* Stitched Edge Detail */}
          <line x1="148" y1="307" x2="532" y2="307" stroke="#334155" strokeDasharray="3 3" strokeWidth="1" />
        </g>

        {/* --- 3. Screen Glow Reflection on Desk --- */}
        <polygon points="230,303 450,303 480,345 200,345" fill="url(#laptop-glow)" />

        {/* --- 4. Formal Characters (Maishaa & Medhaat) --- */}

        {/* ======================================================== */}
        {/* CHARACTER 1: MAISHAA (Formal Smart Girl, Left)           */}
        {/* ======================================================== */}
        <g id="character-maishaa" transform="translate(100, 36)" filter="url(#soft-3d-shadow)">
          {/* Back Volume of Hair */}
          <path
            d="M 68 85 C 48 140, 52 210, 68 255 C 80 262, 120 262, 132 255 C 148 210, 152 140, 132 85 Z"
            fill="url(#hair-maishaa)"
          />

          {/* Tailored Navy Blazer Body */}
          <path
            d="M 40 265 Q 60 148 100 146 Q 140 148 160 265 Z"
            fill="url(#blazer-maishaa)"
          />

          {/* Structured Shoulder Seams */}
          <path d="M 42 260 C 50 185, 70 152, 98 147" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.2" fill="none" />
          <path d="M 158 260 C 150 185, 130 152, 102 147" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.2" fill="none" />

          {/* Formal Notch Lapels (Deep Navy with Shadow) */}
          <polygon points="76,148 98,215 80,215 62,152" fill="url(#lapel-dark)" />
          <polygon points="124,148 102,215 120,215 138,152" fill="url(#lapel-dark)" />
          {/* Lapel Edge Highlights */}
          <line x1="76" y1="148" x2="98" y2="215" stroke="#2563eb" strokeWidth="1.2" />
          <line x1="124" y1="148" x2="102" y2="215" stroke="#2563eb" strokeWidth="1.2" />

          {/* Crisp White Collared Dress Shirt */}
          <polygon points="82,148 100,188 118,148" fill="#ffffff" />
          {/* Shirt Collar Points */}
          <polygon points="80,147 98,168 93,172 75,152" fill="#f8fafc" />
          <polygon points="120,147 102,168 107,172 125,152" fill="#f8fafc" />

          {/* Formal Silk Necktie (Crimson Red with Gold Diagonal Stripes) */}
          <polygon points="94,162 106,162 109,215 100,225 91,215" fill="url(#tie-maishaa)" />
          {/* Gold Diagonal Stripes on Tie */}
          <line x1="94" y1="174" x2="105" y2="178" stroke="#fbbf24" strokeWidth="2.2" />
          <line x1="93" y1="188" x2="107" y2="192" stroke="#fbbf24" strokeWidth="2.2" />
          <line x1="93" y1="202" x2="107" y2="206" stroke="#fbbf24" strokeWidth="2.2" />

          {/* Graceful Neck */}
          <rect x="91" y="124" width="18" height="26" fill="url(#skin-maishaa)" rx="4" />
          {/* Neck Shadow beneath Chin */}
          <ellipse cx="100" cy="132" rx="10" ry="4" fill="#ea580c" fillOpacity="0.2" />

          {/* Sculpted 3D Head / Face */}
          <ellipse cx="100" cy="98" rx="27" ry="32" fill="url(#skin-maishaa)" />

          {/* Delicate Rosy Cheek Blush */}
          <ellipse cx="82" cy="106" rx="6.5" ry="3.5" fill="#f43f5e" fillOpacity="0.28" />
          <ellipse cx="118" cy="106" rx="6.5" ry="3.5" fill="#f43f5e" fillOpacity="0.28" />

          {/* Sculpted Natural Nose */}
          <path d="M 99 94 Q 100 102 98 104 Q 101 106 103 104" stroke="#c2410c" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.65" />

          {/* Warm Confident Smile */}
          <path d="M 92 112 Q 100 120 108 112" stroke="#991b1b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          {/* Lip Highlights */}
          <path d="M 94 113 Q 100 115 106 113" stroke="#fca5a5" strokeWidth="1" strokeLinecap="round" fill="none" />

          {/* Beautiful 3D Eyes (Left) */}
          <g transform="translate(81, 91)">
            {/* Eye Sclera */}
            <path d="M 0 4 Q 8 -3 16 4 Q 8 10 0 4 Z" fill="#ffffff" />
            {/* Rich Espresso/Hazel Iris */}
            <ellipse cx="8" cy="4" rx="4.5" ry="4.5" fill="#1e1b4b" />
            <circle cx="8" cy="4" r="3.2" fill="#312e81" />
            <circle cx="8" cy="4" r="1.8" fill="#090d16" />
            {/* Specular Catchlights (Crisp Double 3D Reflection) */}
            <circle cx="6.8" cy="2.6" r="1.4" fill="#ffffff" />
            <circle cx="9.2" cy="4.8" r="0.7" fill="#ffffff" />
            {/* Eyelash & Lid Contour */}
            <path d="M -1 4 Q 8 -4 17 3" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            {/* Elegant Groomed Eyebrow */}
            <path d="M -1 -2 Q 7 -7 17 -3" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* Beautiful 3D Eyes (Right) */}
          <g transform="translate(103, 91)">
            <path d="M 0 4 Q 8 -3 16 4 Q 8 10 0 4 Z" fill="#ffffff" />
            <ellipse cx="8" cy="4" rx="4.5" ry="4.5" fill="#1e1b4b" />
            <circle cx="8" cy="4" r="3.2" fill="#312e81" />
            <circle cx="8" cy="4" r="1.8" fill="#090d16" />
            <circle cx="6.8" cy="2.6" r="1.4" fill="#ffffff" />
            <circle cx="9.2" cy="4.8" r="0.7" fill="#ffffff" />
            <path d="M -1 3 Q 8 -4 17 4" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M -1 -3 Q 9 -7 17 -2" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
          </g>

          {/* Front Volumetric Styled Hair with Highlights */}
          {/* Hair Side Framing Locks */}
          <path
            d="M 72 82 C 68 115, 72 155, 80 180 C 85 180, 88 150, 86 115 C 86 95, 84 82, 72 82 Z"
            fill="url(#hair-maishaa)"
          />
          <path
            d="M 128 82 C 132 115, 128 155, 120 180 C 115 180, 112 150, 114 115 C 114 95, 116 82, 128 82 Z"
            fill="url(#hair-maishaa)"
          />

          {/* Chic Side-swept Fringe Bangs */}
          <path
            d="M 74 80 C 88 56, 122 62, 130 84 C 122 75, 102 70, 78 84 Z"
            fill="url(#hair-maishaa)"
          />
          <path
            d="M 76 82 C 92 68, 118 72, 126 88"
            stroke="url(#hair-highlight)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Forearm Resting Naturally on Desk */}
          <path
            d="M 145 220 C 160 232, 178 250, 195 268"
            stroke="url(#blazer-maishaa)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          {/* White Shirt Cuff & Graceful Hand */}
          <rect x="186" y="260" width="10" height="16" rx="3" fill="#ffffff" transform="rotate(-30 186 260)" />
          <ellipse cx="202" cy="274" rx="9" ry="7" fill="url(#skin-maishaa)" transform="rotate(-15 202 274)" />
        </g>

        {/* ======================================================== */}
        {/* CHARACTER 2: MEDHAAT (Formal Smart Boy, Right)           */}
        {/* ======================================================== */}
        <g id="character-medhaat" transform="translate(245, 38)" filter="url(#soft-3d-shadow)">
          {/* Tailored Navy Blazer Body */}
          <path
            d="M 40 262 Q 62 144 100 142 Q 138 144 160 262 Z"
            fill="url(#blazer-medhaat)"
          />

          {/* Structured Shoulders & Seams */}
          <path d="M 42 258 C 50 182, 70 148, 98 143" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.25" fill="none" />
          <path d="M 158 258 C 150 182, 130 148, 102 143" stroke="#60a5fa" strokeWidth="1" strokeOpacity="0.25" fill="none" />

          {/* Lapels */}
          <polygon points="76,144 98,212 80,212 62,148" fill="url(#lapel-dark)" />
          <polygon points="124,144 102,212 120,212 138,148" fill="url(#lapel-dark)" />
          <line x1="76" y1="144" x2="98" y2="212" stroke="#3b82f6" strokeWidth="1.2" />
          <line x1="124" y1="144" x2="102" y2="212" stroke="#3b82f6" strokeWidth="1.2" />

          {/* MAISHAA Official Teal Lapel Pin */}
          <circle cx="68" cy="172" r="5" fill="#0d9488" stroke="#f8fafc" strokeWidth="1" />
          <circle cx="68" cy="172" r="3" fill="#14b8a6" />

          {/* Crisp White Collared Dress Shirt */}
          <polygon points="82,144 100,184 118,144" fill="#ffffff" />
          <polygon points="80,143 98,164 93,168 75,148" fill="#f8fafc" />
          <polygon points="120,143 102,164 107,168 125,148" fill="#f8fafc" />

          {/* Formal Silk Necktie (Royal Blue & Teal Stripes) */}
          <polygon points="94,158 106,158 109,210 100,220 91,210" fill="url(#tie-medhaat)" />
          <line x1="94" y1="170" x2="105" y2="174" stroke="#38bdf8" strokeWidth="2.2" />
          <line x1="93" y1="184" x2="107" y2="188" stroke="#2dd4bf" strokeWidth="2.2" />
          <line x1="93" y1="198" x2="107" y2="202" stroke="#38bdf8" strokeWidth="2.2" />

          {/* Strong Neck */}
          <rect x="91" y="120" width="18" height="26" fill="url(#skin-medhaat)" rx="4" />
          <ellipse cx="100" cy="128" rx="10" ry="4" fill="#d97706" fillOpacity="0.22" />

          {/* Sculpted 3D Head / Face */}
          <ellipse cx="100" cy="94" rx="27" ry="32" fill="url(#skin-medhaat)" />

          {/* Subtle Warm Tone */}
          <ellipse cx="82" cy="102" rx="5.5" ry="3" fill="#f59e0b" fillOpacity="0.2" />
          <ellipse cx="118" cy="102" rx="5.5" ry="3" fill="#f59e0b" fillOpacity="0.2" />

          {/* Sculpted Nose */}
          <path d="M 99 90 Q 100 98 97 100 Q 101 102 103 100" stroke="#b45309" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity="0.65" />

          {/* Cheerful Friendly Smile */}
          <path d="M 92 108 Q 100 116 108 108" stroke="#991b1b" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <path d="M 94 109 Q 100 112 106 109" stroke="#fca5a5" strokeWidth="1" strokeLinecap="round" fill="none" />

          {/* Smart 3D Eyes (Left) */}
          <g transform="translate(81, 87)">
            <path d="M 0 4 Q 8 -3 16 4 Q 8 9 0 4 Z" fill="#ffffff" />
            <ellipse cx="8" cy="4" rx="4.3" ry="4.3" fill="#0f172a" />
            <circle cx="8" cy="4" r="3" fill="#1e3a8a" />
            <circle cx="8" cy="4" r="1.6" fill="#020617" />
            <circle cx="6.8" cy="2.6" r="1.3" fill="#ffffff" />
            <circle cx="9.2" cy="4.8" r="0.6" fill="#ffffff" />
            <path d="M -1 3 Q 8 -4 17 3" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M -1 -3 Q 8 -7 17 -3" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>

          {/* Smart 3D Eyes (Right) */}
          <g transform="translate(103, 87)">
            <path d="M 0 4 Q 8 -3 16 4 Q 8 9 0 4 Z" fill="#ffffff" />
            <ellipse cx="8" cy="4" rx="4.3" ry="4.3" fill="#0f172a" />
            <circle cx="8" cy="4" r="3" fill="#1e3a8a" />
            <circle cx="8" cy="4" r="1.6" fill="#020617" />
            <circle cx="6.8" cy="2.6" r="1.3" fill="#ffffff" />
            <circle cx="9.2" cy="4.8" r="0.6" fill="#ffffff" />
            <path d="M -1 3 Q 8 -4 17 3" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <path d="M -1 -3 Q 8 -7 17 -3" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>

          {/* Modern Professional Haircut with Sculpted Volume & Gradient */}
          <path
            d="M 72 82 C 68 44, 132 44, 128 82 C 132 68, 126 52, 116 48 C 100 44, 84 46, 72 82 Z"
            fill="url(#hair-maishaa)"
          />
          {/* Textured Layer Bangs */}
          <path
            d="M 74 72 C 86 54, 114 58, 124 74 C 116 66, 102 62, 80 72 Z"
            fill="#1e293b"
          />
          <path
            d="M 82 56 C 96 48, 114 52, 120 62"
            stroke="url(#hair-highlight)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Arm Leaning Forward Holding Digital Stylus Pen */}
          <path
            d="M 65 220 C 50 235, 30 252, 15 268"
            stroke="url(#blazer-medhaat)"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <rect x="8" y="260" width="10" height="16" rx="3" fill="#ffffff" transform="rotate(30 8 260)" />
          <ellipse cx="-2" cy="272" rx="9" ry="7" fill="url(#skin-medhaat)" />

          {/* Stylus Pen in Hand */}
          <line x1="-12" y1="284" x2="16" y2="256" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" />
          <circle cx="16" cy="256" r="2" fill="#2dd4bf" />
        </g>

        {/* --- 5. Workspace Technology & Tools On Desk --- */}

        {/* A. Digital Tablet Lying Flat on Desk (Left foreground) */}
        <g id="digital-tablet" transform="translate(130, 292)" filter="url(#soft-3d-shadow)">
          <polygon points="10,0 110,0 120,38 -2,38" fill="#0f172a" />
          <polygon points="12,2 108,2 117,36 1,36" fill="#0284c7" />
          {/* Screen Content: Charts & Curves */}
          <path d="M 15 26 L 40 14 L 65 22 L 95 8 L 110 18" stroke="#38bdf8" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 15 30 L 40 22 L 65 26 L 95 16 L 110 24" stroke="#2dd4bf" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>

        {/* B. Centerpiece: Modern Aluminum High-End Laptop */}
        <g id="center-laptop" transform="translate(260, 205)" filter="url(#soft-3d-shadow)">
          {/* Unibody Aluminum Base & Precision Trackpad */}
          <polygon points="20,96 140,96 156,112 4,112" fill="url(#laptop-case)" stroke="#94a3b8" strokeWidth="0.8" />
          <polygon points="22,97 138,97 150,110 10,110" fill="#1e293b" />
          {/* Precision Trackpad */}
          <rect x="66" y="100" width="28" height="8" rx="1.5" fill="#334155" />

          {/* Slim Bezel Display Lid */}
          <rect x="24" y="0" width="112" height="96" rx="6" fill="#090d16" stroke="#64748b" strokeWidth="2" />
          {/* Vibrant High-DPI Screen Content Preview */}
          <rect x="28" y="4" width="104" height="88" rx="3" fill="url(#laptop-screen)" />

          {/* MAISHAA Workspace Dashboard UI Preview */}
          {/* Header Bar */}
          <rect x="32" y="8" width="96" height="8" rx="1.5" fill="#0f172a" fillOpacity="0.8" />
          <circle cx="36" cy="12" r="2" fill="#ef4444" />
          <circle cx="42" cy="12" r="2" fill="#f59e0b" />
          <circle cx="48" cy="12" r="2" fill="#10b981" />

          {/* Official MAISHAA Circular Crest Watermark on Screen */}
          <circle cx="80" cy="44" r="16" fill="#0a192f" stroke="#2dd4bf" strokeWidth="1.8" />
          <circle cx="80" cy="44" r="12" fill="#0d9488" fillOpacity="0.35" />
          {/* M Geometric Monogram */}
          <path
            d="M 72 52 V 36 L 78 44 L 80 41 L 82 44 L 88 36 V 52"
            stroke="#ffffff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="80" cy="36" r="1.5" fill="#2dd4bf" />

          {/* Mini Workspace Productivity Metrics / Bars */}
          <rect x="34" y="66" width="38" height="4" rx="1.5" fill="#38bdf8" />
          <rect x="34" y="73" width="26" height="4" rx="1.5" fill="#2dd4bf" />
          <rect x="34" y="80" width="46" height="4" rx="1.5" fill="#ffffff" fillOpacity="0.4" />

          <rect x="86" y="66" width="42" height="18" rx="2" fill="#0f172a" fillOpacity="0.6" stroke="#38bdf8" strokeWidth="0.8" />
          <path d="M 90 78 L 98 72 L 106 75 L 118 69 L 124 74" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
        </g>

        {/* C. Ceramic White MAISHAA Branded Mug */}
        <g id="branded-mug" transform="translate(425, 260)" filter="url(#soft-3d-shadow)">
          {/* Realistic Cylindrical Body */}
          <rect x="0" y="8" width="38" height="46" rx="5" fill="url(#mug-cylinder)" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Mug Rim Oval Top */}
          <ellipse cx="19" cy="8" rx="19" ry="4.5" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.8" />
          {/* Aromatic Dark Coffee Inside */}
          <ellipse cx="19" cy="8" rx="16.5" ry="3.2" fill="#451a03" />

          {/* Ergonomic Curved Handle with 3D Specular Highlight */}
          <path
            d="M 38 16 C 50 16, 50 40, 38 40"
            stroke="#cbd5e1"
            strokeWidth="4.5"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 38 16 C 48 16, 48 40, 38 40"
            stroke="#ffffff"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />

          {/* Official MAISHAA Teal Logo Stamp on Mug */}
          <circle cx="19" cy="30" r="10" fill="#0a192f" />
          <circle cx="19" cy="30" r="8" fill="#0d9488" />
          <path
            d="M 15 34 V 26 L 18 30 L 19 28 L 20 30 L 23 26 V 34"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gentle Rising Steam Wisps */}
          <path d="M 14 2 Q 11 -6 15 -14" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.35" />
          <path d="M 22 2 Q 25 -8 20 -16" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.35" />
        </g>

        {/* D. Stack of 3 Bound Academic Hardcover Books */}
        <g id="hardcover-books" transform="translate(485, 240)" filter="url(#soft-3d-shadow)">
          {/* Book 1 (Bottom, Deep Royal Navy with Gold Lettering) */}
          <g transform="translate(0, 44)">
            <rect x="0" y="0" width="125" height="20" rx="3" fill="#0a192f" stroke="#1e293b" strokeWidth="0.8" />
            {/* White Paper Pages Edge */}
            <rect x="6" y="3" width="115" height="14" fill="#f8fafc" />
            <line x1="6" y1="7" x2="120" y2="7" stroke="#e2e8f0" strokeWidth="0.5" />
            <line x1="6" y1="11" x2="120" y2="11" stroke="#e2e8f0" strokeWidth="0.5" />
            {/* Gold Embossed Spine Badge */}
            <rect x="0" y="2" width="6" height="16" rx="1" fill="#f59e0b" />
          </g>

          {/* Book 2 (Middle, Deep Emerald Teal) */}
          <g transform="translate(10, 22)">
            <rect x="0" y="0" width="112" height="20" rx="3" fill="#0f766e" stroke="#115e59" strokeWidth="0.8" />
            <rect x="5" y="3" width="103" height="14" fill="#f8fafc" />
            <line x1="5" y1="7" x2="107" y2="7" stroke="#e2e8f0" strokeWidth="0.5" />
            <line x1="5" y1="11" x2="107" y2="11" stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="0" y="2" width="5" height="16" rx="1" fill="#2dd4bf" />
            {/* Golden Satin Ribbon Bookmark */}
            <polygon points="82,10 92,34 87,30 82,34" fill="#f59e0b" />
          </g>

          {/* Book 3 (Top, Warm Amber) */}
          <g transform="translate(18, 0)">
            <rect x="0" y="0" width="98" height="20" rx="3" fill="#b45309" stroke="#92400e" strokeWidth="0.8" />
            <rect x="5" y="3" width="89" height="14" fill="#f8fafc" />
            <line x1="5" y1="7" x2="93" y2="7" stroke="#e2e8f0" strokeWidth="0.5" />
            <line x1="5" y1="11" x2="93" y2="11" stroke="#e2e8f0" strokeWidth="0.5" />
            <rect x="0" y="2" width="5" height="16" rx="1" fill="#fbbf24" />
          </g>
        </g>

        {/* --- 6. Floating 3D Frosted Glass Module Badges --- */}
        {/* PDF (Red - Floating Left Top) */}
        <g transform="translate(24, 60)" filter="url(#badge-3d-shadow)">
          <rect width="44" height="44" rx="12" fill="#ef4444" />
          <rect width="44" height="44" rx="12" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
          <path d="M 14 13 H 26 L 31 18 V 31 H 14 Z" fill="#ffffff" fillOpacity="0.35" />
          <text x="22" y="26" fill="#ffffff" fontSize="9.5" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">PDF</text>
        </g>

        {/* DOCX (Royal Blue - Floating Upper Left) */}
        <g transform="translate(76, 16)" filter="url(#badge-3d-shadow)">
          <rect width="42" height="42" rx="12" fill="#2563eb" />
          <rect width="42" height="42" rx="12" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
          <text x="21" y="25" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">DOCX</text>
        </g>

        {/* XLSX (Emerald Green - Floating Upper Right) */}
        <g transform="translate(565, 30)" filter="url(#badge-3d-shadow)">
          <rect width="42" height="42" rx="12" fill="#10b981" />
          <rect width="42" height="42" rx="12" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
          <text x="21" y="25" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">XLSX</text>
        </g>

        {/* PPTX (Warm Orange - Floating Right) */}
        <g transform="translate(615, 85)" filter="url(#badge-3d-shadow)">
          <rect width="42" height="42" rx="12" fill="#f97316" />
          <rect width="42" height="42" rx="12" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
          <text x="21" y="25" fill="#ffffff" fontSize="9" fontWeight="900" fontFamily="sans-serif" textAnchor="middle">PPTX</text>
        </g>

        {/* AI Sparkle Badge (Purple - Floating Center Top) */}
        <g transform="translate(325, 12)" filter="url(#badge-3d-shadow)">
          <rect width="36" height="36" rx="10" fill="#8b5cf6" />
          <rect width="36" height="36" rx="10" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1" />
          {/* Sparkle 4-point star */}
          <path d="M 18 8 Q 18 18 8 18 Q 18 18 18 28 Q 18 18 28 18 Q 18 18 18 8 Z" fill="#ffffff" />
        </g>

        {/* --- 7. Editorial Corporate Brand Seal (Top Right) --- */}
        <g transform="translate(420, 32)">
          {/* Clean Commercial Ribbon */}
          <rect x="0" y="0" width="190" height="34" rx="17" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" filter="url(#soft-3d-shadow)" />
          {/* Mini Emblem in Ribbon */}
          <circle cx="18" cy="17" r="10" fill="#0a192f" />
          <path d="M 14 20 V 14 L 17 18 L 18 16.5 L 19 18 L 22 14 V 20" stroke="#2dd4bf" strokeWidth="1.2" strokeLinecap="round" />
          {/* Brand Text */}
          <text x="35" y="16" fill="#0a192f" fontSize="10" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.05em">
            MAISHAA &amp; MEDHAAT
          </text>
          <text x="35" y="26" fill="#0d9488" fontSize="8" fontWeight="700" fontFamily="sans-serif" letterSpacing="0.03em">
            Official Workspace Ambassadors
          </text>
        </g>
      </svg>
    </div>
  );
};

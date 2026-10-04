import React from 'react';

interface Icon3dProps {
  className?: string;
  size?: number;
}

export const Icon3dPdf: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-pdf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f43f5e" />
        <stop offset="100%" stopColor="#be123c" />
      </linearGradient>
      <linearGradient id="msh-pdf-fold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fff1f2" />
        <stop offset="100%" stopColor="#fecdd3" />
      </linearGradient>
      <filter id="msh-pdf-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#881337" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="8" width="40" height="50" rx="8" fill="url(#msh-pdf-grad)" filter="url(#msh-pdf-sh)" />
    <path d="M36 8 L50 22 H40 A4 4 0 0 1 36 18 Z" fill="url(#msh-pdf-fold)" />
    <rect x="18" y="27" width="24" height="3.5" rx="1.75" fill="#ffffff" fillOpacity="0.9" />
    <rect x="18" y="34" width="18" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.75" />
    <rect x="16" y="42" width="23" height="11" rx="3" fill="#ffffff" />
    <text x="27.5" y="50.5" fill="#be123c" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">PDF</text>
  </svg>
);

export const Icon3dDocx: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-docx-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="msh-docx-fold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#eff6ff" />
        <stop offset="100%" stopColor="#bfdbfe" />
      </linearGradient>
      <filter id="msh-docx-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#1e3a8a" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="8" width="40" height="50" rx="8" fill="url(#msh-docx-grad)" filter="url(#msh-docx-sh)" />
    <path d="M36 8 L50 22 H40 A4 4 0 0 1 36 18 Z" fill="url(#msh-docx-fold)" />
    <rect x="18" y="27" width="24" height="3.5" rx="1.75" fill="#ffffff" fillOpacity="0.9" />
    <rect x="18" y="34" width="20" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.75" />
    <rect x="15" y="42" width="27" height="11" rx="3" fill="#ffffff" />
    <text x="28.5" y="50.5" fill="#1d4ed8" fontSize="7.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">DOCX</text>
  </svg>
);

export const Icon3dXlsx: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-xlsx-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <filter id="msh-xlsx-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#064e3b" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="8" width="40" height="50" rx="8" fill="url(#msh-xlsx-grad)" filter="url(#msh-xlsx-sh)" />
    <path d="M36 8 L50 22 H40 A4 4 0 0 1 36 18 Z" fill="#d1fae5" />
    <rect x="18" y="27" width="24" height="12" rx="2" fill="#ffffff" fillOpacity="0.25" />
    <line x1="18" y1="33" x2="42" y2="33" stroke="#ffffff" strokeWidth="1.5" />
    <line x1="30" y1="27" x2="30" y2="39" stroke="#ffffff" strokeWidth="1.5" />
    <rect x="15" y="42" width="27" height="11" rx="3" fill="#ffffff" />
    <text x="28.5" y="50.5" fill="#047857" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">XLSX</text>
  </svg>
);

export const Icon3dPptx: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-pptx-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f97316" />
        <stop offset="100%" stopColor="#c2410c" />
      </linearGradient>
      <filter id="msh-pptx-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#7c2d12" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="8" width="40" height="50" rx="8" fill="url(#msh-pptx-grad)" filter="url(#msh-pptx-sh)" />
    <path d="M36 8 L50 22 H40 A4 4 0 0 1 36 18 Z" fill="#ffedd5" />
    <circle cx="28" cy="33" r="6.5" fill="#ffffff" fillOpacity="0.25" />
    <path d="M28 33 L33 29 A6.5 6.5 0 0 1 34.5 33 Z" fill="#ffffff" />
    <rect x="16" y="42" width="25" height="11" rx="3" fill="#ffffff" />
    <text x="28.5" y="50.5" fill="#c2410c" fontSize="7.5" fontWeight="800" textAnchor="middle" fontFamily="sans-serif">PPTX</text>
  </svg>
);

export const Icon3dImage: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-img-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
      <filter id="msh-img-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#4c1d95" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="8" y="10" width="48" height="44" rx="10" fill="url(#msh-img-grad)" filter="url(#msh-img-sh)" />
    <circle cx="22" cy="24" r="4.5" fill="#fef08a" />
    <path d="M14 44 L26 30 L35 39 L41 33 L50 44 Z" fill="#ede9fe" />
  </svg>
);

export const Icon3dOcr: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-ocr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#0f766e" />
      </linearGradient>
      <filter id="msh-ocr-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#134e4a" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="8" width="40" height="50" rx="8" fill="url(#msh-ocr-grad)" filter="url(#msh-ocr-sh)" />
    <path d="M36 8 L50 22 H40 A4 4 0 0 1 36 18 Z" fill="#ccfbf1" />
    <line x1="8" y1="32" x2="52" y2="32" stroke="#2dd4bf" strokeWidth="3" strokeDasharray="3 3" />
    <rect x="18" y="22" width="22" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.8" />
    <rect x="18" y="40" width="24" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.9" />
    <rect x="18" y="46" width="16" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.75" />
  </svg>
);

export const Icon3dForm: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-form-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <filter id="msh-form-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#0c4a6e" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="10" y="8" width="40" height="50" rx="8" fill="url(#msh-form-grad)" filter="url(#msh-form-sh)" />
    <path d="M36 8 L50 22 H40 A4 4 0 0 1 36 18 Z" fill="#e0f2fe" />
    <rect x="18" y="24" width="6" height="6" rx="1.5" fill="#ffffff" />
    <line x1="28" y1="27" x2="42" y2="27" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    <rect x="18" y="34" width="6" height="6" rx="1.5" fill="#ffffff" />
    <line x1="28" y1="37" x2="40" y2="37" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="30" cy="48" r="4.5" fill="#38bdf8" />
  </svg>
);

export const Icon3dPack: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-pack-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <filter id="msh-pack-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#78350f" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="14" y="14" width="38" height="44" rx="8" fill="#fde68a" />
    <rect x="10" y="10" width="38" height="44" rx="8" fill="#f59e0b" />
    <rect x="6" y="6" width="38" height="44" rx="8" fill="url(#msh-pack-grad)" filter="url(#msh-pack-sh)" />
    <path d="M16 22 L22 28 L34 16" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="36" width="22" height="3" rx="1.5" fill="#ffffff" fillOpacity="0.8" />
  </svg>
);

export const Icon3dBatch: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-batch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#4338ca" />
      </linearGradient>
      <filter id="msh-batch-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#312e81" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="18" y="6" width="34" height="42" rx="7" fill="#c7d2fe" />
    <rect x="12" y="12" width="34" height="42" rx="7" fill="#818cf8" />
    <rect x="6" y="18" width="34" height="42" rx="7" fill="url(#msh-batch-grad)" filter="url(#msh-batch-sh)" />
    <line x1="14" y1="30" x2="30" y2="30" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="14" y1="38" x2="26" y2="38" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export const Icon3dAi: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-ai-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="50%" stopColor="#0d9488" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <filter id="msh-ai-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#4c1d95" floodOpacity="0.3" />
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="14" fill="url(#msh-ai-grad)" filter="url(#msh-ai-sh)" />
    <path d="M32 16 L35 27 L46 30 L35 33 L32 44 L29 33 L18 30 L29 27 Z" fill="#ffffff" />
    <circle cx="44" cy="18" r="2.5" fill="#facc15" />
  </svg>
);

export const Icon3dConvert: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-conv-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0d9488" />
      </linearGradient>
      <filter id="msh-conv-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3.5" stdDeviation="3" floodColor="#0f766e" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="14" fill="url(#msh-conv-grad)" filter="url(#msh-conv-sh)" />
    <path d="M20 26 H42 M42 26 L35 19 M42 26 L35 33" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M44 38 H22 M22 38 L29 31 M22 38 L29 45" stroke="#ccfbf1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Icon3dCloud: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-cloud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <filter id="msh-cloud-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#0369a1" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="14" fill="url(#msh-cloud-grad)" filter="url(#msh-cloud-sh)" />
    <path
      d="M24 38 H42 A7 7 0 0 0 42 24 A10 10 0 0 0 23 28 A6 6 0 0 0 24 38 Z"
      fill="#ffffff"
    />
  </svg>
);

export const Icon3dTemplates: React.FC<Icon3dProps> = ({ className = 'w-12 h-12', size }) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    width={size}
    height={size}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="msh-tpl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <filter id="msh-tpl-sh" x="-15%" y="-15%" width="130%" height="130%">
        <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#78350f" floodOpacity="0.25" />
      </filter>
    </defs>
    <rect x="8" y="8" width="48" height="48" rx="14" fill="url(#msh-tpl-grad)" filter="url(#msh-tpl-sh)" />
    <rect x="18" y="18" width="12" height="12" rx="3" fill="#ffffff" />
    <rect x="34" y="18" width="12" height="12" rx="3" fill="#ffffff" fillOpacity="0.8" />
    <rect x="18" y="34" width="12" height="12" rx="3" fill="#ffffff" fillOpacity="0.8" />
    <rect x="34" y="34" width="12" height="12" rx="3" fill="#fef3c7" />
  </svg>
);

/**
 * MAISHAA DESIGN SYSTEM (v2.0)
 * The definitive visual identity and reusable design tokens for ALL MAISHAA applications.
 * 
 * Philosophy:
 * - 80% Clean Professional Productivity UI
 * - 15% Subtle 3D Depth, Layered Cards, Soft Shadows
 * - 5% Restrained Motion & Semantic Glow
 * 
 * Colors: Deep Navy, Royal Blue, Teal, White with semantic accents.
 */

export const MAISHAA_TOKENS = {
  // Brand Color Palette
  colors: {
    // Primary Foundations
    navy: {
      950: '#040914', // Deepest background
      900: '#070e1e', // Sidebar / Dark surface
      850: '#0a1428', // Header / Nav bar
      800: '#0f1d38', // Elevated dark surface
      700: '#182c54', // Border on dark
      600: '#233f75',
    },
    royal: {
      900: '#1e3a8a',
      800: '#1e40af',
      700: '#1d4ed8',
      600: '#2563eb', // Brand primary action
      500: '#3b82f6',
      400: '#60a5fa',
      100: '#dbeafe',
      50: '#eff6ff',
    },
    teal: {
      900: '#134e4a',
      800: '#115e59',
      700: '#0f766e',
      600: '#0d9488', // Core brand accent & verification
      500: '#14b8a6',
      400: '#2dd4bf',
      300: '#5eead4',
      100: '#ccfbf1',
      50: '#f0fdfa',
    },
    // Secondary Feature Accents
    accent: {
      ai: {
        glow: 'rgba(168, 85, 247, 0.25)',
        border: 'rgba(168, 85, 247, 0.4)',
        primary: '#8b5cf6',
        secondary: '#a855f7',
        bg: '#faf5ff',
      },
      pdf: {
        primary: '#e11d48',
        secondary: '#f43f5e',
        light: '#fff1f2',
      },
      spreadsheet: {
        primary: '#059669',
        secondary: '#10b981',
        light: '#ecfdf5',
      },
      presentation: {
        primary: '#ea580c',
        secondary: '#f97316',
        light: '#fff7ed',
      },
      doc: {
        primary: '#2563eb',
        secondary: '#3b82f6',
        light: '#eff6ff',
      },
    },
  },

  // Soft Depth 3D Shadow Tokens
  shadows: {
    card: '0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
    cardHover: '0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.06)',
    card3d: '0 8px 24px -4px rgba(6, 13, 26, 0.08), 0 2px 6px -1px rgba(6, 13, 26, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    button3d: '0 4px 12px -1px rgba(13, 148, 136, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
    aiGlow: '0 4px 20px -2px rgba(147, 51, 234, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    surfaceDark: '0 8px 32px 0 rgba(4, 9, 20, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
  },

  // Corner Radii
  radii: {
    xl: '0.75rem',    // 12px
    '2xl': '1rem',    // 16px (Standard MAISHAA card)
    '3xl': '1.5rem',  // 24px (Hero / Big container)
    full: '9999px',   // Pills
  },

  // Transitions
  motion: {
    transition: 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)',
    hoverLift: 'translateY(-2px)',
  },
};

/**
 * Common Tailwind class bundles for consistent MAISHAA styling
 */
export const MAISHAA_CLASSES = {
  // 3D Glass & Surface Cards
  card3d: 'bg-white rounded-2xl border border-slate-200/90 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-all duration-200 motion-reduce:transform-none',
  cardDark: 'bg-[#0a1428]/95 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]',
  
  // Interactive 3D Buttons
  btnPrimary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#0f766e] to-[#0d9488] hover:from-[#115e59] hover:to-[#0f766e] text-white font-semibold text-xs shadow-[0_4px_12px_rgba(13,148,136,0.3)] hover:shadow-[0_6px_16px_rgba(13,148,136,0.4)] active:translate-y-0.5 transition-all duration-150',
  btnSecondary: 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-semibold shadow-xs transition-all duration-150',
  btnAi: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-[0_4px_16px_rgba(139,92,246,0.35)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.45)] active:translate-y-0.5 transition-all duration-150',
  
  // Icon Containers
  iconBox: 'p-2.5 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none',
};

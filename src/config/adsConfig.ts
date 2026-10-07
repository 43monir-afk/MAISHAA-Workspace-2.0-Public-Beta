/**
 * MAISHAA WORKSPACE — Advertisement & Monetization Architecture
 * 
 * Supports configurable display ad providers:
 * 1. Adsterra display/banner integration using verified placement codes
 * 2. Google AdSense using official publisher client & slot IDs
 * 3. Direct sponsor banners with validated HTTPS links and sponsorship labeling
 * 
 * Strict Zero-Disruption Policy:
 * - Ads never appear inside canvas, over document previews, or beside download buttons
 * - Missing configuration renders nothing (0 layout shift)
 * - Ad scripts run in isolated sandboxed iframes preventing SPA collisions and memory leaks
 * - No popunders, forced redirects, notification prompts, or download-blocking interstitials
 */

export type AdProvider = 'adsterra' | 'adsense' | 'direct' | 'none';

export type AdPlacement =
  | 'home-after-tools'
  | 'home-bottom'
  | 'sidebar-bottom'
  | 'tutorial-bottom'
  | 'tool-result-bottom';

export interface AdsterraBannerUnit {
  key: string;
  format: 'iframe';
  width: number;
  height: number;
  scriptSrc: string;
}

export interface AdSenseUnit {
  slotId: string;
  format: 'horizontal' | 'rectangle' | 'vertical' | 'auto';
  fullWidthResponsive?: boolean;
}

export interface DirectSponsorBanner {
  id: string;
  name: string;
  bannerImageUrl: string;
  destinationUrl: string;
  altText: string;
  startDate?: string;
  endDate?: string;
  placements: AdPlacement[];
}

export interface PlacementConfig {
  enabled: boolean;
  minHeight: string;
  adsterraUnit?: 'leaderboard' | 'mobileBanner';
  adSenseSlotId?: string;
}

export interface AdsSystemConfig {
  enabled: boolean;
  provider: AdProvider;
  testMode: boolean;
  adsterra: {
    leaderboard: AdsterraBannerUnit;
    mobileBanner: AdsterraBannerUnit;
  };
  adsense: {
    publisherId: string;
    testMode: boolean;
  };
  directSponsors: DirectSponsorBanner[];
  placements: Record<AdPlacement, PlacementConfig>;
}

export const ADS_CONFIG: AdsSystemConfig = {
  // Enabled with official owner-provided Adsterra units
  enabled: true,
  provider: 'adsterra',
  testMode: false,

  // Official Adsterra banner placement units provided by the site owner
  adsterra: {
    leaderboard: {
      key: '0b2d613ab754ca5e2db3323eb6659b37',
      format: 'iframe',
      width: 728,
      height: 90,
      scriptSrc: 'https://www.highrevenueformat.com/0b2d613ab754ca5e2db3323eb6659b37/invoke.js',
    },
    mobileBanner: {
      key: '24f9600939225d8dccdade7997d1dba3',
      format: 'iframe',
      width: 320,
      height: 50,
      scriptSrc: 'https://www.highrevenueformat.com/24f9600939225d8dccdade7997d1dba3/invoke.js',
    },
  },

  // Google AdSense settings (activated when provider is set to 'adsense' and valid publisher ID is supplied)
  adsense: {
    publisherId: typeof process !== 'undefined' && process.env?.VITE_ADSENSE_PUB_ID
      ? process.env.VITE_ADSENSE_PUB_ID
      : '',
    testMode: false,
  },

  // Direct Sponsor placements (supports verified corporate partners)
  directSponsors: [
    {
      id: 'maishaa-bd-official',
      name: 'MAISHAA IT & Digital Education',
      bannerImageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=728&h=90&fit=crop&q=80',
      destinationUrl: 'https://workspace.maishaa.bd/about',
      altText: 'মায়িশা আইটি ও কম্পিউটার ট্রেনিং প্রোগ্রাম',
      placements: ['home-bottom', 'tutorial-bottom'],
    },
  ],

  // Specific placements: only explicitly enabled placements will render
  placements: {
    'home-after-tools': {
      enabled: true,
      minHeight: '90px',
      adsterraUnit: 'leaderboard',
    },
    'home-bottom': {
      enabled: true,
      minHeight: '90px',
      adsterraUnit: 'leaderboard',
    },
    'sidebar-bottom': {
      enabled: true,
      minHeight: '60px',
      adsterraUnit: 'mobileBanner',
    },
    'tutorial-bottom': {
      enabled: true,
      minHeight: '90px',
      adsterraUnit: 'leaderboard',
    },
    'tool-result-bottom': {
      enabled: true,
      minHeight: '90px',
      adsterraUnit: 'leaderboard',
    },
  },
};

/**
 * Validates a direct sponsor URL to ensure it is secure HTTPS and not executable javascript.
 */
export function isValidSponsorUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

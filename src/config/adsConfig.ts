/**
 * MAISHAA Workspace AdSense Configuration
 * 
 * Prepares the application for Google AdSense monetization.
 * By default, ADS_ENABLED is false, rendering nothing and consuming no space.
 */

export interface AdSlotConfig {
  slotId: string;
  minHeight: string;
  format: 'horizontal' | 'rectangle' | 'sidebar';
}

export interface AdsConfig {
  enabled: boolean;
  provider: 'adsense';
  publisherId: string;
  testMode: boolean;
  slots: Record<string, AdSlotConfig>;
}

export const ADS_CONFIG: AdsConfig = {
  // Disabled by default: renders nothing and consumes 0 space
  enabled: false,
  provider: 'adsense',
  // Leave empty until approved
  publisherId: '',
  testMode: false,
  slots: {
    'home-after-tools': {
      slotId: '',
      minHeight: '90px',
      format: 'horizontal',
    },
    'home-bottom': {
      slotId: '',
      minHeight: '90px',
      format: 'horizontal',
    },
    'sidebar-bottom': {
      slotId: '',
      minHeight: '100px',
      format: 'sidebar',
    },
    'tool-result-bottom': {
      slotId: '',
      minHeight: '90px',
      format: 'horizontal',
    },
  },
};

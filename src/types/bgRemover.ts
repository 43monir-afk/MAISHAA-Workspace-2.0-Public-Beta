export type BgRemovalProvider = 'local' | 'cloud_removebg' | 'cloud_gemini';

export type JobStatusType = 'IDLE' | 'QUEUED' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface BgImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  dimensions: { width: number; height: number };
  originalUrl: string;
  originalImage: HTMLImageElement | null;
  // Alpha mask array: 0 = transparent, 255 = fully opaque
  alphaMask: Uint8Array | null;
  maskCanvas: HTMLCanvasElement | null;
  // Result transparent cutout
  cutoutCanvas: HTMLCanvasElement | null;
  resultBlob: Blob | null;
  resultUrl: string | null;
  status: JobStatusType;
  progress: number;
  errorMessage?: string;
  providerUsed?: 'local' | 'removebg' | 'gemini';
  // Manual brush stroke history for Undo / Redo
  history: ImageData[];
  historyIndex: number;
}

export type BgType =
  | 'transparent'
  | 'color'
  | 'gradient'
  | 'blur'
  | 'custom_image'
  | 'preset'
  | 'ai_generated';

export type ShadowType = 'none' | 'soft' | 'natural' | 'studio' | 'floating';

export type ProductPresetType =
  | 'none'
  | 'white_product'
  | 'transparent_product'
  | 'catalog'
  | 'marketplace';

export type CropPresetType =
  | 'original'
  | 'auto_subject'
  | '1_1'
  | '4_3'
  | '16_9'
  | '9_16'
  | 'fb_post'
  | 'ig_story'
  | 'yt_thumb'
  | 'web_banner'
  | 'avatar';

export type AlignmentType = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface BgDesignSettings {
  backgroundType: BgType;
  solidColor: string;
  gradientPreset: string;
  blurLevel: number; // 0 to 40
  customBgUrl: string | null;
  customBgBlob: Blob | null;
  presetName: string;
  aiPrompt: string;
  aiGeneratedBgUrl: string | null;

  // Shadow controls
  shadowType: ShadowType;
  shadowOpacity: number; // 0 to 1
  shadowBlur: number; // 0 to 60
  shadowDistance: number; // 0 to 60
  shadowAngle: number; // 0 to 360

  // Subject color adjustments (alpha preserved)
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
  exposure: number; // -100 to 100
  sharpness: number; // -100 to 100

  // Framing & Product layout
  productPreset: ProductPresetType;
  cropPreset: CropPresetType;
  alignment: AlignmentType;
  paddingPercent: number; // 0 to 50
  rotation: number; // 0, 90, 180, 270
  flipH: boolean;
  flipV: boolean;
  watermark: boolean;

  // Export settings
  exportFormat: 'image/png' | 'image/jpeg' | 'image/webp';
  exportQuality: number; // 10 to 100
  exportFilenamePrefix: string;
  customWidth?: number;
  customHeight?: number;
}

export interface BgRemovalOptions {
  tolerance: number; // 5 to 100
  featherRadius: number; // 0 to 10
  smartAlpha: boolean;
  provider: BgRemovalProvider;
}

export interface ProviderStatus {
  removeBgAvailable: boolean;
  geminiAvailable: boolean;
  activeProvider: 'local' | 'removebg' | 'gemini';
  message: string;
}

export interface BatchManifestItem {
  filename: string;
  originalSize: number;
  exportedFilename: string;
  status: JobStatusType;
  dimensions: string;
  provider: string;
  timestamp: string;
  error?: string;
}

/**
 * MAISHAA WORKSPACE — Creative Suite Types & Data Models
 * Canva-style multi-page editable vector design, typography, brand kit, and bulk create models.
 */

export type ElementType = 'text' | 'shape' | 'image' | 'icon' | 'table' | 'qr' | 'barcode';

export type ShapeType = 'rect' | 'circle' | 'triangle' | 'star' | 'badge' | 'line' | 'arrow';

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  opacity: number; // 0 to 1
  locked: boolean;
  visible: boolean;
  zIndex: number;

  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | '600' | '800';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  letterSpacing?: number;
  lineHeight?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  curveRadius?: number; // For curved text effects

  // Shape specific
  shapeType?: ShapeType;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;

  // Image specific
  src?: string;
  alt?: string;
  fit?: 'cover' | 'contain' | 'fill';
  filter?: {
    brightness: number; // -100 to 100
    contrast: number; // -100 to 100
    saturation: number; // -100 to 100
    blur: number; // 0 to 20
  };

  // Variable binding for Bulk Create (e.g. {{Name}}, {{ID}}, {{Photo}})
  bindKey?: string;
}

export interface DesignPage {
  id: string;
  name: string;
  width: number;
  height: number;
  background: {
    type: 'solid' | 'gradient' | 'image';
    color: string;
    gradient?: string;
    imageUrl?: string;
  };
  elements: CanvasElement[];
}

export interface DesignProject {
  id: string;
  title: string;
  version: 1;
  createdTime: number;
  updatedTime: number;
  unit: 'px' | 'mm' | 'in';
  pages: DesignPage[];
  category:
    | 'social'
    | 'print'
    | 'document'
    | 'presentation'
    | 'marketing'
    | 'certificate'
    | 'poster'
    | 'id_card'
    | 'flyer'
    | 'business_card';
}

export interface BrandKit {
  name: string;
  palette: {
    primary: string; // MAISHAA Deep Navy #0B192C
    secondary: string; // MAISHAA Royal Blue #2563EB
    teal: string; // MAISHAA Teal Accent #0D9488
    gold: string; // MAISHAA Gold #F59E0B
    surface: string; // #F8FAFC
    dark: string; // #070E1E
  };
  fonts: {
    headingBn: string; // SolaimanLipi / Noto Sans Bengali
    bodyBn: string;
    headingEn: string;
    bodyEn: string;
  };
  logoUrl: string;
}

export interface DesignTemplate {
  id: string;
  nameEn: string;
  nameBn: string;
  category: 'social' | 'poster' | 'certificate' | 'id_card' | 'flyer' | 'business_card';
  width: number;
  height: number;
  thumbnailColor: string;
  pages: DesignPage[];
}

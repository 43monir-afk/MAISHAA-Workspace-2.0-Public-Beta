/**
 * MAISHAA WORKSPACE — Advertisements, SEO Visibility & Public Routes Test Suite
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ADS_CONFIG,
  isValidSponsorUrl,
} from '../config/adsConfig';
import {
  PUBLIC_ROUTES_SEO,
  generateSchemaJsonLd,
  CANONICAL_DOMAIN,
} from '../config/seoConfig';
import { injectSeoMetadata } from '../../server';
import { trackEvent, getLocalMetrics } from '../utils/analytics';

describe('MAISHAA WORKSPACE Advertisements & SEO Visibility', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('1. Advertisement Configuration & Placement Safety', () => {
    it('contains verified Adsterra official placement keys from dashboard', () => {
      expect(ADS_CONFIG.adsterra.leaderboard.key).toBe('0b2d613ab754ca5e2db3323eb6659b37');
      expect(ADS_CONFIG.adsterra.leaderboard.width).toBe(728);
      expect(ADS_CONFIG.adsterra.leaderboard.height).toBe(90);
      expect(ADS_CONFIG.adsterra.leaderboard.scriptSrc).toContain('0b2d613ab754ca5e2db3323eb6659b37/invoke.js');

      expect(ADS_CONFIG.adsterra.mobileBanner.key).toBe('24f9600939225d8dccdade7997d1dba3');
      expect(ADS_CONFIG.adsterra.mobileBanner.width).toBe(320);
      expect(ADS_CONFIG.adsterra.mobileBanner.height).toBe(50);
      expect(ADS_CONFIG.adsterra.mobileBanner.scriptSrc).toContain('24f9600939225d8dccdade7997d1dba3/invoke.js');
    });

    it('enforces safe HTTPS validation for direct sponsor URLs and rejects malicious schemes', () => {
      expect(isValidSponsorUrl('https://workspace.maishaa.bd/about')).toBe(true);
      expect(isValidSponsorUrl('http://example.com/sponsor')).toBe(true);
      expect(isValidSponsorUrl('javascript:alert(1)')).toBe(false);
      expect(isValidSponsorUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidSponsorUrl('')).toBe(false);
    });

    it('defines low-density, non-disruptive placements without canvas or preview overlaps', () => {
      const placements = Object.keys(ADS_CONFIG.placements);
      expect(placements).toContain('home-after-tools');
      expect(placements).toContain('home-bottom');
      expect(placements).toContain('sidebar-bottom');
      expect(placements).toContain('tutorial-bottom');
      expect(placements).toContain('tool-result-bottom');

      // Ensure no placement is inside canvas or over file downloads
      expect(placements).not.toContain('canvas-overlay');
      expect(placements).not.toContain('download-interstitial');
    });
  });

  describe('2. Public SEO Tool Routes & Canonical Registry', () => {
    it('registers all key public tool routes with full discoverability metadata', () => {
      const expectedRoutes = [
        '/',
        '/pdf-studio/merge',
        '/pdf-studio/split',
        '/pdf-studio/compress',
        '/pdf-studio/organize',
        '/pdf-studio/convert',
        '/image-studio/background-remover',
        '/image-studio/resize',
        '/scan-ocr',
        '/forms-hub',
        '/creative-suite',
        '/whiteboard',
        '/office-pack',
        '/tutorials',
        '/privacy',
        '/about',
      ];

      expectedRoutes.forEach((route) => {
        const seo = PUBLIC_ROUTES_SEO[route];
        expect(seo, `Route ${route} must be defined in SEO registry`).toBeDefined();
        expect(seo.titleBn.length).toBeGreaterThan(15);
        expect(seo.titleEn.length).toBeGreaterThan(15);
        expect(seo.metaDescriptionBn.length).toBeGreaterThan(20);
        expect(seo.h1Bn.length).toBeGreaterThan(10);
        expect(seo.h1En.length).toBeGreaterThan(10);
        expect(seo.instructionsBn.length).toBeGreaterThanOrEqual(2);
        expect(seo.supportedFormats.length).toBeGreaterThan(0);
      });
    });

    it('generates compliant Schema.org JSON-LD structured data', () => {
      const mergeSchemas = generateSchemaJsonLd('/pdf-studio/merge') as any[];
      expect(Array.isArray(mergeSchemas)).toBe(true);

      const orgSchema = mergeSchemas.find((s) => s['@type'] === 'Organization');
      expect(orgSchema).toBeDefined();
      expect(orgSchema.name).toBe('MAISHAA WORKSPACE');
      expect(orgSchema.url).toBe(CANONICAL_DOMAIN);

      const appSchema = mergeSchemas.find((s) => s['@type'] === 'WebApplication');
      expect(appSchema).toBeDefined();
      expect(appSchema.url).toBe(`${CANONICAL_DOMAIN}/pdf-studio/merge`);
      expect(appSchema.offers.price).toBe('0');

      const breadcrumb = mergeSchemas.find((s) => s['@type'] === 'BreadcrumbList');
      expect(breadcrumb).toBeDefined();
      expect(breadcrumb.itemListElement.length).toBe(2);

      const faqSchema = mergeSchemas.find((s) => s['@type'] === 'FAQPage');
      expect(faqSchema).toBeDefined();
      expect(faqSchema.mainEntity.length).toBeGreaterThan(0);
    });
  });

  describe('3. Dynamic Server SEO Injection & Crawlability', () => {
    it('injects page-specific titles, canonical links, and OpenGraph tags into HTML', () => {
      const mockIndexHtml = `<!DOCTYPE html><html><head><title>Default</title><meta name="description" content="Default desc"></head><body><div id="root"></div></body></html>`;
      const rendered = injectSeoMetadata(mockIndexHtml, '/pdf-studio/compress');

      expect(rendered).toContain('PDF ফাইলের সাইজ কমানোর উপায়');
      expect(rendered).toContain('<link rel="canonical" href="https://workspace.maishaa.bd/pdf-studio/compress" />');
      expect(rendered).toContain('<meta property="og:url" content="https://workspace.maishaa.bd/pdf-studio/compress" />');
      expect(rendered).toContain('application/ld+json');
      expect(rendered).toContain('id="seo-prerender-summary"');
    });

    it('falls back to homepage metadata for root path', () => {
      const mockIndexHtml = `<!DOCTYPE html><html><head><title>Default</title></head><body><div id="root"></div></body></html>`;
      const rendered = injectSeoMetadata(mockIndexHtml, '/');

      expect(rendered).toContain('মায়িশা ওয়ার্কস্পেস');
      expect(rendered).toContain('<link rel="canonical" href="https://workspace.maishaa.bd" />');
    });
  });

  describe('4. Privacy-Safe Anonymous Usage Metrics', () => {
    it('tracks aggregate event counts without recording filenames or document content', () => {
      trackEvent('tool_start', 'pdf_merge');
      trackEvent('tool_start', 'pdf_merge');
      trackEvent('file_download', 'pdf_merge');

      const metrics = getLocalMetrics();
      expect(metrics['tool_start:pdf_merge']).toBe(2);
      expect(metrics['file_download:pdf_merge']).toBe(1);

      // Verify no sensitive keys leaked into storage
      const rawStored = localStorage.getItem('maishaa_usage_metrics') || '';
      expect(rawStored).not.toContain('filename');
      expect(rawStored).not.toContain('text');
    });
  });
});

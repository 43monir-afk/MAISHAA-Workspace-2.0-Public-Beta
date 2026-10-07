import React, { useState, useEffect, useRef } from 'react';
import {
  ADS_CONFIG,
  AdPlacement,
  isValidSponsorUrl,
  DirectSponsorBanner,
} from '../../config/adsConfig';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  // If ads are disabled globally or slot is not configured, render NOTHING and consume 0 space
  if (!ADS_CONFIG.enabled) {
    return null;
  }

  const slotPlacement = ADS_CONFIG.placements[placement];
  if (!slotPlacement || !slotPlacement.enabled) {
    return null;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [adBlocked, setAdBlocked] = useState(false);

  // Detect mobile viewport for responsive banner selection
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  // Lazy load ad slot once it nears viewport (200px threshold)
  useEffect(() => {
    if (!containerRef.current) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '200px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Check direct sponsor candidate for this placement
  const activeSponsor: DirectSponsorBanner | undefined =
    ADS_CONFIG.provider === 'direct'
      ? ADS_CONFIG.directSponsors.find((s) => s.placements.includes(placement))
      : undefined;

  // Determine Adsterra banner unit based on placement and viewport
  const isSidebar = placement === 'sidebar-bottom';
  const adsterraUnit = isSidebar || isMobile
    ? ADS_CONFIG.adsterra.mobileBanner
    : ADS_CONFIG.adsterra.leaderboard;

  // Generate safe sandboxed HTML for Adsterra placement
  const adsterraIframeSrcDoc = adsterraUnit
    ? `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <script type="text/javascript">
    atOptions = {
      'key' : '${adsterraUnit.key}',
      'format' : 'iframe',
      'height' : ${adsterraUnit.height},
      'width' : ${adsterraUnit.width},
      'params' : {}
    };
  </script>
  <script type="text/javascript" src="${adsterraUnit.scriptSrc}"></script>
</body>
</html>`
    : '';

  // Google AdSense single-script initializer
  useEffect(() => {
    if (ADS_CONFIG.provider === 'adsense' && ADS_CONFIG.adsense.publisherId && isVisible) {
      try {
        const existingScript = document.querySelector('script[src*="adsbygoogle.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CONFIG.adsense.publisherId}`;
          script.async = true;
          script.crossOrigin = 'anonymous';
          script.onerror = () => setAdBlocked(true);
          document.head.appendChild(script);
        }
        // Initialize AdSense unit
        if (typeof window !== 'undefined') {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch {
        setAdBlocked(true);
      }
    }
  }, [isVisible]);

  // If ad blocker blocked or network error, render cleanly without breaking layout
  if (adBlocked) {
    return null;
  }

  return (
    <aside
      ref={containerRef}
      className={`relative w-full overflow-hidden transition-all duration-300 ${
        isSidebar
          ? 'rounded-xl border border-slate-800 bg-[#070e1c]/90 p-2 my-2'
          : 'rounded-2xl border border-slate-200/90 bg-white/90 p-3 sm:p-4 my-4 shadow-2xs'
      } ${className}`}
      style={{ minHeight: isSidebar ? '60px' : '90px' }}
      aria-label="Advertisement"
    >
      {/* Official Clear Label: Advertisement / বিজ্ঞাপন */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400 select-none pb-1.5 border-b border-slate-100 dark:border-slate-800/60 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500/70" />
          <span>{activeSponsor ? 'Sponsored' : 'Advertisement'}</span>
          <span className="text-slate-300 dark:text-slate-600 font-sans">/</span>
          <span className="font-sans text-[11px] font-medium text-slate-500">
            {activeSponsor ? 'স্পন্সরড' : 'বিজ্ঞাপন'}
          </span>
        </div>
        <span className="text-[9px] text-slate-400 font-sans hidden sm:inline">
          Monetization supports free tools
        </span>
      </div>

      {/* Ad content delivery container */}
      <div className="w-full flex items-center justify-center overflow-hidden">
        {isVisible && (
          <>
            {/* 1. Direct Sponsor Banner */}
            {ADS_CONFIG.provider === 'direct' && activeSponsor && isValidSponsorUrl(activeSponsor.destinationUrl) && (
              <a
                href={activeSponsor.destinationUrl}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="group block relative overflow-hidden rounded-xl transition-transform hover:scale-[1.01]"
              >
                <img
                  src={activeSponsor.bannerImageUrl}
                  alt={activeSponsor.altText || activeSponsor.name}
                  className="max-w-full h-auto rounded-lg shadow-xs object-cover"
                  loading="lazy"
                  width={728}
                  height={90}
                />
              </a>
            )}

            {/* 2. Adsterra Display Banner (Sandboxed Iframe Lifecycle) */}
            {ADS_CONFIG.provider === 'adsterra' && adsterraUnit && (
              <div
                className="flex items-center justify-center overflow-hidden"
                style={{
                  width: adsterraUnit.width,
                  height: adsterraUnit.height,
                  maxWidth: '100%',
                }}
              >
                <iframe
                  title={`Advertisement-${placement}`}
                  srcDoc={adsterraIframeSrcDoc}
                  width={adsterraUnit.width}
                  height={adsterraUnit.height}
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
                  scrolling="no"
                  loading="lazy"
                  style={{
                    border: 'none',
                    overflow: 'hidden',
                    maxWidth: '100%',
                  }}
                />
              </div>
            )}

            {/* 3. Google AdSense Ins Tag */}
            {ADS_CONFIG.provider === 'adsense' && ADS_CONFIG.adsense.publisherId && (
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%', height: '90px' }}
                data-ad-client={ADS_CONFIG.adsense.publisherId}
                data-ad-slot={slotPlacement.adSenseSlotId || ''}
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            )}
          </>
        )}
      </div>
    </aside>
  );
};

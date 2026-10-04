import React, { useState, useEffect, useRef } from 'react';
import { ADS_CONFIG } from '../../config/adsConfig';

export type AdPlacement =
  | 'home-after-tools'
  | 'home-bottom'
  | 'sidebar-bottom'
  | 'tool-result-bottom';

interface AdSlotProps {
  placement: AdPlacement;
  className?: string;
}

export const AdSlot: React.FC<AdSlotProps> = ({ placement, className = '' }) => {
  // If ads are disabled by default, render NOTHING and consume NO space (0 CLS)
  if (!ADS_CONFIG.enabled) {
    return null;
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const slotConfig = ADS_CONFIG.slots[placement] || {
    slotId: '',
    minHeight: '90px',
    format: 'horizontal',
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Lazy load ad slot once it nears the viewport
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

  const isSidebar = placement === 'sidebar-bottom';

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden transition-opacity duration-300 ${
        isSidebar
          ? 'rounded-xl border border-slate-800 bg-[#070e1c]/80 p-2 my-2'
          : 'rounded-2xl border border-slate-200/90 bg-white/80 p-3 sm:p-4 my-4 shadow-2xs'
      } ${className}`}
      style={{ minHeight: slotConfig.minHeight }}
      aria-label="Advertisement"
    >
      {/* Subtle Advertisement Identifier (AdSense Compliance) */}
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400 select-none pb-1.5">
        <span>Advertisement</span>
        <span className="text-[9px] text-slate-400 font-sans">Sponsored</span>
      </div>

      {/* Ad content placeholder area */}
      <div
        className={`w-full flex items-center justify-center text-xs text-slate-400 rounded-lg ${
          isSidebar
            ? 'bg-slate-900/60 border border-slate-800 py-4'
            : 'bg-slate-50/80 border border-dashed border-slate-200 py-6'
        }`}
        style={{ minHeight: `calc(${slotConfig.minHeight} - 28px)` }}
      >
        {isVisible && ADS_CONFIG.publisherId ? (
          // In real production deployment, this mounts the Google AdSense ins tag
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={ADS_CONFIG.publisherId}
            data-ad-slot={slotConfig.slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <span className="text-[11px] font-medium text-slate-400/80">
            Ad Space ({placement})
          </span>
        )}
      </div>
    </div>
  );
};

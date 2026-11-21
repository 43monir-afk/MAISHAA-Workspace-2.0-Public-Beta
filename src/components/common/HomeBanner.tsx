import React from 'react';

/**
 * Home page welcome banner (desktop / tablet).
 * The artwork is a pre-rendered composite (owner's circular logo, "Welcome to MAISHAA Workspace",
 * the family photo in an arch frame and tool cards), exported as WebP in three widths.
 * Phones (< md) do not use it: the text inside would be too small, so Home renders the compact
 * logo + title block there instead (see UniversalWorkspace).
 */
export const HomeBanner: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={className}>
    <h1 className="sr-only">MAISHAA WORKSPACE</h1>
    <img
      src="/images/maishaa-banner-2000.webp"
      srcSet="/images/maishaa-banner-1000.webp 1000w, /images/maishaa-banner-2000.webp 2000w, /images/maishaa-banner-3000.webp 3000w"
      sizes="(min-width: 1536px) 1400px, 92vw"
      width={3000}
      height={1025}
      alt="Welcome to MAISHAA Workspace: PDF, image and Office tools in one place"
      className="w-full h-auto rounded-2xl shadow-[0_8px_30px_-8px_rgba(11,42,111,0.35)] select-none"
      decoding="async"
      draggable={false}
    />
  </div>
);

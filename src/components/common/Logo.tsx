import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  /**
   * 'circular' / 'badge': the full MAISHAA WORKSPACE badge (public/logo-512.png, transparent corners), for big placements.
   * 'mark': compact M² icon (public/favicon.svg), readable down to favicon size.
   * Small renders (< 72 px) automatically use the mark, because the badge's detail is unreadable there.
   */
  variant?: 'badge' | 'circular' | 'mark';
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-9 h-9', size = 36, variant = 'circular' }) => {
  const useMark = variant === 'mark' || size < 72;
  return (
    <img
      src={useMark ? '/favicon.svg' : '/logo-512.png'}
      width={size}
      height={size}
      className={className}
      alt="MAISHAA WORKSPACE – মাইশা ওয়ার্কস্পেস"
      draggable={false}
      decoding="async"
    />
  );
};

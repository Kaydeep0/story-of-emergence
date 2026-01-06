// src/app/insights/hooks/useParallax.ts
// Subtle parallax effect hook for scroll-based depth

'use client';

import { useEffect, useState } from 'react';

export interface ParallaxConfig {
  backgroundSpeed: number; // 0-1, slower than content (e.g., 0.3)
  foregroundSpeed: number; // >1, faster than content (e.g., 1.2)
}

const DEFAULT_CONFIG: ParallaxConfig = {
  backgroundSpeed: 0.3, // Background moves 30% as fast as scroll
  foregroundSpeed: 1.2, // Foreground moves 20% faster than scroll
};

export function useParallax(config: ParallaxConfig = DEFAULT_CONFIG) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    // Throttle scroll events for performance
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    handleScroll(); // Initial call

    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
    };
  }, []);

  return {
    backgroundOffset: scrollY * config.backgroundSpeed,
    foregroundOffset: scrollY * config.foregroundSpeed,
    scrollY,
  };
}


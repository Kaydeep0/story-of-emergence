// src/app/insights/hooks/useDensity.ts
// Hook for managing visual density preference (Dense vs Spacious)

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

export type DensityMode = 'dense' | 'spacious';

const LOCAL_STORAGE_KEY_PREFIX = 'insights-density-mode';

export function useDensity(address: string | undefined, mounted: boolean) {
  const [density, setDensity] = useState<DensityMode>('spacious');

  const getLocalStorageKey = useCallback((walletAddress: string) => {
    return `${LOCAL_STORAGE_KEY_PREFIX}-${walletAddress.toLowerCase()}`;
  }, []);

  // Load density from localStorage on mount or address change
  useEffect(() => {
    if (!mounted || !address) {
      setDensity('spacious'); // Default to spacious
      return;
    }

    const key = getLocalStorageKey(address);
    const storedDensity = localStorage.getItem(key);

    if (storedDensity && ['dense', 'spacious'].includes(storedDensity)) {
      setDensity(storedDensity as DensityMode);
    } else {
      setDensity('spacious'); // Default if no valid stored density
    }
  }, [address, getLocalStorageKey, mounted]);

  // Handle density change and persist to localStorage
  const handleDensityChange = useCallback((newDensity: DensityMode) => {
    setDensity(newDensity);
    if (address) {
      const key = getLocalStorageKey(address);
      localStorage.setItem(key, newDensity);
    }
  }, [address, getLocalStorageKey]);

  return { densityMode: density, handleDensityChange };
}


import { useState, useEffect } from 'react';

export type NarrativeTone = 'calm' | 'poetic' | 'analytical' | 'mirror';

/**
 * Shared hook for narrative tone preference across all Insights lenses
 * Persists preference to localStorage keyed by wallet address
 */
export function useNarrativeTone(address: string | undefined, mounted: boolean) {
  const [narrativeTone, setNarrativeTone] = useState<NarrativeTone>('calm');

  // Load persisted tone preference on mount or when address changes
  useEffect(() => {
    if (!mounted || !address) {
      return;
    }

    const storageKey = `insights-narrative-tone-${address.toLowerCase()}`;
    const persisted = localStorage.getItem(storageKey);
    
    if (persisted && ['calm', 'poetic', 'analytical', 'mirror'].includes(persisted)) {
      setNarrativeTone(persisted as NarrativeTone);
    }
  }, [mounted, address]);

  // Persist tone preference when it changes
  const handleToneChange = (newTone: NarrativeTone) => {
    setNarrativeTone(newTone);
    
    if (address) {
      const storageKey = `insights-narrative-tone-${address.toLowerCase()}`;
      localStorage.setItem(storageKey, newTone);
    }
  };

  return { narrativeTone, handleToneChange };
}


// src/app/lib/insights/useInsightEngine.ts
// Hook for accessing insight engine state (stub implementation for debug strip)

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import type { InsightEngineState } from '../insightEngine';
import { loadExternalEntriesForEngine } from '../insightEngine';

/**
 * Hook to access insight engine state for debug purposes
 * Returns engine status, recipes, and external entries count
 */
export function useInsightEngine() {
  const { address, isConnected } = useAccount();
  const [state, setState] = useState<InsightEngineState>({
    reflections: [],
    external: [],
    status: 'idle',
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setState({
        reflections: [],
        external: [],
        status: 'idle',
      });
      return;
    }

    // Load external entries using mock for now
    async function loadData() {
      if (!address) return; // Type guard
      
      setState((prev) => ({ ...prev, status: 'loading' }));
      
      // For now, use mock sources until RPC is wired
      // listExternalEntries will use getMockSources internally
      const updatedState = await loadExternalEntriesForEngine(address, {
        reflections: [],
        external: [],
        status: 'loading',
      });
      
      setState(updatedState);
    }

    loadData();
  }, [isConnected, address]);

  return {
    status: state.status,
    recipes: [] as unknown[],
    external: state.external,
  };
}

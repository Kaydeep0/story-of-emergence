// src/app/lib/insights/useInsightEngine.ts
// Hook for accessing insight engine state (stub implementation for debug strip)

'use client';

/**
 * Hook to access insight engine state for debug purposes
 * Returns engine status and recipes - stub implementation for now
 */
export function useInsightEngine() {
  // Stub implementation - will be replaced with real engine later
  return {
    status: 'idle' as const,
    recipes: [] as unknown[],
  };
}

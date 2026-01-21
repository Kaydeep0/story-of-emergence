/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical lifetime signal system or removed
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 */

import { useMemo } from 'react';
import {
  buildLifetimeSignalInventory,
  type ReflectionMeta,
  type DeterministicCandidate,
} from './lifetimeSignalInventory';

/**
 * Hook to compute lifetime signal inventory from reflections and candidates.
 * 
 * No fetching logic. Caller must provide inputs.
 * No transforms. No formatting. Returns data only.
 */
export function useLifetimeSignalInventory(args: {
  reflections: ReflectionMeta[];
  candidates: DeterministicCandidate[];
}) {
  return useMemo(() => {
    return buildLifetimeSignalInventory(args);
  }, [args.reflections, args.candidates]);
}


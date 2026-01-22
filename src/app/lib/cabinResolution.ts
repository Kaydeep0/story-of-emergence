// src/app/lib/cabinResolution.ts
// Pure function for cabin mode resolution logic
// Extracted for testability

export interface CabinResolutionInputs {
  explicitMode: 'cabin' | null;
  fromBridge: boolean;
  optedOut: boolean;
  debug: boolean;
  threadDepth: number;
  highlightsFound: boolean;
  urlHasCabinMode: boolean;
}

export interface CabinResolutionResult {
  cabin: boolean;
  reason: 'bridge' | 'depth' | 'highlights' | null;
}

/**
 * Resolves cabin mode state based on inputs
 * 
 * Rules:
 * 1. Explicit mode=cabin always wins
 * 2. Opt-out prevents auto-cabin (unless URL explicitly has mode=cabin)
 * 3. Debug mode prevents auto-cabin
 * 4. Auto-cabin triggers: fromBridge OR threadDepth >= 2 OR highlightsFound
 * 5. Reason priority: bridge > depth > highlights
 */
export function resolveCabinMode(inputs: CabinResolutionInputs): CabinResolutionResult {
  const {
    explicitMode,
    fromBridge,
    optedOut,
    debug,
    threadDepth,
    highlightsFound,
    urlHasCabinMode,
  } = inputs;

  // 1. Explicit mode always wins
  if (explicitMode === 'cabin') {
    return { cabin: true, reason: null };
  }

  // 2. URL mode overrides opt-out
  if (urlHasCabinMode === true) {
    return { cabin: true, reason: 'bridge' };
  }

  // 3. Opt-out prevents auto-cabin
  if (optedOut === true) {
    return { cabin: false, reason: null };
  }

  // 4. Debug mode prevents auto-cabin
  if (debug === true) {
    return { cabin: false, reason: null };
  }

  // 5. Evaluate triggers normally (priority: bridge > depth > highlights)
  const shouldAutoCabin = fromBridge || threadDepth >= 2 || highlightsFound;
  
  if (!shouldAutoCabin) {
    return { cabin: false, reason: null };
  }

  // Determine reason (priority: bridge > depth > highlights)
  let reason: 'bridge' | 'depth' | 'highlights' | null = null;
  if (fromBridge) {
    reason = 'bridge';
  } else if (threadDepth >= 2) {
    reason = 'depth';
  } else if (highlightsFound) {
    reason = 'highlights';
  }

  return { cabin: true, reason };
}


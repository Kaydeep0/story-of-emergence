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

  // Explicit mode always wins
  if (explicitMode === 'cabin') {
    return { cabin: true, reason: null };
  }

  // Calculate shouldAutoCabin (before opt-out check)
  const shouldAutoCabin = !debug && 
    !optedOut &&
    (
      fromBridge ||
      threadDepth >= 2 ||
      highlightsFound
    );

  // If user opted out and URL doesn't explicitly have mode=cabin, don't auto-enter
  const finalShouldAutoCabin = optedOut && !urlHasCabinMode ? false : shouldAutoCabin;

  // Determine reason (priority: bridge > depth > highlights)
  let reason: 'bridge' | 'depth' | 'highlights' | null = null;
  if (finalShouldAutoCabin) {
    if (fromBridge) {
      reason = 'bridge';
    } else if (threadDepth >= 2) {
      reason = 'depth';
    } else if (highlightsFound) {
      reason = 'highlights';
    }
  }

  const cabin = finalShouldAutoCabin;

  return { cabin, reason };
}


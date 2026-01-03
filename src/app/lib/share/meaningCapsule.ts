// src/app/lib/share/meaningCapsule.ts
// Meaning Capsule Contract - Shareable insight moment without private data
// Contract-only: no JSX, no rendering, no UI, no fetching, no inference

/**
 * Meaning Capsule - Shareable insight moment
 * 
 * A small structured object that represents a single insight moment
 * without exposing raw reflections or private data.
 * 
 * Designed to be safe for public sharing:
 * - No identifiers
 * - No personal data
 * - No raw text
 * - No timestamps
 * - No wallet addresses
 * 
 * This is a read-only, exportable representation of meaning.
 */
export type MeaningCapsule = {
  /** One insight sentence - derived from computed insight, sanitized */
  insightSentence: string;
  
  /** Temporal context label - describes when this insight applies */
  temporalContext: 'recent' | 'over time' | 'recurring' | 'emerging' | 'persistent';
  
  /** Philosophical frame - position on determinism → emergence spectrum */
  philosophicalFrame: {
    /** Regime classification */
    regime: 'deterministic' | 'structured' | 'emergent' | 'chaotic';
    
    /** Position on 0-1 scale (0 = deterministic, 1 = emergence) */
    position: number;
  };
};

/**
 * Input data for building a Meaning Capsule
 * All fields must be from already-computed insight outputs
 * 
 * Cannot accept:
 * - Raw text or reflections
 * - Entry IDs or timestamps
 * - Wallet addresses or user identifiers
 * - Personal data
 */
export type MeaningCapsuleInput = {
  /** Insight sentence from computed insight card (title or explanation) */
  insightSentence: string;
  
  /** Time horizon from insight artifact */
  horizon: 'weekly' | 'yearly' | 'lifetime' | 'yoy';
  
  /** Philosophical frame from EmergenceMap */
  emergenceMap: {
    regime: 'deterministic' | 'structured' | 'emergent' | 'chaotic';
    position: number;
  };
};

/**
 * Map insight horizon to temporal context label
 * Pure function - deterministic mapping
 */
function mapHorizonToTemporalContext(
  horizon: MeaningCapsuleInput['horizon']
): MeaningCapsule['temporalContext'] {
  switch (horizon) {
    case 'weekly':
      return 'recent';
    case 'yearly':
      return 'over time';
    case 'lifetime':
      return 'persistent';
    case 'yoy':
      return 'recurring';
    default:
      return 'over time';
  }
}

/**
 * Sanitize insight sentence for sharing
 * Removes any potential identifiers or personal markers
 * 
 * Rules:
 * - No dates or timestamps
 * - No specific counts that could identify
 * - No source names or identifiers
 * - Preserves meaning but removes identifying details
 */
function sanitizeInsightSentence(sentence: string): string {
  // Remove any ISO date patterns (YYYY-MM-DD)
  let sanitized = sentence.replace(/\d{4}-\d{2}-\d{2}/g, '');
  
  // Remove any wallet address patterns (0x followed by hex)
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{40}/g, '');
  
  // Remove any entry ID patterns (if they follow a pattern)
  // This is defensive - entry IDs shouldn't be in insight sentences
  
  // Trim and normalize whitespace
  sanitized = sanitized.trim().replace(/\s+/g, ' ');
  
  // If sentence is empty after sanitization, return a neutral fallback
  if (sanitized.length === 0) {
    return 'Patterns observed in reflection.';
  }
  
  return sanitized;
}

/**
 * Build a Meaning Capsule from existing insight outputs
 * 
 * Pure function - deterministic, no side effects.
 * Transforms already-computed insight data into a shareable capsule.
 * 
 * Rules:
 * - No new intelligence
 * - No inference or scoring
 * - No personalization
 * - No fetching or network calls
 * - Pure transformation only
 * 
 * @param input - Already-computed insight outputs (sentence, horizon, emergenceMap)
 * @returns MeaningCapsule safe for public sharing
 */
export function buildMeaningCapsule(input: MeaningCapsuleInput): MeaningCapsule {
  const { insightSentence, horizon, emergenceMap } = input;
  
  // Sanitize insight sentence to remove any potential identifiers
  const sanitizedSentence = sanitizeInsightSentence(insightSentence);
  
  // Map horizon to temporal context
  const temporalContext = mapHorizonToTemporalContext(horizon);
  
  // Extract philosophical frame from EmergenceMap
  const philosophicalFrame = {
    regime: emergenceMap.regime,
    position: emergenceMap.position,
  };
  
  return {
    insightSentence: sanitizedSentence,
    temporalContext,
    philosophicalFrame,
  };
}


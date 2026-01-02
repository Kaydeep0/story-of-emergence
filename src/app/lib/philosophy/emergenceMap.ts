/**
 * PHILOSOPHY PRIMITIVE — DO NOT EXTEND LIGHTLY
 *
 * This module encodes the core worldview of Story of Emergence:
 * movement from determinism toward emergence across time.
 *
 * This is NOT:
 * - A predictive model
 * - A scoring system
 * - A recommendation engine
 * - A gamified visualization
 *
 * Rules:
 * - No new intelligence is introduced here
 * - No interactivity that changes meaning
 * - No user manipulation or optimization signals
 * - No reinterpretation of distributions
 *
 * This layer exists to orient, not instruct.
 * Any proposal to modify this must preserve philosophical neutrality.
 */

// src/app/lib/philosophy/emergenceMap.ts
// EmergenceMap Contract - Semantic mapping of determinism → emergence spectrum
// Contract-only: no JSX, no rendering, no UI
// Derived from existing insight outputs only

/**
 * EmergenceMap - Canonical representation of position on determinism → emergence spectrum
 * 
 * This is a frozen semantic layer that maps existing insight data to a philosophical position.
 * No new intelligence, no UI - pure derivation from distributionLabel, concentration, spikeCount.
 */
export type EmergenceMap = {
  /** Position on 0–1 scale: 0 = deterministic, 1 = emergence/chaos */
  position: number;
  
  /** Regime classification */
  regime: 'deterministic' | 'structured' | 'emergent' | 'chaotic';
  
  /** Distribution context from existing insights */
  distributionContext: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  
  /** Short human-readable label */
  narrativeLabel: string;
  
  /** 1–2 sentence explanation of the position */
  explanation: string;
};

/**
 * Input data for building an EmergenceMap
 * All fields derived from existing insight outputs
 */
export type EmergenceMapInput = {
  /** Distribution label from existing insights */
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  
  /** Concentration: share of activity in top 10% of days (0–1) */
  concentration: number;
  
  /** Spike count: number of high-activity days */
  spikeCount: number;
};

/**
 * Build an EmergenceMap from existing insight outputs
 * 
 * Pure function - deterministic, no side effects.
 * Maps distribution patterns to philosophical position on determinism → emergence spectrum.
 * 
 * Rules:
 * - No new intelligence
 * - No UI
 * - No changes to existing logic
 * - Frozen semantic layer
 * 
 * @param input - Existing insight outputs (distributionLabel, concentration, spikeCount)
 * @returns EmergenceMap with position, regime, and narrative
 */
export function buildEmergenceMap(input: EmergenceMapInput): EmergenceMap {
  const { distributionLabel, concentration, spikeCount } = input;
  
  // Normalize spike count to a 0-1 scale (assuming max reasonable spikes ~50 for a year)
  const normalizedSpikeCount = Math.min(spikeCount / 50, 1);
  
  // Determine base position from distribution pattern
  let basePosition: number;
  let regime: EmergenceMap['regime'];
  let narrativeLabel: string;
  let explanation: string;
  
  if (distributionLabel === 'normal') {
    // Normal distribution = more deterministic
    // Position depends on concentration and spikes
    if (concentration < 0.3 && normalizedSpikeCount < 0.2) {
      // Low concentration, few spikes = highly deterministic
      basePosition = 0.15;
      regime = 'deterministic';
      narrativeLabel = 'Steady rhythm';
      explanation = 'Your patterns follow a predictable, consistent rhythm. Each day contributes evenly, creating a stable foundation.';
    } else if (concentration < 0.5) {
      // Moderate concentration = structured
      basePosition = 0.35;
      regime = 'structured';
      narrativeLabel = 'Organized flow';
      explanation = 'Your activity follows a structured pattern with some natural variation. The rhythm is consistent but not rigid.';
    } else {
      // Higher concentration = more emergent
      basePosition = 0.55;
      regime = 'emergent';
      narrativeLabel = 'Patterns emerging';
      explanation = 'Even within a normal distribution, certain periods concentrate your attention. Patterns are beginning to emerge from the steady flow.';
    }
  } else if (distributionLabel === 'lognormal') {
    // Log-normal = structured with natural variation
    if (concentration < 0.4) {
      basePosition = 0.4;
      regime = 'structured';
      narrativeLabel = 'Natural variation';
      explanation = 'Your activity follows a log-normal pattern—structured but with natural variation. Some days naturally carry more weight.';
    } else {
      basePosition = 0.6;
      regime = 'emergent';
      narrativeLabel = 'Emerging structure';
      explanation = 'Your log-normal pattern shows concentration in key periods. Structure is emerging from the natural variation.';
    }
  } else if (distributionLabel === 'powerlaw') {
    // Power law = high emergence
    if (concentration > 0.7 || normalizedSpikeCount > 0.4) {
      basePosition = 0.85;
      regime = 'chaotic';
      narrativeLabel = 'At the edge of emergence';
      explanation = 'Your activity follows a power-law distribution with high concentration. A few intense moments shape everything—patterns emerge unpredictably.';
    } else {
      basePosition = 0.7;
      regime = 'emergent';
      narrativeLabel = 'Emergent patterns';
      explanation = 'Your activity follows a power-law pattern. A small number of intense periods carry disproportionate weight, revealing emergent structure.';
    }
  } else if (distributionLabel === 'mixed') {
    // Mixed = complex, potentially chaotic
    if (concentration > 0.6) {
      basePosition = 0.8;
      regime = 'chaotic';
      narrativeLabel = 'Complex emergence';
      explanation = 'Your activity shows mixed patterns with high concentration. Multiple rhythms overlap, creating complex emergent behavior.';
    } else {
      basePosition = 0.65;
      regime = 'emergent';
      narrativeLabel = 'Layered patterns';
      explanation = 'Your activity shows mixed distribution patterns. Different rhythms coexist, revealing emergent structure from complexity.';
    }
  } else {
    // 'none' = insufficient data, default to structured
    basePosition = 0.45;
    regime = 'structured';
    narrativeLabel = 'Patterns forming';
    explanation = 'Your activity patterns are still forming. As more data accumulates, clearer structure will emerge.';
  }
  
  // Adjust position based on spike count (more spikes = more emergent)
  // Spike count adds 0-0.15 to position
  const spikeAdjustment = normalizedSpikeCount * 0.15;
  
  // Adjust position based on concentration (higher concentration = more emergent)
  // Concentration adds 0-0.1 to position
  const concentrationAdjustment = concentration * 0.1;
  
  // Final position: clamp to 0-1
  const finalPosition = Math.max(0, Math.min(1, basePosition + spikeAdjustment + concentrationAdjustment));
  
  // Re-determine regime if position shifted significantly
  let finalRegime = regime;
  if (finalPosition < 0.25) {
    finalRegime = 'deterministic';
  } else if (finalPosition < 0.5) {
    finalRegime = 'structured';
  } else if (finalPosition < 0.75) {
    finalRegime = 'emergent';
  } else {
    finalRegime = 'chaotic';
  }
  
  // Update narrative if regime changed
  if (finalRegime !== regime) {
    if (finalRegime === 'deterministic') {
      narrativeLabel = 'Steady rhythm';
      explanation = 'Your patterns follow a predictable, consistent rhythm. Each day contributes evenly, creating a stable foundation.';
    } else if (finalRegime === 'structured') {
      narrativeLabel = 'Organized flow';
      explanation = 'Your activity follows a structured pattern with some natural variation. The rhythm is consistent but not rigid.';
    } else if (finalRegime === 'emergent') {
      narrativeLabel = 'Patterns emerging';
      explanation = 'Your activity shows emergent patterns. Certain periods concentrate your attention, revealing structure from complexity.';
    } else {
      narrativeLabel = 'At the edge of emergence';
      explanation = 'Your activity shows high concentration and unpredictable patterns. A few intense moments shape everything—emergence dominates.';
    }
  }
  
  return {
    position: finalPosition,
    regime: finalRegime,
    distributionContext: distributionLabel,
    narrativeLabel,
    explanation,
  };
}


/**
 * Emergence Boundary Crossing Detector
 * 
 * Identifies when the system crosses from non-emergent structure into emergent structure,
 * without influencing, amplifying, narrating, or stabilizing emergence.
 * 
 * This detector does not create meaning.
 * It only marks that emergence has occurred.
 * 
 * Core Principle:
 * - Emergence is detected, not encouraged.
 * - Observation must not change the system.
 * 
 * Requirements:
 * - Emergence definition: structural condition, not semantic. Based ONLY on structural density, density gradient, curvature, neighborhood connectivity.
 * - Binary boundary: either emergent or not. No partial states, degrees, or scores.
 * - Non-causal: must NOT reinforce meaning, slow decay, affect novelty, prevent collapse, stabilize regimes, extend dwell time.
 * - Non-directional: no "entering" or "leaving" semantics, no progress framing.
 * - Deterministic: same structure → same detection result. No smoothing, temporal hysteresis, or momentum.
 * - Session scoped: computed per wallet session. No cross-session memory.
 * - Read-only and isolated: computed in its own module, not imported by inference, decay, novelty, or UI logic.
 * - No UI exposure: no indicator, badge, animation, copy, explanation, or visual affordance.
 * - Encrypted at rest: detection result encrypted client-side, stored separately.
 * - No semantics: no labels like "alive," "active," "rich," or "complex."
 */

import type { StructuralDensityMap } from './computeStructuralDensity';
import type { StructuralDensityGradient } from './computeDensityGradient';
import type { StructuralCurvatureIndex } from './computeStructuralCurvature';
import type { StructuralNeighborhoodIndex } from './buildNeighborhoodIndex';

export type EmergenceBoundaryState = {
  isEmergent: boolean; // Binary: true if system has crossed into emergent structure, false otherwise
  sessionId: string;
  createdAt: string; // ISO timestamp
};

export type EmergenceDetectionSignals = {
  densityMap: StructuralDensityMap;
  densityGradient: StructuralDensityGradient;
  curvatureIndex: StructuralCurvatureIndex;
  neighborhoodIndex: StructuralNeighborhoodIndex;
  sessionId: string;
};

/**
 * Detect emergence boundary crossing
 * 
 * Emergence is defined as a structural condition where:
 * - Structural density shows local concentration (neighborhoods with above-average density)
 * - Density gradient shows variation (non-uniform density distribution)
 * - Curvature shows deviation from uniform structure (bent neighborhoods)
 * - Neighborhood connectivity shows clustering (reflections with multiple neighbors)
 * 
 * Detection thresholds (deterministic, fixed):
 * - At least 30% of reflections must have density > average density
 * - Average density gradient magnitude must be > 0.3
 * - Average curvature magnitude must be > 0.2
 * - At least 40% of reflections must have 3+ neighbors
 * 
 * Binary boundary: all thresholds must be met for emergence to be detected.
 * 
 * Deterministic: same structure → same detection result.
 * Non-causal: detection does not influence the system.
 * 
 * @param signals - Emergence detection signals
 * @returns EmergenceBoundaryState
 */
export function detectEmergenceBoundary(signals: EmergenceDetectionSignals): EmergenceBoundaryState {
  const { densityMap, densityGradient, curvatureIndex, neighborhoodIndex, sessionId } = signals;

  const { densities } = densityMap;
  const { gradients } = densityGradient;
  const { curvatures } = curvatureIndex;
  const { neighborhoods } = neighborhoodIndex;

  if (densities.length === 0 || gradients.length === 0 || curvatures.length === 0 || neighborhoods.length === 0) {
    // No structure = not emergent
    return {
      isEmergent: false,
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  // Compute average density
  const totalDensity = densities.reduce((sum, d) => sum + d.density, 0);
  const averageDensity = totalDensity / densities.length;

  // Check threshold 1: At least 30% of reflections must have density > average density
  const highDensityCount = densities.filter(d => d.density > averageDensity).length;
  const highDensityRatio = highDensityCount / densities.length;
  const threshold1Met = highDensityRatio >= 0.3;

  // Compute average density gradient magnitude
  const totalGradientMagnitude = gradients.reduce((sum, g) => sum + g.gradientMagnitude, 0);
  const averageGradientMagnitude = totalGradientMagnitude / gradients.length;

  // Check threshold 2: Average density gradient magnitude must be > 0.3
  const threshold2Met = averageGradientMagnitude > 0.3;

  // Compute average curvature magnitude
  const totalCurvatureMagnitude = curvatures.reduce((sum, c) => sum + c.curvatureMagnitude, 0);
  const averageCurvatureMagnitude = totalCurvatureMagnitude / curvatures.length;

  // Check threshold 3: Average curvature magnitude must be > 0.2
  const threshold3Met = averageCurvatureMagnitude > 0.2;

  // Check threshold 4: At least 40% of reflections must have 3+ neighbors
  const highConnectivityCount = neighborhoods.filter(n => n.neighborIds.length >= 3).length;
  const highConnectivityRatio = highConnectivityCount / neighborhoods.length;
  const threshold4Met = highConnectivityRatio >= 0.4;

  // Binary boundary: all thresholds must be met for emergence
  const isEmergent = threshold1Met && threshold2Met && threshold3Met && threshold4Met;

  return {
    isEmergent,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}


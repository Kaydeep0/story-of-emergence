import type { Regime } from './detectRegime';
import { detectRegime } from './detectRegime';
import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { ObservationClosure } from '../closure/inferObservationClosure';

export type PeriodRegimeData = {
  period: string;
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
  closure?: ObservationClosure;
};

export type StabilizedRegimeHistory = {
  period: string;
  rawRegime: Regime;
  stabilizedRegime: Regime;
}[];

/**
 * Compute evidence for emergent regime (0..1)
 * Higher values indicate stronger emergent signals
 */
function computeEvidenceEmergent(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): number {
  if (clusters.length === 0) {
    return 0;
  }

  // Calculate cluster dominance ratio
  const allPeriods = new Set<string>();
  clusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => allPeriods.add(period));
  });

  let dominance = 0;
  if (allPeriods.size > 0) {
    const clusterPeriodCounts = clusters.map(cluster => cluster.sourcePeriods.length);
    clusterPeriodCounts.sort((a, b) => b - a);
    const topClusterPeriods = clusterPeriodCounts[0] || 0;
    dominance = topClusterPeriods / allPeriods.size;
  }

  // Calculate structural reuse (inverse: lower reuse = higher emergent evidence)
  const multiPeriodClusters = clusters.filter(c => c.sourcePeriods.length >= 2).length;
  const structuralReuse = clusters.length > 0 ? multiPeriodClusters / clusters.length : 0;

  // Calculate association concentration (inverse: lower concentration = higher emergent evidence)
  const clustersWithAssociations = new Set<string>();
  associations.forEach(assoc => {
    clustersWithAssociations.add(assoc.fromClusterId);
    clustersWithAssociations.add(assoc.toClusterId);
  });
  const associationConcentration = clusters.length > 0
    ? clustersWithAssociations.size / clusters.length
    : 0;

  // Calculate variance of cluster sizes (higher variance = higher emergent evidence)
  const clusterSizes = clusters.map(c => c.sourcePeriods.length);
  const meanSize = clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length;
  const variance = clusterSizes.reduce((sum, size) => {
    const diff = size - meanSize;
    return sum + (diff * diff);
  }, 0) / clusterSizes.length;

  // Normalize variance (assuming max reasonable variance around 10)
  const normalizedVariance = Math.min(variance / 10, 1);

  // Combine signals (weighted)
  // Strong dominance + low reuse + low association + few clusters = emergent
  const clusterCountSignal = Math.min(clusters.length / 5, 1); // Fewer clusters = more emergent
  const inverseClusterCount = 1 - clusterCountSignal;

  const evidence = (
    dominance * 0.4 +                    // Dominance is strong signal
    (1 - structuralReuse) * 0.25 +      // Low reuse = emergent
    (1 - associationConcentration) * 0.2 + // Low associations = emergent
    normalizedVariance * 0.1 +          // High variance = emergent
    inverseClusterCount * 0.05          // Few clusters = emergent
  );

  return Math.max(0, Math.min(1, evidence));
}

/**
 * Compute evidence for deterministic regime (0..1)
 * Higher values indicate stronger deterministic signals
 */
function computeEvidenceDeterministic(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[]
): number {
  if (clusters.length === 0) {
    return 1; // No clusters = default deterministic
  }

  // Calculate structural reuse (higher reuse = higher deterministic evidence)
  const multiPeriodClusters = clusters.filter(c => c.sourcePeriods.length >= 2).length;
  const structuralReuse = clusters.length > 0 ? multiPeriodClusters / clusters.length : 0;

  // Calculate association concentration (higher concentration = higher deterministic evidence)
  const clustersWithAssociations = new Set<string>();
  associations.forEach(assoc => {
    clustersWithAssociations.add(assoc.fromClusterId);
    clustersWithAssociations.add(assoc.toClusterId);
  });
  const associationConcentration = clusters.length > 0
    ? clustersWithAssociations.size / clusters.length
    : 0;

  // Calculate variance of cluster sizes (lower variance = higher deterministic evidence)
  const clusterSizes = clusters.map(c => c.sourcePeriods.length);
  const meanSize = clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length;
  const variance = clusterSizes.reduce((sum, size) => {
    const diff = size - meanSize;
    return sum + (diff * diff);
  }, 0) / clusterSizes.length;

  // Normalize variance (inverse: lower variance = higher deterministic)
  const normalizedVariance = Math.max(0, 1 - Math.min(variance / 10, 1));

  // Calculate period variance (lower = more deterministic)
  const periodCounts = new Map<string, number>();
  clusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => {
      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });
  });

  let periodVariance = 0;
  if (periodCounts.size > 0) {
    const counts = Array.from(periodCounts.values());
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const varianceValue = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;
    periodVariance = Math.max(0, 1 - Math.min(varianceValue / 5, 1)); // Normalize
  }

  // Combine signals (weighted)
  const evidence = (
    structuralReuse * 0.4 +              // High reuse = deterministic
    associationConcentration * 0.3 +      // High associations = deterministic
    normalizedVariance * 0.2 +            // Low variance = deterministic
    periodVariance * 0.1                 // Low period variance = deterministic
  );

  return Math.max(0, Math.min(1, evidence));
}

/**
 * Stabilize regime using hysteresis and persistence
 * 
 * Implements Schmitt trigger behavior with asymmetric thresholds:
 * - To switch INTO emergent: evidenceEmergent >= 0.70
 * - To switch OUT of emergent: evidenceEmergent <= 0.45
 * - To switch INTO deterministic: evidenceDeterministic >= 0.70
 * - To switch OUT of deterministic: evidenceDeterministic <= 0.45
 * 
 * Also enforces minimum persistence (2 periods) and closure rules.
 */
export function stabilizeRegime(
  periods: PeriodRegimeData[],
  previousHistory: StabilizedRegimeHistory = []
): StabilizedRegimeHistory {
  if (periods.length === 0) {
    return [];
  }

  const history: StabilizedRegimeHistory = [...previousHistory];
  
  // Track regime persistence (periods since last change)
  const regimePersistence = new Map<Regime, number>();
  let lastStabilizedRegime: Regime | null = null;
  
  if (history.length > 0) {
    lastStabilizedRegime = history[history.length - 1].stabilizedRegime;
    // Count consecutive periods with same regime
    let consecutiveCount = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].stabilizedRegime === lastStabilizedRegime) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    regimePersistence.set(lastStabilizedRegime, consecutiveCount);
  }

  for (const periodData of periods) {
    const { period, clusters, associations, closure } = periodData;

    // Closure rule: if period is closed, use previous stabilized regime
    if (closure === 'closed' && lastStabilizedRegime !== null) {
      const rawRegime = detectRegime({ clusters, associations, currentPeriod: period });
      history.push({
        period,
        rawRegime,
        stabilizedRegime: lastStabilizedRegime,
      });
      continue;
    }

    // Compute evidence values
    const evidenceEmergent = computeEvidenceEmergent(clusters, associations);
    const evidenceDeterministic = computeEvidenceDeterministic(clusters, associations);
    const rawRegime = detectRegime({ clusters, associations, currentPeriod: period });

    // First period: use raw regime (no hysteresis)
    if (lastStabilizedRegime === null) {
      history.push({
        period,
        rawRegime,
        stabilizedRegime: rawRegime,
      });
      lastStabilizedRegime = rawRegime;
      regimePersistence.set(rawRegime, 1);
      continue;
    }

    // Apply hysteresis thresholds
    let stabilizedRegime: Regime = lastStabilizedRegime;

    // Check if we should switch TO emergent
    if (lastStabilizedRegime !== 'emergent' && evidenceEmergent >= 0.70) {
      const persistence = regimePersistence.get(lastStabilizedRegime) || 0;
      // Minimum persistence: must have been in current regime for at least 2 periods
      if (persistence >= 2) {
        stabilizedRegime = 'emergent';
      }
    }
    // Check if we should switch OUT OF emergent
    else if (lastStabilizedRegime === 'emergent' && evidenceEmergent <= 0.45) {
      const persistence = regimePersistence.get('emergent') || 0;
      if (persistence >= 2) {
        // Determine which regime to switch to
        if (evidenceDeterministic >= 0.70) {
          stabilizedRegime = 'deterministic';
        } else {
          stabilizedRegime = 'transitional';
        }
      }
    }
    // Check if we should switch TO deterministic
    else if (lastStabilizedRegime !== 'deterministic' && evidenceDeterministic >= 0.70) {
      const persistence = regimePersistence.get(lastStabilizedRegime) || 0;
      if (persistence >= 2) {
        stabilizedRegime = 'deterministic';
      }
    }
    // Check if we should switch OUT OF deterministic
    else if (lastStabilizedRegime === 'deterministic' && evidenceDeterministic <= 0.45) {
      const persistence = regimePersistence.get('deterministic') || 0;
      if (persistence >= 2) {
        // Determine which regime to switch to
        if (evidenceEmergent >= 0.70) {
          stabilizedRegime = 'emergent';
        } else {
          stabilizedRegime = 'transitional';
        }
      }
    }
    // If both thresholds crossed (rare), prefer transitional unless extreme dominance
    else if (
      evidenceEmergent >= 0.70 && evidenceDeterministic >= 0.70 &&
      lastStabilizedRegime !== 'transitional'
    ) {
      const persistence = regimePersistence.get(lastStabilizedRegime) || 0;
      if (persistence >= 2) {
        // Check dominance ratio to break tie
        const allPeriods = new Set<string>();
        clusters.forEach(cluster => {
          cluster.sourcePeriods.forEach(p => allPeriods.add(p));
        });
        let dominance = 0;
        if (allPeriods.size > 0) {
          const clusterPeriodCounts = clusters.map(c => c.sourcePeriods.length);
          clusterPeriodCounts.sort((a, b) => b - a);
          const topClusterPeriods = clusterPeriodCounts[0] || 0;
          dominance = topClusterPeriods / allPeriods.size;
        }
        
        // Extreme dominance (>0.8) breaks tie toward emergent
        if (dominance > 0.8) {
          stabilizedRegime = 'emergent';
        } else {
          stabilizedRegime = 'transitional';
        }
      }
    }

    // Update persistence tracking
    if (stabilizedRegime === lastStabilizedRegime) {
      const currentPersistence = regimePersistence.get(stabilizedRegime) || 0;
      regimePersistence.set(stabilizedRegime, currentPersistence + 1);
    } else {
      // Regime changed, reset persistence
      regimePersistence.clear();
      regimePersistence.set(stabilizedRegime, 1);
    }

    history.push({
      period,
      rawRegime,
      stabilizedRegime,
    });

    lastStabilizedRegime = stabilizedRegime;
  }

  return history;
}

/**
 * Get stabilized regime for a specific period
 * Helper function to extract stabilized regime from history
 */
export function getStabilizedRegime(
  period: string,
  history: StabilizedRegimeHistory
): Regime | null {
  const entry = history.find(h => h.period === period);
  return entry?.stabilizedRegime || null;
}


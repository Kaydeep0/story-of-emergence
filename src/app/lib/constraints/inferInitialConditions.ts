import type { ConceptualCluster, ClusterAssociation } from '../clusters/conceptualClusters';
import type { ReflectionEntry } from '../insights/types';

export type ConstraintDensity = 'low' | 'medium' | 'high';
export type AuthorityConcentration = 'low' | 'medium' | 'high';
export type VariabilityBaseline = 'low' | 'medium' | 'high';

export type InitialConditions = {
  constraintDensity: ConstraintDensity;
  authorityConcentration: AuthorityConcentration;
  variabilityBaseline: VariabilityBaseline;
};

export type InitialConditionsSignals = {
  reflections: ReflectionEntry[];
  clusters: ConceptualCluster[];
  associations: ClusterAssociation[];
};

/**
 * Infer initial conditions from earliest available data
 * 
 * Initial conditions represent the observer's starting boundary with the environment.
 * They are not identity claims and are never edited, optimized, or reframed.
 * 
 * This function derives a stable constraint profile from:
 * - Earliest available data window (first 3-6 months or first 20-30 entries)
 * - Lowest-variance clusters (most stable patterns)
 * - Highest continuity signals (most persistent themes)
 * - Longest-lived associations (most stable relationships)
 * 
 * If initial conditions cannot be inferred, returns null (system behaves as before).
 */
export function inferInitialConditions(
  signals: InitialConditionsSignals
): InitialConditions | null {
  const { reflections, clusters, associations } = signals;

  // Need minimum data to infer initial conditions
  if (reflections.length < 10 || clusters.length === 0) {
    return null;
  }

  // Get earliest data window (first 3 months or first 30 entries, whichever is smaller)
  const sortedReflections = [...reflections]
    .filter(r => !r.deletedAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const earliestReflection = sortedReflections[0];
  if (!earliestReflection) {
    return null;
  }

  const earliestDate = new Date(earliestReflection.createdAt);
  const threeMonthsLater = new Date(earliestDate);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const earlyWindowReflections = sortedReflections.filter(r => {
    const date = new Date(r.createdAt);
    return date >= earliestDate && date <= threeMonthsLater;
  }).slice(0, 30); // Limit to first 30 entries

  if (earlyWindowReflections.length < 5) {
    return null; // Not enough early data
  }

  // Find clusters that appear in earliest periods
  const earlyPeriods = new Set<string>();
  earlyWindowReflections.forEach(r => {
    const date = new Date(r.createdAt);
    const year = date.getFullYear();
    earlyPeriods.add(year.toString());
  });

  const earlyClusters = clusters.filter(c => {
    // Cluster appears in earliest periods
    return c.sourcePeriods.some(p => earlyPeriods.has(p));
  });

  if (earlyClusters.length === 0) {
    return null;
  }

  // Calculate constraint density from cluster stability in early window
  // High constraint density = low variance, high recurrence, stable patterns
  const earlyClusterSizes = earlyClusters.map(c => c.sourcePeriods.length);
  const meanSize = earlyClusterSizes.reduce((sum, size) => sum + size, 0) / earlyClusterSizes.length;
  const variance = earlyClusterSizes.reduce((sum, size) => {
    const diff = size - meanSize;
    return sum + (diff * diff);
  }, 0) / earlyClusterSizes.length;

  // Low variance + high recurrence = high constraint density
  const recurrenceRatio = earlyClusters.filter(c => c.sourcePeriods.length >= 2).length / earlyClusters.length;
  const normalizedVariance = Math.max(0, 1 - Math.min(variance / 10, 1));

  const constraintScore = (recurrenceRatio * 0.6 + normalizedVariance * 0.4);
  const constraintDensity: ConstraintDensity =
    constraintScore >= 0.6 ? 'high' :
    constraintScore >= 0.3 ? 'medium' :
    'low';

  // Calculate authority concentration from association stability
  // High authority concentration = stable, concentrated associations
  const earlyAssociations = associations.filter(a => {
    // Association involves clusters that appear in early periods
    const fromCluster = clusters.find(c => c.id === a.fromClusterId);
    const toCluster = clusters.find(c => c.id === a.toClusterId);
    return (fromCluster && earlyClusters.includes(fromCluster)) ||
           (toCluster && earlyClusters.includes(toCluster));
  });

  let authorityConcentration: AuthorityConcentration = 'low';
  if (earlyAssociations.length > 0) {
    // Check if associations are concentrated (few clusters with many associations)
    const clustersWithAssociations = new Set<string>();
    earlyAssociations.forEach(a => {
      clustersWithAssociations.add(a.fromClusterId);
      clustersWithAssociations.add(a.toClusterId);
    });

    const associationConcentration = clustersWithAssociations.size / earlyClusters.length;
    const avgCoOccurrence = earlyAssociations.reduce((sum, a) => sum + a.coOccurrenceCount, 0) / earlyAssociations.length;

    // High concentration + high co-occurrence = high authority
    const authorityScore = (associationConcentration * 0.5 + Math.min(avgCoOccurrence / 3, 1) * 0.5);
    authorityConcentration =
      authorityScore >= 0.6 ? 'high' :
      authorityScore >= 0.3 ? 'medium' :
      'low';
  }

  // Calculate variability baseline from early period variance
  // Low variability baseline = stable, predictable patterns
  const periodCounts = new Map<string, number>();
  earlyClusters.forEach(cluster => {
    cluster.sourcePeriods.forEach(period => {
      periodCounts.set(period, (periodCounts.get(period) || 0) + 1);
    });
  });

  let variabilityBaseline: VariabilityBaseline = 'medium';
  if (periodCounts.size > 0) {
    const counts = Array.from(periodCounts.values());
    const mean = counts.reduce((sum, count) => sum + count, 0) / counts.length;
    const periodVariance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;

    // Low variance = low variability baseline
    const normalizedPeriodVariance = Math.min(periodVariance / 5, 1);
    variabilityBaseline =
      normalizedPeriodVariance <= 0.3 ? 'low' :
      normalizedPeriodVariance <= 0.6 ? 'medium' :
      'high';
  }

  return {
    constraintDensity,
    authorityConcentration,
    variabilityBaseline,
  };
}

/**
 * Get initial conditions for a wallet session
 * Computed once per session and cached in memory
 */
const initialConditionsCache = new Map<string, InitialConditions | null>();

export function getInitialConditions(
  walletAddress: string,
  signals: InitialConditionsSignals
): InitialConditions | null {
  const cacheKey = walletAddress.toLowerCase();

  if (initialConditionsCache.has(cacheKey)) {
    return initialConditionsCache.get(cacheKey) || null;
  }

  const conditions = inferInitialConditions(signals);
  initialConditionsCache.set(cacheKey, conditions);
  return conditions;
}

/**
 * Clear initial conditions cache (useful for testing or session reset)
 */
export function clearInitialConditionsCache(): void {
  initialConditionsCache.clear();
}


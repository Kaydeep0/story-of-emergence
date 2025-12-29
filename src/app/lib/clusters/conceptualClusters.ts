import type { YearlyWrap } from '../wrap/yearlyWrap';
import type { ReflectionEntry } from '../insights/types';
import { buildPriorYearWrap } from '../continuity/continuity';
import { buildYearlyWrap } from '../wrap/yearlyWrap';
import { buildDistributionFromReflections } from '../distributions/buildSeries';
import { classifyDistribution } from '../distributions/classify';
import { generateDistributionInsight } from '../distributions/insights';
import { generateNarrative } from '../distributions/narratives';
import { inspectDistribution } from '../distributions/inspect';
import { fromNarrative } from '../insights/viewModels';
import { calculateDensity } from '../insights/density';
import { classifyCadence } from '../insights/cadence';
import { generateInsightLabel } from '../insights/labels';
import type { Regime } from '../regime/detectRegime';

export type ConceptualCluster = {
  id: string;
  label: string; // 1-3 words, neutral nouns
  description?: string; // Max 1 sentence, optional
  sourcePeriods: string[]; // List of year or month identifiers (e.g., "2023", "2024-01")
  faded?: boolean; // True if cluster appeared in prior periods but not current period
  fadePhrase?: string; // Phrase describing fade status
};

export type ClusterAssociation = {
  fromClusterId: string;
  toClusterId: string;
  coOccurrenceCount: number;
  periods: string[]; // List of year or month identifiers where both clusters appeared
};

type PeriodSummary = {
  period: string; // Year or month identifier
  keywords: string[];
};

/**
 * Extract keywords from text (reused from continuity)
 * Only references summary text, never individual reflections or dates
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'your', 'my', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who', 'whom',
    'where', 'when', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not',
    'more', 'most', 'less', 'least', 'many', 'much', 'few', 'little', 'very', 'too',
    'so', 'than', 'then', 'there', 'here', 'now', 'then', 'just', 'only', 'also',
    'year', 'years', 'yearly', 'month', 'months', 'monthly', 'week', 'weeks', 'weekly',
    'day', 'days', 'daily', 'time', 'times', 'period', 'periods', 'appeared', 'appear',
    'similar', 'themes', 'theme', 'around', 'reflection', 'reflections', 'activity',
    'pattern', 'patterns', 'engagement', 'rhythm', 'rhythms', 'distributed', 'showed',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency and return top keywords
  const counts = new Map<string, number>();
  words.forEach(word => {
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

/**
 * Build YearlyWrap for a specific year from reflections
 * Helper function for cluster generation
 */
function buildYearWrapForYear(
  reflections: ReflectionEntry[],
  year: number
): YearlyWrap | null {
  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

  const yearEntries = reflections.filter(entry => {
    if (entry.deletedAt) return false;
    const entryDate = new Date(entry.createdAt);
    return entryDate >= yearStart && entryDate <= yearEnd;
  });

  if (yearEntries.length === 0) {
    return null;
  }

  const series = buildDistributionFromReflections(yearEntries, 'month', 'normal');
  const shape = classifyDistribution(series);

  if (shape === 'insufficient_data') {
    return null;
  }

  const classifiedSeries = { ...series, shape };
  const insight = generateDistributionInsight(classifiedSeries, shape);

  if (!insight) {
    return null;
  }

  const stats = inspectDistribution(classifiedSeries);
  const narrative = generateNarrative('year', insight);

  const bucketCounts = classifiedSeries.points.map(p => p.weight);
  const density = calculateDensity({ totalEvents: stats.totalEvents, scope: 'year' });
  const cadence = classifyCadence(bucketCounts);
  const label = generateInsightLabel({ totalEvents: stats.totalEvents, scope: 'year', bucketCounts });

  const card = fromNarrative(narrative, label);

  return buildYearlyWrap({
    yearlyInsights: [card],
    yearlyDeltas: [],
  });
}

/**
 * Generate neutral label from keywords (1-3 words, neutral nouns)
 * Avoids emotional adjectives, value judgments, clinical language
 */
function generateNeutralLabel(keywords: string[]): string {
  // Use the most frequent keyword as the base
  // Capitalize first letter for display
  if (keywords.length === 0) {
    return 'Pattern';
  }

  const primary = keywords[0];
  const capitalized = primary.charAt(0).toUpperCase() + primary.slice(1);

  // If we have 2-3 keywords, combine them (max 3 words)
  if (keywords.length >= 2) {
    const secondary = keywords[1];
    const secondaryCapitalized = secondary.charAt(0).toUpperCase() + secondary.slice(1);
    
    if (keywords.length >= 3) {
      const tertiary = keywords[2];
      const tertiaryCapitalized = tertiary.charAt(0).toUpperCase() + tertiary.slice(1);
      return `${capitalized} ${secondaryCapitalized} ${tertiaryCapitalized}`;
    }
    
    return `${capitalized} ${secondaryCapitalized}`;
  }

  return capitalized;
}

/**
 * Apply regime gating to clusters
 * Regime determines which observations are allowed to surface
 * Regime is never shown to user, only gates visibility
 */
function applyRegimeGating(
  clusters: ConceptualCluster[],
  associations: ClusterAssociation[],
  regime: Regime,
  currentPeriod: string
): ConceptualCluster[] {
  if (clusters.length === 0) {
    return [];
  }

  switch (regime) {
    case 'deterministic':
      // Deterministic regime suppresses:
      // - Multiplicity (keep only top clusters)
      // - Scenario projection
      // - Dominant cluster emphasis
      // Keep clusters with highest period counts, limit to top 3
      const sortedByPeriods = [...clusters].sort(
        (a, b) => b.sourcePeriods.length - a.sourcePeriods.length
      );
      return sortedByPeriods.slice(0, 3);

    case 'transitional':
      // Transitional regime allows:
      // - Lattice structure
      // - Spatial layout
      // - Acceleration visibility
      // Keep all clusters that pass silence rules
      return clusters;

    case 'emergent':
      // Emergent regime allows:
      // - Asymmetry
      // - Dominant cluster prominence
      // - Silence elsewhere without fallback
      // Keep only clusters with highest dominance
      const dominantClusters = [...clusters].sort(
        (a, b) => b.sourcePeriods.length - a.sourcePeriods.length
      );
      // Keep top 2 dominant clusters
      return dominantClusters.slice(0, 2);

    default:
      return clusters;
  }
}

/**
 * Generate conceptual clusters from reflections
 * Only forms clusters from repeated keywords across summaries
 * Minimum threshold: appears across at least 2 separate time periods
 * Applies regime gating to control observation visibility
 */
export function generateConceptualClusters(
  reflections: ReflectionEntry[],
  currentYearWrap: YearlyWrap,
  regime?: Regime
): ConceptualCluster[] {
  if (reflections.length === 0) {
    return [];
  }

  const currentYear = new Date().getFullYear();
  const periods: PeriodSummary[] = [];

  // Collect summaries from current year and prior years (up to 3 years back)
  for (let yearOffset = 0; yearOffset <= 3; yearOffset++) {
    const year = currentYear - yearOffset;
    const yearWrap = yearOffset === 0 
      ? currentYearWrap 
      : buildYearWrapForYear(reflections, year);

    if (yearWrap && yearWrap.summary) {
      const keywords = extractKeywords(yearWrap.summary);
      if (keywords.length > 0) {
        periods.push({
          period: year.toString(),
          keywords,
        });
      }
    }
  }

  // Need at least 2 periods to form clusters
  if (periods.length < 2) {
    return [];
  }

  // Find keywords that appear in at least 2 periods
  const keywordOccurrences = new Map<string, Set<string>>();

  for (const periodSummary of periods) {
    for (const keyword of periodSummary.keywords) {
      if (!keywordOccurrences.has(keyword)) {
        keywordOccurrences.set(keyword, new Set());
      }
      keywordOccurrences.get(keyword)!.add(periodSummary.period);
    }
  }

  // Group keywords that appear together across periods
  const clusters: ConceptualCluster[] = [];
  const processedKeywords = new Set<string>();

  for (const [keyword, periodsSet] of keywordOccurrences.entries()) {
    // Skip if keyword appears in fewer than 2 periods
    if (periodsSet.size < 2) {
      continue;
    }

    // Skip if already processed as part of another cluster
    if (processedKeywords.has(keyword)) {
      continue;
    }

    // Find related keywords that appear in similar periods
    const relatedKeywords: string[] = [keyword];
    const clusterPeriods = new Set(periodsSet);

    for (const [otherKeyword, otherPeriods] of keywordOccurrences.entries()) {
      if (otherKeyword === keyword || processedKeywords.has(otherKeyword)) {
        continue;
      }

      // Check if this keyword appears in at least 2 periods and overlaps with our cluster
      if (otherPeriods.size >= 2) {
        const overlap = Array.from(clusterPeriods).filter(p => otherPeriods.has(p));
        if (overlap.length >= 2) {
          relatedKeywords.push(otherKeyword);
          otherPeriods.forEach(p => clusterPeriods.add(p));
        }
      }
    }

    // Mark all keywords as processed
    relatedKeywords.forEach(kw => processedKeywords.add(kw));

    // Generate cluster
    const label = generateNeutralLabel(relatedKeywords.slice(0, 3));
    const id = `cluster-${label.toLowerCase().replace(/\s+/g, '-')}`;
    const description = `This theme has appeared in multiple periods.`;

    clusters.push({
      id,
      label,
      description,
      sourcePeriods: Array.from(clusterPeriods).sort(),
    });
  }

  // Apply regime gating if regime is provided
  if (regime) {
    const currentYear = new Date().getFullYear().toString();
    const emptyAssociations: ClusterAssociation[] = []; // Associations generated separately
    return applyRegimeGating(clusters, emptyAssociations, regime, currentYear);
  }

  return clusters;
}

/**
 * Generate associations between conceptual clusters
 * Associations exist only if two clusters appear in the same period summary
 * and occur in at least 2 separate periods
 * Applies silence rules - only renders if shouldRenderObservation returns true
 */
export function generateClusterAssociations(
  clusters: ConceptualCluster[],
  currentPeriod: string
): ClusterAssociation[] {
  if (clusters.length < 2) {
    return [];
  }

  const associations: ClusterAssociation[] = [];
  const processedPairs = new Set<string>();

  // Check all pairs of clusters
  for (let i = 0; i < clusters.length; i++) {
    for (let j = i + 1; j < clusters.length; j++) {
      const clusterA = clusters[i];
      const clusterB = clusters[j];

      // Create a canonical pair key (undirected)
      const pairKey = [clusterA.id, clusterB.id].sort().join('-');
      if (processedPairs.has(pairKey)) {
        continue;
      }
      processedPairs.add(pairKey);

      // Find periods where both clusters appear
      const periodsA = new Set(clusterA.sourcePeriods);
      const periodsB = new Set(clusterB.sourcePeriods);
      const coOccurringPeriods = Array.from(periodsA).filter(p => periodsB.has(p));

      // Association exists only if co-occurs in at least 2 separate periods
      if (coOccurringPeriods.length >= 2) {
        // Check if observation should be rendered (silence rules)
        const shouldRender = shouldRenderObservation(
          {
            type: 'association',
            periods: coOccurringPeriods,
            clusterA,
            clusterB,
            coOccurrenceCount: coOccurringPeriods.length,
          },
          {
            allClusters: clusters,
            currentPeriod,
          }
        );

        if (shouldRender) {
          associations.push({
            fromClusterId: clusterA.id,
            toClusterId: clusterB.id,
            coOccurrenceCount: coOccurringPeriods.length,
            periods: coOccurringPeriods.sort(),
          });
        }
      }
    }
  }

  return associations;
}

/**
 * Get associations for a specific cluster
 * Returns up to maxCount associations, sorted by co-occurrence count
 */
export function getAssociationsForCluster(
  clusterId: string,
  associations: ClusterAssociation[],
  maxCount: number = 2
): ClusterAssociation[] {
  const relevantAssociations = associations.filter(
    assoc => assoc.fromClusterId === clusterId || assoc.toClusterId === clusterId
  );

  // Sort by co-occurrence count (descending)
  relevantAssociations.sort((a, b) => b.coOccurrenceCount - a.coOccurrenceCount);

  return relevantAssociations.slice(0, maxCount);
}

/**
 * Get the other cluster ID from an association
 * Helper function to find which cluster is associated with the given cluster
 */
export function getAssociatedClusterId(
  association: ClusterAssociation,
  currentClusterId: string
): string {
  return association.fromClusterId === currentClusterId
    ? association.toClusterId
    : association.fromClusterId;
}

/**
 * Calculate conceptual distance between two clusters
 * Distance is inverse of shared periods: more shared periods = closer distance
 * Values remain internal only, not shown to user
 * Distance is NOT a score, rank, weight, or value judgment
 * Applies silence rules - only calculates if shouldRenderObservation returns true
 */
export function calculateClusterDistance(
  clusterA: ConceptualCluster,
  clusterB: ConceptualCluster,
  context: {
    allClusters: ConceptualCluster[];
    currentPeriod: string;
  }
): number | null {
  const periodsA = new Set(clusterA.sourcePeriods);
  const periodsB = new Set(clusterB.sourcePeriods);
  
  // Count shared periods
  const sharedPeriods = Array.from(periodsA).filter(p => periodsB.has(p)).length;
  
  // Total unique periods across both clusters
  const totalPeriods = new Set([...periodsA, ...periodsB]).size;
  
  // Check if distance observation should be rendered (silence rules)
  const shouldRender = shouldRenderObservation(
    {
      type: 'distance',
      periods: Array.from(periodsA).concat(Array.from(periodsB)),
      clusterA,
      clusterB,
      coOccurrenceCount: sharedPeriods,
    },
    context
  );

  if (!shouldRender) {
    return null; // Silence - return null instead of distance value
  }
  
  // Distance is inverse of shared period ratio
  // More shared periods = closer distance (lower value)
  // If no shared periods, distance is maximum (1.0)
  if (sharedPeriods === 0) {
    return 1.0;
  }
  
  // Distance = 1 - (sharedPeriods / totalPeriods)
  // This gives us a value between 0 (very close) and 1 (very far)
  const sharedRatio = sharedPeriods / totalPeriods;
  return 1.0 - sharedRatio;
}

/**
 * Map distance into language buckets
 * Deterministic mapping, no numbers exposed
 */
export type DistanceLabel = 'usually' | 'sometimes' | 'rarely';

export function getDistanceLabel(distance: number): DistanceLabel {
  // Distance ranges:
  // 0.0 - 0.33: "usually nearby" (close)
  // 0.34 - 0.66: "sometimes nearby" (moderate)
  // 0.67 - 1.0: "rarely nearby" (far)
  
  if (distance <= 0.33) {
    return 'usually';
  } else if (distance <= 0.66) {
    return 'sometimes';
  } else {
    return 'rarely';
  }
}

/**
 * Get distance phrase for display
 * Exposes distance ONLY using specific phrasing
 */
export function getDistancePhrase(distance: number): string {
  const label = getDistanceLabel(distance);
  
  switch (label) {
    case 'usually':
      return 'usually nearby';
    case 'sometimes':
      return 'sometimes nearby';
    case 'rarely':
      return 'rarely nearby';
  }
}

/**
 * Determine if an observation should be rendered
 * Returns false (silence) for observations that:
 * - Appear in only one period total
 * - Contradict themselves across periods
 * - Have frequency below minimum threshold
 * - Are ambiguous between multiple clusters
 * - Would require interpretation to explain
 * 
 * Silence rules apply to: Absence, Associations, Distance, Continuity notes
 * Not to: Raw reflections, Explicit summaries
 */
export function shouldRenderObservation(
  observation: {
    type: 'fade' | 'association' | 'distance' | 'continuity';
    periods: string[];
    clusterA?: ConceptualCluster;
    clusterB?: ConceptualCluster;
    coOccurrenceCount?: number;
  },
  context: {
    allClusters: ConceptualCluster[];
    currentPeriod: string;
  }
): boolean {
  const { type, periods, clusterA, clusterB, coOccurrenceCount } = observation;
  const { allClusters, currentPeriod } = context;

  // Rule 1: Observation appears in only one period total
  if (periods.length < 2) {
    return false;
  }

  // Rule 2: Observation frequency is below minimum threshold
  // For associations and distance, require at least 2 co-occurring periods
  if (type === 'association' || type === 'distance') {
    if (!coOccurrenceCount || coOccurrenceCount < 2) {
      return false;
    }
  }

  // Rule 3: Observation is ambiguous between multiple clusters
  // If cluster labels are too similar or overlapping, silence
  if (clusterA && clusterB) {
    const labelA = clusterA.label.toLowerCase();
    const labelB = clusterB.label.toLowerCase();
    
    // If labels are identical or one contains the other, it's ambiguous
    if (labelA === labelB || labelA.includes(labelB) || labelB.includes(labelA)) {
      return false;
    }
    
    // If clusters share too many source periods (more than 80%), it's ambiguous
    const periodsA = new Set(clusterA.sourcePeriods);
    const periodsB = new Set(clusterB.sourcePeriods);
    const sharedPeriods = Array.from(periodsA).filter(p => periodsB.has(p)).length;
    const totalUniquePeriods = new Set([...periodsA, ...periodsB]).size;
    const overlapRatio = sharedPeriods / totalUniquePeriods;
    
    if (overlapRatio > 0.8) {
      return false;
    }
  }

  // Rule 4: Observation would require interpretation to explain
  // For fade: if cluster appeared in current period but also in many prior periods,
  // it's not a clear fade (would require interpretation)
  if (type === 'fade' && clusterA) {
    const appearsInCurrent = clusterA.sourcePeriods.includes(currentPeriod);
    if (appearsInCurrent) {
      return false; // Not faded if it appears in current period
    }
    
    // If cluster has very few periods total, fade observation is ambiguous
    if (clusterA.sourcePeriods.length < 3) {
      return false;
    }
  }

  // Rule 5: Observation contradicts itself across periods
  // For associations: if clusters never co-occur in same periods, it's contradictory
  if (type === 'association' && clusterA && clusterB) {
    const periodsA = new Set(clusterA.sourcePeriods);
    const periodsB = new Set(clusterB.sourcePeriods);
    const coOccurringPeriods = Array.from(periodsA).filter(p => periodsB.has(p));
    
    // If they have periods but never co-occur, it's contradictory
    if (periodsA.size > 0 && periodsB.size > 0 && coOccurringPeriods.length === 0) {
      return false;
    }
  }

  return true;
}

/**
 * Detect faded clusters
 * A cluster is considered "faded" if:
 * - It appeared in at least 2 prior periods
 * - It does NOT appear in the current period
 * Binary presence/absence only - no time decay curves, no scoring
 * Fade detection applies ONLY to conceptual clusters, never to emotions, people, or identities
 * Applies silence rules - only renders if shouldRenderObservation returns true
 */
export function detectFadedClusters(
  clusters: ConceptualCluster[],
  currentPeriod: string
): ConceptualCluster[] {
  if (clusters.length === 0) {
    return [];
  }

  const updatedClusters = clusters.map(cluster => {
    // Check if cluster appeared in at least 2 prior periods
    const priorPeriods = cluster.sourcePeriods.filter(p => p !== currentPeriod);
    
    if (priorPeriods.length >= 2) {
      // Check if cluster does NOT appear in current period
      const appearsInCurrent = cluster.sourcePeriods.includes(currentPeriod);
      
      if (!appearsInCurrent) {
        // Check if observation should be rendered (silence rules)
        const shouldRender = shouldRenderObservation(
          {
            type: 'fade',
            periods: cluster.sourcePeriods,
            clusterA: cluster,
          },
          {
            allClusters: clusters,
            currentPeriod,
          }
        );

        if (shouldRender) {
          // Cluster is faded - appeared in prior periods but not current
          // Use "Not observed this period" phrasing (never use: gone, missing, lost, declined, stopped, reduced, weakened)
          return {
            ...cluster,
            faded: true,
            fadePhrase: 'Not observed this period',
          };
        }
      }
    }
    
    return cluster;
  });

  return updatedClusters;
}


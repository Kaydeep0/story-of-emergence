// src/app/lib/observer/computeCrossLensPersistence.ts
// Observer v1: Pure helper to compute cross-lens persistence from artifacts
// No React, no DOM, no time, no randomness

import { detectPatternPersistence, type PatternSignature as CoarsePatternSignature, type PersistenceResult } from './detectPatternPersistence';
import { makePatternSignature, type PatternSignature as ContinuousPatternSignature } from './patternSignature';
import type { InsightArtifact } from '../insights/artifactTypes';
import type { DistributionResult } from '../insights/distributionLayer';
import type { ReflectionEntry } from '../insights/types';
import { computeDistributionLayer } from '../insights/distributionLayer';

/**
 * Convert continuous pattern signature to coarse-band signature
 * 
 * This adapter converts the continuous PatternSignature (with numeric values)
 * to the coarse-band PatternSignature (with low/medium/high bands) required
 * by detectPatternPersistence.
 */
function toCoarseSignature(sig: ContinuousPatternSignature): CoarsePatternSignature {
  // Convert concentrationRatio to band
  // Thresholds: < 1.5 = low, 1.5-3.0 = medium, > 3.0 = high
  let concentrationBand: "low" | "medium" | "high" = "low";
  if (sig.concentrationRatio >= 3.0) {
    concentrationBand = "high";
  } else if (sig.concentrationRatio >= 1.5) {
    concentrationBand = "medium";
  }

  // Convert topPercentileShare to band (0-1 range)
  // Thresholds: < 0.2 = low, 0.2-0.4 = medium, > 0.4 = high
  let topPercentileShareBand: "low" | "medium" | "high" | undefined = undefined;
  if (sig.topPercentileShare >= 0.4) {
    topPercentileShareBand = "high";
  } else if (sig.topPercentileShare >= 0.2) {
    topPercentileShareBand = "medium";
  } else if (sig.topPercentileShare > 0) {
    topPercentileShareBand = "low";
  }

  // Convert relativeSpikeThreshold to band
  // Thresholds: < 1.5 = low, 1.5-2.5 = medium, > 2.5 = high
  let spikeThresholdBand: "low" | "medium" | "high" | undefined = undefined;
  if (sig.relativeSpikeThreshold >= 2.5) {
    spikeThresholdBand = "high";
  } else if (sig.relativeSpikeThreshold >= 1.5) {
    spikeThresholdBand = "medium";
  } else {
    spikeThresholdBand = "low";
  }

  // Convert dayOfWeekPattern Set to string representation
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const activeDays = Array.from(sig.dayOfWeekPattern).sort().map(d => dayNames[d]).join(',');
  const dayOfWeekShape = activeDays || undefined;

  return {
    distributionClass: sig.observedDistributionFit,
    concentrationBand,
    dayOfWeekShape,
    topPercentileShareBand,
    spikeThresholdBand,
  };
}

/**
 * Extract distribution data from Yearly artifact
 * 
 * Yearly artifacts store distribution data in cards with _distributionResult.
 */
function extractYearlyDistribution(artifact: InsightArtifact): DistributionResult | null {
  if (artifact.horizon !== 'yearly') {
    return null;
  }
  
  // Find card with _distributionResult
  for (const card of artifact.cards) {
    if ('_distributionResult' in card && card._distributionResult) {
      return card._distributionResult as DistributionResult;
    }
  }
  
  return null;
}

/**
 * Compute distribution data for Weekly artifact from reflections
 * 
 * Weekly artifacts don't store distribution data, so we compute it from reflections.
 */
function computeWeeklyDistribution(
  artifact: InsightArtifact,
  reflections: ReflectionEntry[]
): DistributionResult | null {
  if (artifact.horizon !== 'weekly') {
    return null;
  }
  
  // Filter reflections to weekly window
  const windowStart = new Date(artifact.window.start);
  const windowEnd = new Date(artifact.window.end);
  
  const windowReflections = reflections.filter(r => {
    const createdAt = new Date(r.createdAt);
    return createdAt >= windowStart && createdAt < windowEnd;
  });
  
  if (windowReflections.length === 0) {
    return null;
  }
  
  return computeDistributionLayer(windowReflections, { windowDays: 7 });
}

/**
 * Extract windowDistribution from Yearly artifact for classification
 */
function extractYearlyWindowDistribution(
  artifact: InsightArtifact
): { classification: 'normal' | 'lognormal' | 'powerlaw' } | undefined {
  if (artifact.horizon !== 'yearly') {
    return undefined;
  }
  
  for (const card of artifact.cards) {
    if ('_windowDistribution' in card && card._windowDistribution) {
      return card._windowDistribution as { classification: 'normal' | 'lognormal' | 'powerlaw' };
    }
  }
  
  return undefined;
}

/**
 * Compute cross-lens pattern persistence from Weekly and Yearly artifacts
 * 
 * This is a pure function that extracts pattern signatures from artifacts
 * and detects persistence across lenses.
 * 
 * @param args - Weekly and yearly artifacts, plus reflections for Weekly distribution computation
 * @returns PersistenceResult with either silence or the exact sentence
 */
export function computeCrossLensPersistence(args: {
  weeklyArtifact: InsightArtifact | null;
  yearlyArtifact: InsightArtifact | null;
  weeklyReflections?: ReflectionEntry[];
}): PersistenceResult {
  const { weeklyArtifact, yearlyArtifact, weeklyReflections = [] } = args;
  
  // Silence if either artifact is null
  if (!weeklyArtifact || !yearlyArtifact) {
    return { speaks: false };
  }
  
  // Extract/compute distribution data
  const weeklyDistribution = computeWeeklyDistribution(weeklyArtifact, weeklyReflections);
  const yearlyDistribution = extractYearlyDistribution(yearlyArtifact);
  
  // Silence if distributions are missing
  if (!weeklyDistribution || !yearlyDistribution) {
    return { speaks: false };
  }
  
  // Extract windowDistribution from Yearly artifact for classification
  const yearlyWindowDistribution = extractYearlyWindowDistribution(yearlyArtifact);
  
  // Build signature inputs
  const weeklyClassification: 'normal' | 'lognormal' | 'powerlaw' = 
    weeklyDistribution.fittedBuckets.normal.share > weeklyDistribution.fittedBuckets.lognormal.share
      ? (weeklyDistribution.fittedBuckets.normal.share > weeklyDistribution.fittedBuckets.powerlaw.share ? 'normal' : 'powerlaw')
      : (weeklyDistribution.fittedBuckets.lognormal.share > weeklyDistribution.fittedBuckets.powerlaw.share ? 'lognormal' : 'powerlaw');

  const yearlyClassification: 'normal' | 'lognormal' | 'powerlaw' = 
    yearlyWindowDistribution?.classification || (
      yearlyDistribution.fittedBuckets.normal.share > yearlyDistribution.fittedBuckets.lognormal.share
        ? (yearlyDistribution.fittedBuckets.normal.share > yearlyDistribution.fittedBuckets.powerlaw.share ? 'normal' : 'powerlaw')
        : (yearlyDistribution.fittedBuckets.lognormal.share > yearlyDistribution.fittedBuckets.powerlaw.share ? 'lognormal' : 'powerlaw')
    );

  const weeklyInput = {
    distributionClassification: weeklyClassification,
    spikeRatio: weeklyDistribution.stats.spikeRatio,
    top10PercentDaysShare: weeklyDistribution.stats.top10PercentDaysShare,
    dailyCounts: weeklyDistribution.topDays.map(d => ({ date: d.date, count: d.count })),
    spikeThreshold: 2.0,
  };

  const yearlyInput = {
    distributionClassification: yearlyClassification,
    spikeRatio: yearlyDistribution.stats.spikeRatio,
    top10PercentDaysShare: yearlyDistribution.stats.top10PercentDaysShare,
    dailyCounts: yearlyDistribution.topDays.map(d => ({ date: d.date, count: d.count })),
    spikeThreshold: 2.0,
  };

  // Compute continuous signatures
  const weeklySignature = makePatternSignature(weeklyInput);
  const yearlySignature = makePatternSignature(yearlyInput);

  // Silence if signatures are missing
  if (!weeklySignature || !yearlySignature) {
    return { speaks: false };
  }

  // Convert to coarse-band signatures
  const weeklyCoarse = toCoarseSignature(weeklySignature);
  const yearlyCoarse = toCoarseSignature(yearlySignature);

  // Detect persistence
  return detectPatternPersistence({
    weeklySignatures: [weeklyCoarse],
    yearlySignatures: [yearlyCoarse],
  });
}

// src/app/lib/observer/compareArtifacts.ts
// Observer v1: Compare artifacts for pattern persistence
// Pure function that takes two artifacts and detects persistence

import type { InsightArtifact } from '../insights/artifactTypes';
import type { DistributionResult } from '../insights/distributionLayer';
import { makePatternSignature, type PatternSignatureInput } from './patternSignature';
import { detectPatternPersistence, type PersistenceWindow } from './patternPersistence';
import { toPersistenceStatement } from './persistenceStatement';
import { computeDistributionLayer } from '../insights/distributionLayer';
import type { ReflectionEntry } from '../insights/types';

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
 * Compute distribution data for Weekly artifact
 * 
 * Weekly artifacts don't store distribution data, so we compute it from events.
 * This requires access to reflection entries.
 */
function computeWeeklyDistribution(
  artifact: InsightArtifact,
  reflections?: ReflectionEntry[]
): DistributionResult | null {
  if (artifact.horizon !== 'weekly') {
    return null;
  }
  
  // If we have reflections, compute distribution
  if (reflections && reflections.length > 0) {
    // Filter reflections to weekly window
    const windowStart = new Date(artifact.window.start);
    const windowEnd = new Date(artifact.window.end);
    
    const windowReflections = reflections.filter(r => {
      const createdAt = new Date(r.createdAt);
      return createdAt >= windowStart && createdAt <= windowEnd;
    });
    
    if (windowReflections.length > 0) {
      return computeDistributionLayer(windowReflections, { windowDays: 7 });
    }
  }
  
  return null;
}

/**
 * Convert DistributionResult to PatternSignatureInput
 */
function distributionToSignatureInput(
  distribution: DistributionResult,
  windowDistribution?: { classification: 'normal' | 'lognormal' | 'powerlaw' }
): PatternSignatureInput | null {
  if (!distribution || distribution.totalEntries === 0) {
    return null;
  }
  
  // Get classification from windowDistribution or infer from fittedBuckets
  let classification: 'normal' | 'lognormal' | 'powerlaw' | null = null;
  
  if (windowDistribution) {
    classification = windowDistribution.classification;
  } else {
    // Infer from fittedBuckets (highest share)
    const buckets = distribution.fittedBuckets;
    let maxShare = 0;
    if (buckets.normal.share > maxShare) {
      maxShare = buckets.normal.share;
      classification = 'normal';
    }
    if (buckets.lognormal.share > maxShare) {
      maxShare = buckets.lognormal.share;
      classification = 'lognormal';
    }
    if (buckets.powerlaw.share > maxShare) {
      classification = 'powerlaw';
    }
  }
  
  if (!classification) {
    return null;
  }
  
  // Build daily counts array with dates
  // DistributionResult has topDays, but we need all days
  // For now, use topDays as proxy (this is a limitation, but acceptable for v1)
  const dailyCounts = distribution.topDays.map(d => ({
    date: d.date,
    count: d.count,
  }));
  
  return {
    distributionClassification: classification,
    spikeRatio: distribution.stats.spikeRatio,
    top10PercentDaysShare: distribution.stats.top10PercentDaysShare,
    dailyCounts,
    spikeThreshold: 2.0, // Default threshold
  };
}

/**
 * Compare two artifacts and detect pattern persistence
 * 
 * This function:
 * 1. Extracts/computes distribution data for each artifact
 * 2. Computes pattern signatures
 * 3. Detects persistence
 * 4. Generates statements
 * 5. Attaches results to artifacts
 * 6. Populates debug info
 * 
 * @param weeklyArtifact - Weekly artifact
 * @param yearlyArtifact - Yearly artifact
 * @param weeklyReflections - Optional reflections for Weekly (needed to compute distribution)
 * @returns Updated artifacts with persistence attached (or null if silence applies)
 */
export function compareArtifactsForPersistence(
  weeklyArtifact: InsightArtifact,
  yearlyArtifact: InsightArtifact,
  weeklyReflections?: ReflectionEntry[]
): {
  weekly: InsightArtifact;
  yearly: InsightArtifact;
  debug: {
    weeklySignature: { observedDistributionFit: string; concentrationRatio: number } | null;
    yearlySignature: { observedDistributionFit: string; concentrationRatio: number } | null;
    match: boolean;
    silenceReason?: string;
  };
} | null {
  // Initialize debug info
  let debug: {
    weeklySignature: { observedDistributionFit: string; concentrationRatio: number } | null;
    yearlySignature: { observedDistributionFit: string; concentrationRatio: number } | null;
    match: boolean;
    silenceReason?: string;
  } = {
    weeklySignature: null,
    yearlySignature: null,
    match: false,
  };
  
  // Enforce silence: require both artifacts
  if (!weeklyArtifact || !yearlyArtifact) {
    debug.silenceReason = 'Missing artifact';
    return { weekly: weeklyArtifact, yearly: yearlyArtifact, debug };
  }
  
  // Enforce silence: require correct horizons
  if (weeklyArtifact.horizon !== 'weekly' || yearlyArtifact.horizon !== 'yearly') {
    debug.silenceReason = 'Invalid horizons';
    return { weekly: weeklyArtifact, yearly: yearlyArtifact, debug };
  }
  
  // Extract/compute distribution data
  const weeklyDistribution = computeWeeklyDistribution(weeklyArtifact, weeklyReflections);
  const yearlyDistribution = extractYearlyDistribution(yearlyArtifact);
  
  // Enforce silence: require both distributions
  if (!weeklyDistribution || !yearlyDistribution) {
    debug.silenceReason = 'Missing distribution data';
    return { weekly: weeklyArtifact, yearly: yearlyArtifact, debug };
  }
  
  // Extract windowDistribution from Yearly (for classification)
  let yearlyWindowDistribution: { classification: 'normal' | 'lognormal' | 'powerlaw' } | undefined;
  for (const card of yearlyArtifact.cards) {
    if ('_windowDistribution' in card && card._windowDistribution) {
      yearlyWindowDistribution = card._windowDistribution as { classification: 'normal' | 'lognormal' | 'powerlaw' };
      break;
    }
  }
  
  // Convert to signature inputs
  const weeklyInput = distributionToSignatureInput(weeklyDistribution);
  const yearlyInput = distributionToSignatureInput(yearlyDistribution, yearlyWindowDistribution);
  
  // Enforce silence: require both signature inputs
  if (!weeklyInput || !yearlyInput) {
    return null;
  }
  
  // Compute signatures
  const weeklySignature = makePatternSignature(weeklyInput);
  const yearlySignature = makePatternSignature(yearlyInput);
  
  // Populate debug with signatures (even if null)
  debug.weeklySignature = weeklySignature
    ? { observedDistributionFit: weeklySignature.observedDistributionFit, concentrationRatio: weeklySignature.concentrationRatio }
    : null;
  debug.yearlySignature = yearlySignature
    ? { observedDistributionFit: yearlySignature.observedDistributionFit, concentrationRatio: yearlySignature.concentrationRatio }
    : null;
  
  // Enforce silence: require both signatures
  if (!weeklySignature || !yearlySignature) {
    debug.silenceReason = 'Failed to compute signatures';
    return { weekly: weeklyArtifact, yearly: yearlyArtifact, debug };
  }
  
  // Build persistence windows
  const windows: PersistenceWindow[] = [
    {
      lens: 'weekly',
      windowStart: weeklyArtifact.window.start,
      windowEnd: weeklyArtifact.window.end,
      signature: weeklySignature,
    },
    {
      lens: 'yearly',
      windowStart: yearlyArtifact.window.start,
      windowEnd: yearlyArtifact.window.end,
      signature: yearlySignature,
    },
  ];
  
  // Detect persistence
  const persistenceResult = detectPatternPersistence(windows);
  
  // Enforce silence: if no persistence detected, return with debug
  if (!persistenceResult) {
    debug.silenceReason = 'No pattern match detected';
    return { weekly: weeklyArtifact, yearly: yearlyArtifact, debug };
  }
  
  // Generate statement
  const statement = toPersistenceStatement(persistenceResult);
  
  // Enforce silence: if statement is null, return with debug
  if (!statement) {
    debug.silenceReason = 'Failed to generate statement';
    return { weekly: weeklyArtifact, yearly: yearlyArtifact, debug };
  }
  
  // Match found - update debug
  debug.match = true;
  
  // Attach persistence to artifacts
  const updatedWeekly: InsightArtifact = {
    ...weeklyArtifact,
    persistence: {
      signature: {
        observedDistributionFit: persistenceResult.signature.observedDistributionFit,
        concentrationRatio: persistenceResult.signature.concentrationRatio,
        dayOfWeekPattern: Array.from(persistenceResult.signature.dayOfWeekPattern),
        topPercentileShare: persistenceResult.signature.topPercentileShare,
        relativeSpikeThreshold: persistenceResult.signature.relativeSpikeThreshold,
      },
      lenses: persistenceResult.lenses,
      windowStarts: persistenceResult.windowStarts,
      windowEnds: persistenceResult.windowEnds,
      statement,
    },
  };
  
  const updatedYearly: InsightArtifact = {
    ...yearlyArtifact,
    persistence: {
      signature: {
        observedDistributionFit: persistenceResult.signature.observedDistributionFit,
        concentrationRatio: persistenceResult.signature.concentrationRatio,
        dayOfWeekPattern: Array.from(persistenceResult.signature.dayOfWeekPattern),
        topPercentileShare: persistenceResult.signature.topPercentileShare,
        relativeSpikeThreshold: persistenceResult.signature.relativeSpikeThreshold,
      },
      lenses: persistenceResult.lenses,
      windowStarts: persistenceResult.windowStarts,
      windowEnds: persistenceResult.windowEnds,
      statement,
    },
  };
  
  return {
    weekly: updatedWeekly,
    yearly: updatedYearly,
    debug,
  };
}


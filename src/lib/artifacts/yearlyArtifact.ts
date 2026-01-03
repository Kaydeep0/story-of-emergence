/**
 * Yearly Artifact Generator
 * 
 * Generates shareable artifacts from Yearly insights.
 * Uses the same contract as Lifetime artifacts.
 */

import type { ShareArtifact } from './types';
import type { ReflectionEntry } from '../../app/lib/insights/types';
import type { DistributionResult } from '../../app/lib/insights/distributionLayer';
import { generateArtifactId } from './artifactId';

/**
 * Generate a shareable artifact from Yearly data.
 * 
 * Rules:
 * - Uses already sanitized data (no recomputation)
 * - No interpretation
 * - No UI language
 * - No derived prose
 * - No undefined values (use null for missing)
 */
export async function generateYearlyArtifact(
  reflections: ReflectionEntry[],
  distributionResult: DistributionResult | null,
  wallet: string
): Promise<ShareArtifact> {
  // Extract dates from reflections
  let firstReflectionDate: string | null = null;
  let lastReflectionDate: string | null = null;
  
  if (reflections.length > 0) {
    const dates = reflections
      .map(r => r.timestamp)
      .filter((d): d is string => !!d)
      .sort();
    
    if (dates.length > 0) {
      firstReflectionDate = dates[0];
      lastReflectionDate = dates[dates.length - 1];
    }
  }

  // Compute distinct months
  const monthSet = new Set<string>();
  for (const reflection of reflections) {
    if (reflection.timestamp) {
      try {
        const date = new Date(reflection.timestamp);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthSet.add(monthKey);
        }
      } catch {
        // Skip invalid dates
      }
    }
  }

  // Map distribution insights to signals
  const signals: ShareArtifact['signals'] = [];
  
  if (distributionResult) {
    // Helper to format date nicely
    const formatDate = (dateStr: string): string => {
      try {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      } catch {
        return dateStr; // Fallback to original if parsing fails
      }
    };

    // Add top spike days as signals
    const topSpikes = distributionResult.topDays.slice(0, 5);
    for (let i = 0; i < topSpikes.length; i++) {
      const spike = topSpikes[i];
      const formattedDate = formatDate(spike.date);
      signals.push({
        id: `yearly-spike-${i}`,
        label: `${spike.count} reflection${spike.count === 1 ? '' : 's'} on ${formattedDate}`,
        confidence: Math.min(1.0, spike.count / 10), // Normalize to 0-1
        evidenceCount: spike.count,
      });
    }
  }

  // Generate deterministic artifact ID
  const artifactId = await generateArtifactId(
    wallet,
    'yearly',
    firstReflectionDate,
    lastReflectionDate
  );

  const artifact: ShareArtifact = {
    kind: 'yearly',
    generatedAt: new Date().toISOString(),
    wallet: wallet.toLowerCase(),
    artifactId,

    inventory: {
      totalReflections: reflections.length,
      firstReflectionDate,
      lastReflectionDate,
      distinctMonths: monthSet.size,
    },

    signals,
  };

  // Runtime guard: ensure contract is valid
  if (!artifact.inventory) {
    throw new Error('YearlyArtifact invariant violated: inventory is missing');
  }
  if (!artifact.artifactId) {
    throw new Error('YearlyArtifact invariant violated: artifactId is missing');
  }

  return artifact;
}


/**
 * Lifetime Artifact Generator
 * 
 * Generates shareable artifacts from Lifetime insights.
 * Uses the same contract as other artifacts.
 */

import type { ShareArtifact } from './types';
import type { ReflectionEntry } from '../../app/lib/insights/types';
import { generateArtifactId } from './artifactId';

/**
 * Generate a shareable artifact from Lifetime reflections.
 * 
 * Rules:
 * - Uses already sanitized data (no recomputation)
 * - No interpretation
 * - No UI language
 * - No derived prose
 * - No undefined values (use null for missing)
 */
export async function generateLifetimeArtifact(
  reflections: ReflectionEntry[],
  wallet: string
): Promise<ShareArtifact> {
  // Extract dates from reflections
  let firstReflectionDate: string | null = null;
  let lastReflectionDate: string | null = null;
  
  if (reflections.length > 0) {
    const dates = reflections
      .map(r => r.timestamp || r.createdAt)
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
    const dateStr = reflection.timestamp || reflection.createdAt;
    if (dateStr) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthSet.add(monthKey);
        }
      } catch {
        // Skip invalid dates
      }
    }
  }

  // Map reflections to signals (group by year)
  const signals: ShareArtifact['signals'] = [];
  
  const reflectionsByYear = new Map<string, ReflectionEntry[]>();
  for (const reflection of reflections) {
    const dateStr = reflection.timestamp || reflection.createdAt;
    if (dateStr) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const yearKey = String(date.getFullYear());
          if (!reflectionsByYear.has(yearKey)) {
            reflectionsByYear.set(yearKey, []);
          }
          reflectionsByYear.get(yearKey)!.push(reflection);
        }
      } catch {
        // Skip invalid dates
      }
    }
  }

  // Create signals from yearly groups (top 5 years)
  const sortedYears = Array.from(reflectionsByYear.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  for (let i = 0; i < sortedYears.length; i++) {
    const [yearKey, yearReflections] = sortedYears[i];
    signals.push({
      id: `lifetime-year-${i}`,
      label: `${yearReflections.length} reflection${yearReflections.length === 1 ? '' : 's'} in ${yearKey}`,
      confidence: Math.min(1.0, yearReflections.length / 20), // Normalize to 0-1
      evidenceCount: yearReflections.length,
    });
  }

  // Generate deterministic artifact ID
  const artifactId = await generateArtifactId(
    wallet,
    'lifetime',
    firstReflectionDate,
    lastReflectionDate
  );

  const artifact: ShareArtifact = {
    kind: 'lifetime',
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
    throw new Error('LifetimeArtifact invariant violated: inventory is missing');
  }
  if (!artifact.artifactId) {
    throw new Error('LifetimeArtifact invariant violated: artifactId is missing');
  }

  return artifact;
}


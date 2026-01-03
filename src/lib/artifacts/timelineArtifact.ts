/**
 * Timeline Artifact Generator
 * 
 * Generates shareable artifacts from Timeline insights.
 * Uses the same contract as Lifetime artifacts.
 */

import type { ShareArtifact } from './types';
import type { ReflectionEntry } from '../../app/lib/insights/types';
import { generateArtifactId } from './artifactId';

/**
 * Generate a shareable artifact from Timeline reflections.
 * 
 * Rules:
 * - Uses already sanitized data (no recomputation)
 * - No interpretation
 * - No UI language
 * - No derived prose
 * - No undefined values (use null for missing)
 */
export async function generateTimelineArtifact(
  reflections: ReflectionEntry[],
  wallet: string
): Promise<ShareArtifact> {
  // Extract dates from reflections
  let firstReflectionDate: string | null = null;
  let lastReflectionDate: string | null = null;
  
  if (reflections.length > 0) {
    const dates = reflections
      .map(r => r.createdAt)
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
    const dateStr = reflection.createdAt;
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

  // Map reflections to signals (using reflection IDs as signals)
  const signals: ShareArtifact['signals'] = [];
  
  // Group reflections by month and create signals
  const reflectionsByMonth = new Map<string, ReflectionEntry[]>();
  for (const reflection of reflections) {
    const dateStr = reflection.createdAt;
    if (dateStr) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          if (!reflectionsByMonth.has(monthKey)) {
            reflectionsByMonth.set(monthKey, []);
          }
          reflectionsByMonth.get(monthKey)!.push(reflection);
        }
      } catch {
        // Skip invalid dates
      }
    }
  }

  // Create signals from monthly groups (top 5 months)
  const sortedMonths = Array.from(reflectionsByMonth.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  for (let i = 0; i < sortedMonths.length; i++) {
    const [monthKey, monthReflections] = sortedMonths[i];
    signals.push({
      id: `timeline-month-${i}`,
      label: `${monthReflections.length} reflections in ${monthKey}`,
      confidence: Math.min(1.0, monthReflections.length / 10), // Normalize to 0-1
      evidenceCount: monthReflections.length,
    });
  }

  // Generate deterministic artifact ID
  const artifactId = await generateArtifactId(
    wallet,
    'lifetime', // Timeline spans all reflections, use lifetime kind
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
    throw new Error('TimelineArtifact invariant violated: inventory is missing');
  }
  if (!artifact.artifactId) {
    throw new Error('TimelineArtifact invariant violated: artifactId is missing');
  }

  return artifact;
}


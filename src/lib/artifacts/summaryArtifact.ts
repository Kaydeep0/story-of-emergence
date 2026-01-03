/**
 * Summary Artifact Generator
 * 
 * Generates shareable artifacts from Summary insights.
 * Uses the same contract as Weekly artifacts.
 */

import type { ShareArtifact } from './types';
import type { ReflectionEntry } from '../../app/lib/insights/types';
import { generateArtifactId } from './artifactId';

/**
 * Generate a shareable artifact from Summary reflections.
 * 
 * Rules:
 * - Uses already sanitized data (no recomputation)
 * - No interpretation
 * - No UI language
 * - No derived prose
 * - No undefined values (use null for missing)
 */
export async function generateSummaryArtifact(
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

  // Compute distinct months (should be 1-2 for summary view)
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

  // Map reflections to signals (group by day)
  const signals: ShareArtifact['signals'] = [];
  
  const reflectionsByDay = new Map<string, ReflectionEntry[]>();
  for (const reflection of reflections) {
    const dateStr = reflection.timestamp || reflection.createdAt;
    if (dateStr) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const dayKey = date.toISOString().split('T')[0];
          if (!reflectionsByDay.has(dayKey)) {
            reflectionsByDay.set(dayKey, []);
          }
          reflectionsByDay.get(dayKey)!.push(reflection);
        }
      } catch {
        // Skip invalid dates
      }
    }
  }

  // Create signals from daily groups (top 5 days)
  const sortedDays = Array.from(reflectionsByDay.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);
  
  for (let i = 0; i < sortedDays.length; i++) {
    const [dayKey, dayReflections] = sortedDays[i];
    signals.push({
      id: `summary-day-${i}`,
      label: `${dayReflections.length} reflections on ${dayKey}`,
      confidence: Math.min(1.0, dayReflections.length / 5), // Normalize to 0-1
      evidenceCount: dayReflections.length,
    });
  }

  // Generate deterministic artifact ID
  const artifactId = await generateArtifactId(
    wallet,
    'weekly', // Summary focuses on recent activity, use weekly kind
    firstReflectionDate,
    lastReflectionDate
  );

  const artifact: ShareArtifact = {
    kind: 'weekly',
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
    throw new Error('SummaryArtifact invariant violated: inventory is missing');
  }
  if (!artifact.artifactId) {
    throw new Error('SummaryArtifact invariant violated: artifactId is missing');
  }

  return artifact;
}


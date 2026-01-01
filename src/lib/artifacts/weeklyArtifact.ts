/**
 * Weekly Artifact Generator
 * 
 * Generates shareable artifacts from Weekly insights.
 * Uses the same contract as Lifetime artifacts.
 */

import type { ShareArtifact } from '../lifetimeArtifact';
import type { WeeklyInsight } from '../../app/lib/weeklyInsights';

/**
 * Generate a shareable artifact from Weekly insights.
 * 
 * Rules:
 * - Uses already sanitized data (no recomputation)
 * - No interpretation
 * - No UI language
 * - No derived prose
 * - No undefined values (use null for missing)
 */
export function generateWeeklyArtifact(
  weeklyInsight: WeeklyInsight,
  wallet: string
): ShareArtifact {
  // Extract dates
  const firstReflectionDate = weeklyInsight.startDate.toISOString();
  const lastReflectionDate = weeklyInsight.endDate.toISOString();
  
  // Compute distinct months (should be 1 for a single week, but handle edge cases)
  const startMonth = `${weeklyInsight.startDate.getFullYear()}-${String(weeklyInsight.startDate.getMonth() + 1).padStart(2, '0')}`;
  const endMonth = `${weeklyInsight.endDate.getFullYear()}-${String(weeklyInsight.endDate.getMonth() + 1).padStart(2, '0')}`;
  const distinctMonths = startMonth === endMonth ? 1 : 2;

  // Map topics to signals
  const signals = weeklyInsight.topGuessedTopics.map((topic, idx) => ({
    id: `weekly-${weeklyInsight.weekId}-topic-${idx}`,
    label: topic,
    confidence: 0.5, // Default confidence for weekly topics
    evidenceCount: weeklyInsight.journalEvents,
  }));

  const artifact: ShareArtifact = {
    kind: 'weekly',
    generatedAt: new Date().toISOString(),
    wallet: wallet.toLowerCase(),

    inventory: {
      totalReflections: weeklyInsight.journalEvents,
      firstReflectionDate,
      lastReflectionDate,
      distinctMonths,
    },

    signals,
  };

  // Runtime guard: ensure contract is valid
  if (!artifact.inventory) {
    throw new Error('WeeklyArtifact invariant violated: inventory is missing');
  }

  return artifact;
}


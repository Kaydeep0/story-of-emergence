// src/app/lib/insights/patterns/extractPatterns.ts
// Canonical pattern extraction layer
// Phase 4.3: Read-only, additive pattern extraction from InsightArtifacts

import type { InsightArtifact } from '../artifactTypes';
import type { InsightPatternSet, InsightPattern, InsightPatternKind } from '../patternModel';
import type { InsightCard, AlwaysOnSummaryCard } from '../types';
import { makePatternId } from '../patternModel';

/**
 * Extract patterns from an InsightArtifact
 * 
 * This is the canonical way to extract patterns from artifacts.
 * It reads existing pattern data from cards and consolidates them into a single pattern set.
 * 
 * Phase 4.3: Mapping only - does not modify the artifact, only extracts patterns.
 * 
 * @param artifact - The insight artifact to extract patterns from
 * @returns InsightPatternSet with all patterns found in the artifact
 */
export function extractPatternsFromArtifact(
  artifact: InsightArtifact
): InsightPatternSet {
  const patterns: InsightPattern[] = [];
  const windowStartISO = artifact.window.startISO;
  const windowEndISO = artifact.window.endISO;
  
  // Extract patterns from cards
  for (const card of artifact.cards) {
    // 1. If card already has a patternSet, include those patterns
    if (card.patternSet?.patterns) {
      patterns.push(...card.patternSet.patterns);
    }
    
    // 2. Extract patterns from card-specific data
    if (card.kind === 'always_on_summary') {
      const alwaysOnCard = card as AlwaysOnSummaryCard;
      const data = alwaysOnCard.data;
      
      // Extract pattern days (e.g., ['Monday', 'Thursday'])
      if (data.patternDays && data.patternDays.length > 0) {
        const patternLabel = `Writing pattern: ${data.patternDays.join(', ')}`;
        patterns.push({
          id: makePatternId('uncategorized', patternLabel),
          kind: 'uncategorized',
          label: patternLabel,
          evidence: [{
            id: `evidence-${card.id}-pattern-days`,
            label: patternLabel,
            windowStartISO,
            windowEndISO,
            count: data.currentWeekEntries,
            source: 'reflections',
          }],
        });
      }
      
      // Extract activity spike patterns
      if (data.summaryType === 'activity_spike' && data.spikeDate) {
        const spikeLabel = `Activity spike on ${data.spikeDayName || data.spikeDate}`;
        patterns.push({
          id: makePatternId('uncategorized', spikeLabel),
          kind: 'uncategorized',
          label: spikeLabel,
          strength: data.spikeCount && data.baselineCount 
            ? Math.min(1, (data.spikeCount - data.baselineCount) / data.baselineCount)
            : undefined,
          evidence: [{
            id: `evidence-${card.id}-spike`,
            label: spikeLabel,
            windowStartISO: data.spikeDate,
            windowEndISO: data.spikeDate,
            count: data.spikeCount,
            source: 'reflections',
          }],
        });
      }
    }
    
    // 3. Extract patterns from timeline spikes
    if (card.kind === 'timeline_spike' && 'data' in card) {
      const spikeData = (card as any).data;
      if (spikeData?.date) {
        const spikeLabel = `Timeline spike on ${spikeData.date}`;
        patterns.push({
          id: makePatternId('uncategorized', spikeLabel),
          kind: 'uncategorized',
          label: spikeLabel,
          strength: spikeData.multiplier ? Math.min(1, spikeData.multiplier / 10) : undefined,
          evidence: [{
            id: `evidence-${card.id}-timeline-spike`,
            label: spikeLabel,
            windowStartISO: spikeData.date,
            windowEndISO: spikeData.date,
            count: spikeData.count,
            source: 'reflections',
          }],
        });
      }
    }
  }
  
  // Deduplicate patterns by ID
  const uniquePatterns = new Map<string, InsightPattern>();
  for (const pattern of patterns) {
    if (!uniquePatterns.has(pattern.id)) {
      uniquePatterns.set(pattern.id, pattern);
    }
  }
  
  return {
    patterns: Array.from(uniquePatterns.values()),
    updatedAtISO: new Date().toISOString(),
  };
}


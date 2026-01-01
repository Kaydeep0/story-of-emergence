/**
 * Year-over-Year Narrative Generator
 * 
 * PHASE 4 NARRATIVE CODE
 * Do not move this into artifacts.
 * Do not modify ShareArtifact contract here.
 * 
 * Phase 4: Interpretation layer
 * 
 * Compares two yearly artifacts and produces a narrative delta.
 * This is interpretation, not summarization.
 */

import type { ShareArtifact } from '../lifetimeArtifact';

export type YearOverYearNarrative = {
  headline: string;
  dominantShift: string;
  themesIntroduced: string[];
  themesFaded: string[];
  intensityChange: 'up' | 'down' | 'flat';
};

/**
 * Extract theme keywords from signal labels
 */
function extractThemes(signals: ShareArtifact['signals']): string[] {
  const themes: string[] = [];
  
  for (const signal of signals) {
    // Extract meaningful words from labels like "3 reflections on Jan 15, 2025"
    // or "5 reflections in 2024"
    const label = signal.label.toLowerCase();
    
    // Skip date patterns and numbers
    const words = label
      .split(/\s+/)
      .filter(word => {
        // Skip numbers, dates, common words
        if (/^\d+$/.test(word)) return false;
        if (word === 'reflection' || word === 'reflections') return false;
        if (word === 'on' || word === 'in') return false;
        if (/^\d{4}$/.test(word)) return false; // years
        if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(word)) return false; // months
        if (word.length < 3) return false; // too short
        return true;
      });
    
    themes.push(...words);
  }
  
  // Return unique themes, sorted by frequency
  const themeCounts = new Map<string, number>();
  for (const theme of themes) {
    themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
  }
  
  return Array.from(themeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme);
}

/**
 * Compare signal labels to find introduced and faded themes
 */
function compareSignals(
  signalsA: ShareArtifact['signals'],
  signalsB: ShareArtifact['signals']
): { introduced: string[]; faded: string[] } {
  const labelsA = new Set(signalsA.map(s => s.label.toLowerCase()));
  const labelsB = new Set(signalsB.map(s => s.label.toLowerCase()));
  
  // Find themes that appear in B but not A (introduced)
  const introduced: string[] = [];
  for (const label of labelsB) {
    if (!labelsA.has(label)) {
      // Extract meaningful part (skip dates/numbers)
      const parts = label.split(/\s+/).filter(p => 
        !/^\d+$/.test(p) && 
        !/^\d{4}$/.test(p) &&
        p !== 'reflection' && 
        p !== 'reflections' &&
        p !== 'on' &&
        p !== 'in' &&
        p.length >= 3
      );
      if (parts.length > 0) {
        introduced.push(parts.join(' '));
      }
    }
  }
  
  // Find themes that appear in A but not B (faded)
  const faded: string[] = [];
  for (const label of labelsA) {
    if (!labelsB.has(label)) {
      const parts = label.split(/\s+/).filter(p => 
        !/^\d+$/.test(p) && 
        !/^\d{4}$/.test(p) &&
        p !== 'reflection' && 
        p !== 'reflections' &&
        p !== 'on' &&
        p !== 'in' &&
        p.length >= 3
      );
      if (parts.length > 0) {
        faded.push(parts.join(' '));
      }
    }
  }
  
  return { introduced, faded };
}

/**
 * Determine intensity change based on reflection counts and signal confidence
 */
function determineIntensityChange(
  artifactA: ShareArtifact,
  artifactB: ShareArtifact
): 'up' | 'down' | 'flat' {
  const countA = artifactA.inventory.totalReflections;
  const countB = artifactB.inventory.totalReflections;
  
  const avgConfidenceA = artifactA.signals.length > 0
    ? artifactA.signals.reduce((sum, s) => sum + s.confidence, 0) / artifactA.signals.length
    : 0;
  const avgConfidenceB = artifactB.signals.length > 0
    ? artifactB.signals.reduce((sum, s) => sum + s.confidence, 0) / artifactB.signals.length
    : 0;
  
  // Weighted: 70% count change, 30% confidence change
  const countChange = countB - countA;
  const confidenceChange = avgConfidenceB - avgConfidenceA;
  const weightedChange = (countChange * 0.7) + (confidenceChange * 100 * 0.3);
  
  if (weightedChange > 2) return 'up';
  if (weightedChange < -2) return 'down';
  return 'flat';
}

/**
 * Generate a narrative delta comparing two yearly artifacts
 * 
 * This is interpretation, not summarization.
 * It creates meaning from the structural differences between years.
 */
export function generateYearOverYearNarrative(
  yearA: ShareArtifact,
  yearB: ShareArtifact
): YearOverYearNarrative {
  // Extract themes from signals
  const themesA = extractThemes(yearA.signals);
  const themesB = extractThemes(yearB.signals);
  
  // Compare signals to find introduced/faded themes
  const { introduced, faded } = compareSignals(yearA.signals, yearB.signals);
  
  // Determine intensity change
  const intensityChange = determineIntensityChange(yearA, yearB);
  
  // Generate headline based on intensity and theme changes
  let headline = '';
  if (intensityChange === 'up' && introduced.length > 0) {
    headline = `A year of new patterns`;
  } else if (intensityChange === 'down' && faded.length > 0) {
    headline = `A year of shifting focus`;
  } else if (intensityChange === 'up') {
    headline = `A year of increased reflection`;
  } else if (intensityChange === 'down') {
    headline = `A year of consolidation`;
  } else {
    headline = `A year of continuity`;
  }
  
  // Generate dominant shift narrative
  let dominantShift = '';
  const countA = yearA.inventory.totalReflections;
  const countB = yearB.inventory.totalReflections;
  const countDiff = countB - countA;
  
  if (introduced.length > 0 && faded.length > 0) {
    dominantShift = `New patterns emerged while previous ones faded.`;
  } else if (introduced.length > 0) {
    dominantShift = `New patterns emerged without replacing what came before.`;
  } else if (faded.length > 0) {
    dominantShift = `Previous patterns faded, leaving space for what follows.`;
  } else if (countDiff > 5) {
    dominantShift = `Reflection deepened, with more moments captured.`;
  } else if (countDiff < -5) {
    dominantShift = `Reflection became more selective, focusing on what mattered most.`;
  } else {
    dominantShift = `The rhythm of reflection remained consistent.`;
  }
  
  return {
    headline,
    dominantShift,
    themesIntroduced: introduced.slice(0, 5),
    themesFaded: faded.slice(0, 5),
    intensityChange,
  };
}


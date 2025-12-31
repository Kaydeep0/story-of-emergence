/**
 * Deterministic Year Narrative Assembly
 * 
 * This assembly pass is deterministic.
 * It performs no interpretation.
 * It may be safely regenerated or deleted.
 * It exists only to expose structure.
 */

import type {
  NarrativeCandidate,
  YearNarrativeDraft,
} from './narrativeAssembly';
import {
  computeConfidence,
  computeDistinctMonths,
  computeTimeSpanDays,
} from './confidenceScoring';

/**
 * Assemble a year's narrative using only deterministic signals:
 * - Count of reflections
 * - Reflection timestamps
 * - Repeated words frequency
 * - Gaps in time
 * - First and last reflection of the year
 * 
 * Forbidden: summaries, paraphrasing, meaning compression,
 * emotional language, inference.
 */
export function assembleYearNarrative(
  year: number,
  reflections: { id: string; created_at: string; text: string }[]
): YearNarrativeDraft {
  const candidates: NarrativeCandidate[] = [];

  if (reflections.length === 0) {
    return {
      year,
      generatedAt: new Date().toISOString(),
      candidates,
    };
  }

  // Sort reflections by timestamp (oldest first)
  const sortedReflections = [...reflections].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Anchors: First and last reflection
  const firstReflection = sortedReflections[0];
  const lastReflection = sortedReflections[sortedReflections.length - 1];

  if (firstReflection) {
    const firstDate = new Date(firstReflection.created_at);
    candidates.push({
      section: 'anchors',
      text: `First recorded reflection on ${firstDate.toISOString().split('T')[0]}`,
      sourceReflectionIds: [firstReflection.id],
      confidence: computeConfidence({
        sourceReflectionIds: [firstReflection.id],
        isFirstOrLast: true,
      }),
    });
  }

  if (lastReflection && lastReflection.id !== firstReflection?.id) {
    const lastDate = new Date(lastReflection.created_at);
    candidates.push({
      section: 'anchors',
      text: `Last recorded reflection on ${lastDate.toISOString().split('T')[0]}`,
      sourceReflectionIds: [lastReflection.id],
      confidence: computeConfidence({
        sourceReflectionIds: [lastReflection.id],
        isFirstOrLast: true,
      }),
    });
  }

  // Themes: Most frequent words (simple counting only)
  const wordFrequency = new Map<string, { count: number; reflectionIds: Set<string> }>();
  
  for (const reflection of sortedReflections) {
    if (!reflection.text) continue;
    
    // Simple word extraction (lowercase, alphanumeric only)
    const words = reflection.text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter out very short words
    
    for (const word of words) {
      if (!wordFrequency.has(word)) {
        wordFrequency.set(word, { count: 0, reflectionIds: new Set() });
      }
      const entry = wordFrequency.get(word)!;
      entry.count++;
      entry.reflectionIds.add(reflection.id);
    }
  }

  // Get top 3 most frequent words (themes)
  const topWords = Array.from(wordFrequency.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3);

  for (const [word, data] of topWords) {
    if (data.count >= 2) { // Only include if appears at least twice
      // Get dates for reflections containing this word
      const reflectionDates = Array.from(data.reflectionIds)
        .map(id => sortedReflections.find(r => r.id === id)?.created_at)
        .filter((d): d is string => !!d);

      const distinctMonths = computeDistinctMonths(reflectionDates);
      const timeSpanDays = computeTimeSpanDays(reflectionDates);

      candidates.push({
        section: 'themes',
        text: `Word "${word}" appears ${data.count} times`,
        sourceReflectionIds: Array.from(data.reflectionIds),
        confidence: computeConfidence({
          sourceReflectionIds: Array.from(data.reflectionIds),
          frequencyCount: data.count,
          appearsAcrossMonths: distinctMonths,
          timeSpanDays,
        }),
      });
    }
  }

  // Transitions: Gaps in time (longest gaps between reflections)
  const gaps: Array<{ gapDays: number; beforeId: string; afterId: string }> = [];
  
  for (let i = 0; i < sortedReflections.length - 1; i++) {
    const current = sortedReflections[i];
    const next = sortedReflections[i + 1];
    
    const currentDate = new Date(current.created_at);
    const nextDate = new Date(next.created_at);
    const gapMs = nextDate.getTime() - currentDate.getTime();
    const gapDays = Math.floor(gapMs / (1000 * 60 * 60 * 24));
    
    if (gapDays > 0) {
      gaps.push({
        gapDays,
        beforeId: current.id,
        afterId: next.id,
      });
    }
  }

  // Get top 2 longest gaps (transitions)
  const topGaps = gaps
    .sort((a, b) => b.gapDays - a.gapDays)
    .slice(0, 2);

  for (const gap of topGaps) {
    if (gap.gapDays >= 7) { // Only include gaps of at least a week
      const beforeReflection = sortedReflections.find(r => r.id === gap.beforeId);
      const afterReflection = sortedReflections.find(r => r.id === gap.afterId);
      
      const reflectionDates: string[] = [];
      if (beforeReflection) reflectionDates.push(beforeReflection.created_at);
      if (afterReflection) reflectionDates.push(afterReflection.created_at);
      
      const distinctMonths = computeDistinctMonths(reflectionDates);

      candidates.push({
        section: 'transitions',
        text: `Gap of ${gap.gapDays} days between reflections`,
        sourceReflectionIds: [gap.beforeId, gap.afterId],
        confidence: computeConfidence({
          sourceReflectionIds: [gap.beforeId, gap.afterId],
          timeSpanDays: gap.gapDays,
          appearsAcrossMonths: distinctMonths,
        }),
      });
    }
  }

  // Anchors: Total reflection count
  const allReflectionDates = sortedReflections.map(r => r.created_at);
  const totalTimeSpanDays = computeTimeSpanDays(allReflectionDates);
  const totalDistinctMonths = computeDistinctMonths(allReflectionDates);

  candidates.push({
    section: 'anchors',
    text: `Total of ${sortedReflections.length} reflection${sortedReflections.length === 1 ? '' : 's'} recorded`,
    sourceReflectionIds: sortedReflections.map(r => r.id),
    confidence: computeConfidence({
      sourceReflectionIds: sortedReflections.map(r => r.id),
      timeSpanDays: totalTimeSpanDays,
      appearsAcrossMonths: totalDistinctMonths,
    }),
  });

  return {
    year,
    generatedAt: new Date().toISOString(),
    candidates,
  };
}


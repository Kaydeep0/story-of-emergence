/**
 * Structural Lineage Graph
 * 
 * Records how reflections relate to one another over time without
 * introducing causality, narrative, or semantic hierarchy.
 * 
 * This captures structure, not meaning.
 * 
 * Requirements:
 * - Structural linkage only: links represent difference, not influence
 * - No inference impact: must not influence emergence, novelty, decay, saturation, regime, dwell time
 * - Deterministic construction: same reflection set → same lineage graph
 * - Session scoped: recomputed per wallet session
 * - Encrypted at rest: all lineage data encrypted client-side
 * - No narrative semantics: no labels, no directionality, no start/end nodes
 */

import type { ReflectionEntry } from '../insights/types';

export type StructuralLink = {
  fromReflectionId: string;
  toReflectionId: string;
  divergence: number; // 0-1, structural difference between reflections
};

export type StructuralLineageGraph = {
  reflections: string[]; // Reflection IDs in chronological order
  links: StructuralLink[]; // Structural links between reflections
  sessionId: string; // Session identifier
  createdAt: string; // ISO timestamp
};

export type LineageSignals = {
  reflections: ReflectionEntry[];
  sessionId: string;
  divergenceThreshold?: number; // Minimum divergence to create link (default 0.2)
};

/**
 * Build structural lineage graph from reflections
 * 
 * For each reflection, creates links to prior reflections it structurally diverges from.
 * Links represent difference, not influence.
 * 
 * Deterministic: same reflection set → same lineage graph
 * No probabilistic edges or adaptive rewiring.
 * 
 * @param signals - Lineage construction signals
 * @returns StructuralLineageGraph
 */
export function buildStructuralLineage(signals: LineageSignals): StructuralLineageGraph {
  const { reflections, sessionId, divergenceThreshold = 0.2 } = signals;

  // Filter out deleted reflections
  const activeReflections = reflections.filter(r => !r.deletedAt);
  
  if (activeReflections.length === 0) {
    return {
      reflections: [],
      links: [],
      sessionId,
      createdAt: new Date().toISOString(),
    };
  }

  // Sort reflections by creation date
  const sortedReflections = [...activeReflections].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const reflectionIds = sortedReflections.map(r => r.id);
  const links: StructuralLink[] = [];

  // For each reflection, find prior reflections it structurally diverges from
  for (let i = 1; i < sortedReflections.length; i++) {
    const currentReflection = sortedReflections[i];
    
    // Check divergence from all prior reflections
    for (let j = 0; j < i; j++) {
      const priorReflection = sortedReflections[j];
      
      // Compute structural divergence (reuse logic from novelty detection)
      const divergence = computeStructuralDivergence(
        currentReflection.plaintext,
        priorReflection.plaintext
      );
      
      // Create link if divergence exceeds threshold
      // Link represents difference, not influence
      if (divergence >= divergenceThreshold) {
        links.push({
          fromReflectionId: priorReflection.id,
          toReflectionId: currentReflection.id,
          divergence,
        });
      }
    }
  }

  return {
    reflections: reflectionIds,
    links,
    sessionId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Compute structural divergence between two reflection texts
 * 
 * This is a pure function that computes structural difference,
 * not semantic similarity.
 * 
 * @param text1 - First reflection text
 * @param text2 - Second reflection text
 * @returns Structural divergence (0-1)
 */
function computeStructuralDivergence(text1: string, text2: string): number {
  // Extract structural features (reuse from novelty detection)
  const features1 = extractStructuralFeatures(text1);
  const features2 = extractStructuralFeatures(text2);
  
  // Compute divergence
  const wordCountDiff = Math.abs(features1.wordCount - features2.wordCount) / Math.max(features1.wordCount + features2.wordCount, 1);
  const uniqueWordRatioDiff = Math.abs(features1.uniqueWordRatio - features2.uniqueWordRatio);
  const sentenceCountDiff = Math.abs(features1.sentenceCount - features2.sentenceCount) / Math.max(features1.sentenceCount + features2.sentenceCount, 1);
  const avgSentenceLengthDiff = Math.abs(features1.avgSentenceLength - features2.avgSentenceLength) / Math.max(features1.avgSentenceLength + features2.avgSentenceLength, 1);
  const punctuationDensityDiff = Math.abs(features1.punctuationDensity - features2.punctuationDensity);
  const capitalizationRatioDiff = Math.abs(features1.capitalizationRatio - features2.capitalizationRatio);

  // Weighted average of structural differences
  const divergence = (
    wordCountDiff * 0.2 +
    uniqueWordRatioDiff * 0.25 +
    sentenceCountDiff * 0.15 +
    avgSentenceLengthDiff * 0.15 +
    punctuationDensityDiff * 0.1 +
    capitalizationRatioDiff * 0.15
  );

  return Math.min(1, Math.max(0, divergence));
}

/**
 * Extract structural features from reflection text
 */
function extractStructuralFeatures(text: string): {
  wordCount: number;
  uniqueWordRatio: number;
  sentenceCount: number;
  avgSentenceLength: number;
  punctuationDensity: number;
  capitalizationRatio: number;
} {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const punctuationCount = (text.match(/[.,!?;:—–-]/g) || []).length;
  const capitalizedWords = words.filter(w => /^[A-Z]/.test(w)).length;
  
  return {
    wordCount: words.length,
    uniqueWordRatio: uniqueWords.size / Math.max(words.length, 1),
    sentenceCount: sentences.length,
    avgSentenceLength: sentences.length > 0 
      ? sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length
      : 0,
    punctuationDensity: punctuationCount / Math.max(text.length, 1),
    capitalizationRatio: capitalizedWords / Math.max(words.length, 1),
  };
}


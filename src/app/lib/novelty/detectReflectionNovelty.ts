/**
 * Reflection Novelty Detection
 * 
 * Ensures that only genuine new reflections can reinforce meaning,
 * while preventing minor variations, paraphrases, or observer-driven
 * repetition from artificially sustaining emergence.
 * 
 * Requirements:
 * - Reinforcement only occurs if new reflections exceed a novelty threshold
 * - Paraphrases do not reinforce
 * - Minor variations do not reinforce
 * - Repetition does not reinforce
 * - Structural difference, not semantic agreement
 * - Agreement alone does not increase meaning strength
 * - Confirmation does not count as novelty
 * - No observer amplification
 * - Deterministic novelty scoring
 * - Reinforcement can slow decay but cannot eliminate it
 */

import type { ReflectionEntry } from '../insights/types';

export type NoveltyScore = {
  score: number; // 0-1, where 1 = highly novel, 0 = no novelty
  isNovel: boolean; // true if score exceeds threshold
  structuralDivergence: number; // 0-1, structural difference from prior reflections
};

export type NoveltySignals = {
  newReflection: ReflectionEntry;
  priorReflections: ReflectionEntry[];
  noveltyThreshold?: number; // Default 0.4
};

/**
 * Extract structural features from reflection text
 * 
 * Structural features (not semantic):
 * - Word count
 * - Unique word ratio
 * - Sentence count
 * - Average sentence length
 * - Punctuation density
 * - Capitalization pattern
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

/**
 * Compute structural divergence between two reflections
 * 
 * Returns 0-1, where 1 = completely different structure, 0 = identical structure
 */
function computeStructuralDivergence(
  features1: ReturnType<typeof extractStructuralFeatures>,
  features2: ReturnType<typeof extractStructuralFeatures>
): number {
  // Normalize differences for each feature
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
 * Detect reflection novelty
 * 
 * Determines if a new reflection is sufficiently novel to reinforce meaning.
 * 
 * Novelty is based on structural divergence from prior reflections, not semantic agreement.
 * 
 * Deterministic: same reflection set → same novelty score
 * 
 * @param signals - Novelty detection signals
 * @returns NoveltyScore
 */
export function detectReflectionNovelty(signals: NoveltySignals): NoveltyScore {
  const { newReflection, priorReflections, noveltyThreshold = 0.4 } = signals;

  if (priorReflections.length === 0) {
    // First reflection is always novel
    return {
      score: 1.0,
      isNovel: true,
      structuralDivergence: 1.0,
    };
  }

  // Extract structural features from new reflection
  const newFeatures = extractStructuralFeatures(newReflection.plaintext);

  // Compute structural divergence from each prior reflection
  const divergences: number[] = [];
  
  for (const prior of priorReflections) {
    if (prior.deletedAt) continue;
    
    const priorFeatures = extractStructuralFeatures(prior.plaintext);
    const divergence = computeStructuralDivergence(newFeatures, priorFeatures);
    divergences.push(divergence);
  }

  // Novelty score is the minimum divergence (most similar prior reflection)
  // If it's similar to any prior reflection, it's not novel
  const minDivergence = divergences.length > 0 ? Math.min(...divergences) : 1.0;
  
  // Average divergence (overall structural difference)
  const avgDivergence = divergences.length > 0
    ? divergences.reduce((sum, d) => sum + d, 0) / divergences.length
    : 1.0;

  // Novelty score combines min and avg divergence
  // Must be different from closest prior AND different on average
  const noveltyScore = (minDivergence * 0.6 + avgDivergence * 0.4);

  // Check if novelty exceeds threshold
  const isNovel = noveltyScore >= noveltyThreshold;

  return {
    score: noveltyScore,
    isNovel,
    structuralDivergence: avgDivergence,
  };
}

/**
 * Check if reflections contain sufficient novelty to reinforce meaning
 * 
 * @param newReflections - New reflections to check
 * @param priorReflections - Prior reflections for comparison
 * @param noveltyThreshold - Threshold for novelty (default 0.4)
 * @returns true if any new reflection is novel enough to reinforce
 */
export function hasReinforcingNovelty(
  newReflections: ReflectionEntry[],
  priorReflections: ReflectionEntry[],
  noveltyThreshold: number = 0.4
): boolean {
  if (newReflections.length === 0) {
    return false;
  }

  // Check each new reflection for novelty
  for (const newReflection of newReflections) {
    if (newReflection.deletedAt) continue;

    const novelty = detectReflectionNovelty({
      newReflection,
      priorReflections,
      noveltyThreshold,
    });

    if (novelty.isNovel) {
      return true; // At least one novel reflection is sufficient
    }
  }

  return false; // No novel reflections found
}


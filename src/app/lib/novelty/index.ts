/**
 * Reflection Novelty Module
 * 
 * Ensures that only genuine new reflections can reinforce meaning.
 * Prevents minor variations, paraphrases, or observer-driven repetition
 * from artificially sustaining emergence.
 * 
 * Firewall preserved:
 * - UI cannot trigger reinforcement
 * - No manual overrides
 * - No configuration knobs exposed
 * - Observer trace explicitly excluded
 */

export type {
  NoveltyScore,
  NoveltySignals,
} from './detectReflectionNovelty';

export {
  detectReflectionNovelty,
  hasReinforcingNovelty,
} from './detectReflectionNovelty';


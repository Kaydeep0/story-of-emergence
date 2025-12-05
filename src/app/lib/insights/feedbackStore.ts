// src/app/lib/insights/feedbackStore.ts
// Client-side feedback storage for insight cards
// All data persisted to localStorage - no server calls

'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'soe_insight_feedback_v2';

// Scoring constants
const SCORE_THUMBS_UP = 2;
const SCORE_THUMBS_DOWN = -2;

// Dev mode detection
const isDev = process.env.NODE_ENV === 'development';

/**
 * Feedback value: positive (thumbs up), negative (thumbs down), or none
 */
export type FeedbackValue = 'positive' | 'negative' | null;

/**
 * Single feedback entry stored per insight
 */
export type FeedbackEntry = {
  insightId: string;
  recipeId: string; // e.g. "timeline_spike", "link_cluster", "streak_coach"
  value: FeedbackValue;
  score: number; // individual insight score: +2, -2, or 0
  updatedAt: string; // ISO timestamp
};

/**
 * Full feedback store shape
 */
export type FeedbackStore = {
  entries: Record<string, FeedbackEntry>; // keyed by insightId
  recipeScores: Record<string, number>; // keyed by recipeId
  insightScores: Record<string, number>; // keyed by insightId
};

/**
 * Load feedback store from localStorage
 */
function loadFeedbackStore(): FeedbackStore {
  const emptyStore: FeedbackStore = { entries: {}, recipeScores: {}, insightScores: {} };

  if (typeof window === 'undefined') {
    return emptyStore;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.entries === 'object' &&
      typeof parsed.recipeScores === 'object'
    ) {
      // Ensure insightScores exists (migration from v1)
      const store: FeedbackStore = {
        entries: parsed.entries,
        recipeScores: parsed.recipeScores,
        insightScores: parsed.insightScores ?? {},
      };

      if (isDev) {
        console.log('[feedbackStore] Loaded store:', {
          entryCount: Object.keys(store.entries).length,
          recipeScores: store.recipeScores,
          insightScores: store.insightScores,
        });
      }

      return store;
    }
    return emptyStore;
  } catch {
    return emptyStore;
  }
}

/**
 * Save feedback store to localStorage
 */
function saveFeedbackStore(store: FeedbackStore): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    if (isDev) {
      console.log('[feedbackStore] Saved store:', {
        entryCount: Object.keys(store.entries).length,
        recipeScores: store.recipeScores,
        insightScores: store.insightScores,
      });
    }
  } catch (err) {
    console.error('[feedbackStore] Failed to save:', err);
  }
}

/**
 * Calculate both recipe scores and insight scores from feedback entries
 * +2 for thumbs up, -2 for thumbs down
 */
function calculateScores(
  entries: Record<string, FeedbackEntry>
): { recipeScores: Record<string, number>; insightScores: Record<string, number> } {
  const recipeScores: Record<string, number> = {};
  const insightScores: Record<string, number> = {};

  for (const entry of Object.values(entries)) {
    if (!entry.recipeId) continue;

    // Initialize recipe score if needed
    if (!(entry.recipeId in recipeScores)) {
      recipeScores[entry.recipeId] = 0;
    }

    // Calculate score based on feedback value
    let score = 0;
    if (entry.value === 'positive') {
      score = SCORE_THUMBS_UP;
    } else if (entry.value === 'negative') {
      score = SCORE_THUMBS_DOWN;
    }
    // null value = 0 (reset to zero)

    // Store individual insight score
    insightScores[entry.insightId] = score;

    // Aggregate into recipe score
    recipeScores[entry.recipeId] += score;
  }

  return { recipeScores, insightScores };
}

/**
 * Hook for managing insight feedback
 *
 * Provides:
 * - getFeedback: get feedback value for an insight
 * - setFeedback: set feedback (positive/negative/null)
 * - getRecipeScore: get cumulative score for a recipe
 * - getInsightScore: get score for a specific insight
 * - recipeScores: all recipe scores for sorting
 * - insightScores: all individual insight scores
 */
export function useFeedback() {
  const [store, setStore] = useState<FeedbackStore>({
    entries: {},
    recipeScores: {},
    insightScores: {},
  });
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFeedbackStore();
    setStore(stored);
    setLoaded(true);
  }, []);

  // Save to localStorage whenever store changes
  useEffect(() => {
    if (!loaded) return;
    saveFeedbackStore(store);
  }, [store, loaded]);

  /**
   * Get feedback value for an insight
   */
  const getFeedback = useCallback(
    (insightId: string): FeedbackValue => {
      return store.entries[insightId]?.value ?? null;
    },
    [store.entries]
  );

  /**
   * Set feedback for an insight
   * Automatically updates recipe and insight scores
   * +2 for thumbs up, -2 for thumbs down, 0 (reset) for null
   */
  const setFeedback = useCallback(
    (insightId: string, recipeId: string, value: FeedbackValue): void => {
      setStore((prev) => {
        const newEntries = { ...prev.entries };
        const oldEntry = prev.entries[insightId];
        const oldValue = oldEntry?.value ?? null;

        // Calculate score for logging
        let newScore = 0;
        if (value === 'positive') newScore = SCORE_THUMBS_UP;
        else if (value === 'negative') newScore = SCORE_THUMBS_DOWN;

        if (isDev) {
          const oldScore = oldEntry?.score ?? 0;
          console.log('[feedbackStore] Score change:', {
            insightId,
            recipeId,
            oldValue,
            newValue: value,
            oldScore,
            newScore,
            change: newScore - oldScore,
          });
        }

        if (value === null) {
          // Remove feedback - reset score to zero
          delete newEntries[insightId];
        } else {
          // Set or update feedback
          newEntries[insightId] = {
            insightId,
            recipeId,
            value,
            score: newScore,
            updatedAt: new Date().toISOString(),
          };
        }

        // Recalculate all scores
        const { recipeScores, insightScores } = calculateScores(newEntries);

        if (isDev) {
          console.log('[feedbackStore] Updated scores:', {
            recipeScores,
            insightScores,
          });
        }

        return {
          entries: newEntries,
          recipeScores,
          insightScores,
        };
      });
    },
    []
  );

  /**
   * Toggle feedback: null -> positive -> negative -> null
   */
  const toggleFeedback = useCallback(
    (
      insightId: string,
      recipeId: string,
      direction: 'up' | 'down'
    ): void => {
      const current = store.entries[insightId]?.value ?? null;

      let newValue: FeedbackValue;
      if (direction === 'up') {
        newValue = current === 'positive' ? null : 'positive';
      } else {
        newValue = current === 'negative' ? null : 'negative';
      }

      setFeedback(insightId, recipeId, newValue);
    },
    [store.entries, setFeedback]
  );

  /**
   * Get score for a specific recipe
   */
  const getRecipeScore = useCallback(
    (recipeId: string): number => {
      return store.recipeScores[recipeId] ?? 0;
    },
    [store.recipeScores]
  );

  /**
   * Get score for a specific insight
   */
  const getInsightScore = useCallback(
    (insightId: string): number => {
      return store.insightScores[insightId] ?? 0;
    },
    [store.insightScores]
  );

  return {
    getFeedback,
    setFeedback,
    toggleFeedback,
    getRecipeScore,
    getInsightScore,
    recipeScores: store.recipeScores,
    insightScores: store.insightScores,
    loaded,
  };
}

/**
 * Sort insights by score and recency
 *
 * Sorting priority:
 * 1. Individual insight score (higher scores first)
 * 2. Recipe score as tiebreaker for unrated items
 * 3. Recency (more recent computedAt first)
 *
 * @param items - Insight cards to sort
 * @param recipeScores - Cumulative scores per recipe type
 * @param insightScores - Individual scores per insight ID
 */
export function sortByRecipeScore<T extends { id: string; kind: string; computedAt: string }>(
  items: T[],
  recipeScores: Record<string, number>,
  insightScores: Record<string, number> = {}
): T[] {
  // Create a copy to avoid mutating the original
  return [...items].sort((a, b) => {
    // Primary: individual insight score
    const insightScoreA = insightScores[a.id] ?? 0;
    const insightScoreB = insightScores[b.id] ?? 0;

    if (insightScoreA !== insightScoreB) {
      return insightScoreB - insightScoreA; // Higher scores first
    }

    // Secondary: recipe score (for items with same/no individual score)
    const recipeScoreA = recipeScores[a.kind] ?? 0;
    const recipeScoreB = recipeScores[b.kind] ?? 0;

    if (recipeScoreA !== recipeScoreB) {
      return recipeScoreB - recipeScoreA; // Higher scores first
    }

    // Tertiary: recency (more recent first)
    const timeA = new Date(a.computedAt).getTime();
    const timeB = new Date(b.computedAt).getTime();
    return timeB - timeA; // More recent first
  });
}


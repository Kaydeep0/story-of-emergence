// src/app/lib/insights/feedbackStore.ts
// Client-side feedback storage for insight cards
// All data persisted to localStorage - no server calls

'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'soe_insight_feedback_v1';

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
  updatedAt: string; // ISO timestamp
};

/**
 * Full feedback store shape
 */
export type FeedbackStore = {
  entries: Record<string, FeedbackEntry>; // keyed by insightId
  recipeScores: Record<string, number>; // keyed by recipeId
};

/**
 * Load feedback store from localStorage
 */
function loadFeedbackStore(): FeedbackStore {
  if (typeof window === 'undefined') {
    return { entries: {}, recipeScores: {} };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {}, recipeScores: {} };

    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.entries === 'object' &&
      typeof parsed.recipeScores === 'object'
    ) {
      return parsed as FeedbackStore;
    }
    return { entries: {}, recipeScores: {} };
  } catch {
    return { entries: {}, recipeScores: {} };
  }
}

/**
 * Save feedback store to localStorage
 */
function saveFeedbackStore(store: FeedbackStore): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('[feedbackStore] Failed to save:', err);
  }
}

/**
 * Calculate recipe score from feedback entries
 * +1 for positive, -1 for negative
 */
function calculateRecipeScores(
  entries: Record<string, FeedbackEntry>
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const entry of Object.values(entries)) {
    if (!entry.recipeId) continue;

    if (!(entry.recipeId in scores)) {
      scores[entry.recipeId] = 0;
    }

    if (entry.value === 'positive') {
      scores[entry.recipeId] += 1;
    } else if (entry.value === 'negative') {
      scores[entry.recipeId] -= 1;
    }
  }

  return scores;
}

/**
 * Hook for managing insight feedback
 *
 * Provides:
 * - getFeedback: get feedback value for an insight
 * - setFeedback: set feedback (positive/negative/null)
 * - getRecipeScore: get cumulative score for a recipe
 * - recipeScores: all recipe scores for sorting
 */
export function useFeedback() {
  const [store, setStore] = useState<FeedbackStore>({
    entries: {},
    recipeScores: {},
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
   * Automatically updates recipe scores
   */
  const setFeedback = useCallback(
    (insightId: string, recipeId: string, value: FeedbackValue): void => {
      setStore((prev) => {
        const newEntries = { ...prev.entries };

        if (value === null) {
          // Remove feedback
          delete newEntries[insightId];
        } else {
          // Set or update feedback
          newEntries[insightId] = {
            insightId,
            recipeId,
            value,
            updatedAt: new Date().toISOString(),
          };
        }

        // Recalculate all recipe scores
        const newRecipeScores = calculateRecipeScores(newEntries);

        return {
          entries: newEntries,
          recipeScores: newRecipeScores,
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

  return {
    getFeedback,
    setFeedback,
    toggleFeedback,
    getRecipeScore,
    recipeScores: store.recipeScores,
    loaded,
  };
}

/**
 * Sort insights by recipe score (higher scores first)
 * Maintains stable sort for equal scores (preserves original order)
 */
export function sortByRecipeScore<T extends { kind: string }>(
  items: T[],
  recipeScores: Record<string, number>
): T[] {
  // Create a copy to avoid mutating the original
  return [...items].sort((a, b) => {
    const scoreA = recipeScores[a.kind] ?? 0;
    const scoreB = recipeScores[b.kind] ?? 0;
    return scoreB - scoreA; // Higher scores first
  });
}


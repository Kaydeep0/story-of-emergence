// src/app/lib/insights/useHighlights.ts
// Hook for managing highlighted insight cards, persisted in localStorage
// This is entirely client-side - no Supabase or network calls

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { InsightCard, HighlightSnapshot } from './types';

const STORAGE_KEY = 'soe_highlights_v1';

/**
 * Load highlights from localStorage
 * Returns empty array if parsing fails or in SSR context
 */
function loadHighlightsFromStorage(): HighlightSnapshot[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Basic validation - ensure each item has required fields
    return parsed.filter(
      (item): item is HighlightSnapshot =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.id === 'string' &&
        typeof item.kind === 'string' &&
        typeof item.title === 'string'
    );
  } catch {
    return [];
  }
}

/**
 * Save highlights to localStorage
 */
function saveHighlightsToStorage(highlights: HighlightSnapshot[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(highlights));
  } catch (err) {
    console.error('[useHighlights] Failed to save to localStorage:', err);
  }
}

/**
 * Create a HighlightSnapshot from an InsightCard
 */
function createSnapshot(card: InsightCard): HighlightSnapshot {
  return {
    id: card.id,
    kind: card.kind,
    title: card.title,
    explanation: card.explanation,
    computedAt: card.computedAt,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Hook for managing insight highlights
 * 
 * Provides:
 * - highlights: array of saved highlight snapshots
 * - isHighlighted: check if a card is currently highlighted
 * - toggleHighlight: add or remove a card from highlights
 * 
 * All data is persisted to localStorage under key "soe_highlights_v1"
 */
export function useHighlights() {
  const [highlights, setHighlights] = useState<HighlightSnapshot[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = loadHighlightsFromStorage();
    setHighlights(stored);
    setLoaded(true);
  }, []);

  // Save to localStorage whenever highlights change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    saveHighlightsToStorage(highlights);
  }, [highlights, loaded]);

  /**
   * Check if a card is currently highlighted
   */
  const isHighlighted = useCallback(
    (card: InsightCard): boolean => {
      return highlights.some((h) => h.id === card.id);
    },
    [highlights]
  );

  /**
   * Toggle highlight state for a card
   * If already highlighted, removes it. Otherwise, adds it.
   */
  const toggleHighlight = useCallback((card: InsightCard): void => {
    setHighlights((prev) => {
      const existingIndex = prev.findIndex((h) => h.id === card.id);
      
      if (existingIndex !== -1) {
        // Remove existing highlight
        return prev.filter((_, i) => i !== existingIndex);
      } else {
        // Add new highlight (newest first)
        return [createSnapshot(card), ...prev];
      }
    });
  }, []);

  /**
   * Remove a highlight by id
   */
  const removeHighlight = useCallback((id: string): void => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  return {
    highlights,
    isHighlighted,
    toggleHighlight,
    removeHighlight,
  };
}


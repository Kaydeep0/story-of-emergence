import type { EvidenceChip } from './types';

/**
 * Canonical InsightCard shape for UI consumption
 * All insight cards must conform to this shape before rendering
 */
export type InsightCardBase = {
  id: string;
  scope: 'week' | 'month' | 'year';
  headline: string;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
  label?: string;
  evidenceChips?: EvidenceChip[]; // Observer v0: Excerpt chips from actual reflections
};

/**
 * Input types that may need normalization
 */
type LegacyInsightCard = {
  id: string;
  kind?: string;
  title?: string;
  explanation?: string;
  headline?: string;
  summary?: string;
  scope?: 'week' | 'month' | 'year' | string | { label?: string; scope?: string };
  confidence?: 'low' | 'medium' | 'high' | string | null;
  label?: string;
  evidence?: any[];
  computedAt?: string;
  [key: string]: any; // Allow extra fields
};

/**
 * Normalize any insight card variant to canonical InsightCardBase
 * Handles:
 * - Legacy types.ts cards (title/explanation → headline/summary)
 * - ViewModels cards (already correct shape)
 * - Partial/missing fields (provides defaults)
 * - Non-string scope/confidence (extracts string values)
 */
export function normalizeInsightCard(input: LegacyInsightCard | InsightCardBase | any): InsightCardBase {
  // Extract scope safely
  const extractScope = (): 'week' | 'month' | 'year' => {
    if (!input.scope) return 'week';
    
    if (typeof input.scope === 'string') {
      const normalized = input.scope.toLowerCase();
      if (normalized === 'week' || normalized === 'month' || normalized === 'year') {
        return normalized;
      }
    }
    
    if (input.scope && typeof input.scope === 'object') {
      const scopeStr = input.scope.scope || input.scope.label || '';
      const normalized = scopeStr.toLowerCase();
      if (normalized === 'week' || normalized === 'month' || normalized === 'year') {
        return normalized;
      }
    }
    
    return 'week'; // Default fallback
  };

  // Extract confidence safely
  const extractConfidence = (): 'low' | 'medium' | 'high' => {
    if (!input.confidence) return 'medium';
    
    if (typeof input.confidence === 'string') {
      const normalized = input.confidence.toLowerCase();
      if (normalized === 'low' || normalized === 'medium' || normalized === 'high') {
        return normalized;
      }
    }
    
    return 'medium'; // Default fallback
  };

  // Extract headline (prefer headline, fallback to title) - force string
  const headline = String(input.headline || input.title || 'Insight');
  
  // Extract summary (prefer summary, fallback to explanation) - force string
  const summary = String(input.summary || input.explanation || '');
  
  // Extract ID (must be string) - ensure it's always a stable string
  const id = typeof input.id === 'string' && input.id.length > 0 
    ? input.id 
    : typeof input.id === 'object' && input.id !== null
    ? JSON.stringify(input.id)
    : `insight-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  return {
    id,
    scope: extractScope(),
    headline,
    summary,
    confidence: extractConfidence(),
    label: input.label,
    evidenceChips: input.evidenceChips, // Preserve evidence chips if present
  };
}


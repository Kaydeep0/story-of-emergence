// src/app/insights/lib/lensContract.ts
// Canonical lens definitions - single source of truth for all insight lenses
// Navigation contract: Each lens maps to exactly one route

export type LensKey = 'weekly' | 'summary' | 'timeline' | 'yearly' | 'distributions' | 'yoy' | 'lifetime';

export type LensStatus = 'available' | 'disabled' | 'coming_soon';

export type Lens = {
  key: LensKey;
  label: string;
  route: string;
  description: string;
  status: LensStatus;
  disabledReason?: string;
};

export const LENSES: Record<LensKey, Lens> = {
  weekly: {
    key: 'weekly',
    label: 'Weekly',
    route: '/insights/weekly',
    description: 'Your encrypted activity this week',
    status: 'available',
  },
  summary: {
    key: 'summary',
    label: 'Summary',
    route: '/insights/summary',
    description: 'Always-on insights from recent activity',
    status: 'available',
  },
  timeline: {
    key: 'timeline',
    label: 'Timeline',
    route: '/insights/timeline',
    description: 'Activity spikes, clusters, and topic drift over time',
    status: 'available',
  },
  yearly: {
    key: 'yearly',
    label: 'Yearly',
    route: '/insights/yearly',
    description: 'Your year in reflection',
    status: 'available',
  },
  distributions: {
    key: 'distributions',
    label: 'Distributions',
    route: '/insights/distributions',
    description: 'Pattern analysis across time windows',
    status: 'available',
  },
  yoy: {
    key: 'yoy',
    label: 'Year over Year',
    route: '/insights/yoy',
    description: 'Compare two moments in time',
    status: 'available',
  },
  lifetime: {
    key: 'lifetime',
    label: 'Lifetime',
    route: '/insights/lifetime',
    description: 'Your encrypted activity across all time',
    status: 'available',
  },
};

// Order for tab navigation
export const LENS_ORDER: LensKey[] = ['weekly', 'summary', 'timeline', 'yearly', 'distributions', 'yoy', 'lifetime'];

/**
 * Get feature readiness status for a lens
 * Used by UI to show availability, disabled state, or coming soon
 */
export function getInsightFeatureStatus(lensKey: LensKey): {
  status: LensStatus;
  reason?: string;
} {
  const lens = LENSES[lensKey];
  
  if (!lens) {
    return { status: 'coming_soon', reason: 'Lens not defined' };
  }
  
  return {
    status: lens.status,
    reason: lens.disabledReason,
  };
}

/**
 * Check if a horizon is supported by the insight engine
 * Prevents UI from requesting unsupported horizons
 */
export function isHorizonSupported(horizon: 'weekly' | 'summary' | 'timeline' | 'yearly' | 'lifetime' | 'yoy'): boolean {
  // Weekly: fully supported with pattern narratives
  if (horizon === 'weekly') return true;
  
  // Summary: supported via computeSummaryInsights (no engine artifact yet)
  if (horizon === 'summary') return true;
  
  // Timeline: supported via computeTimelineInsights (no engine artifact yet)
  if (horizon === 'timeline') return true;
  
  // Yearly: supported via separate page (not through engine)
  if (horizon === 'yearly') return true;
  
  // Lifetime: supported via separate page (not through engine)
  if (horizon === 'lifetime') return true;
  
  // YoY: computation exists but not wired to engine
  if (horizon === 'yoy') return true;
  
  return false;
}


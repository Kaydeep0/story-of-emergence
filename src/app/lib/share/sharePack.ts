// src/app/lib/share/sharePack.ts
// Canonical SharePack Contract and Schema Boundary
// Phase 3.2: Contract-only step - no UI, no rendering, no platform logic

/**
 * SharePack - Canonical type for shareable artifact derived from Yearly insights
 * 
 * This is the single source of truth for what can be shared.
 * All fields are derived from encrypted private journal data.
 * No raw reflection text, wallet addresses, or internal IDs.
 */
export type SharePack = {
  /** Year this pack represents */
  year: number;
  
  /** One sentence summary of the year */
  oneSentenceSummary: string;
  
  /** Archetype classification (e.g., "The Quiet Builder", "The Pattern Seeker") */
  archetype: string | null;
  
  /** Distribution pattern label */
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  
  /** Key numbers summarizing the year */
  keyNumbers: {
    /** Frequency: total number of reflections */
    frequency: number;
    /** Spike count: number of high-activity days */
    spikeCount: number;
    /** Concentration: share of activity in top 10% of days */
    concentration: number;
  };
  
  /** Top moments (ids only, no raw text) */
  topMoments: Array<{
    /** Moment identifier (derived, not raw entry ID) */
    id: string;
    /** ISO date string */
    date: string;
  }>;
  
  /** Mirror insight - wholesome reflection on the year */
  mirrorInsight: string | null;
  
  /** ISO timestamp when pack was generated */
  generatedAt: string;
  
  /** Static privacy label - always the same */
  privacyLabel: 'Derived from encrypted private journal';
  
  // Optional fields for extended SharePack (used by generateSharePack)
  id?: string;
  createdAt?: number;
  checksum?: string;
  scope?: 'year' | 'week' | 'month';
  title?: string;
  summary?: string;
  moments?: Array<{
    headline: string;
    summary: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  shifts?: Array<{
    scope: string;
    direction: string;
    headline: string;
    summary: string;
  }>;
  density?: string;
  cadence?: string;
  confidence?: 'high' | 'medium' | 'low';
};

/**
 * Moment type for extended SharePack format
 */
export type Moment = {
  headline: string;
  summary: string;
  confidence: 'high' | 'medium' | 'low';
};

/**
 * Input data for building a SharePack from yearly insights
 * 
 * This represents the already-computed Yearly Wrap data structure.
 * All insights and computations should already be done before calling buildYearlySharePack.
 */
export type YearlyInsightData = {
  /** Year being analyzed */
  year: number;
  
  /** One sentence summary (from headline or identitySentence) */
  oneSentenceSummary: string;
  
  /** Archetype name (optional) */
  archetype?: string | null;
  
  /** Distribution label from yearly wrap */
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  
  /** Entry count (total reflections) */
  entryCount: number;
  
  /** Active days count */
  activeDays: number;
  
  /** Concentration share (top 10% days) */
  concentrationShareTop10PercentDays: number;
  
  /** Spike count (days with ≥3 entries AND ≥2× median) - required, computed in observer layer */
  spikeCount: number;
  
  /** Key moments with dates */
  keyMoments?: Array<{
    date: string; // ISO date string
    summary?: string; // Optional summary (not included in SharePack)
  }>;
  
  /** Mirror insight text (optional) */
  mirrorInsight?: string | null;
  
  /** ISO timestamp when pack was generated (optional, defaults to current time) */
  generatedAt?: string;
};

/**
 * Build a SharePack from yearly insight data
 * 
 * Pure function - deterministic, no side effects, no network calls.
 * Uses already-computed Yearly Wrap data only.
 * Does not recompute insights.
 * 
 * Rules:
 * - No JSX
 * - No rendering logic
 * - No platform logic
 * - No side effects
 * - Deterministic output
 * 
 * @param yearlyInsightData - Pre-computed yearly insight data
 * @returns SharePack object conforming to the canonical contract
 */
export function buildYearlySharePack(yearlyInsightData: YearlyInsightData): SharePack {
  const {
    year,
    oneSentenceSummary,
    archetype,
    distributionLabel,
    entryCount,
    activeDays,
    concentrationShareTop10PercentDays,
    spikeCount,
    keyMoments = [],
    mirrorInsight,
    generatedAt,
  } = yearlyInsightData;

  // Sort keyMoments by date for stable ordering (ensures IDs remain stable across runs)
  const sortedMoments = [...keyMoments].sort((a, b) => a.date.localeCompare(b.date));

  // Transform keyMoments to topMoments format (ids only, no raw text)
  const topMoments: SharePack['topMoments'] = sortedMoments.map((moment, index) => ({
    id: `moment-${year}-${index}`,
    date: moment.date,
  }));

  const sharePack: SharePack = {
    year,
    oneSentenceSummary,
    archetype: archetype ?? null,
    distributionLabel,
    keyNumbers: {
      frequency: entryCount,
      spikeCount,
      concentration: concentrationShareTop10PercentDays,
    },
    topMoments,
    mirrorInsight: mirrorInsight ?? null,
    generatedAt: generatedAt ?? new Date().toISOString(),
    privacyLabel: 'Derived from encrypted private journal',
  };

  return sharePack;
}

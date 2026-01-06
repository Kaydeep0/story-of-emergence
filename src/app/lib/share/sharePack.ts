// src/app/lib/share/sharePack.ts
// Canonical SharePack Contract and Schema Boundary
// Phase 3.2: Contract-only step - no UI, no rendering, no platform logic

/**
 * SharePack Contract
 * 
 * SharePack is a representation of observed structure,
 * not a prescription or call to action.
 * 
 * SharePack - Universal payload type for all lenses (Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime)
 * 
 * This is the single source of truth for what can be shared.
 * All fields are derived from encrypted private journal data.
 * No raw reflection text, wallet addresses, or internal IDs.
 */
export type SharePack = {
  /** Lens type that generated this pack */
  lens: 'weekly' | 'summary' | 'timeline' | 'yearly' | 'distributions' | 'yoy' | 'lifetime';
  
  /** One sentence summary */
  oneSentenceSummary: string;
  
  /** Archetype classification (e.g., "The Quiet Builder", "The Pattern Seeker") - optional for non-yearly lenses */
  archetype: string | null;
  
  /** Distribution pattern label */
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  
  /** Key numbers summarizing the period */
  keyNumbers: {
    /** Frequency: total number of reflections */
    frequency: number;
    /** Spike count: number of high-activity days */
    spikeCount: number;
    /** Concentration: share of activity in top 10% of days */
    concentration: number;
    /** Active days: number of days with at least one reflection */
    activeDays?: number;
  };
  
  /** Top moments (ids only, no raw text) */
  topMoments: Array<{
    /** Moment identifier (derived, not raw entry ID) */
    id: string;
    /** ISO date string */
    date: string;
  }>;
  
  /** Mirror insight - wholesome reflection on the period */
  mirrorInsight: string | null;
  
  /** ISO timestamp when pack was generated */
  generatedAt: string;
  
  /** Static privacy label - always the same */
  privacyLabel: 'Derived from encrypted private journal';
  
  /** Year for yearly lens, or period identifier for other lenses */
  year?: number;
  
  /** Period start date (ISO string) */
  periodStart?: string;
  
  /** Period end date (ISO string) */
  periodEnd?: string;
  
  // Optional fields for extended SharePack
  id?: string;
  createdAt?: number;
  checksum?: string;
  scope?: 'year' | 'week' | 'month' | 'lifetime';
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
  
  /** Lens-specific metadata (optional, for future extensions) */
  lensMetadata?: Record<string, unknown>;
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
 * Lens state data structure - what each lens provides to build SharePack
 */
export type LensState = {
  lens: 'weekly' | 'summary' | 'timeline' | 'yearly' | 'distributions' | 'yoy' | 'lifetime';
  
  // Core metrics (required)
  oneSentenceSummary: string;
  entryCount: number;
  activeDays?: number;
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  concentrationShareTop10PercentDays?: number;
  spikeCount?: number;
  
  // Optional fields
  year?: number;
  periodStart?: string;
  periodEnd?: string;
  archetype?: string | null;
  keyMoments?: Array<{ date: string; summary?: string }>;
  mirrorInsight?: string | null;
  generatedAt?: string;
  
  // Lens-specific metadata
  lensMetadata?: Record<string, unknown>;
};

/**
 * Build a SharePack from lens state
 * 
 * Universal builder for all lenses. Pure function - deterministic, no side effects.
 * 
 * Rules:
 * - No JSX
 * - No rendering logic
 * - No platform logic
 * - No side effects
 * - Deterministic output
 * 
 * @param lensState - Pre-computed lens state data
 * @returns SharePack object conforming to the canonical contract
 */
export function buildSharePackForLens(lensState: LensState): SharePack {
  const {
    lens,
    oneSentenceSummary,
    entryCount,
    activeDays,
    distributionLabel,
    concentrationShareTop10PercentDays = 0,
    spikeCount = 0,
    year,
    periodStart,
    periodEnd,
    archetype,
    keyMoments = [],
    mirrorInsight,
    generatedAt,
    lensMetadata,
  } = lensState;

  // Sort keyMoments by date for stable ordering
  const sortedMoments = [...keyMoments].sort((a, b) => a.date.localeCompare(b.date));

  // Transform keyMoments to topMoments format (ids only, no raw text)
  const momentIdPrefix = year ? `moment-${year}` : `moment-${lens}`;
  const topMoments: SharePack['topMoments'] = sortedMoments.map((moment, index) => ({
    id: `${momentIdPrefix}-${index}`,
    date: moment.date,
  }));

  const sharePack: SharePack = {
    lens,
    oneSentenceSummary,
    archetype: archetype ?? null,
    distributionLabel,
    keyNumbers: {
      frequency: entryCount,
      spikeCount,
      concentration: concentrationShareTop10PercentDays,
      activeDays,
    },
    topMoments,
    mirrorInsight: mirrorInsight ?? null,
    generatedAt: generatedAt ?? new Date().toISOString(),
    privacyLabel: 'Derived from encrypted private journal',
    year,
    periodStart,
    periodEnd,
    scope: lens === 'yearly' ? 'year' : lens === 'weekly' ? 'week' : lens === 'lifetime' ? 'lifetime' : 'month',
    lensMetadata,
  };

  return sharePack;
}

/**
 * Build a SharePack from yearly insight data (backward compatibility)
 * 
 * @deprecated Use buildSharePackForLens instead
 * @param yearlyInsightData - Pre-computed yearly insight data
 * @returns SharePack object conforming to the canonical contract
 */
export function buildYearlySharePack(yearlyInsightData: YearlyInsightData): SharePack {
  return buildSharePackForLens({
    lens: 'yearly',
    oneSentenceSummary: yearlyInsightData.oneSentenceSummary,
    entryCount: yearlyInsightData.entryCount,
    activeDays: yearlyInsightData.activeDays,
    distributionLabel: yearlyInsightData.distributionLabel,
    concentrationShareTop10PercentDays: yearlyInsightData.concentrationShareTop10PercentDays,
    spikeCount: yearlyInsightData.spikeCount,
    year: yearlyInsightData.year,
    archetype: yearlyInsightData.archetype,
    keyMoments: yearlyInsightData.keyMoments,
    mirrorInsight: yearlyInsightData.mirrorInsight,
    generatedAt: yearlyInsightData.generatedAt,
  });
}

/**
 * Share Pack Contract
 * 
 * This contract defines the maximum information allowed to leave the private vault by default.
 * 
 * All fields are derived narrative data only.
 * No raw journal text, wallet addresses, internal IDs, confidence scores, recommendations, or predictions.
 */

/**
 * SharePack - The canonical contract for what can be shared
 * 
 * Contains ONLY derived narrative data suitable for public sharing.
 */
export type SharePack = {
  year: number;
  sentence: string;
  archetype: string | null;
  distributionHint: "normal" | "log-normal" | "power-law" | null;

  moments: Array<{
    id: string;
    title: string;
    date: string;
  }>;

  numbers: {
    totalEntries: number;
    activeDays: number;
    spikeDays: number;
    concentrationRatio: number;
  };

  mirrorInsight: string | null;

  // Optional metadata
  generatedAt?: string; // ISO date string
  version?: "v1";
};

/**
 * Yearly data input for building a SharePack
 * 
 * This represents the already-computed Yearly Wrap data structure.
 * All insights and computations should already be done before calling buildSharePack.
 */
export type YearlyData = {
  year: number;
  headline: string; // Used as sentence
  keyMoments: Array<{
    date: string; // ISO date string
    summary: string; // Used as title
  }>;
  entryCount: number; // Used as totalEntries
  activeDays: number;
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed' | 'none';
  concentrationShareTop10PercentDays: number; // Used as concentrationRatio
  
  // Optional fields that may be available
  archetype?: string | null;
  mirrorInsight?: string | null;
  
  // For computing spikeDays - daily counts or spike information
  dailyCounts?: number[]; // Array of entry counts per day
  spikeRatio?: number; // If available, can help identify spike threshold
};

/**
 * Build a SharePack from yearly wrap data
 * 
 * Pure function - deterministic, no side effects, no network calls.
 * Uses already-computed Yearly Wrap data only.
 * Does not recompute insights.
 * 
 * @param yearlyData - Pre-computed yearly wrap data
 * @returns SharePack object conforming to the contract
 */
export function buildSharePack(yearlyData: YearlyData): SharePack {
  // Convert distributionLabel to distributionHint format
  const distributionHint: SharePack["distributionHint"] = 
    yearlyData.distributionLabel === 'normal' ? 'normal' :
    yearlyData.distributionLabel === 'lognormal' ? 'log-normal' :
    yearlyData.distributionLabel === 'powerlaw' ? 'power-law' :
    null;

  // Compute spikeDays from dailyCounts if available
  // Spike days are days with ≥3 entries AND ≥2× median daily activity
  let spikeDays = 0;
  if (yearlyData.dailyCounts && yearlyData.dailyCounts.length > 0) {
    const nonZeroCounts = yearlyData.dailyCounts.filter(c => c > 0);
    if (nonZeroCounts.length > 0) {
      const sortedNonZero = [...nonZeroCounts].sort((a, b) => a - b);
      const median = sortedNonZero.length % 2 === 0
        ? (sortedNonZero[sortedNonZero.length / 2 - 1] + sortedNonZero[sortedNonZero.length / 2]) / 2
        : sortedNonZero[Math.floor(sortedNonZero.length / 2)];
      
      const effectiveMedian = median > 0 ? median : 1;
      const spikeThreshold = Math.max(3, effectiveMedian * 2);
      
      spikeDays = yearlyData.dailyCounts.filter(count => 
        count >= spikeThreshold && count >= 3
      ).length;
    }
  }

  // Transform keyMoments to moments format
  const moments: SharePack["moments"] = yearlyData.keyMoments.map((moment, index) => ({
    id: `moment-${yearlyData.year}-${index}`,
    title: moment.summary,
    date: moment.date,
  }));

  const sharePack: SharePack = {
    year: yearlyData.year,
    sentence: yearlyData.headline,
    archetype: yearlyData.archetype ?? null,
    distributionHint,
    moments,
    numbers: {
      totalEntries: yearlyData.entryCount,
      activeDays: yearlyData.activeDays,
      spikeDays,
      concentrationRatio: yearlyData.concentrationShareTop10PercentDays,
    },
    mirrorInsight: yearlyData.mirrorInsight ?? null,
    generatedAt: new Date().toISOString(),
    version: "v1",
  };

  return sharePack;
}


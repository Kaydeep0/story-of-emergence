/**
 * SharePack - Canonical object for yearly wrap sharing
 * 
 * This is the single source of truth for:
 * - Preview rendering
 * - Exported image rendering
 * - Caption generation
 * 
 * If it's not in the SharePack, it cannot show up in the share card.
 */

import type { DistributionResult, WindowDistribution } from '../../../lib/insights/distributionLayer';
import type { ReflectionEntry } from '../../../lib/insights/types';
import { pickTopMomentsForShare, cleanForShare, isProbablySystemOrErrorText } from '../../../lib/share/buildShareText';
import { getTopSpikeDates } from '../../../lib/insights/distributionLayer';

/**
 * SharePackSelection - The checkboxes that control what's included
 */
export interface SharePackSelection {
  yearSentence: boolean;
  archetype: boolean;
  yearShape: boolean;
  topMoments: boolean;
  threeNumbers: boolean;
  wholesomeMirror: boolean;
}

/**
 * SharePackPlatform - Supported platforms for sharing
 */
export type SharePackPlatform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'threads';

/**
 * SharePack - The final derived payload (safe fields only)
 * 
 * No raw reflection text by default.
 * All fields are derived from Yearly insight data and selections.
 */
export interface SharePack {
  // Metadata
  year: number;
  platform: SharePackPlatform;
  attribution: string; // "Computed locally. Nothing uploaded."

  // Content (only included if selected)
  sentence?: string; // identitySentence (sanitized)
  archetype?: string; // archetype (sanitized)
  
  yearShape?: {
    summary: string; // e.g., "52 weeks of activity, 3 spike days"
    weekCount: number;
    spikeCount: number;
    topSpikeDates: string[]; // YYYY-MM-DD format
  };
  
  numbers?: {
    totalEntries: number;
    activeDays: number;
    spikeRatio: number;
  };
  
  topMoments?: Array<{
    date: string; // ISO date string
    shortTitle: string; // sanitized preview (no raw body)
    reflectionId: string; // entryId for reference
  }>;
  
  mirrorInsight?: string; // wholesome mirror insight (sanitized)
  
  distributionLabel?: 'Normal' | 'Log Normal' | 'Power Law'; // Human-readable label
}

/**
 * Input data for building a SharePack
 */
export interface SharePackInput {
  year: number;
  selection: SharePackSelection;
  platform: SharePackPlatform;
  
  // Raw data from yearly insights
  identitySentence?: string;
  archetype?: string;
  yearShape?: {
    dailyCounts: number[];
    topSpikeDates: string[];
  };
  moments?: Array<{ date: string; preview: string }>;
  numbers?: {
    totalEntries: number;
    activeDays: number;
    spikeRatio: number;
  };
  mirrorInsight?: string;
  
  // For computing safe moments
  entries?: ReflectionEntry[];
  distributionResult?: DistributionResult | null;
  windowDistribution?: WindowDistribution | null; // For distribution label
}

/**
 * Sanitize text for sharing
 * Returns undefined if text is unsafe or empty
 */
function sanitizeText(text: string | undefined): string | undefined {
  if (!text || !text.trim()) return undefined;
  
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  
  // Exclude if contains unsafe patterns
  if (
    lowerText.includes('decrypt') ||
    lowerText.includes('unable to decrypt') ||
    lowerText.includes('entryid') ||
    lowerText.includes('entry id') ||
    lowerText.includes('rpc') ||
    lowerText.includes('supabase') ||
    lowerText.includes('error:') ||
    lowerText.includes('exception:') ||
    lowerText.includes('at src') ||
    lowerText.includes('stack trace') ||
    trimmed.startsWith('{') ||
    trimmed.includes('"metadata"') ||
    trimmed.includes('"note":') ||
    (trimmed.includes(' at ') && (trimmed.includes('.ts') || trimmed.includes('.js'))) ||
    (trimmed.includes('{') && trimmed.includes('}'))
  ) {
    return undefined;
  }
  
  return trimmed;
}

/**
 * Format distribution label to human-readable
 */
function formatDistributionLabel(
  windowDistribution: WindowDistribution | null | undefined
): 'Normal' | 'Log Normal' | 'Power Law' | undefined {
  if (!windowDistribution) return undefined;
  
  const classification = windowDistribution.classification;
  if (classification === 'normal') return 'Normal';
  if (classification === 'lognormal') return 'Log Normal';
  if (classification === 'powerlaw') return 'Power Law';
  
  return undefined;
}

/**
 * Build year shape summary string
 */
function buildYearShapeSummary(
  yearShape: { dailyCounts: number[]; topSpikeDates: string[] } | undefined
): string | undefined {
  if (!yearShape) return undefined;
  
  const weekCount = Math.ceil(yearShape.dailyCounts.length / 7);
  const spikeCount = yearShape.topSpikeDates.length;
  
  return `${weekCount} weeks of activity, ${spikeCount} spike ${spikeCount === 1 ? 'day' : 'days'}`;
}

/**
 * Build SharePack from input
 * 
 * Pure function - deterministic and side effect free.
 * Only includes fields that are selected and safe.
 */
export function buildSharePack(input: SharePackInput): SharePack {
  const { year, selection, platform, identitySentence, archetype, yearShape, moments, numbers, mirrorInsight, entries, distributionResult, windowDistribution } = input;
  
  // Base SharePack
  const sharePack: SharePack = {
    year,
    platform,
    attribution: 'Computed locally. Nothing uploaded.',
  };
  
  // Include sentence if selected and safe
  if (selection.yearSentence && identitySentence) {
    const cleaned = cleanForShare(identitySentence);
    if (cleaned && !isProbablySystemOrErrorText(cleaned)) {
      sharePack.sentence = cleaned;
    }
  }
  
  // Include archetype if selected and safe
  if (selection.archetype && archetype) {
    const sanitized = sanitizeText(archetype);
    if (sanitized) {
      sharePack.archetype = sanitized;
    }
  }
  
  // Include year shape if selected
  if (selection.yearShape && yearShape) {
    const summary = buildYearShapeSummary(yearShape);
    if (summary) {
      sharePack.yearShape = {
        summary,
        weekCount: Math.ceil(yearShape.dailyCounts.length / 7),
        spikeCount: yearShape.topSpikeDates.length,
        topSpikeDates: yearShape.topSpikeDates,
      };
    }
  }
  
  // Include numbers if selected
  if (selection.threeNumbers && numbers) {
    sharePack.numbers = {
      totalEntries: numbers.totalEntries,
      activeDays: numbers.activeDays,
      spikeRatio: numbers.spikeRatio,
    };
  }
  
  // Include top moments if selected (computed safely from entries)
  if (selection.topMoments && entries && entries.length > 0 && distributionResult) {
    const topSpikeDates = getTopSpikeDates(distributionResult, 3);
    const pickedMoments = pickTopMomentsForShare(entries, topSpikeDates, 3);
    
    if (pickedMoments.length > 0) {
      sharePack.topMoments = pickedMoments.map(moment => ({
        date: moment.date,
        shortTitle: moment.preview, // Already sanitized by pickTopMomentsForShare
        reflectionId: moment.entryId,
      }));
    }
  }
  
  // Include mirror insight if selected and safe
  if (selection.wholesomeMirror && mirrorInsight) {
    const cleaned = cleanForShare(mirrorInsight);
    if (cleaned && !isProbablySystemOrErrorText(cleaned)) {
      sharePack.mirrorInsight = cleaned;
    } else {
      // Fallback if filtered out
      sharePack.mirrorInsight = 'A quiet year can still be a powerful one. Your reflection is building underneath the surface.';
    }
  }
  
  // Include distribution label if available
  const distributionLabel = formatDistributionLabel(windowDistribution);
  if (distributionLabel) {
    sharePack.distributionLabel = distributionLabel;
  }
  
  return sharePack;
}


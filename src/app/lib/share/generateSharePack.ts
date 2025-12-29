import type { YearlyWrap } from '@/app/lib/wrap/yearlyWrap';
import type { SharePack, Moment } from './sharePack';

/**
 * Normalize text for deterministic hashing
 * Trims whitespace and normalizes spacing
 */
function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Simple deterministic hash function
 * @param str String to hash
 * @returns Hash value as hex string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string (8 chars)
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate deterministic ID from year, wallet, and summary
 * @param year Year number
 * @param walletAddress Wallet address (for uniqueness, not included in content)
 * @param summary Normalized summary text
 * @returns Deterministic ID string
 */
function generateId(year: number, walletAddress: string, summary: string): string {
  const normalized = normalizeText(summary);
  const hash = simpleHash(`${year}:${walletAddress.toLowerCase()}:${normalized}`);
  return `sharepack-${year}-${hash}`;
}

/**
 * Generate checksum from full content payload
 * Ensures content integrity
 * @param pack SharePack object (without checksum)
 * @returns Checksum string
 */
function generateChecksum(pack: Omit<SharePack, 'checksum' | 'id' | 'createdAt'>): string {
  // Create deterministic string representation
  const content = JSON.stringify({
    scope: pack.scope,
    title: normalizeText(pack.title),
    summary: normalizeText(pack.summary),
    moments: pack.moments.map(m => ({
      headline: normalizeText(m.headline),
      summary: normalizeText(m.summary),
      confidence: m.confidence,
    })).sort((a, b) => a.headline.localeCompare(b.headline)),
    shifts: pack.shifts.map(s => ({
      scope: s.scope,
      direction: s.direction,
      headline: normalizeText(s.headline),
      summary: normalizeText(s.summary),
    })).sort((a, b) => a.headline.localeCompare(b.headline)),
    density: pack.density,
    cadence: pack.cadence,
    confidence: pack.confidence,
  });
  
  return simpleHash(content);
}

/**
 * Convert InsightCard to Moment
 * Pure function, no side effects
 */
function insightToMoment(insight: { headline: string; summary: string; confidence: 'high' | 'medium' | 'low' }): Moment {
  return {
    headline: normalizeText(insight.headline),
    summary: normalizeText(insight.summary),
    confidence: insight.confidence,
  };
}

/**
 * Generate SharePack from YearlyWrap
 * Pure function, deterministic, no side effects
 * @param wrap YearlyWrap object
 * @param year Year number
 * @param walletAddress Wallet address (for ID generation only, not included in content)
 * @returns SharePack object with deterministic ID and checksum
 */
export function generateSharePack(
  wrap: YearlyWrap,
  year: number,
  walletAddress: string
): SharePack {
  // Normalize all text fields
  const title = normalizeText(wrap.headline);
  const summary = normalizeText(wrap.summary);
  
  // Convert key moments to Moment format
  const moments: Moment[] = wrap.keyMoments.map(insightToMoment);
  
  // Convert shifts to NarrativeDelta format (already compatible)
  const shifts = wrap.shifts.map(shift => ({
    scope: shift.scope as 'year',
    direction: shift.direction,
    headline: normalizeText(shift.headline),
    summary: normalizeText(shift.summary),
  }));
  
  // Determine overall confidence from moments
  const confidenceOrder: Record<'high' | 'medium' | 'low', number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  const overallConfidence = moments.length > 0
    ? moments.reduce((best, m) => 
        confidenceOrder[m.confidence] < confidenceOrder[best] ? m.confidence : best,
        moments[0].confidence as 'high' | 'medium' | 'low'
      )
    : 'low';
  
  // Build pack without checksum
  const packWithoutChecksum: Omit<SharePack, 'checksum' | 'id' | 'createdAt'> = {
    scope: 'year',
    title,
    summary,
    moments,
    shifts,
    density: wrap.densityLabel || '',
    cadence: wrap.cadenceLabel || '',
    confidence: overallConfidence,
  };
  
  // Generate checksum
  const checksum = generateChecksum(packWithoutChecksum);
  
  // Generate ID
  const id = generateId(year, walletAddress, summary);
  
  // Get current timestamp
  const createdAt = Date.now();
  
  return {
    id,
    createdAt,
    ...packWithoutChecksum,
    checksum,
  };
}


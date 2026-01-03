'use client';

/**
 * renderSharePack - Single canonical renderer for Share Pack
 * 
 * This is the single source of truth for both preview and export rendering.
 * No data fetching, no side effects - pure rendering only.
 */

import React from 'react';
import type { SharePack as ContractSharePack } from '../../lib/share/sharePackContract';
import type { SharePack as LegacySharePack } from '../../insights/yearly/share/sharePack';

export type ShareFrame = "ig_square" | "ig_story" | "linkedin";

/**
 * Frame dimension presets
 */
const FRAME_PRESETS: Record<ShareFrame, { width: number; height: number }> = {
  ig_square: { width: 1080, height: 1080 },
  ig_story: { width: 1080, height: 1920 },
  linkedin: { width: 1200, height: 628 },
};

/**
 * Convert legacy SharePack to contract SharePack
 * Adapter function to bridge between existing SharePack and contract SharePack
 */
function adaptToContractPack(legacyPack: LegacySharePack, distributionHint?: "normal" | "log-normal" | "power-law" | null): ContractSharePack {
  // Convert topMoments to moments format
  const moments = legacyPack.topMoments?.map((moment, index) => ({
    id: moment.reflectionId || `moment-${legacyPack.year}-${index}`,
    title: moment.shortTitle,
    date: moment.date,
  })) || [];

  // Compute spikeDays from yearShape.dailyCounts if available
  // Spike days are days with ≥3 entries AND ≥2× median daily activity
  let spikeDays = 0;
  if (legacyPack.yearShape?.dailyCounts && legacyPack.yearShape.dailyCounts.length > 0) {
    const dailyCounts = legacyPack.yearShape.dailyCounts;
    const nonZeroCounts = dailyCounts.filter(c => c > 0);
    if (nonZeroCounts.length > 0) {
      const sortedNonZero = [...nonZeroCounts].sort((a, b) => a - b);
      const median = sortedNonZero.length % 2 === 0
        ? (sortedNonZero[sortedNonZero.length / 2 - 1] + sortedNonZero[sortedNonZero.length / 2]) / 2
        : sortedNonZero[Math.floor(sortedNonZero.length / 2)];
      
      const effectiveMedian = median > 0 ? median : 1;
      const spikeThreshold = Math.max(3, effectiveMedian * 2);
      
      spikeDays = dailyCounts.filter(count => 
        count >= spikeThreshold && count >= 3
      ).length;
    }
  }

  // ConcentrationRatio - compute from yearShape if available
  // Top 10% of days share of total entries
  let concentrationRatio = 0.5; // Default placeholder
  if (legacyPack.yearShape?.dailyCounts && legacyPack.yearShape.dailyCounts.length > 0) {
    const dailyCounts = legacyPack.yearShape.dailyCounts;
    const total = dailyCounts.reduce((sum, count) => sum + count, 0);
    if (total > 0) {
      const sorted = [...dailyCounts].sort((a, b) => b - a);
      const top10PercentCount = Math.max(1, Math.ceil(dailyCounts.length * 0.1));
      const top10PercentTotal = sorted.slice(0, top10PercentCount).reduce((sum, count) => sum + count, 0);
      concentrationRatio = top10PercentTotal / total;
    }
  }

  return {
    year: legacyPack.year,
    sentence: legacyPack.sentence || '',
    archetype: legacyPack.archetype || null,
    distributionHint: distributionHint || null,
    moments,
    numbers: legacyPack.numbers ? {
      totalEntries: legacyPack.numbers.totalEntries,
      activeDays: legacyPack.numbers.activeDays,
      spikeDays,
      concentrationRatio,
    } : {
      totalEntries: 0,
      activeDays: 0,
      spikeDays: 0,
      concentrationRatio: 0,
    },
    mirrorInsight: legacyPack.mirrorInsight || null,
    generatedAt: new Date().toISOString(),
    version: "v1",
  };
}

/**
 * Render a SharePack as a React element
 * 
 * Pure function - no side effects, no data fetching.
 * Takes only SharePack and frame, returns JSX.
 * 
 * @param pack - The SharePack to render (contract or legacy format)
 * @param frame - The frame type (ig_square, ig_story, linkedin)
 * @returns JSX.Element representing the share card
 */
export function renderSharePack(
  pack: ContractSharePack | LegacySharePack, 
  frame: ShareFrame
) {
  // Convert legacy pack to contract pack if needed
  const contractPack: ContractSharePack = 'platform' in pack 
    ? adaptToContractPack(pack as LegacySharePack, pack.distributionLabel === 'Normal' ? 'normal' : pack.distributionLabel === 'Log Normal' ? 'log-normal' : pack.distributionLabel === 'Power Law' ? 'power-law' : null)
    : pack as ContractSharePack;
  const dimensions = FRAME_PRESETS[frame];
  
  // Typography styles - fixed, no responsive behavior
  const typography = {
    brandTitle: {
      fontSize: '48px',
      fontWeight: '600',
      lineHeight: '1.2',
      letterSpacing: '-0.02em',
      whiteSpace: 'nowrap' as const,
    },
    brandSubtitle: {
      fontSize: '32px',
      fontWeight: '400',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.7)',
      letterSpacing: '-0.01em',
      whiteSpace: 'nowrap' as const,
    },
    year: {
      fontSize: '72px',
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.03em',
      whiteSpace: 'nowrap' as const,
    },
    sentence: {
      fontSize: '36px',
      fontWeight: '500',
      lineHeight: '1.3',
      letterSpacing: '-0.01em',
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    },
    archetype: {
      fontSize: '28px',
      fontWeight: '600',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.9)',
      letterSpacing: '-0.01em',
    },
    metricLabel: {
      fontSize: '20px',
      fontWeight: '400',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.6)',
      letterSpacing: '0',
    },
    metricValue: {
      fontSize: '56px',
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.02em',
    },
    momentTitle: {
      fontSize: '20px',
      lineHeight: '1.4',
      color: 'rgba(255, 255, 255, 0.8)',
    },
    mirrorInsight: {
      fontSize: '24px',
      lineHeight: '1.4',
      color: 'rgba(255, 255, 255, 0.85)',
      fontStyle: 'italic' as const,
    },
    footer: {
      fontSize: '18px',
      fontWeight: '400',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.4)',
    },
  };

  // Spacing - fixed vertical rhythm
  const spacing = {
    padding: '80px',
    sectionGap: '40px',
    identityGap: '30px',
    archetypeGap: '40px',
    metricGap: '24px',
    metricLabelGap: '8px',
    footerTop: '40px',
  };

  // Base card style - fixed dimensions, black background
  const cardStyle: React.CSSProperties = {
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
    backgroundColor: '#000000',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: spacing.padding,
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    position: 'relative',
    overflow: 'hidden',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ marginBottom: spacing.sectionGap }}>
        <div style={{ ...typography.brandTitle, marginBottom: '8px' }}>
          Story of Emergence
        </div>
        <div style={{ ...typography.brandSubtitle, marginBottom: '24px' }}>
          Yearly Wrap
        </div>
        <div style={typography.year}>
          {contractPack.year}
        </div>
      </div>

      {/* Sentence */}
      {contractPack.sentence && (
        <div style={{ ...typography.sentence, marginBottom: spacing.identityGap }}>
          {contractPack.sentence}
        </div>
      )}

      {/* Archetype */}
      {contractPack.archetype && (
        <div style={{ ...typography.archetype, marginBottom: spacing.archetypeGap }}>
          {contractPack.archetype}
        </div>
      )}

      {/* Distribution Hint */}
      {contractPack.distributionHint && (
        <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
          Distribution: {contractPack.distributionHint}
        </div>
      )}

      {/* Numbers */}
      {contractPack.numbers && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: spacing.metricGap, 
          justifyContent: 'center' 
        }}>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Total Entries
            </div>
            <div style={typography.metricValue}>
              {contractPack.numbers.totalEntries}
            </div>
          </div>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Active Days
            </div>
            <div style={typography.metricValue}>
              {contractPack.numbers.activeDays}
            </div>
          </div>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Spike Days
            </div>
            <div style={typography.metricValue}>
              {contractPack.numbers.spikeDays}
            </div>
          </div>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Concentration Ratio
            </div>
            <div style={typography.metricValue}>
              {contractPack.numbers.concentrationRatio.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Moments */}
      {contractPack.moments && contractPack.moments.length > 0 && (
        <div style={{ marginBottom: spacing.sectionGap }}>
          <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
            Key Moments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {contractPack.moments.slice(0, 3).map((moment) => (
              <div key={moment.id}>
                <div style={typography.momentTitle}>
                  {moment.title}
                </div>
                <div style={{ ...typography.metricLabel, fontSize: '16px', marginTop: '4px' }}>
                  {new Date(moment.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mirror Insight */}
      {contractPack.mirrorInsight && (
        <div style={{ marginBottom: spacing.sectionGap, ...typography.mirrorInsight }}>
          {contractPack.mirrorInsight}
        </div>
      )}

      {/* Footer with watermark */}
      <div style={{ marginTop: 'auto', paddingTop: spacing.footerTop }}>
        <div style={{ ...typography.footer, marginBottom: '8px' }}>
          Computed locally. Nothing uploaded.
        </div>
        <div style={{ ...typography.footer, fontSize: '14px', color: 'rgba(255, 255, 255, 0.25)' }}>
          Private reflection · Shared intentionally
        </div>
      </div>
    </div>
  );
}


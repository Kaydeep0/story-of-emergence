// src/app/lib/share/renderSharePack.tsx
// Canonical SharePack Renderer - Single Source of Truth for Preview and Export
// Phase 3.2: Preview equals export - one renderer used by both

import React from 'react';
import type { SharePack } from './sharePack';

/**
 * Frame type for SharePack rendering
 */
export type SharePackFrame = 'square' | 'story' | 'landscape';

/**
 * Frame dimension presets
 */
const FRAME_PRESETS: Record<SharePackFrame, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  landscape: { width: 1200, height: 628 },
};

/**
 * Render a SharePack as a React element
 * 
 * This is the SINGLE SOURCE OF TRUTH for SharePack rendering.
 * Used by both preview UI and PNG export.
 * 
 * Rules:
 * - No data shaping inside renderer
 * - Renderer consumes SharePack only
 * - No calls to insight engine
 * - No network calls
 * - No platform detection
 * - Pure rendering function
 * 
 * @param pack - The SharePack to render (canonical contract)
 * @param opts - Rendering options
 * @param opts.frame - Frame type (square, story, landscape)
 * @returns JSX.Element representing the share card
 */
export function renderSharePack(
  pack: SharePack,
  opts: { frame: SharePackFrame }
): JSX.Element {
  const { frame } = opts;
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
    distributionLabel: {
      fontSize: '20px',
      fontWeight: '400',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.6)',
      letterSpacing: '0',
      textTransform: 'capitalize' as const,
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
    momentDate: {
      fontSize: '16px',
      lineHeight: '1.4',
      color: 'rgba(255, 255, 255, 0.5)',
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

  // Format distribution label for display
  const formatDistributionLabel = (label: SharePack['distributionLabel']): string => {
    if (label === 'lognormal') return 'Log Normal';
    if (label === 'powerlaw') return 'Power Law';
    if (label === 'mixed') return 'Mixed';
    if (label === 'none') return 'None';
    return 'Normal';
  };

  // Format date for display
  const formatDate = (isoDate: string): string => {
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return isoDate;
    }
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
          {pack.year}
        </div>
      </div>

      {/* One Sentence Summary */}
      {pack.oneSentenceSummary && (
        <div style={{ ...typography.sentence, marginBottom: spacing.identityGap }}>
          {pack.oneSentenceSummary}
        </div>
      )}

      {/* Archetype */}
      {pack.archetype && (
        <div style={{ ...typography.archetype, marginBottom: spacing.archetypeGap }}>
          {pack.archetype}
        </div>
      )}

      {/* Distribution Label */}
      {pack.distributionLabel !== 'none' && (
        <div style={{ ...typography.distributionLabel, marginBottom: spacing.metricLabelGap }}>
          Distribution: {formatDistributionLabel(pack.distributionLabel)}
        </div>
      )}

      {/* Key Numbers */}
      {pack.keyNumbers && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: spacing.metricGap, 
          justifyContent: 'center' 
        }}>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Frequency
            </div>
            <div style={typography.metricValue}>
              {pack.keyNumbers.frequency}
            </div>
          </div>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Spike Count
            </div>
            <div style={typography.metricValue}>
              {pack.keyNumbers.spikeCount}
            </div>
          </div>
          <div>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Concentration
            </div>
            <div style={typography.metricValue}>
              {(pack.keyNumbers.concentration * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Top Moments */}
      {pack.topMoments && pack.topMoments.length > 0 && (
        <div style={{ marginBottom: spacing.sectionGap }}>
          <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
            Key Moments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pack.topMoments.map((moment) => (
              <div key={moment.id}>
                <div style={typography.momentDate}>
                  {formatDate(moment.date)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mirror Insight */}
      {pack.mirrorInsight && (
        <div style={{ marginBottom: spacing.sectionGap, ...typography.mirrorInsight }}>
          {pack.mirrorInsight}
        </div>
      )}

      {/* Footer with privacy label */}
      <div style={{ marginTop: 'auto', paddingTop: spacing.footerTop }}>
        <div style={{ ...typography.footer, marginBottom: '8px' }}>
          {pack.privacyLabel}
        </div>
        <div style={{ ...typography.footer, fontSize: '14px', color: 'rgba(255, 255, 255, 0.25)' }}>
          Generated: {new Date(pack.generatedAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}


// src/app/lib/share/SharePackRenderer.tsx
// Universal SharePack Renderer - Single Source of Truth
// Used for: Preview blocks, PNG export, Received share viewer

'use client';

import React from 'react';
import type { SharePack } from './sharePack';

export type SharePackRenderMode = 'preview' | 'png' | 'viewer';

export interface SharePackRendererProps {
  sharePack: SharePack;
  mode?: SharePackRenderMode;
  className?: string;
  /** For PNG mode: fixed dimensions */
  frame?: 'square' | 'story' | 'landscape';
}

/**
 * Format distribution label for display
 */
function formatDistributionLabel(label: SharePack['distributionLabel']): string {
  if (label === 'lognormal') return 'Log Normal';
  if (label === 'powerlaw') return 'Power Law';
  if (label === 'mixed') return 'Mixed';
  if (label === 'none') return 'None';
  return 'Normal';
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return isoDate;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

/**
 * Format short date (no year)
 */
function formatShortDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return '';
  }
}

/**
 * Get lens display label
 */
function getLensLabel(lens: SharePack['lens']): string {
  const labels: Record<SharePack['lens'], string> = {
    weekly: 'Weekly Reflection',
    summary: 'Summary',
    timeline: 'Timeline',
    yearly: 'Yearly Reflection',
    distributions: 'Distributions',
    yoy: 'Year over Year',
    lifetime: 'Lifetime Reflection',
  };
  return labels[lens] || 'Reflection';
}

/**
 * Format period display
 */
function formatPeriod(sharePack: SharePack): string {
  if (sharePack.year) {
    return `${sharePack.year}`;
  } else if (sharePack.periodStart && sharePack.periodEnd) {
    const start = formatShortDate(sharePack.periodStart);
    const end = formatShortDate(sharePack.periodEnd);
    if (start && end && start !== end) {
      return `${start} – ${end}`;
    } else if (start) {
      return start;
    }
  }
  return '';
}

/**
 * Universal SharePack Renderer
 * 
 * Single source of truth for rendering SharePack in all contexts:
 * - Preview blocks (responsive, Tailwind)
 * - PNG export (fixed dimensions, inline styles)
 * - Received share viewer (consistent layout)
 * 
 * Rules:
 * - No lens-specific logic
 * - Pure rendering component
 * - Adapts to mode (preview/png/viewer)
 */
export function SharePackRenderer({ 
  sharePack, 
  mode = 'preview',
  className = '',
  frame = 'square'
}: SharePackRendererProps) {
  const lensLabel = getLensLabel(sharePack.lens);
  const periodDisplay = formatPeriod(sharePack);

  // PNG mode: Fixed dimensions with inline styles
  if (mode === 'png') {
    const FRAME_PRESETS: Record<string, { width: number; height: number }> = {
      square: { width: 1080, height: 1080 },
      story: { width: 1080, height: 1920 },
      landscape: { width: 1200, height: 628 },
    };
    
    const dimensions = FRAME_PRESETS[frame] || FRAME_PRESETS.square;
    
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

    const spacing = {
      padding: '80px',
      sectionGap: '40px',
      identityGap: '30px',
      archetypeGap: '40px',
      metricGap: '24px',
      metricLabelGap: '8px',
      footerTop: '40px',
    };

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
      <div style={cardStyle} data-share-pack-root="true" className={className}>
        {/* Header */}
        <div style={{ marginBottom: spacing.sectionGap }}>
          <div style={{ ...typography.brandTitle, marginBottom: '8px' }}>
            Story of Emergence
          </div>
          <div style={{ ...typography.brandSubtitle, marginBottom: '24px' }}>
            {lensLabel}
            {periodDisplay && ` · ${periodDisplay}`}
          </div>
          {sharePack.year && (
            <div style={typography.year}>
              {sharePack.year}
            </div>
          )}
        </div>

        {/* One Sentence Summary */}
        {sharePack.oneSentenceSummary && (
          <div style={{ ...typography.sentence, marginBottom: spacing.identityGap }}>
            {sharePack.oneSentenceSummary}
          </div>
        )}

        {/* Archetype */}
        {sharePack.archetype && (
          <div style={{ ...typography.archetype, marginBottom: spacing.archetypeGap }}>
            {sharePack.archetype}
          </div>
        )}

        {/* Distribution Label */}
        {sharePack.distributionLabel !== 'none' && (
          <div style={{ ...typography.distributionLabel, marginBottom: spacing.metricLabelGap }}>
            Distribution: {formatDistributionLabel(sharePack.distributionLabel)}
          </div>
        )}

        {/* Key Numbers */}
        {sharePack.keyNumbers && (
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
                {sharePack.keyNumbers.frequency}
              </div>
            </div>
            {sharePack.keyNumbers.activeDays !== undefined && (
              <div>
                <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                  Active Days
                </div>
                <div style={typography.metricValue}>
                  {sharePack.keyNumbers.activeDays}
                </div>
              </div>
            )}
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Spike Count
              </div>
              <div style={typography.metricValue}>
                {sharePack.keyNumbers.spikeCount}
              </div>
            </div>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Concentration
              </div>
              <div style={typography.metricValue}>
                {(sharePack.keyNumbers.concentration * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Top Moments */}
        {sharePack.topMoments && sharePack.topMoments.length > 0 && (
          <div style={{ marginBottom: spacing.sectionGap }}>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Key Moments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {sharePack.topMoments.slice(0, 3).map((moment) => (
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
        {sharePack.mirrorInsight && (
          <div style={{ marginBottom: spacing.sectionGap, ...typography.mirrorInsight }}>
            {sharePack.mirrorInsight}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: spacing.footerTop }}>
          <div style={{ ...typography.footer, marginBottom: '8px' }}>
            {sharePack.privacyLabel}
          </div>
          <div style={{ ...typography.footer, fontSize: '14px', color: 'rgba(255, 255, 255, 0.25)' }}>
            Generated: {new Date(sharePack.generatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  }

  // Preview/Viewer mode: Responsive with Tailwind classes
  return (
    <div 
      className={`bg-black text-white rounded-2xl border border-white/10 ${className}`}
      data-share-pack-root="true"
    >
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            Story of Emergence — {lensLabel}
            {periodDisplay && <span className="text-white/60 ml-2">· {periodDisplay}</span>}
          </h2>
          {sharePack.year && (
            <div className="text-3xl sm:text-4xl font-bold mt-2">
              {sharePack.year}
            </div>
          )}
        </div>

        {/* One Sentence Summary */}
        {sharePack.oneSentenceSummary && (
          <div className="mb-6">
            <p className="text-base sm:text-lg text-white/90 leading-relaxed">
              {sharePack.oneSentenceSummary}
            </p>
          </div>
        )}

        {/* Archetype */}
        {sharePack.archetype && (
          <div className="mb-6">
            <p className="text-base text-white/80 italic">
              {sharePack.archetype}
            </p>
          </div>
        )}

        {/* Distribution Label */}
        {sharePack.distributionLabel !== 'none' && (
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-2">Distribution Pattern</div>
            <div className="text-base text-white/80 capitalize">
              {formatDistributionLabel(sharePack.distributionLabel)}
              {sharePack.keyNumbers.concentration > 0 && (
                <span className="text-white/60 ml-2">
                  ({Math.round(sharePack.keyNumbers.concentration * 100)}% concentration)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Key Numbers */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs sm:text-sm text-white/60 mb-1">Reflections</div>
            <div className="text-xl sm:text-2xl font-semibold">{sharePack.keyNumbers.frequency}</div>
          </div>
          {sharePack.keyNumbers.activeDays !== undefined && (
            <div>
              <div className="text-xs sm:text-sm text-white/60 mb-1">Active Days</div>
              <div className="text-xl sm:text-2xl font-semibold">{sharePack.keyNumbers.activeDays}</div>
            </div>
          )}
          <div>
            <div className="text-xs sm:text-sm text-white/60 mb-1">Spike Days</div>
            <div className="text-xl sm:text-2xl font-semibold">{sharePack.keyNumbers.spikeCount}</div>
          </div>
          <div>
            <div className="text-xs sm:text-sm text-white/60 mb-1">Concentration</div>
            <div className="text-xl sm:text-2xl font-semibold">
              {Math.round(sharePack.keyNumbers.concentration * 100)}%
            </div>
          </div>
        </div>

        {/* Top Moments */}
        {sharePack.topMoments && sharePack.topMoments.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-white/60 mb-2">Key Moments</div>
            <div className="space-y-2">
              {sharePack.topMoments.slice(0, 3).map((moment) => (
                <div key={moment.id} className="text-sm text-white/70">
                  {formatDate(moment.date)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mirror Insight */}
        {sharePack.mirrorInsight && (
          <div className="mb-6 pt-6 border-t border-white/10">
            <p className="text-base text-white/80 italic leading-relaxed">
              {sharePack.mirrorInsight}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-white/10 text-xs sm:text-sm text-white/50 text-center">
          {sharePack.privacyLabel}
          <div className="mt-1 text-white/40">
            Generated: {new Date(sharePack.generatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}


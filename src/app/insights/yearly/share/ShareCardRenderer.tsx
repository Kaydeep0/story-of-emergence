'use client';

/**
 * ShareCardRenderer - Unified renderer for preview and export
 * 
 * This is the single source of truth for share card rendering.
 * Both preview and export use this component, ensuring they never diverge.
 */

import React, { forwardRef } from 'react';
import type { SharePack } from './sharePack';

export type ShareCardFrame = 'square' | 'portrait' | 'landscape';

export interface ShareCardRendererProps {
  pack: SharePack;
  frame?: ShareCardFrame;
  className?: string;
  id?: string;
}

/**
 * Get dimensions for a frame type
 */
function getFrameDimensions(frame: ShareCardFrame): { width: number; height: number } {
  switch (frame) {
    case 'square':
      return { width: 1080, height: 1080 };
    case 'portrait':
      return { width: 1080, height: 1350 };
    case 'landscape':
      return { width: 1200, height: 1200 }; // LinkedIn square format
    default:
      return { width: 1080, height: 1080 };
  }
}

/**
 * Map SharePackPlatform to frame type
 */
export function getFrameForPlatform(platform: SharePack['platform']): ShareCardFrame {
  switch (platform) {
    case 'instagram':
      return 'square'; // Instagram post
    case 'x':
      return 'square';
    case 'threads':
      return 'square';
    case 'tiktok':
      return 'portrait';
    case 'linkedin':
      return 'landscape';
    default:
      return 'square';
  }
}

export const ShareCardRenderer = forwardRef<HTMLDivElement, ShareCardRendererProps>(
  function ShareCardRenderer(
    {
      pack,
      frame,
      className,
      id,
    },
    ref
  ) {
    // Determine frame from platform if not provided
    const cardFrame = frame || getFrameForPlatform(pack.platform);
    const dimensions = getFrameDimensions(cardFrame);
    
    // Typography lock: Fixed font sizes, weights, line heights
    // These never change regardless of viewport or platform
    // No responsive resizing - card is a fixed artifact
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
      identitySentence: { 
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
        whiteSpace: 'nowrap' as const,
      },
      metricLabel: { 
        fontSize: '20px', 
        fontWeight: '400', 
        lineHeight: '1.2', 
        color: 'rgba(255, 255, 255, 0.6)',
        letterSpacing: '0',
        whiteSpace: 'nowrap' as const,
      },
      metricValue: { 
        fontSize: '56px', 
        fontWeight: '700', 
        lineHeight: '1',
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap' as const,
      },
      momentText: {
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
        letterSpacing: '0',
        whiteSpace: 'nowrap' as const,
      },
    };
    
    // Spacing lock: Fixed padding and gaps
    // Consistent vertical rhythm regardless of content presence
    const spacing = {
      padding: '80px',
      sectionGap: '40px',
      identityGap: '30px',
      archetypeGap: '40px',
      yearShapeHeight: '120px',
      yearShapeGap: '40px',
      metricGap: '24px',
      metricLabelGap: '8px',
      footerTop: '40px',
    };

    // Base card style - identical for preview and export
    // Fixed frame: no viewport dependencies, no responsive behavior
    // High contrast: pure black background, white text
    const baseCardStyle: React.CSSProperties = {
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
      border: 'none',
      outline: 'none',
    };

    return (
      <div
        id={id}
        ref={ref}
        className={className}
        style={baseCardStyle}
      >
        {/* Header - Story of Emergence */}
        <div style={{ marginBottom: spacing.sectionGap }}>
          <div style={{ ...typography.brandTitle, marginBottom: '8px' }}>
            Story of Emergence
          </div>
          <div style={{ ...typography.brandSubtitle, marginBottom: '24px' }}>
            Yearly Wrap
          </div>
          <div style={{ ...typography.year }}>
            {pack.year}
          </div>
        </div>

        {/* Year sentence */}
        {pack.sentence && (
          <div style={{ ...typography.identitySentence, marginBottom: spacing.identityGap }}>
            {pack.sentence}
          </div>
        )}

        {/* Archetype */}
        {pack.archetype && (
          <div style={{ ...typography.archetype, marginBottom: spacing.archetypeGap }}>
            {pack.archetype}
          </div>
        )}

        {/* Year shape */}
        {pack.yearShape && pack.yearShape.dailyCounts && pack.yearShape.dailyCounts.length > 0 && (() => {
          const yearShape = pack.yearShape!; // Safe to assert here due to check above
          return (
            <div style={{ marginBottom: spacing.yearShapeGap, height: spacing.yearShapeHeight, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'end', gap: '2px', height: '100%' }}>
                {yearShape.dailyCounts.slice(0, 52).map((count, idx) => {
                  const maxCount = Math.max(...yearShape.dailyCounts, 1);
                  const height = (count / maxCount) * 100;
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        minWidth: '2px',
                        height: `${Math.max(height, 2)}%`,
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '2px 2px 0 0',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Numbers */}
        {pack.numbers && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.metricGap, justifyContent: 'center' }}>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Total Entries
              </div>
              <div style={typography.metricValue}>
                {pack.numbers.totalEntries}
              </div>
            </div>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Active Days
              </div>
              <div style={typography.metricValue}>
                {pack.numbers.activeDays}
              </div>
            </div>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Spike Ratio
              </div>
              <div style={typography.metricValue}>
                {pack.numbers.spikeRatio.toFixed(1)}x
              </div>
            </div>
          </div>
        )}

        {/* Top moments */}
        {pack.topMoments && pack.topMoments.length > 0 ? (
          <div style={{ marginBottom: spacing.sectionGap }}>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Top Moments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {pack.topMoments.slice(0, 3).map((moment, idx) => (
                <div key={idx}>
                  <div style={{ ...typography.momentText }}>
                    {moment.shortTitle}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Mirror insight */}
        {pack.mirrorInsight && (
          <div style={{ marginBottom: spacing.sectionGap, ...typography.mirrorInsight }}>
            {pack.mirrorInsight}
          </div>
        )}

        {/* Footer - Attribution */}
        <div style={{ marginTop: 'auto', paddingTop: spacing.footerTop, ...typography.footer }}>
          {pack.attribution}
        </div>
      </div>
    );
  }
);


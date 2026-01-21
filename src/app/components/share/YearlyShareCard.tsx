/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical SharePackRenderer
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

'use client';

import React, { forwardRef } from 'react';
import { isProbablySystemOrErrorText, cleanForShare } from '../../lib/share/buildShareText';

export type ShareCardPlatform = 'instagram-portrait' | 'instagram-square' | 'linkedin-square' | 'tiktok';

export interface ShareCardDimensions {
  width: number;
  height: number;
}

// Single source of truth for platform dimensions
export const PLATFORM_DIMENSIONS: Record<ShareCardPlatform, ShareCardDimensions> = {
  'instagram-portrait': { width: 1080, height: 1350 },
  'instagram-square': { width: 1080, height: 1080 },
  'linkedin-square': { width: 1200, height: 1200 },
  'tiktok': { width: 1080, height: 1920 },
};

export interface YearlyShareCardProps {
  year: number;
  identitySentence?: string;
  archetype?: string;
  yearShape?: {
    dailyCounts: number[];
    topSpikeDates: string[];
  };
  moments?: Array<{ date: string; preview: string; context?: string }>;
  numbers?: {
    totalEntries: number;
    activeDays: number;
    spikeRatio: number;
  };
  mirrorInsight?: string;
  mode?: 'preview' | 'export';
  platform?: ShareCardPlatform;
  id?: string;
}

export const YearlyShareCard = forwardRef<HTMLDivElement, YearlyShareCardProps>(
  function YearlyShareCard(
    {
      year,
      identitySentence,
      archetype,
      yearShape,
      moments,
      numbers,
      mirrorInsight,
      mode = 'preview',
      platform = 'instagram-portrait',
      id,
    },
    ref
  ) {
    const isExport = mode === 'export';
    const dimensions = PLATFORM_DIMENSIONS[platform];
    
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
        // Allow wrapping but control it
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

    // Shared card content renderer - identical for preview and export
    // Content uses consistent spacing regardless of what's present
    // Flexbox handles vertical distribution naturally
    const renderCardContent = () => (
      <>
        {/* Header - Only "Story of Emergence" text, no logos */}
        <div style={{ marginBottom: spacing.sectionGap }}>
          <div style={{ ...typography.brandTitle, marginBottom: '8px' }}>
            Story of Emergence
          </div>
          <div style={{ ...typography.brandSubtitle, marginBottom: '24px' }}>
            Yearly Wrap
          </div>
          <div style={{ ...typography.year }}>
            {year}
          </div>
        </div>

        {/* Identity sentence */}
        {identitySentence && (
          <div style={{ ...typography.identitySentence, marginBottom: spacing.identityGap }}>
            {identitySentence}
          </div>
        )}

        {/* Archetype */}
        {archetype && (
          <div style={{ ...typography.archetype, marginBottom: spacing.archetypeGap }}>
            {archetype}
          </div>
        )}

        {/* Year shape */}
        {yearShape && (
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
        )}

        {/* Numbers - flex: 1 ensures it takes available space, centering content vertically */}
        {numbers && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: spacing.metricGap, justifyContent: 'center' }}>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Total Entries
              </div>
              <div style={typography.metricValue}>
                {numbers.totalEntries}
              </div>
            </div>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Active Days
              </div>
              <div style={typography.metricValue}>
                {numbers.activeDays}
              </div>
            </div>
            <div>
              <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
                Spike Ratio
              </div>
              <div style={typography.metricValue}>
                {numbers.spikeRatio.toFixed(1)}x
              </div>
            </div>
          </div>
        )}

        {/* Top moments */}
        {moments && moments.length > 0 ? (
          <div style={{ marginBottom: spacing.sectionGap }}>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Top Moments
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {moments.slice(0, 3).map((moment, idx) => {
                // Sanitize preview text
                const cleanedPreview = cleanForShare(moment.preview);
                const isSafe = cleanedPreview && !isProbablySystemOrErrorText(cleanedPreview);
                
                if (!isSafe) return null;
                
                return (
                  <div key={idx}>
                    <div style={{ fontSize: '20px', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.8)', marginBottom: moment.context ? '4px' : '0' }}>
                      {cleanedPreview}
                    </div>
                    {moment.context && (
                      <div style={{ fontSize: '16px', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                        {moment.context}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: spacing.sectionGap }}>
            <div style={{ ...typography.metricLabel, marginBottom: spacing.metricLabelGap }}>
              Top Moments
            </div>
            <div style={{ fontSize: '18px', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.7)', fontStyle: 'italic' }}>
              Moments will appear here. As you write, Story of Emergence will surface your highest activity days automatically. Keep going.
            </div>
          </div>
        )}

        {/* Mirror insight */}
        {mirrorInsight ? (() => {
          const cleaned = cleanForShare(mirrorInsight);
          const isSafe = cleaned && !isProbablySystemOrErrorText(cleaned);
          
          if (isSafe) {
            return (
              <div style={{ marginBottom: spacing.sectionGap, fontSize: '24px', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.85)', fontStyle: 'italic' }}>
                {cleaned}
              </div>
            );
          }
          
          // Fallback if mirror insight is filtered out
          return (
            <div style={{ marginBottom: spacing.sectionGap, fontSize: '24px', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.85)', fontStyle: 'italic' }}>
              A quiet year can still be a powerful one. Your reflection is building underneath the surface.
            </div>
          );
        })() : null}

        {/* Footer - Authority line only, no URLs or CTAs */}
        {/* marginTop: 'auto' pushes footer to bottom, creating intentional negative space above */}
        <div style={{ marginTop: 'auto', paddingTop: spacing.footerTop, ...typography.footer }}>
          Computed locally. Nothing uploaded.
        </div>
      </>
    );

    // Base card style - identical for preview and export
    // Fixed frame: no viewport dependencies, no responsive behavior
    // High contrast: pure black background, white text
    // No gradients, no borders that clip on PNG export
    const baseCardStyle: React.CSSProperties = {
      width: `${dimensions.width}px`,
      height: `${dimensions.height}px`,
      backgroundColor: '#000000', // Pure black - no gradients
      color: '#ffffff', // Pure white text - high contrast
      display: 'flex',
      flexDirection: 'column',
      padding: spacing.padding,
      boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden', // Prevent any content from clipping
      // Ensure crisp rendering
      WebkitFontSmoothing: 'antialiased',
      MozOsxFontSmoothing: 'grayscale',
      // No borders, no shadows that might clip
      border: 'none',
      outline: 'none',
    };

    if (isExport) {
      // Export mode: Fixed dimensions, no scaling
      return (
        <div
          id={id}
          ref={ref}
          style={baseCardStyle}
        >
          {renderCardContent()}
        </div>
      );
    }

    // Preview mode: Locked to exact export dimensions
    // Container will scale this visually via CSS transform, but dimensions remain fixed
    // This ensures typography never reflows between preview → export
    return (
      <div
        ref={ref}
        style={baseCardStyle}
      >
        {renderCardContent()}
      </div>
    );
  }
);


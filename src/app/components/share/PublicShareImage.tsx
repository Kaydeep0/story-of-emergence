// src/app/components/share/PublicShareImage.tsx
// Public Share Image Renderer - Static, shareable image from PublicSharePayload
// Read-only: no computation, no personalization, no interactivity

'use client';

import React from 'react';
import type { PublicSharePayload } from '../../lib/share/publicSharePayload';
import type { EmergenceMap } from '../../lib/philosophy/emergenceMap';
import { EmergenceMapViz } from '../philosophy/EmergenceMapViz';

/**
 * Public Share Image Component
 * 
 * Renders a static, shareable image using PublicSharePayload
 * without accessing MeaningCapsule directly.
 * 
 * Rules:
 * - UI component only
 * - Input is PublicSharePayload (not MeaningCapsule)
 * - No computation
 * - No personalization
 * - No timestamps
 * - No user context
 * - No interactivity
 * - No animation
 * - No optimization language
 * 
 * Rendering:
 * - Neutral, calm visual tone
 * - Philosophy-first layout
 * - EmergenceMapViz included if philosophical frame present
 * - Text reads as observational, not declarative
 * - Image stands alone when shared outside the app
 */
export interface PublicShareImageProps {
  /** Public Share Payload to render */
  payload: PublicSharePayload;
  
  /** Optional width (default: 1200 for social sharing) */
  width?: number;
  
  /** Optional height (default: 628 for social sharing) */
  height?: number;
}

/**
 * Create a minimal EmergenceMap from philosophical frame
 * Used only for rendering - does not compute new meaning
 */
function createEmergenceMapFromFrame(
  philosophicalFrame: PublicSharePayload['capsule']['philosophicalFrame']
): EmergenceMap {
  // Map regime to narrative label
  const regimeLabels: Record<EmergenceMap['regime'], string> = {
    deterministic: 'Steady rhythm',
    structured: 'Organized flow',
    emergent: 'Patterns emerging',
    chaotic: 'At the edge of emergence',
  };
  
  // Map regime to explanation
  const regimeExplanations: Record<EmergenceMap['regime'], string> = {
    deterministic: 'Patterns follow a predictable, consistent rhythm.',
    structured: 'Activity follows a structured pattern with natural variation.',
    emergent: 'Patterns are beginning to emerge from the flow.',
    chaotic: 'A few intense moments shape everything—patterns emerge unpredictably.',
  };
  
  return {
    position: philosophicalFrame.position,
    regime: philosophicalFrame.regime,
    distributionContext: 'none', // Not available in payload
    narrativeLabel: regimeLabels[philosophicalFrame.regime],
    explanation: regimeExplanations[philosophicalFrame.regime],
  };
}

/**
 * Format temporal context for display
 */
function formatTemporalContext(
  temporalContext: PublicSharePayload['capsule']['temporalContext']
): string {
  const labels: Record<PublicSharePayload['capsule']['temporalContext'], string> = {
    recent: 'Recent patterns',
    'over time': 'Patterns over time',
    recurring: 'Recurring patterns',
    emerging: 'Emerging patterns',
    persistent: 'Persistent patterns',
  };
  
  return labels[temporalContext];
}

/**
 * Format context hint for display
 */
function formatContextHint(
  contextHint: PublicSharePayload['contextHint']
): string {
  return contextHint === 'observational' ? 'An observation' : 'A reflection';
}

/**
 * Public Share Image Component
 * 
 * Renders a static image that can be shared publicly.
 * The image is self-contained and requires no explanation.
 */
export function PublicShareImage({ payload, width = 1200, height = 628 }: PublicShareImageProps) {
  const { capsule, contextHint, origin } = payload;
  
  // Create EmergenceMap from philosophical frame for visualization
  const emergenceMap = createEmergenceMapFromFrame(capsule.philosophicalFrame);
  
  // Typography styles - fixed, calm, neutral
  const typography = {
    brand: {
      fontSize: '32px',
      fontWeight: '400',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.6)',
      letterSpacing: '-0.01em',
    },
    insight: {
      fontSize: '36px',
      fontWeight: '500',
      lineHeight: '1.4',
      color: 'rgba(255, 255, 255, 0.9)',
      letterSpacing: '-0.01em',
      wordBreak: 'break-word' as const,
      overflowWrap: 'break-word' as const,
    },
    context: {
      fontSize: '18px',
      fontWeight: '400',
      lineHeight: '1.4',
      color: 'rgba(255, 255, 255, 0.5)',
      letterSpacing: '0',
    },
    footer: {
      fontSize: '14px',
      fontWeight: '400',
      lineHeight: '1.2',
      color: 'rgba(255, 255, 255, 0.3)',
    },
  };
  
  // Spacing
  const spacing = {
    padding: '60px',
    sectionGap: '40px',
    textGap: '24px',
  };
  
  // Base card style - fixed dimensions, black background
  const cardStyle: React.CSSProperties = {
    width: `${width}px`,
    height: `${height}px`,
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
      {/* Header - Brand */}
      <div style={{ marginBottom: spacing.sectionGap }}>
        <div style={typography.brand}>
          Story of Emergence
        </div>
      </div>
      
      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Insight sentence - primary content */}
        <div style={{ marginBottom: spacing.textGap }}>
          <p style={typography.insight}>
            {capsule.insightSentence}
          </p>
        </div>
        
        {/* Context hint - subtle */}
        <div style={{ marginBottom: spacing.sectionGap }}>
          <p style={typography.context}>
            {formatContextHint(contextHint)} · {formatTemporalContext(capsule.temporalContext)}
          </p>
        </div>
        
        {/* Emergence Map Visualization - compact */}
        <div style={{ marginBottom: spacing.sectionGap }}>
          <EmergenceMapViz map={emergenceMap} width={width - spacing.padding * 2} height={200} />
        </div>
      </div>
      
      {/* Footer - minimal, observational */}
      <div style={{ marginTop: 'auto', paddingTop: spacing.sectionGap }}>
        <p style={typography.footer}>
          Derived from encrypted private journal
        </p>
      </div>
    </div>
  );
}


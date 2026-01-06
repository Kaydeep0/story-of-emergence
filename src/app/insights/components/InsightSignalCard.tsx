// src/app/insights/components/InsightSignalCard.tsx
// Reusable "Signal Card" component for all Insights lenses

'use client';

import * as React from 'react';
import type { IntensityLevel } from '../lib/intensitySystem';
import { getIntensityBackground, getIntensityText, getIntensityBorder, getIntensityGlow } from '../lib/intensitySystem';
import { ObservationalDivider } from './ObservationalDivider';
import type { DensityMode } from '../hooks/useDensity';
import { getCardPadding, getCardSpacing, getChipSpacing, getTextSize } from '../lib/densityStyles';
import { useParallax } from '../hooks/useParallax';
import '../styles/visualHaptics.css';

type Chip = { label: string; tone?: 'neutral' | 'good' | 'warn'; intensity?: IntensityLevel };

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function InsightSignalCard(props: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  chips?: Chip[];
  rightMeta?: React.ReactNode;
  children?: React.ReactNode;
  chart?: React.ReactNode;
  className?: string;
  primaryLabel?: string; // e.g., "Primary signal this week"
  densityMode?: DensityMode; // Optional density mode
}) {
  const { title, subtitle, icon, chips = [], rightMeta, children, chart, className, primaryLabel, densityMode = 'spacious' } = props;
  const isPrimary = !!primaryLabel;
  const { backgroundOffset, foregroundOffset } = useParallax();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/[0.04]',
        'backdrop-blur',
        // Isolation for deterministic z-index stacking
        'isolate',
        // Top and side glow only, no bottom border
        isPrimary
          ? 'shadow-[0_-2px_8px_rgba(16,185,129,0.2),-2px_0_8px_rgba(16,185,129,0.15),2px_0_8px_rgba(16,185,129,0.15)]'
          : 'shadow-[0_-1px_4px_rgba(255,255,255,0.05),-1px_0_4px_rgba(255,255,255,0.03),1px_0_4px_rgba(255,255,255,0.03)]',
        'card-haptic', // Visual haptic feedback
        className
      )}
    >
      {/* Glow layer - behind content, using pseudo-element pattern */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0"
        style={{
          transform: `translateY(${backgroundOffset}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Blur glows - smaller pseudo-elements to avoid compositing issues */}
        <div 
          className="absolute -top-24 left-12 h-64 w-64 rounded-full bg-emerald-400/10"
          style={{
            filter: 'blur(48px)',
            opacity: isPrimary ? 0.8 : 0.6,
          }}
        />
        <div 
          className="absolute -bottom-24 right-12 h-64 w-64 rounded-full bg-cyan-400/10"
          style={{
            filter: 'blur(48px)',
            opacity: isPrimary ? 0.8 : 0.6,
          }}
        />
        {isPrimary && (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5" />
        )}
      </div>

      {/* Subtle vertical gradients suggesting continuation - parallax background */}
      <div 
        className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
        style={{
          transform: `translateY(${backgroundOffset}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white/[0.08] via-white/[0.02] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white/[0.08] via-white/[0.02] to-transparent" />
      </div>

      {/* Bottom edge fade to transparency - parallax background (contained) */}
      <div 
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/50 to-transparent rounded-b-2xl overflow-hidden"
        style={{
          transform: `translateY(${backgroundOffset}px)`,
          transition: 'transform 0.1s ease-out',
        }}
      />

      {/* Content layer - NO TRANSFORM, stays in normal document flow, above glow */}
      <div className={`relative z-10 ${getCardPadding(densityMode)}`}>
        {/* Primary label */}
        {primaryLabel && (
          <div className={`${densityMode === 'dense' ? 'mb-2 pb-2' : 'mb-3 pb-3'}`}>
            <ObservationalDivider />
            <span className={`${getTextSize(densityMode, 'xs')} font-medium text-emerald-300/90 uppercase tracking-wider block ${densityMode === 'dense' ? 'mt-2' : 'mt-3'}`}>
              {primaryLabel}
            </span>
          </div>
        )}
        <div className={`flex items-start justify-between ${densityMode === 'dense' ? 'gap-2' : 'gap-3'}`}>
          <div className="min-w-0">
            <div className={`flex items-center ${densityMode === 'dense' ? 'gap-1.5' : 'gap-2'}`}>
              {icon ? <span className={cn('text-white/70', isPrimary && 'text-emerald-300/80')}>{icon}</span> : null}
              <h3 className={cn(
                getTextSize(densityMode, 'base'),
                'font-semibold',
                isPrimary ? 'text-white' : 'text-white/90'
              )}>{title}</h3>
            </div>
            {subtitle ? (
              <p className={`mt-1 ${getTextSize(densityMode, 'sm')} text-white/60`}>{subtitle}</p>
            ) : null}
          </div>

          <div className={`flex flex-col items-end ${densityMode === 'dense' ? 'gap-1.5' : 'gap-2'}`}>
            {rightMeta ? <div className={`${getTextSize(densityMode, 'xs')} text-white/60`}>{rightMeta}</div> : null}
            {chips.length ? (
              <div className={`flex flex-wrap justify-end ${getChipSpacing(densityMode)} max-w-full`}>
                {chips.map((c, i) => {
                  // Use intensity system if provided, otherwise fall back to tone
                  const chipClasses = c.intensity
                    ? cn(
                        'rounded-full px-2 py-1 text-xs',
                        'max-w-full break-words',
                        getIntensityBackground(c.intensity),
                        getIntensityText(c.intensity)
                      )
                    : cn(
                        'rounded-full px-2 py-1 text-xs',
                        'border border-white/10 bg-white/[0.04] text-white/70',
                        'max-w-full break-words',
                        c.tone === 'good' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300/80',
                        c.tone === 'warn' && 'border-white/20 bg-white/5 text-white/60' // Neutral, not warning
                      );
                  
                  return (
                    <span
                      key={i}
                      className={cn(chipClasses, 'chip-haptic')}
                      title={c.label}
                      style={c.intensity ? { filter: getIntensityGlow(c.intensity) } : undefined}
                    >
                      {c.label}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {children ? <div className={`${densityMode === 'dense' ? 'mt-3' : 'mt-4'} ${getTextSize(densityMode, 'sm')} text-white/70 leading-relaxed`}>{children}</div> : null}

        {chart ? (
          <div className={densityMode === 'dense' ? 'mt-3' : 'mt-4'}>
            {/* Chart container - contained within card bounds */}
            <div className={`relative ${densityMode === 'dense' ? 'h-10' : 'h-14'} overflow-hidden rounded-xl`}>
              {/* Chart background with subtle border only on top and sides */}
              <div className="relative h-full rounded-xl bg-black/20 overflow-hidden"
                   style={{
                     boxShadow: '0 -1px 4px rgba(255,255,255,0.05), -1px 0 4px rgba(255,255,255,0.03), 1px 0 4px rgba(255,255,255,0.03)',
                     borderTop: '1px solid rgba(255,255,255,0.05)',
                     borderLeft: '1px solid rgba(255,255,255,0.03)',
                     borderRight: '1px solid rgba(255,255,255,0.03)',
                   }}>
                {/* density strip - parallax background (contained, behind chart) */}
                <div 
                  className="pointer-events-none absolute inset-0 opacity-40 overflow-hidden rounded-xl z-0"
                  style={{
                    transform: `translateY(${backgroundOffset * 0.5}px)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 via-transparent to-cyan-400/10" />
                  <div className="absolute inset-0 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_16px)] opacity-20" />
                </div>
                {/* Bottom fade for chart - parallax background (contained, behind chart) */}
                <div 
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-xl overflow-hidden z-0"
                  style={{
                    transform: `translateY(${backgroundOffset * 0.5}px)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                />
                {/* Chart content - NO TRANSFORM, above decorative layers */}
                <div className="relative z-10 h-full overflow-hidden">{chart}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


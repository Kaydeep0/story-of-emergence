// src/app/insights/components/SignalCard.tsx
// Premium dark "signal card" component for Weekly and Summary insights

'use client';

import React, { useState } from 'react';

export interface SignalCardProps {
  title: string;
  description: string;
  periodChip: string; // e.g., "Week", "Month", "Year"
  confidenceChip: string; // e.g., "High", "Medium", "Low"
  signalMeter?: number; // 0-1 for right side gauge
  signalMeterLabel?: string; // e.g., "18 entries"
  sparklineValues: number[]; // Daily counts for sparkline
  distributionSignature?: string[]; // e.g., ["burst like", "steady", "clustered"]
  icon?: React.ReactNode;
  subtitle?: string; // e.g., "Last 7 days activity"
}

export function SignalCard({
  title,
  description,
  periodChip,
  confidenceChip,
  signalMeter,
  signalMeterLabel,
  sparklineValues,
  distributionSignature,
  icon,
  subtitle,
}: SignalCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Find peak bar index for highlighting
  const maxValue = Math.max(...sparklineValues, 1);
  const peakIndex = sparklineValues.findIndex(v => v === maxValue);

  return (
    <div
      className="relative rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 p-6 transition-all duration-200 hover:border-emerald-500/35 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundImage: `
          linear-gradient(to bottom, rgba(39, 39, 42, 0.8), rgba(24, 24, 27, 0.9)),
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.01) 2px,
            rgba(255, 255, 255, 0.01) 4px
          )
        `,
      }}
    >
      {/* Top row: Chips and Signal Meter */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period chip */}
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300/80 border border-emerald-500/20 font-medium">
            {periodChip}
          </span>
          {/* Confidence chip */}
          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors duration-200 ${
            confidenceChip.toLowerCase() === 'high'
              ? 'bg-emerald-500/15 text-emerald-300/90 border-emerald-500/25' + (isHovered ? ' brightness-110' : '')
              : confidenceChip.toLowerCase() === 'medium'
              ? 'bg-amber-500/10 text-amber-300/80 border-amber-500/20' + (isHovered ? ' brightness-110' : '')
              : 'bg-zinc-500/10 text-zinc-400/70 border-zinc-500/15' + (isHovered ? ' brightness-110' : '')
          }`}>
            {confidenceChip}
          </span>
        </div>
        
        {/* Signal meter (right side) */}
        {signalMeter !== undefined && (
          <div className="flex flex-col items-end gap-1">
            {signalMeterLabel && (
              <span className="text-xs text-white/50">{signalMeterLabel}</span>
            )}
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3].map((i) => {
                const threshold = (i + 1) / 4;
                const isActive = signalMeter >= threshold;
                return (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-400/80'
                        : 'bg-white/10'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Title with icon */}
      <div className="flex items-start gap-2 mb-2">
        {icon && <div className="mt-0.5 text-emerald-400/70">{icon}</div>}
        <h3 className="text-base font-semibold text-white leading-tight">{title}</h3>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-white/50 mb-3">{subtitle}</p>
      )}

      {/* Description */}
      <p className="text-sm text-white/70 leading-relaxed mb-4">{description}</p>

      {/* Distribution signature row */}
      {distributionSignature && distributionSignature.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {distributionSignature.map((sig, i) => (
            <span
              key={i}
              className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10"
            >
              {sig}
            </span>
          ))}
        </div>
      )}

      {/* Sparkline Band - tall with gradient fade */}
      <div className="relative mt-6 h-20 overflow-hidden rounded-lg bg-gradient-to-t from-zinc-900/40 to-transparent">
        {/* Soft baseline */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-emerald-500/20" />
        
        {/* Sparkline bars */}
        <div className="absolute bottom-0 left-0 right-0 h-full flex items-end gap-0.5 px-1">
          {sparklineValues.map((value, i) => {
            const normalizedHeight = (value / maxValue) * 100;
            const isPeak = i === peakIndex && value > 0;
            const liftAmount = isHovered ? 2 : 0;
            
            return (
              <div
                key={i}
                className="flex-1 relative transition-all duration-200"
                style={{
                  transform: `translateY(-${liftAmount}px)`,
                }}
              >
                <div
                  className={`w-full rounded-t transition-all duration-200 ${
                    isPeak
                      ? 'bg-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                      : 'bg-emerald-500/30'
                  }`}
                  style={{
                    height: `${Math.max(normalizedHeight, 2)}%`,
                    minHeight: value > 0 ? '2px' : '0',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Gradient fade overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 via-transparent to-transparent pointer-events-none" />
      </div>
    </div>
  );
}


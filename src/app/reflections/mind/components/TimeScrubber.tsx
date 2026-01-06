// src/app/reflections/mind/components/TimeScrubber.tsx
// Time scrubber control for viewing graph evolution over time
// Layer 4: Visual encoding

'use client';

import { useMemo } from 'react';
import { NeoCard } from '../../../../components/ui/NeoCard';

interface TimeScrubberProps {
  earliestDate: Date | null;
  latestDate: Date | null;
  asOf: Date | null;
  onAsOfChange: (date: Date) => void;
  reflectionCount: number;
  edgeCount: number;
  clusterCount: number;
}

export function TimeScrubber({
  earliestDate,
  latestDate,
  asOf,
  onAsOfChange,
  reflectionCount,
  edgeCount,
  clusterCount,
}: TimeScrubberProps) {
  const minTime = earliestDate ? earliestDate.getTime() : 0;
  const maxTime = latestDate ? latestDate.getTime() : Date.now();
  const currentTime = asOf ? asOf.getTime() : maxTime;
  const progress = maxTime > minTime ? (currentTime - minTime) / (maxTime - minTime) : 1;

  const presets = useMemo(() => {
    if (!latestDate) return [];
    
    const now = latestDate.getTime();
    return [
      { label: '7D', days: 7 },
      { label: '30D', days: 30 },
      { label: '90D', days: 90 },
      { label: 'All', days: null },
    ].map(preset => ({
      ...preset,
      date: preset.days ? new Date(now - preset.days * 24 * 60 * 60 * 1000) : earliestDate,
    }));
  }, [earliestDate, latestDate]);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    const newTime = minTime + value * (maxTime - minTime);
    onAsOfChange(new Date(newTime));
  };

  const handlePresetClick = (presetDate: Date | null) => {
    if (presetDate) {
      onAsOfChange(presetDate);
    } else if (latestDate) {
      onAsOfChange(latestDate);
    }
  };

  if (!earliestDate || !latestDate) {
    return null;
  }

  const isAllTime = asOf && asOf.getTime() >= latestDate.getTime();

  return (
    <NeoCard className="p-4 mb-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[hsl(var(--accent))]" />
            <h3 className="text-sm font-semibold text-white/90">Time Scrub</h3>
          </div>
          <div className="text-xs text-[hsl(var(--muted))]">
            As of: <span className="text-white/80 font-medium">{formatDate(asOf)}</span>
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-2">
          {presets.map((preset, i) => {
            const isActive = preset.days === null 
              ? isAllTime
              : asOf && Math.abs(asOf.getTime() - (preset.date?.getTime() || 0)) < 24 * 60 * 60 * 1000;
            
            return (
              <button
                key={i}
                onClick={() => handlePresetClick(preset.date)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                  isActive
                    ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]'
                    : 'border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={handleSliderChange}
            className="w-full h-2 bg-[hsl(var(--bg1))] rounded-lg appearance-none cursor-pointer accent-[hsl(var(--accent))]"
            style={{
              background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${progress * 100}%, hsl(var(--bg1)) ${progress * 100}%, hsl(var(--bg1)) 100%)`,
            }}
          />
          <div className="flex items-center justify-between text-xs text-[hsl(var(--muted))]">
            <span>{formatDate(earliestDate)}</span>
            <span>{formatDate(latestDate)}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted))] pt-2 border-t border-[hsl(var(--line))]">
          <span>
            <span className="text-white/80 font-medium">{reflectionCount}</span> reflections
          </span>
          <span>•</span>
          <span>
            <span className="text-white/80 font-medium">{edgeCount}</span> connections
          </span>
          <span>•</span>
          <span>
            <span className="text-white/80 font-medium">{clusterCount}</span> clusters
          </span>
        </div>
      </div>
    </NeoCard>
  );
}


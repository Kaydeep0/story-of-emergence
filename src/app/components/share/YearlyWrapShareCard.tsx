'use client';

import React from 'react';

export interface YearlyWrapShareCardProps {
  year: number;
  classificationLabel: string; // "Normal", "Log Normal", "Power Law"
  totalEntries: number;
  activeDays: number;
  spikeRatio: number;
  top10PercentShare: number;
  highlightAccent?: string; // Optional accent color
  mode?: 'preview' | 'export'; // Preview uses responsive classes, export uses fixed 1080x1350
  id?: string; // Optional id for export card
}

export function YearlyWrapShareCard({
  year,
  classificationLabel,
  totalEntries,
  activeDays,
  spikeRatio,
  top10PercentShare,
  highlightAccent,
  mode = 'preview',
  id,
}: YearlyWrapShareCardProps) {
  const isExport = mode === 'export';
  
  // Export mode: Fixed Instagram portrait size: 1080x1350
  // Preview mode: Responsive with Tailwind classes
  const cardStyle: React.CSSProperties = isExport ? {
    width: '1080px',
    height: '1350px',
    backgroundColor: '#000000',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    padding: '80px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
  } : {};

  const headerStyle: React.CSSProperties = isExport ? {
    marginBottom: '60px',
  } : {};

  const titleStyle: React.CSSProperties = isExport ? {
    fontSize: '48px',
    fontWeight: '600',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  } : {};

  const subtitleStyle: React.CSSProperties = isExport ? {
    fontSize: '32px',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '24px',
  } : {};

  const yearStyle: React.CSSProperties = isExport ? {
    fontSize: '72px',
    fontWeight: '700',
    marginBottom: '40px',
    letterSpacing: '-0.03em',
  } : {};

  const badgeStyle: React.CSSProperties = isExport ? {
    display: 'inline-block',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '24px',
    fontWeight: '500',
    marginBottom: '60px',
    border: '2px solid',
  } : {};

  const getBadgeColors = () => {
    const lower = classificationLabel.toLowerCase();
    if (lower.includes('normal') && !lower.includes('log')) {
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        color: 'rgba(147, 197, 253, 1)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
      };
    } else if (lower.includes('log')) {
      return {
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        color: 'rgba(196, 181, 253, 1)',
        borderColor: 'rgba(168, 85, 247, 0.3)',
      };
    } else {
      // Power Law
      return {
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        color: 'rgba(253, 186, 116, 1)',
        borderColor: 'rgba(249, 115, 22, 0.3)',
      };
    }
  };

  const badgeColors = getBadgeColors();

  const metricsContainerStyle: React.CSSProperties = isExport ? {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    justifyContent: 'center',
  } : {};

  const metricStyle: React.CSSProperties = isExport ? {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } : {};

  const metricLabelStyle: React.CSSProperties = isExport ? {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  } : {};

  const metricValueStyle: React.CSSProperties = isExport ? {
    fontSize: '56px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.02em',
  } : {};

  const footerStyle: React.CSSProperties = isExport ? {
    marginTop: 'auto',
    paddingTop: '40px',
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  } : {};

  if (isExport) {
    // Export mode: Fixed size with inline styles
    return (
      <div id={id} style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>Story of Emergence</div>
          <div style={subtitleStyle}>Yearly Wrap</div>
          <div style={yearStyle}>{year}</div>
          <div
            style={{
              ...badgeStyle,
              ...badgeColors,
            }}
          >
            {classificationLabel}
          </div>
        </div>

        <div style={metricsContainerStyle}>
          <div style={metricStyle}>
            <div style={metricLabelStyle}>Total Entries</div>
            <div style={metricValueStyle}>{totalEntries}</div>
          </div>
          <div style={metricStyle}>
            <div style={metricLabelStyle}>Active Days</div>
            <div style={metricValueStyle}>{activeDays}</div>
          </div>
          <div style={metricStyle}>
            <div style={metricLabelStyle}>Top 10% Days Share</div>
            <div style={metricValueStyle}>{(top10PercentShare * 100).toFixed(1)}%</div>
          </div>
          <div style={metricStyle}>
            <div style={metricLabelStyle}>Spike Ratio</div>
            <div style={metricValueStyle}>{spikeRatio.toFixed(2)}x</div>
          </div>
        </div>

        <div style={footerStyle}>Computed locally</div>
      </div>
    );
  }

  // Preview mode: Responsive with Tailwind classes
  return (
    <div className="w-full aspect-[9/16] rounded-2xl border border-white/10 bg-black/70 p-4 sm:p-6 md:p-8 flex flex-col">
      {/* Header */}
      <div className="mb-6 sm:mb-8 md:mb-12">
        <div className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-1 sm:mb-2">Story of Emergence</div>
        <div className="text-lg sm:text-xl md:text-2xl text-white/70 mb-3 sm:mb-4 md:mb-6">Yearly Wrap</div>
        <div className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 sm:mb-6 md:mb-8">{year}</div>
        <div
          className={`inline-block px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-lg text-sm sm:text-base md:text-lg font-medium border-2 ${
            classificationLabel.toLowerCase().includes('normal') && !classificationLabel.toLowerCase().includes('log')
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : classificationLabel.toLowerCase().includes('log')
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
              : 'bg-orange-500/20 text-orange-300 border-orange-500/30'
          }`}
        >
          {classificationLabel}
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 flex flex-col gap-4 sm:gap-6 md:gap-8 justify-center">
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="text-xs sm:text-sm md:text-base text-white/60">Total Entries</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{totalEntries}</div>
        </div>
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="text-xs sm:text-sm md:text-base text-white/60">Active Days</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{activeDays}</div>
        </div>
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="text-xs sm:text-sm md:text-base text-white/60">Top 10% Days Share</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{(top10PercentShare * 100).toFixed(1)}%</div>
        </div>
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="text-xs sm:text-sm md:text-base text-white/60">Spike Ratio</div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">{spikeRatio.toFixed(2)}x</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 sm:pt-6 md:pt-8 text-xs sm:text-sm md:text-base text-white/40">
        Computed locally
      </div>
    </div>
  );
}


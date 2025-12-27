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
}

export function YearlyWrapShareCard({
  year,
  classificationLabel,
  totalEntries,
  activeDays,
  spikeRatio,
  top10PercentShare,
  highlightAccent,
}: YearlyWrapShareCardProps) {
  // Fixed Instagram portrait size: 1080x1350
  const cardStyle: React.CSSProperties = {
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
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '60px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: '600',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '24px',
  };

  const yearStyle: React.CSSProperties = {
    fontSize: '72px',
    fontWeight: '700',
    marginBottom: '40px',
    letterSpacing: '-0.03em',
  };

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '24px',
    fontWeight: '500',
    marginBottom: '60px',
    border: '2px solid',
  };

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

  const metricsContainerStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    justifyContent: 'center',
  };

  const metricStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  };

  const metricLabelStyle: React.CSSProperties = {
    fontSize: '20px',
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '400',
  };

  const metricValueStyle: React.CSSProperties = {
    fontSize: '56px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.02em',
  };

  const footerStyle: React.CSSProperties = {
    marginTop: 'auto',
    paddingTop: '40px',
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '400',
  };

  return (
    <div style={cardStyle}>
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


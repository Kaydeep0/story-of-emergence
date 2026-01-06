/**
 * Sparkline Component (Minimal)
 * 
 * Renders a simple inline SVG sparkline from numeric values.
 * Compatibility shim for Timeline lens.
 */

interface SparklineProps {
  dailyCounts?: number[];
  dates?: string[];
  isLoading?: boolean;
  values?: number[]; // Fallback prop
  width?: number;
  height?: number;
}

export function Sparkline({ dailyCounts, dates, isLoading, values, width = 80, height = 24 }: SparklineProps) {
  // Use dailyCounts if provided, otherwise fall back to values
  const data = dailyCounts ?? values ?? [];
  
  if (isLoading || !data || data.length === 0) {
    return (
      <svg width={width} height={height} className="text-white/20">
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="currentColor" strokeWidth="1" />
      </svg>
    );
  }

  // Normalize values to 0..1
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const normalized = data.map(v => (v - min) / range);

  // Map to points
  const points = normalized.map((y, i) => {
    const x = (i / (normalized.length - 1 || 1)) * width;
    const yPos = height - (y * height);
    return `${x},${yPos}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="text-white/40" style={{ animation: 'waveSubtle 2s ease-in-out 0.3s' }}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'waveSubtle 2s ease-in-out 0.3s',
        }}
      />
    </svg>
  );
}

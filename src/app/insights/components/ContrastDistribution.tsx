/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical insight components
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

// src/app/insights/components/ContrastDistribution.tsx
// Pure visual primitive for contrast between two time slices
// No computation, no semantics, just visual texture

export interface ContrastDistributionProps {
  leftLabel: string;
  rightLabel: string;
  leftPoints: number[];
  rightPoints: number[];
}

/**
 * Contrast Distribution - Visual primitive showing point dispersion
 * 
 * Renders two vertical "clouds" of points representing contrast.
 * Horizontal axis = time contrast (left vs right)
 * Vertical spread = dispersion only
 * 
 * This is a perceptual texture, not an explanation.
 */
export function ContrastDistribution({
  leftLabel,
  rightLabel,
  leftPoints,
  rightPoints,
}: ContrastDistributionProps) {
  // Normalize points to 0-1 range for vertical positioning
  const normalizePoints = (points: number[]): number[] => {
    if (points.length === 0) return [];
    const min = Math.min(...points);
    const max = Math.max(...points);
    if (max === min) return points.map(() => 0.5);
    return points.map(p => (p - min) / (max - min));
  };

  // Deterministic jitter based on index (for stable rendering)
  const getJitter = (idx: number, seed: number): number => {
    const hash = (idx * 9301 + seed * 49297) % 233280;
    return ((hash / 233280) - 0.5) * 20;
  };

  const normalizedLeft = normalizePoints(leftPoints);
  const normalizedRight = normalizePoints(rightPoints);

  // SVG dimensions
  const width = 400;
  const height = 300;
  const padding = 40;
  const leftCenterX = padding + (width - padding * 2) * 0.25;
  const rightCenterX = padding + (width - padding * 2) * 0.75;
  const verticalSpread = height - padding * 2;

  // Point size and opacity
  const pointRadius = 2;
  const pointOpacity = 0.4;

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Left cloud */}
        {normalizedLeft.map((y, idx) => {
          const x = leftCenterX + getJitter(idx, 1);
          const yPos = padding + (1 - y) * verticalSpread; // Invert Y so 0 is bottom
          return (
            <circle
              key={`left-${idx}`}
              cx={x}
              cy={yPos}
              r={pointRadius}
              fill="rgba(255, 255, 255, 0.4)"
              opacity={pointOpacity}
            />
          );
        })}

        {/* Right cloud */}
        {normalizedRight.map((y, idx) => {
          const x = rightCenterX + getJitter(idx, 2);
          const yPos = padding + (1 - y) * verticalSpread; // Invert Y so 0 is bottom
          return (
            <circle
              key={`right-${idx}`}
              cx={x}
              cy={yPos}
              r={pointRadius}
              fill="rgba(255, 255, 255, 0.4)"
              opacity={pointOpacity}
            />
          );
        })}
      </svg>

      {/* Labels - minimal, neutral */}
      <div className="flex justify-between px-4 mt-2">
        <span className="text-xs text-white/50">{leftLabel}</span>
        <span className="text-xs text-white/50">{rightLabel}</span>
      </div>
    </div>
  );
}


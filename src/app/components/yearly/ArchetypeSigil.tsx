// src/app/components/yearly/ArchetypeSigil.tsx
// Minimal abstract sigil/glyph for archetypes with self-drawing animation

'use client';

import React, { useEffect, useState } from 'react';
import '../../insights/styles/delights.css';

export interface ArchetypeSigilProps {
  archetypeName: string;
  size?: number;
  color?: string;
  narrativeTone?: 'calm' | 'poetic' | 'analytical' | 'mirror';
}

// Abstract sigil patterns for each archetype - minimal, geometric, symbolic
const SIGIL_PATTERNS: Record<string, string> = {
  // Deep Diver: Downward arrow/dive symbol
  'The Deep Diver': 'M 50 20 L 50 80 M 30 50 L 50 30 L 70 50 M 40 60 L 50 50 L 60 60',
  // Steady Builder: Horizontal layers (foundation)
  'The Steady Builder': 'M 20 70 L 80 70 M 20 60 L 80 60 M 20 50 L 80 50 M 20 40 L 80 40',
  // Gravity Wells: Concentric circles (gravitational pull)
  'The Gravity Wells': 'M 50 50 m -20 0 a 20 20 0 1 1 40 0 a 20 20 0 1 1 -40 0 M 50 50 m -10 0 a 10 10 0 1 1 20 0 a 10 10 0 1 1 -20 0',
  // Pulse Writer: Wave pattern (rhythm)
  'The Pulse Writer': 'M 20 50 Q 30 30, 40 50 T 60 50 T 80 50 M 20 50 Q 30 70, 40 50 T 60 50 T 80 50',
  // Sprinter: Sharp diagonal (burst)
  'The Sprinter': 'M 20 70 L 50 20 L 80 70 M 35 50 L 45 50 M 50 40 L 50 60',
  // Balanced Writer: Equilibrium symbol (balanced)
  'The Balanced Writer': 'M 50 20 L 50 80 M 20 50 L 80 50 M 50 50 m -15 -15 L 35 35 M 50 50 m 15 -15 L 65 35',
};

export function ArchetypeSigil({
  archetypeName,
  size = 100,
  color = 'rgba(16, 185, 129, 0.8)',
  narrativeTone = 'calm',
}: ArchetypeSigilProps) {
  const [animated, setAnimated] = useState(false);
  const pathData = SIGIL_PATTERNS[archetypeName] || SIGIL_PATTERNS['The Balanced Writer'];

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Tone-based styling
  const strokeWidth = narrativeTone === 'analytical' ? 2 : narrativeTone === 'poetic' ? 1.5 : 1.5;
  const strokeOpacity = narrativeTone === 'mirror' ? 0.6 : narrativeTone === 'poetic' ? 0.8 : 0.8;
  const effectiveColor = narrativeTone === 'mirror' ? 'rgba(200, 200, 200, 0.8)' : color;
  const dashArray = narrativeTone === 'poetic' ? '2,2' : 'none';

  // Calculate approximate path length for animation
  // Count path segments (M, L, C, Q, Z commands) to estimate length
  const pathSegments = pathData.match(/[MLCZQ]/g) || [];
  const estimatedLength = pathSegments.length * 25; // Rough estimate
  const safeId = archetypeName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="archetype-sigil"
      style={{
        filter: narrativeTone === 'poetic' ? 'blur(0.5px)' : 'none',
      }}
    >
      <defs>
        <linearGradient id={`sigilGradient-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={effectiveColor} stopOpacity={strokeOpacity} />
          <stop offset="100%" stopColor={effectiveColor} stopOpacity={strokeOpacity * 0.6} />
        </linearGradient>
        <filter id={`sigilGlow-${safeId}`}>
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <path
        d={pathData}
        fill="none"
        stroke={`url(#sigilGradient-${safeId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={animated ? dashArray : `${estimatedLength} ${estimatedLength}`}
        strokeDashoffset={animated ? 0 : estimatedLength}
        style={{
          transition: 'stroke-dashoffset 1.5s ease-out',
          filter: narrativeTone === 'poetic' ? `url(#sigilGlow-${safeId})` : 'none',
        }}
      />
    </svg>
  );
}


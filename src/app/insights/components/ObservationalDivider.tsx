// src/app/insights/components/ObservationalDivider.tsx
// Soft gradient divider that signals observation, not judgment

'use client';

import React from 'react';

export function ObservationalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`relative h-px ${className}`}>
      {/* Gradient fade instead of hard line */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}


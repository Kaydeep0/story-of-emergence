// src/app/insights/components/LensTransition.tsx
// Micro-transition copy that connects lenses narratively

'use client';

import React from 'react';

export interface LensTransitionProps {
  text: string;
  className?: string;
}

export function LensTransition({ text, className = '' }: LensTransitionProps) {
  return (
    <div className={`py-4 text-center ${className}`}>
      <p className="text-xs text-white/40 italic leading-relaxed max-w-md mx-auto">
        {text}
      </p>
    </div>
  );
}


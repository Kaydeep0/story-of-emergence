// src/app/insights/components/EvidenceChips.tsx
// Observer v0: Evidence Chips UI
// Shows clickable excerpts from actual reflections

'use client';

import { useRouter } from 'next/navigation';
import type { EvidenceChip } from '../../lib/insights/types';
import type { ReflectionEntry } from '../../lib/insights/types';

interface EvidenceChipsProps {
  chips: EvidenceChip[];
  reflections: ReflectionEntry[];
  onChipClick?: (reflection: ReflectionEntry) => void;
}

export function EvidenceChips({ chips, reflections, onChipClick }: EvidenceChipsProps) {
  const router = useRouter();
  
  if (chips.length === 0) {
    return null;
  }

  const handleClick = (chip: EvidenceChip) => {
    const reflection = reflections.find(r => r.id === chip.reflectionId);
    if (!reflection) return;
    
    if (onChipClick) {
      onChipClick(reflection);
    } else {
      // Fallback: navigate to reflection detail if available
      // For now, just scroll to reflection in home page
      router.push(`/?highlight=${chip.reflectionId}`);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {chips.map((chip, idx) => {
        const reflection = reflections.find(r => r.id === chip.reflectionId);
        const hasReflection = !!reflection;

        return (
          <button
            key={`${chip.reflectionId}-${idx}`}
            onClick={() => handleClick(chip)}
            disabled={!hasReflection}
            className={`
              inline-flex items-start gap-2 px-3 py-2 rounded-lg border transition-colors text-left
              ${hasReflection
                ? 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 text-white/90 cursor-pointer'
                : 'border-white/10 bg-white/5 text-white/50 cursor-not-allowed opacity-50'
              }
            `}
            title={hasReflection ? 'Click to view reflection' : 'Reflection not available'}
          >
            <span className="text-xs text-white/40 mt-0.5">"{chip.excerpt}"</span>
            {hasReflection && (
              <svg
                className="w-3 h-3 text-white/40 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}


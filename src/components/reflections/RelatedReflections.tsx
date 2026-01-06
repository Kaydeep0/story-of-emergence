// src/components/reflections/RelatedReflections.tsx
// Related reflections panel using automatic graph linking
// Layer 4: Visual encoding

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import type { Reflection } from '../../lib/graph/buildReflectionGraph';
import type { Edge } from '../../lib/graph/buildReflectionGraph';
import { getRelatedReflections } from '../../lib/graph/buildReflectionGraph';
import { NeoCard } from '../ui/NeoCard';

interface RelatedReflectionsProps {
  reflectionId: string;
  edges: Edge[];
  allReflections: Reflection[];
  onReflectionClick?: (reflectionId: string) => void;
}

/**
 * Extract a title from reflection text (first sentence up to 80 chars, fallback to "Reflection")
 */
function extractTitle(text: string): string {
  const firstSentence = text.split(/[.!?]\s/)[0];
  if (firstSentence.length > 0 && firstSentence.length <= 80) {
    return firstSentence;
  }
  const truncated = text.slice(0, 80).trim();
  return truncated.length > 0 ? truncated + (text.length > 80 ? '...' : '') : 'Reflection';
}

/**
 * Format reasons for display
 */
function formatReasons(reasons: string[]): string {
  if (reasons.length === 0) return 'related';
  if (reasons.length === 1) {
    return reasons[0] === 'lexical' ? 'similar words' : 'nearby time';
  }
  return 'similar words, nearby time';
}

/**
 * Format weight as percentage
 */
function formatWeight(weight: number): string {
  return `${Math.round(weight * 100)}%`;
}

export function RelatedReflections({
  reflectionId,
  edges,
  allReflections,
  onReflectionClick,
}: RelatedReflectionsProps) {
  const related = useMemo(() => {
    return getRelatedReflections(reflectionId, edges, allReflections);
  }, [reflectionId, edges, allReflections]);

  if (related.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-1 rounded-full bg-[hsl(var(--accent))] shadow-[var(--glow-mid)]" />
        <h4 className="text-sm font-semibold text-white/90">Related Reflections</h4>
      </div>

      <div className="space-y-3">
        {related.map(({ reflection, edge }) => {
          const title = extractTitle(reflection.text);
          const date = new Date(reflection.createdAt);
          const formattedDate = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
          });

          return (
            <NeoCard
              key={reflection.id}
              className="p-4 hover:shadow-[var(--glow-mid)] transition-shadow cursor-pointer"
              onClick={() => {
                if (onReflectionClick) {
                  onReflectionClick(reflection.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-white/90 mb-1 line-clamp-2">
                    {title}
                  </h5>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-white/50">{formattedDate}</span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {formatReasons(edge.reasons)}
                    </span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs text-[hsl(var(--accent))]">
                      {formatWeight(edge.weight)} match
                    </span>
                  </div>
                </div>
                <Link
                  href={`/?focus=${reflection.id}`}
                  className="text-xs text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))]/80 transition-colors flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onReflectionClick) {
                      onReflectionClick(reflection.id);
                    }
                  }}
                >
                  View →
                </Link>
              </div>
            </NeoCard>
          );
        })}
      </div>
    </div>
  );
}


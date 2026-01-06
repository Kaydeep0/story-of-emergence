// src/app/reflections/mind/components/FocusPanel.tsx
// Focus panel showing selected reflection details and neighbors
// Layer 4: Visual encoding

'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { NeoCard } from '../../../../components/ui/NeoCard';
import type { ReflectionEntry } from '../../../lib/insights/types';
import type { Edge } from '../../../../lib/graph/buildReflectionGraph';

interface NeighborRowProps {
  neighbor: ReflectionEntry;
  edge: Edge;
  onSelect: (reflectionId: string) => void;
}

function NeighborRow({ neighbor, edge, onSelect }: NeighborRowProps) {
  const extractTitle = (text: string): string => {
    const firstSentence = text.split(/[.!?]\s/)[0];
    if (firstSentence.length > 0 && firstSentence.length <= 60) {
      return firstSentence;
    }
    return text.slice(0, 60).trim() + (text.length > 60 ? '...' : '');
  };

  const formatReasons = (reasons: string[]): string[] => {
    return reasons.map(r => {
      if (r === 'lexical') return 'similar words';
      if (r === 'time') return 'nearby time';
      return r;
    });
  };

  return (
    <button
      onClick={() => onSelect(neighbor.id)}
      className="w-full text-left p-3 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.50)] hover:bg-[hsl(var(--panel)/0.70)] hover:border-[hsl(var(--accent)/0.5)] transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-white/90 mb-1 line-clamp-2 group-hover:text-[hsl(var(--accent))] transition-colors">
            {extractTitle(neighbor.plaintext)}
          </h4>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-xs text-[hsl(var(--accent))] font-medium">
              {Math.round((edge.weight || 0) * 100)}% match
            </span>
            {edge.reasons && edge.reasons.length > 0 && (
              <>
                <span className="text-xs text-white/40">•</span>
                <div className="flex gap-1.5 flex-wrap">
                  {formatReasons(edge.reasons).map((reason, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-[hsl(var(--muted))]"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface FocusPanelProps {
  reflection: ReflectionEntry;
  neighbors: Array<{ reflection: ReflectionEntry; edge: Edge }>;
  clusterId: number;
  clusterSize: number;
  asOf: Date | null;
  onOpenReflection: (reflectionId: string) => void;
  onCenterGraph: () => void;
  onClearFocus: () => void;
  onSelectNeighbor: (reflectionId: string) => void;
  onOpenThread?: (clusterId: number) => void;
  onPinCluster?: (clusterId: number) => void;
}

export function FocusPanel({
  reflection,
  neighbors,
  clusterId,
  clusterSize,
  asOf,
  onOpenReflection,
  onCenterGraph,
  onClearFocus,
  onSelectNeighbor,
  onOpenThread,
  onPinCluster,
}: FocusPanelProps) {

  const extractTitle = useCallback((text: string): string => {
    const firstSentence = text.split(/[.!?]\s/)[0];
    if (firstSentence.length > 0 && firstSentence.length <= 80) {
      return firstSentence;
    }
    return text.slice(0, 80).trim() + (text.length > 80 ? '...' : '');
  }, []);

  const extractPreview = useCallback((text: string): string => {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= 240) return cleaned;
    return cleaned.slice(0, 240).trim() + '...';
  }, []);

  const date = new Date(reflection.createdAt);
  const formattedDate = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <NeoCard className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white/90 mb-2 line-clamp-2">
            {extractTitle(reflection.plaintext)}
          </h2>
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted))]">
            <span>{formattedDate}</span>
            <span>•</span>
            <span>{formattedTime}</span>
            {clusterId >= 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span>Cluster {clusterId + 1}</span>
                  <span className="text-[hsl(var(--muted))]">({clusterSize})</span>
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onClearFocus}
          className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Clear focus"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Preview snippet */}
      <div>
        <p className="text-sm text-white/70 leading-relaxed line-clamp-4">
          {extractPreview(reflection.plaintext)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onOpenReflection(reflection.id)}
          className="flex-1 min-w-[120px] px-4 py-2 rounded-lg border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
        >
          Open Reflection
        </button>
        {clusterId >= 0 && (
          <div className="flex gap-2">
            {onOpenThread && (
              <button
                onClick={() => onOpenThread(clusterId)}
                className="px-4 py-2 rounded-lg border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
              >
                Open Thread
              </button>
            )}
            {onPinCluster && (
              <button
                onClick={() => onPinCluster(clusterId)}
                className="px-4 py-2 rounded-lg border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
              >
                Pin Cluster
              </button>
            )}
          </div>
        )}
        <button
          onClick={onCenterGraph}
          className="px-4 py-2 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] hover:text-white/90 transition-colors text-sm"
        >
          Center Graph
        </button>
      </div>

      {/* Neighbors */}
      {neighbors.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-1 rounded-full bg-[hsl(var(--accent))] shadow-[var(--glow-mid)]" />
            <h3 className="text-sm font-semibold text-white/90">
              Connected Reflections ({neighbors.length})
            </h3>
          </div>
          <div className="space-y-2">
            {neighbors.map(({ reflection: neighbor, edge }) => (
              <NeighborRow
                key={neighbor.id}
                neighbor={neighbor}
                edge={edge}
                onSelect={onSelectNeighbor}
              />
            ))}
          </div>
        </div>
      )}
    </NeoCard>
  );
}


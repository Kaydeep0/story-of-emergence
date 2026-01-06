// src/app/reflections/mind/components/EmergencePanel.tsx
// Emergence events panel showing recent graph evolution events
// Layer 4: Visual encoding

'use client';

import { NeoCard } from '../../../../components/ui/NeoCard';
import type { EmergenceEvent } from '../../../../lib/graph/emergenceEvents';
import type { ReflectionEntry } from '../../../lib/insights/types';

interface EmergencePanelProps {
  events: EmergenceEvent[];
  reflections: ReflectionEntry[];
  onFocusNode: (nodeId: string) => void;
  onFocusCluster: (clusterId: number) => void;
}

export function EmergencePanel({
  events,
  reflections,
  onFocusNode,
  onFocusCluster,
}: EmergencePanelProps) {
  const extractTitle = (text: string): string => {
    const firstSentence = text.split(/[.!?]\s/)[0];
    if (firstSentence.length > 0 && firstSentence.length <= 50) {
      return firstSentence;
    }
    return text.slice(0, 50).trim() + (text.length > 50 ? '...' : '');
  };

  const formatEvent = (event: EmergenceEvent): { label: string; action: () => void } => {
    switch (event.type) {
      case 'NODE_BIRTH': {
        const reflection = reflections.find(r => r.id === event.nodeId);
        const title = reflection ? extractTitle(reflection.plaintext) : 'New reflection';
        return {
          label: `New node: "${title}"`,
          action: () => onFocusNode(event.nodeId),
        };
      }
      case 'CLUSTER_FORMATION':
        return {
          label: `Cluster formed: ${event.size} notes`,
          action: () => onFocusCluster(event.clusterId),
        };
      case 'CLUSTER_MERGE':
        return {
          label: `Merge: Cluster ${event.fromClusterIds.map(id => id + 1).join(' + ')} → ${event.toClusterId + 1}`,
          action: () => onFocusCluster(event.toClusterId),
        };
      case 'CONNECTIVITY_SPIKE': {
        const reflection = reflections.find(r => r.id === event.nodeId);
        const title = reflection ? extractTitle(reflection.plaintext) : 'Reflection';
        return {
          label: `Spike: "${title}" gained ${event.delta.toFixed(1)} connections`,
          action: () => onFocusNode(event.nodeId),
        };
      }
    }
  };

  if (events.length === 0) {
    return null;
  }

  // Show last 3 events
  const recentEvents = events.slice(-3).reverse();

  return (
    <NeoCard className="p-4 mb-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-1 rounded-full bg-[hsl(var(--accent))]" />
          <h3 className="text-sm font-semibold text-white/90">Emergence</h3>
        </div>
        <div className="space-y-1.5">
          {recentEvents.map((event, i) => {
            const { label, action } = formatEvent(event);
            return (
              <button
                key={i}
                onClick={action}
                className="w-full text-left px-3 py-2 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] hover:bg-[hsl(var(--panel)/0.7)] hover:border-[hsl(var(--accent)/0.5)] transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-white/80 group-hover:text-white/90 transition-colors line-clamp-1">
                    {label}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted))] group-hover:text-[hsl(var(--accent))] transition-colors">
                    Focus →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </NeoCard>
  );
}


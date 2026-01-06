'use client';

import { useEffect, useState } from 'react';
import { fetchBridgesForWallet } from '../lib/meaningBridges/storage';
import { getSupabaseForWallet } from '../lib/supabase';
import type { ReflectionEntry } from '../lib/insights/types';

type ThreadConnection = {
  reflectionId: string;
  explanation: string;
  reasons: string[];
  weight?: number; // Bridge weight for ranking
  qualityScore?: number; // Combined quality score (weight + diversity)
};

type Props = {
  reflectionId: string;
  walletAddress: string;
  sessionKey: CryptoKey | null;
  encryptionReady: boolean;
  reflections: ReflectionEntry[];
};

export function ThreadConnections({
  reflectionId,
  walletAddress,
  sessionKey,
  encryptionReady,
  reflections,
}: Props) {
  const [connections, setConnections] = useState<ThreadConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAllConnections, setShowAllConnections] = useState(false);
  const [showAllBridges, setShowAllBridges] = useState(false);
  
  // Maximum number of bridges to show per reflection (start with 3)
  const MAX_VISIBLE_BRIDGES = 3;
  // Minimum quality score threshold (hide weak bridges by default)
  const MIN_QUALITY_SCORE = 0.4;

  useEffect(() => {
    if (!encryptionReady || !sessionKey || !walletAddress || !reflectionId) {
      setConnections([]);
      return;
    }

    let cancelled = false;

    async function loadConnections() {
      if (!sessionKey) return; // Guard against null
      
      try {
        setLoading(true);
        const supabase = getSupabaseForWallet(walletAddress);
        const bridges = await fetchBridgesForWallet({
          supabase,
          wallet: walletAddress,
          key: sessionKey,
          limit: 100,
        });

        if (cancelled) return;

        // Find bridges where this reflection is the "from" or "to"
        const relevantBridges = bridges.filter(
          ({ fromId, toId }) => fromId === reflectionId || toId === reflectionId
        );

        // Convert to connections with reflection info
        const connectionsList: ThreadConnection[] = relevantBridges
          .map(({ fromId, toId, bridge, bridgeType }): ThreadConnection | null => {
            const connectedId = fromId === reflectionId ? toId : fromId;
            const connectedReflection = reflections.find((r) => r.id === connectedId);

            if (!connectedReflection) return null;

            // Extract explanation, reasons, and weight from bridge
            let explanation = '';
            let reasons: string[] = [];
            let weight: number | undefined;

            if (bridgeType === 'narrative' && bridge && typeof bridge === 'object') {
              explanation = (bridge as any).explanation || '';
              reasons = (bridge as any).reasons || [];
              weight = (bridge as any).weight;
            } else if (bridgeType === 'meaning' && bridge && typeof bridge === 'object' && 'claim' in bridge) {
              explanation = (bridge as any).claim || '';
              reasons = ['meaning'];
              // Meaning bridges don't have weight, use default
              weight = 0.5;
            }

            return {
              reflectionId: connectedId,
              explanation,
              reasons,
              weight,
            };
          })
          .filter((c): c is ThreadConnection => c !== null);

        // Rank bridges by quality + diversity
        // Quality = weight (higher is better)
        // Diversity = unique reasons (more diverse is better)
        const rankedConnections: ThreadConnection[] = connectionsList
          .map(conn => {
            // Calculate diversity score: number of unique reasons
            const diversityScore = new Set(conn.reasons).size;
            // Combine weight (0-1) and diversity (normalized to 0-1, assuming max 5 reasons)
            const qualityScore = (conn.weight ?? 0.5) * 0.7 + (diversityScore / 5) * 0.3;
            return { ...conn, qualityScore };
          })
          .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

        if (!cancelled) {
          setConnections(rankedConnections);
        }
      } catch (err) {
        console.error('Failed to load thread connections', err);
        if (!cancelled) {
          setConnections([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadConnections();

    return () => {
      cancelled = true;
    };
  }, [reflectionId, walletAddress, sessionKey, encryptionReady, reflections]);

  // Show loading state
  if (loading) {
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <div className="text-xs text-white/40">Loading connections...</div>
      </div>
    );
  }

  // Filter bridges by quality score threshold (prefer fewer, stronger bridges)
  const strongBridges = connections.filter(conn => (conn.qualityScore ?? 0) >= MIN_QUALITY_SCORE);
  const weakBridges = connections.filter(conn => (conn.qualityScore ?? 0) < MIN_QUALITY_SCORE);
  const visibleBridges = showAllBridges ? connections : strongBridges;

  // Show orphan reflection message when no connections found
  if (connections.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <div className="space-y-2">
          <div className="text-xs text-white/60 font-medium">
            No connections found
          </div>
          <div className="text-xs text-white/40 leading-relaxed">
            This reflection stands alone for now. Some reflections explore unique ideas or capture moments that don't yet connect to other entries in your vault. This is information, not a gap—each reflection has value whether it's part of a thread or not.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-xs text-white/60">
          This reflection connects to {strongBridges.length} other{strongBridges.length !== 1 ? 's' : ''}
          {weakBridges.length > 0 && !showAllBridges && (
            <span className="text-white/40"> ({weakBridges.length} weak hidden)</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-3 pt-2 border-t border-white/10">
          {(showAllConnections ? visibleBridges : visibleBridges.slice(0, MAX_VISIBLE_BRIDGES)).map((conn) => {
            const reflection = reflections.find((r) => r.id === conn.reflectionId);
            const title =
              typeof reflection?.plaintext === 'string'
                ? reflection.plaintext.split('\n')[0].slice(0, 80) || '(no title)'
                : '(no title)';

            return (
              <div key={conn.reflectionId} className="space-y-1.5">
                <div className="text-xs text-white/50 font-medium">{title}</div>
                {conn.explanation && (() => {
                  // Do NOT render fallback explanations
                  const normalizedExplanation = conn.explanation.toLowerCase().trim();
                  const isFallbackPattern = [
                    'this later reflection builds on the earlier one',
                    'this connects to an earlier reflection',
                    'this builds on what came before',
                    'you viewed this from another angle',
                    'you saw this differently the second time',
                  ].some(pattern => normalizedExplanation === pattern || normalizedExplanation.includes(pattern));
                  
                  if (isFallbackPattern || conn.explanation.trim().length === 0) {
                    // Skip fallback explanations
                    return null;
                  }
                  
                  return <div className="text-xs text-white/70 leading-relaxed">{conn.explanation}</div>;
                })()}
                {conn.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {conn.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-xs text-white/50"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Show more/less toggle if there are more than MAX_VISIBLE_BRIDGES */}
          {visibleBridges.length > MAX_VISIBLE_BRIDGES && (
            <button
              onClick={() => setShowAllConnections(!showAllConnections)}
              className="w-full text-xs text-emerald-300 hover:text-emerald-200 transition-colors pt-2 border-t border-white/10"
            >
              {showAllConnections 
                ? `Show less (${MAX_VISIBLE_BRIDGES} of ${visibleBridges.length})`
                : `Show ${visibleBridges.length - MAX_VISIBLE_BRIDGES} more connection${visibleBridges.length - MAX_VISIBLE_BRIDGES !== 1 ? 's' : ''}`
              }
            </button>
          )}
          
          {/* Show all bridges toggle (including weak ones) */}
          {weakBridges.length > 0 && (
            <button
              onClick={() => setShowAllBridges(!showAllBridges)}
              className="w-full text-xs text-white/50 hover:text-white/70 transition-colors pt-2 border-t border-white/10"
            >
              {showAllBridges 
                ? `Hide ${weakBridges.length} weak bridge${weakBridges.length !== 1 ? 's' : ''}`
                : `Show all (${weakBridges.length} weak bridge${weakBridges.length !== 1 ? 's' : ''} hidden)`
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}


'use client';

/**
 * Lifetime - Signal Inventory View
 * 
 * Read-only structural table showing lifetime signals.
 * No interpretation, no summaries, no meaning.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { assembleYearNarrative } from '../../lib/narrative/assembleYearNarrativeDeterministic';
import { useLifetimeSignalInventory } from '../../lib/useLifetimeSignalInventory';
import { FEATURE_LIFETIME_INVENTORY } from '../../lib/featureFlags';
import type {
  ReflectionMeta,
  DeterministicCandidate,
} from '../../lib/lifetimeSignalInventory';

export default function LifetimePage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allReflections, setAllReflections] = useState<any[]>([]);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all reflections
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    if (!encryptionReady || !sessionKey) {
      if (encryptionError) {
        setError(encryptionError);
      }
      return;
    }

    let cancelled = false;

    async function loadReflections() {
      if (!address || !sessionKey) {
        setAllReflections([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 1000,
          offset: 0,
        });

        if (cancelled) return;

        setAllReflections(items);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load reflections', err);
          setError(err.message ?? 'Failed to load reflections');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReflections();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, encryptionError]);

  // Group reflections by year and assemble candidates
  const { reflectionMetas, deterministicCandidates } = useMemo(() => {
    if (allReflections.length === 0) {
      return { reflectionMetas: [], deterministicCandidates: [] };
    }

    // Convert to ReflectionMeta format
    const reflectionMetas: ReflectionMeta[] = allReflections.map((item) => ({
      id: item.id,
      createdAt: item.created_at,
    }));

    // Group by year
    const byYear = new Map<number, Array<{ id: string; created_at: string; text: string }>>();
    for (const item of allReflections) {
      const year = new Date(item.created_at).getFullYear();
      if (!byYear.has(year)) {
        byYear.set(year, []);
      }
      byYear.get(year)!.push({
        id: item.id,
        created_at: item.created_at,
        text: item.plaintext || '',
      });
    }

    // Assemble narrative for each year and collect candidates
    const allCandidates: DeterministicCandidate[] = [];
    for (const [year, yearReflections] of byYear.entries()) {
      const narrativeDraft = assembleYearNarrative(year, yearReflections);
      
      // Convert NarrativeCandidate to DeterministicCandidate
      for (const candidate of narrativeDraft.candidates) {
        // Map section names: 'themes' -> 'theme', 'transitions' -> 'transition', 'anchors' -> 'anchor'
        const categoryMap: Record<string, 'theme' | 'transition' | 'anchor'> = {
          themes: 'theme',
          transitions: 'transition',
          anchors: 'anchor',
        };
        
        allCandidates.push({
          id: `${year}-${candidate.section}-${candidate.text.slice(0, 20)}`,
          label: candidate.text,
          category: categoryMap[candidate.section] || 'theme',
          reflectionIds: candidate.sourceReflectionIds,
          confidence: candidate.confidence,
        });
      }
    }

    return { reflectionMetas, deterministicCandidates: allCandidates };
  }, [allReflections]);

  // Build inventory
  const inventory = useLifetimeSignalInventory({
    reflections: reflectionMetas,
    candidates: deterministicCandidates,
  });

  // Format date to YYYY-MM
  const formatYearMonth = (iso: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  if (!FEATURE_LIFETIME_INVENTORY) {
    return null;
  }

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white/80 text-sm uppercase tracking-wide mb-4">
            Lifetime Signal Inventory
          </h1>
          <p className="text-white/60">Please connect your wallet to view inventory.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white/80 text-sm uppercase tracking-wide mb-4">
            Lifetime Signal Inventory
          </h1>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white/80 text-sm uppercase tracking-wide mb-4">
            Lifetime Signal Inventory
          </h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-white/80 text-sm uppercase tracking-wide mb-6">
          Lifetime Signal Inventory
        </h1>

        {/* Explicit Boundary Copy */}
        <div className="mb-8 p-4 border border-white/10 bg-white/5 rounded-lg">
          <p className="text-xs text-white/50 leading-relaxed">
            This view shows structural signals only.
            It does not interpret meaning, causes, value, or importance.
            All conclusions remain user-authored.
          </p>
        </div>

        {/* Structural Table */}
        {inventory.signals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    Label
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    Category
                  </th>
                  <th className="text-right py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    Total Count
                  </th>
                  <th className="text-right py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    Distinct Months
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    First Seen
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    Last Seen
                  </th>
                  <th className="text-right py-3 px-4 text-xs text-white/60 uppercase tracking-wide font-normal">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventory.signals.map((signal) => (
                  <tr
                    key={signal.id}
                    className="border-b border-white/5 hover:bg-white/2 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-white/70">
                      {signal.label}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {signal.category}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right">
                      {signal.totalCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right">
                      {signal.distinctMonths}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {formatYearMonth(signal.firstSeen)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60">
                      {formatYearMonth(signal.lastSeen)}
                    </td>
                    <td className="py-3 px-4 text-sm text-white/60 text-right">
                      {signal.confidence.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-white/40">
            No signals found.
          </p>
        )}
      </div>
    </div>
  );
}

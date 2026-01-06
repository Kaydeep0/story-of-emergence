// src/app/reflections/thread/page.tsx
// Thread View - Narrative sequence of connected reflections in a cluster
// Layer 4: Visual encoding

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { getOrBuildGraph } from '../../../lib/graph/graphCache';
import { computeClusters } from '../../../lib/graph/clusterGraph';
import { buildThread, getClusterIdFromSeed, type ThreadResult } from '../../../lib/graph/buildThread';
import { NeoCard } from '../../../components/ui/NeoCard';
import { rpcInsertPin, type ThreadPinPayload } from '../../lib/pins';
import type { ReflectionEntry } from '../../lib/insights/types';
import type { Edge } from '../../../lib/graph/buildReflectionGraph';

export default function ThreadViewPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadResult, setThreadResult] = useState<ThreadResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const clusterIdParam = searchParams.get('clusterId');
  const seedIdParam = searchParams.get('seedReflectionId');
  const asOfParam = searchParams.get('asOf');
  const asOf = asOfParam ? new Date(asOfParam) : null;

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load reflections and build graph
  useEffect(() => {
    if (!mounted || !connected || !address || !encryptionReady || !sessionKey) {
      setReflections([]);
      setGraphEdges([]);
      return;
    }

    let cancelled = false;

    async function loadGraph() {
      if (!address || !sessionKey) return;
      try {
        setLoading(true);
        setError(null);

        // Load all reflections
        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 1000,
          offset: 0,
        });

        if (cancelled) return;

        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        setReflections(reflectionEntries);

        // Convert to Reflection[] format for graph builder
        const reflectionsForGraph = reflectionEntries.map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          text: r.plaintext,
        }));

        // Build or get cached graph
        const edges = await getOrBuildGraph(address, sessionKey, reflectionsForGraph, 'mind_all', 6);
        if (!cancelled) {
          setGraphEdges(edges);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load reflection graph', err);
          setError(err.message ?? 'Failed to load reflection graph');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGraph();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Compute clusters
  const nodeToCluster = useMemo(() => {
    if (reflections.length === 0 || graphEdges.length === 0) {
      return new Map<string, number>();
    }
    const nodeIds = reflections.map(r => r.id);
    return computeClusters(graphEdges, nodeIds);
  }, [reflections, graphEdges]);

  // Determine cluster ID from params
  const clusterId = useMemo(() => {
    if (clusterIdParam) {
      return parseInt(clusterIdParam, 10);
    }
    if (seedIdParam) {
      return getClusterIdFromSeed(seedIdParam, nodeToCluster);
    }
    return null;
  }, [clusterIdParam, seedIdParam, nodeToCluster]);

  // Build thread when cluster ID is determined
  useEffect(() => {
    if (clusterId === null || reflections.length === 0 || graphEdges.length === 0) {
      setThreadResult(null);
      return;
    }

    const result = buildThread(reflections, graphEdges, clusterId, nodeToCluster);
    setThreadResult(result);
  }, [clusterId, reflections, graphEdges, nodeToCluster]);

  // Handle pin thread
  const handlePinThread = useCallback(async () => {
    if (!address || !sessionKey || !threadResult || !seedIdParam) return;

    try {
      const scope = asOf ? 'mind_all' : 'mind_all'; // Use appropriate scope
      
      const payload: ThreadPinPayload = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        label: `Thread ${threadResult.clusterSize} reflections`,
        asOf: asOf ? asOf.toISOString() : null,
        seedReflectionId: seedIdParam,
        orderedReflectionIds: threadResult.nodes.map(n => n.reflection.id),
        keyBridges: threadResult.keyBridges.map(bridge => ({
          from: bridge.from.id,
          to: bridge.to.id,
          weight: bridge.weight,
          reasons: bridge.reasons,
        })),
      };

      await rpcInsertPin(address, sessionKey, 'thread_pin', scope, payload);
      alert('Thread pinned!');
    } catch (err: any) {
      console.error('Failed to pin thread', err);
      alert('Failed to pin thread: ' + (err.message ?? 'Unknown error'));
    }
  }, [address, sessionKey, threadResult, seedIdParam, asOf]);

  const extractTitle = (text: string): string => {
    const firstSentence = text.split(/[.!?]\s/)[0];
    if (firstSentence.length > 0 && firstSentence.length <= 80) {
      return firstSentence;
    }
    return text.slice(0, 80).trim() + (text.length > 80 ? '...' : '');
  };

  const extractPreview = (text: string): string => {
    const cleaned = text.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= 200) return cleaned;
    return cleaned.slice(0, 200).trim() + '...';
  };

  const formatReasons = (reasons: string[]): string[] => {
    return reasons.map(r => {
      if (r === 'lexical') return 'similar words';
      if (r === 'time') return 'nearby time';
      return r;
    });
  };

  const filteredThreadNodes = useMemo(() => {
    if (!threadResult || !searchQuery.trim()) {
      return threadResult?.nodes || [];
    }
    const query = searchQuery.toLowerCase();
    return threadResult.nodes.filter(node => {
      const title = extractTitle(node.reflection.plaintext).toLowerCase();
      const preview = extractPreview(node.reflection.plaintext).toLowerCase();
      return title.includes(query) || preview.includes(query);
    });
  }, [threadResult, searchQuery]);

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Please connect your wallet to view threads.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Loading thread...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-red-400">Error: {error}</p>
        </div>
      </main>
    );
  }

  if (!threadResult || threadResult.nodes.length === 0) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">
            {clusterId === null ? 'No cluster specified.' : 'Thread not found.'}
          </p>
        </div>
      </main>
    );
  }

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] hover:bg-[hsl(var(--panel)/0.7)] transition-colors"
              aria-label="Back to Mind View"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="h-6 w-1 rounded-full bg-[hsl(var(--accent))] shadow-[var(--glow-mid)]" />
              <h1 className="text-2xl font-semibold text-white/90">Thread View</h1>
            </div>
          </div>
          
          {/* Cluster info */}
          <NeoCard className="p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white/90 mb-1">
                  Cluster {clusterId! + 1}
                </h2>
                <p className="text-sm text-[hsl(var(--muted))]">
                  {threadResult.clusterSize} reflections • {formatDate(threadResult.timeRange.earliest)} → {formatDate(threadResult.timeRange.latest)}
                </p>
              </div>
              <button
                onClick={handlePinThread}
                className="px-4 py-2 rounded-lg border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
              >
                Save as Favorite Thread
              </button>
            </div>
          </NeoCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main thread timeline */}
          <div className="lg:col-span-2 space-y-4">
            {filteredThreadNodes.length === 0 ? (
              <NeoCard className="p-6">
                <p className="text-center text-[hsl(var(--muted))]">No reflections match your search.</p>
              </NeoCard>
            ) : (
              filteredThreadNodes.map((node, index) => {
                const date = new Date(node.reflection.createdAt);
                const formattedDate = date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                const formattedTime = date.toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                });

                return (
                  <NeoCard key={node.reflection.id} className="p-6">
                    <div className="space-y-3">
                      {/* Connection indicator */}
                      {index > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.3)] to-transparent" />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[hsl(var(--muted))]">
                              {node.connectionStrength > 0 ? `${Math.round(node.connectionStrength * 100)}%` : 'chronological'}
                            </span>
                            {node.connectionReason.length > 0 && (
                              <div className="flex gap-1">
                                {formatReasons(node.connectionReason).map((reason, i) => (
                                  <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 rounded-full border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-[hsl(var(--muted))]"
                                  >
                                    {reason}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent)/0.3)] to-transparent" />
                        </div>
                      )}

                      {/* Reflection content */}
                      <button
                        onClick={() => router.push(`/?focus=${node.reflection.id}`)}
                        className="w-full text-left group"
                      >
                        <h3 className="text-base font-semibold text-white/90 mb-2 group-hover:text-[hsl(var(--accent))] transition-colors line-clamp-2">
                          {extractTitle(node.reflection.plaintext)}
                        </h3>
                        <p className="text-sm text-[hsl(var(--muted))] mb-3">
                          {formattedDate} at {formattedTime}
                        </p>
                        <p className="text-sm text-white/70 leading-relaxed line-clamp-3">
                          {extractPreview(node.reflection.plaintext)}
                        </p>
                      </button>
                    </div>
                  </NeoCard>
                );
              })
            )}
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            {/* Search */}
            <NeoCard className="p-4">
              <h3 className="text-sm font-semibold text-white/90 mb-3">Search Thread</h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reflections..."
                className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-white/90 placeholder:text-white/40 focus:outline-none focus:border-[hsl(var(--accent)/0.5)] transition-colors"
              />
            </NeoCard>

            {/* Key bridges */}
            {threadResult.keyBridges.length > 0 && (
              <NeoCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-1 rounded-full bg-[hsl(var(--accent))]" />
                  <h3 className="text-sm font-semibold text-white/90">Key Bridges</h3>
                </div>
                <div className="space-y-3">
                  {threadResult.keyBridges.map((bridge, i) => (
                    <button
                      key={i}
                      onClick={() => router.push(`/?focus=${bridge.to.id}`)}
                      className="w-full text-left p-3 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] hover:bg-[hsl(var(--panel)/0.7)] hover:border-[hsl(var(--accent)/0.5)] transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[hsl(var(--accent))] font-medium">
                          {Math.round(bridge.weight * 100)}%
                        </span>
                        {bridge.reasons.length > 0 && (
                          <div className="flex gap-1">
                            {formatReasons(bridge.reasons).slice(0, 2).map((reason, j) => (
                              <span
                                key={j}
                                className="text-xs px-1.5 py-0.5 rounded border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-[hsl(var(--muted))]"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/80 group-hover:text-white/90 transition-colors line-clamp-1 mb-1">
                        {extractTitle(bridge.from.plaintext)}
                      </p>
                      <p className="text-xs text-white/60 group-hover:text-white/70 transition-colors line-clamp-1">
                        → {extractTitle(bridge.to.plaintext)}
                      </p>
                    </button>
                  ))}
                </div>
              </NeoCard>
            )}

            {/* Jump to node */}
            <NeoCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-4 w-1 rounded-full bg-[hsl(var(--accent))]" />
                <h3 className="text-sm font-semibold text-white/90">Jump to Node</h3>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {threadResult.nodes.map((node) => (
                  <button
                    key={node.reflection.id}
                    onClick={() => {
                      const element = document.getElementById(`thread-node-${node.reflection.id}`);
                      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-xs text-white/80 hover:text-white/90"
                  >
                    {extractTitle(node.reflection.plaintext)}
                  </button>
                ))}
              </div>
            </NeoCard>
          </div>
        </div>
      </div>
    </main>
  );
}


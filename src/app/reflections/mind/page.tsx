// src/app/reflections/mind/page.tsx
// Mind View - Force-directed network visualization of reflection graph
// Layer 4: Visual encoding

'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { getOrBuildGraph } from '../../../lib/graph/graphCache';
import type { Edge } from '../../../lib/graph/buildReflectionGraph';
import type { ReflectionEntry } from '../../lib/insights/types';
import dynamic from 'next/dynamic';
import { FocusPanel } from './components/FocusPanel';
import { computeClusters, getClusterStats, getClusterColorWithOpacity, getClusterColor } from '../../../lib/graph/clusterGraph';
import { NeoCard } from '../../../components/ui/NeoCard';
import { TimeScrubber } from './components/TimeScrubber';
import { EmergencePanel } from './components/EmergencePanel';
import { detectEmergenceEvents, type EmergenceEvent, type GraphState } from '../../../lib/graph/emergenceEvents';
import { rpcInsertPin, type ClusterPinPayload } from '../../lib/pins';
import { buildMeaningBridge } from '../../lib/meaningBridges/buildBridge';
import { upsertBridgeEncrypted, fetchBridgesForWallet } from '../../lib/meaningBridges/storage';
import { getSupabaseForWallet } from '../../lib/supabase';
import type { MeaningBridge } from '../../lib/meaningBridges/types';
import { WhyLinkedPanel } from './components/WhyLinkedPanel';

// Dynamically import react-force-graph-2d to avoid SSR issues and VR dependencies
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
}) as any;

export default function MindViewPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor, links: reflectionLinks, error: linksError, loading: linksLoading, refetch: refetchLinks } = useReflectionLinks(address);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [graphEdges, setGraphEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [filteredClusterId, setFilteredClusterId] = useState<number | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const [emergenceEvents, setEmergenceEvents] = useState<EmergenceEvent[]>([]);
  const [activeEventNodeId, setActiveEventNodeId] = useState<string | null>(null);
  const [activeEventClusterId, setActiveEventClusterId] = useState<number | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ from: string; to: string } | null>(null);
  const [bridgeCache, setBridgeCache] = useState<Map<string, MeaningBridge>>(new Map());
  const priorGraphStateRef = useRef<GraphState | null>(null);
  const graphRef = useRef<any>(null);

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

        // Convert ReflectionEntry[] to Reflection[] format for graph builder
        const reflectionsForGraph = reflectionEntries.map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          text: r.plaintext,
        }));

        // Build or get cached graph (encrypted)
        const edges = await getOrBuildGraph(address, sessionKey, reflectionsForGraph, 'lifetime', 6);
        setGraphEdges(edges);
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

  // Filter reflections by asOf date
  const filteredReflections = useMemo(() => {
    if (!asOf) return reflections;
    return reflections.filter(r => new Date(r.createdAt).getTime() <= asOf.getTime());
  }, [reflections, asOf]);

  // Get time scope for cache key
  const getTimeScope = useCallback((asOfDate: Date | null, latestDate: Date | null): string => {
    if (!asOfDate || !latestDate) return 'mind_all';
    const daysDiff = Math.floor((latestDate.getTime() - asOfDate.getTime()) / (24 * 60 * 60 * 1000));
    if (daysDiff <= 7) return 'mind_7d';
    if (daysDiff <= 30) return 'mind_30d';
    if (daysDiff <= 90) return 'mind_90d';
    return 'mind_all';
  }, []);

  // Load or build graph for filtered reflections
  useEffect(() => {
    if (!mounted || !connected || !address || !encryptionReady || !sessionKey || filteredReflections.length === 0) {
      setGraphEdges([]);
      return;
    }

    let cancelled = false;

    async function loadFilteredGraph() {
      if (!address || !sessionKey) return;
      try {
        // Convert filtered reflections to Reflection[] format
        const reflectionsForGraph = filteredReflections.map(r => ({
          id: r.id,
          createdAt: r.createdAt,
          text: r.plaintext,
        }));

        // Determine scope based on asOf date
        const latestReflection = reflections.reduce((latest, r) => {
          const rDate = new Date(r.createdAt);
          return rDate > latest ? rDate : latest;
        }, new Date(filteredReflections[0].createdAt));
        
        const scope = getTimeScope(asOf, latestReflection);

        // Build or get cached graph (encrypted) with scope
        const edges = await getOrBuildGraph(address, sessionKey, reflectionsForGraph, scope, 6);
        if (!cancelled) {
          setGraphEdges(edges);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load filtered reflection graph', err);
        }
      }
    }

    loadFilteredGraph();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, filteredReflections, asOf, reflections, getTimeScope]);

  // Compute clusters (memoized) for filtered reflections
  const nodeToCluster = useMemo(() => {
    if (filteredReflections.length === 0 || graphEdges.length === 0) {
      return new Map<string, number>();
    }
    const nodeIds = filteredReflections.map(r => r.id);
    return computeClusters(graphEdges, nodeIds);
  }, [filteredReflections, graphEdges]);

  // Get cluster statistics
  const clusterStats = useMemo(() => {
    return getClusterStats(nodeToCluster);
  }, [nodeToCluster]);

  // Detect emergence events when graph state changes
  useEffect(() => {
    if (filteredReflections.length === 0 || graphEdges.length === 0) {
      setEmergenceEvents([]);
      priorGraphStateRef.current = null;
      return;
    }

    const currentGraphState: GraphState = {
      nodes: filteredReflections.map(r => ({ id: r.id, createdAt: r.createdAt })),
      links: graphEdges.map(e => ({
        source: e.from,
        target: e.to,
        weight: e.weight,
      })),
      clusters: nodeToCluster,
    };

    const events = detectEmergenceEvents(priorGraphStateRef.current, currentGraphState);
    setEmergenceEvents(events);

    // Update prior state for next comparison
    priorGraphStateRef.current = currentGraphState;
  }, [filteredReflections, graphEdges, nodeToCluster]);

  // Clear active event effects after animation duration
  useEffect(() => {
    if (activeEventNodeId) {
      const timer = setTimeout(() => setActiveEventNodeId(null), 600);
      return () => clearTimeout(timer);
    }
  }, [activeEventNodeId]);

  useEffect(() => {
    if (activeEventClusterId !== null) {
      const timer = setTimeout(() => setActiveEventClusterId(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeEventClusterId]);

  // Clear selected node if it's not in filtered set
  useEffect(() => {
    if (selectedNodeId && !filteredReflections.find(r => r.id === selectedNodeId)) {
      setSelectedNodeId(null);
      setHighlightedNodes(new Set());
    }
  }, [selectedNodeId, filteredReflections]);

  // Compute graph data structure for react-force-graph
  // Render nodes even if edges are empty (links failure shouldn't block visualization)
  const graphData = useMemo(() => {
    if (filteredReflections.length === 0) {
      return { nodes: [], links: [] };
    }
    
    // If edges are empty but we have reflections, still show nodes
    if (graphEdges.length === 0) {
      const nodeMap = new Map<string, { id: string; reflection: ReflectionEntry; clusterId: number }>();
      filteredReflections.forEach(ref => {
        const clusterId = nodeToCluster.get(ref.id) ?? -1;
        nodeMap.set(ref.id, {
          id: ref.id,
          reflection: ref,
          clusterId,
        });
      });
      
      const nodes = Array.from(nodeMap.values()).map(node => ({
        id: node.id,
        size: 5, // Default size when no edges
        outDegree: 0,
        reflection: node.reflection,
        clusterId: node.clusterId,
      }));
      
      return { nodes, links: [] };
    }

    // Create node map from filtered reflections
    const nodeMap = new Map<string, { id: string; outDegree: number; reflection: ReflectionEntry; clusterId: number }>();
    
    // Initialize nodes with cluster IDs (only filtered reflections)
    filteredReflections.forEach(ref => {
      const clusterId = nodeToCluster.get(ref.id) ?? -1;
      nodeMap.set(ref.id, {
        id: ref.id,
        outDegree: 0,
        reflection: ref,
        clusterId,
      });
    });

    // Calculate weighted out-degree for each node
    graphEdges.forEach(edge => {
      const node = nodeMap.get(edge.from);
      if (node) {
        node.outDegree += edge.weight;
      }
    });

    // Convert to array and calculate size
    const nodes = Array.from(nodeMap.values()).map(node => {
      // Normalize out-degree to node size (min 3, max 15)
      const maxOutDegree = Math.max(...Array.from(nodeMap.values()).map(n => n.outDegree), 1);
      const normalizedSize = maxOutDegree > 0 
        ? 3 + (node.outDegree / maxOutDegree) * 12 
        : 5;
      
      return {
        id: node.id,
        size: normalizedSize,
        outDegree: node.outDegree,
        reflection: node.reflection,
        clusterId: node.clusterId,
      };
    });

    // Convert edges to links format (include reasons and cluster info for styling)
    const links = graphEdges.map(edge => {
      const sourceClusterId = nodeToCluster.get(edge.from) ?? -1;
      const targetClusterId = nodeToCluster.get(edge.to) ?? -1;
      const sameCluster = sourceClusterId === targetClusterId && sourceClusterId !== -1;
      
      return {
        source: edge.from,
        target: edge.to,
        weight: edge.weight,
        reasons: edge.reasons || [],
        sameCluster,
      };
    });

    return { nodes, links };
  }, [reflections, graphEdges, nodeToCluster]);

  // Build bridges for top edges (async)
  const buildBridgesForTopEdges = useCallback(async (
    edges: Edge[],
    reflections: ReflectionEntry[],
    wallet: string,
    key: CryptoKey
  ) => {
    if (!edges.length || !reflections.length) return;
    
    // Get top 20 edges by weight
    const topEdges = [...edges]
      .sort((a, b) => (b.weight || 0) - (a.weight || 0))
      .slice(0, 20);
    
    const supabase = getSupabaseForWallet(wallet);
    const reflectionMap = new Map(reflections.map(r => [r.id, r]));
    const newCache = new Map(bridgeCache);
    
    // Load existing bridges first
    try {
      const existingBridges = await fetchBridgesForWallet({
        supabase,
        wallet,
        key,
        limit: 300,
      });
      
      for (const { fromId, toId, bridge } of existingBridges) {
        const key = `${fromId}:${toId}`;
        // Only cache MeaningBridge types (narrative bridges are handled separately in thread view)
        if (bridge && typeof bridge === 'object' && 'title' in bridge && 'claim' in bridge) {
          newCache.set(key, bridge as MeaningBridge);
        }
      }
    } catch (err) {
      console.error('Failed to load existing bridges', err);
    }
    
    // Build bridges for edges that don't have one yet
    for (const edge of topEdges) {
      const cacheKey = `${edge.from}:${edge.to}`;
      if (newCache.has(cacheKey)) continue; // Already have bridge
      
      const fromRef = reflectionMap.get(edge.from);
      const toRef = reflectionMap.get(edge.to);
      
      if (!fromRef || !toRef) continue;
      
      try {
        const bridge = buildMeaningBridge(fromRef.plaintext, toRef.plaintext);
        newCache.set(cacheKey, bridge);
        
        // Upsert encrypted bridge (async, don't wait)
        upsertBridgeEncrypted({
          supabase,
          wallet,
          fromId: edge.from,
          toId: edge.to,
          bridge,
          key,
        }).catch(err => {
          console.error(`Failed to save bridge ${cacheKey}`, err);
        });
      } catch (err) {
        console.error(`Failed to build bridge ${cacheKey}`, err);
      }
    }
    
    setBridgeCache(newCache);
  }, [bridgeCache]);
  
  // Build bridges when graph edges change
  useEffect(() => {
    if (!mounted || !connected || !address || !encryptionReady || !sessionKey || graphEdges.length === 0 || reflections.length === 0) {
      return;
    }

    // Build bridges for top edges (async, don't block)
    buildBridgesForTopEdges(graphEdges, reflections, address, sessionKey).catch(err => {
      console.error('Failed to build bridges', err);
    });
  }, [mounted, connected, address, encryptionReady, sessionKey, graphEdges.length, reflections.length, buildBridgesForTopEdges]);
  
  // Get bridge for selected edge
  const selectedBridge = useMemo(() => {
    if (!selectedEdge) return null;
    const cacheKey = `${selectedEdge.from}:${selectedEdge.to}`;
    return bridgeCache.get(cacheKey) || null;
  }, [selectedEdge, bridgeCache]);

  // Get neighbors for a node
  const getNeighbors = useCallback((nodeId: string) => {
    const neighborIds = new Set<string>();
    graphEdges.forEach(edge => {
      if (edge.from === nodeId) {
        neighborIds.add(edge.to);
      }
      if (edge.to === nodeId) {
        neighborIds.add(edge.from);
      }
    });
    return neighborIds;
  }, [graphEdges]);

  // Handle node click - focus and highlight neighbors
  const handleNodeClick = useCallback((node: any) => {
    if (!node) {
      setSelectedNodeId(null);
      setHighlightedNodes(new Set());
      return;
    }

    setSelectedNodeId(node.id);
    
    // Find all neighbors (nodes connected to this node)
    const neighborIds = getNeighbors(node.id);
    
    // Include the selected node itself
    neighborIds.add(node.id);
    setHighlightedNodes(neighborIds);

    // Center on node (if graph ref is available)
    if (graphRef.current && typeof graphRef.current.centerAt === 'function') {
      // Use node position if available, otherwise center by ID
      if (node.x !== undefined && node.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 1000);
      } else {
        // Fallback: zoom to fit
        graphRef.current.zoomToFit(400, 20);
      }
    }
  }, [getNeighbors]);

  // Handle neighbor selection from panel
  const handleSelectNeighbor = useCallback((neighborId: string) => {
    // Find the node in graphData
    const neighborNode = graphData.nodes.find((n: any) => n.id === neighborId);
    if (neighborNode) {
      handleNodeClick(neighborNode);
    }
  }, [graphData, handleNodeClick]);

  // Center graph on selected node
  const handleCenterGraph = useCallback(() => {
    if (!selectedNodeId || !graphRef.current) return;
    const selectedNode = graphData.nodes.find((n: any) => n.id === selectedNodeId) as any;
    if (selectedNode && selectedNode.x !== undefined && selectedNode.y !== undefined) {
      graphRef.current.centerAt(selectedNode.x, selectedNode.y, 1000);
    }
  }, [selectedNodeId, graphData]);

  // Handle emergence event focus
  const handleFocusEmergenceNode = useCallback((nodeId: string) => {
    const node = graphData.nodes.find((n: any) => n.id === nodeId);
    if (node) {
      handleNodeClick(node);
      setActiveEventNodeId(nodeId);
    }
  }, [graphData, handleNodeClick]);

  const handleFocusEmergenceCluster = useCallback((clusterId: number) => {
    setFilteredClusterId(clusterId);
    setActiveEventClusterId(clusterId);
    
    // Center on cluster centroid
    const clusterNodes = graphData.nodes.filter((n: any) => n.clusterId === clusterId);
    if (clusterNodes.length > 0 && graphRef.current) {
      // Calculate centroid
      let sumX = 0, sumY = 0;
      clusterNodes.forEach((node: any) => {
        if (node.x !== undefined && node.y !== undefined) {
          sumX += node.x;
          sumY += node.y;
        }
      });
      const centroidX = sumX / clusterNodes.length;
      const centroidY = sumY / clusterNodes.length;
      
      if (centroidX && centroidY && graphRef.current.centerAt) {
        graphRef.current.centerAt(centroidX, centroidY, 1000);
      }
    }
  }, [graphData]);

  // Handle thread navigation
  const handleOpenThread = useCallback((clusterId: number) => {
    // Preserve asOf in URL if set
    const params = new URLSearchParams();
    params.set('clusterId', clusterId.toString());
    if (asOf) {
      params.set('asOf', asOf.toISOString());
    }
    router.push(`/reflections/thread?${params.toString()}`);
  }, [router, asOf]);

  // Handle pin cluster
  const handlePinCluster = useCallback(async (clusterId: number) => {
    if (!address || !sessionKey) return;

    try {
      const clusterNodes = filteredReflections.filter(r => {
        const nodeClusterId = nodeToCluster.get(r.id);
        return nodeClusterId === clusterId;
      });

      if (clusterNodes.length === 0) {
        alert('No nodes in this cluster');
        return;
      }

      // Calculate top nodes by degree
      const nodeDegrees = new Map<string, number>();
      clusterNodes.forEach(node => {
        let degree = 0;
        graphEdges.forEach(edge => {
          if (edge.from === node.id || edge.to === node.id) {
            degree += edge.weight;
          }
        });
        nodeDegrees.set(node.id, degree);
      });

      const topNodes = Array.from(nodeDegrees.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, degree]) => ({ id, degree }));

      // Calculate time range
      const times = clusterNodes.map(r => new Date(r.createdAt).getTime());
      const earliest = new Date(Math.min(...times));
      const latest = new Date(Math.max(...times));

      // Get scope
      const latestReflection = reflections.length > 0
        ? reflections.reduce((latest, r) => {
            const rDate = new Date(r.createdAt);
            return rDate > latest ? rDate : latest;
          }, new Date(reflections[0].createdAt))
        : new Date();
      const scope = getTimeScope(asOf, latestReflection);

      const payload: ClusterPinPayload = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        label: `Cluster ${clusterId + 1}`,
        asOf: asOf ? asOf.toISOString() : null,
        clusterId,
        memberIds: clusterNodes.map(r => r.id),
        size: clusterNodes.length,
        timeRange: {
          earliest: earliest.toISOString(),
          latest: latest.toISOString(),
        },
        topNodes,
      };

      await rpcInsertPin(address, sessionKey, 'cluster_pin', scope, payload);
      alert('Cluster pinned!');
    } catch (err: any) {
      console.error('Failed to pin cluster', err);
      alert('Failed to pin cluster: ' + (err.message ?? 'Unknown error'));
    }
  }, [address, sessionKey, filteredReflections, nodeToCluster, graphEdges, asOf, reflections, getTimeScope]);

  // Handle node double-click - open reflection
  const handleNodeDoubleClick = useCallback((node: any) => {
    if (node?.id) {
      router.push(`/?focus=${node.id}`);
    }
  }, [router]);

  // Extract title from reflection text
  const extractTitle = (text: string): string => {
    const firstSentence = text.split(/[.!?]\s/)[0];
    if (firstSentence.length > 0 && firstSentence.length <= 60) {
      return firstSentence;
    }
    return text.slice(0, 60).trim() + (text.length > 60 ? '...' : '');
  };

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Please connect your wallet to view the Mind Map.</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Loading reflection graph...</p>
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

  if (graphData.nodes.length === 0) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">No reflections found. Start writing to see your mind map.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
      <div className={`max-w-7xl mx-auto px-4 py-8 ${selectedNodeId ? 'lg:pr-[440px]' : ''}`}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-1 rounded-full bg-[hsl(var(--accent))] shadow-[var(--glow-mid)]" />
            <h1 className="text-2xl font-semibold text-white/90">Mind View</h1>
          </div>
          <p className="text-sm text-[hsl(var(--muted))] ml-3">
            Force-directed network of your reflections. Click to focus, double-click to open.
          </p>
        </div>

        {/* Cluster Legend */}
        {(() => {
          const topClusters = Array.from(clusterStats.values())
            .sort((a, b) => b.nodeIds.length - a.nodeIds.length)
            .slice(0, 5);
          
          if (topClusters.length === 0) return null;
          
          return (
            <div className="mb-4">
              <NeoCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-4 w-1 rounded-full bg-[hsl(var(--accent))]" />
                  <h3 className="text-sm font-semibold text-white/90">Clusters</h3>
                  {filteredClusterId !== null && (
                    <button
                      onClick={() => setFilteredClusterId(null)}
                      className="ml-auto text-xs text-[hsl(var(--muted))] hover:text-white/90 transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {topClusters.map((cluster) => {
                    const isFiltered = filteredClusterId === cluster.clusterId;
                    return (
                      <button
                        key={cluster.clusterId}
                        onClick={() => setFilteredClusterId(isFiltered ? null : cluster.clusterId)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                          isFiltered
                            ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)]'
                            : 'border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] hover:bg-[hsl(var(--panel)/0.7)]'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getClusterColor(cluster.clusterId) }}
                        />
                        <span className="text-xs text-white/80">
                          Cluster {cluster.clusterId + 1}
                        </span>
                        <span className="text-xs text-[hsl(var(--muted))]">
                          ({cluster.nodeIds.length})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </NeoCard>
            </div>
          );
        })()}

        {/* Time Scrubber */}
        {(() => {
          const earliestDate = reflections.length > 0
            ? reflections.reduce((earliest, r) => {
                const rDate = new Date(r.createdAt);
                return rDate < earliest ? rDate : earliest;
              }, new Date(reflections[0].createdAt))
            : null;
          
          const latestDate = reflections.length > 0
            ? reflections.reduce((latest, r) => {
                const rDate = new Date(r.createdAt);
                return rDate > latest ? rDate : latest;
              }, new Date(reflections[0].createdAt))
            : null;

          return earliestDate && latestDate ? (
            <TimeScrubber
              earliestDate={earliestDate}
              latestDate={latestDate}
              asOf={asOf}
              onAsOfChange={setAsOf}
              reflectionCount={filteredReflections.length}
              edgeCount={graphEdges.length}
              clusterCount={clusterStats.size}
            />
          ) : null;
        })()}

        {/* Emergence Panel */}
        {emergenceEvents.length > 0 && (
          <EmergencePanel
            events={emergenceEvents}
            reflections={filteredReflections}
            onFocusNode={handleFocusEmergenceNode}
            onFocusCluster={handleFocusEmergenceCluster}
          />
        )}

        {/* Why Linked Panel */}
        {selectedBridge && selectedEdge && 'title' in selectedBridge && 'claim' in selectedBridge && (
          <div className="mb-4">
            <WhyLinkedPanel 
              bridge={selectedBridge as MeaningBridge} 
              fromId={selectedEdge.from}
              toId={selectedEdge.to}
            />
          </div>
        )}

        {/* Links unavailable banner - don't show for "Wallet not ready" */}
        {linksError && linksError !== "Wallet not ready" && !linksLoading && (
          <NeoCard className="p-4 mb-4 border-yellow-500/50 bg-yellow-500/5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-yellow-400">
                  Links unavailable. Showing nodes only.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-xs text-yellow-500/70 mt-1">
                    {linksError}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  refetchLinks();
                }}
                className="px-3 py-1.5 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </NeoCard>
        )}

        {/* Graph container */}
        <div className="rounded-2xl border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.70)] overflow-hidden shadow-[var(--glow-soft)]">
          <div style={{ width: '100%', height: '80vh', minHeight: '600px' }}>
            {mounted && (
              <ForceGraph2D
                ref={(ref: any) => { graphRef.current = ref; }}
                graphData={graphData}
                nodeLabel={(node: any) => {
                  const reflection = reflections.find(r => r.id === node.id);
                  if (!reflection) return node.id;
                  return extractTitle(reflection.plaintext);
                }}
                nodeColor={(node: any) => {
                  const isSelected = selectedNodeId === node.id;
                  const isHighlighted = highlightedNodes.has(node.id);
                  const clusterId = node.clusterId ?? -1;
                  const isEventNode = activeEventNodeId === node.id;
                  
                  // Apply cluster filter dimming
                  if (filteredClusterId !== null && clusterId !== filteredClusterId) {
                    return `hsl(var(--muted) / 0.1)`;
                  }
                  
                  // Event node glow (for birth/spike)
                  if (isEventNode) {
                    return clusterId >= 0 ? getClusterColorWithOpacity(clusterId, 1.0) : `hsl(var(--accent))`;
                  }
                  
                  if (isSelected) {
                    // Selected node uses cluster color at higher opacity
                    return clusterId >= 0 ? getClusterColorWithOpacity(clusterId, 0.9) : `hsl(var(--accent))`;
                  }
                  if (isHighlighted) {
                    return `hsl(var(--accent) / 0.7)`;
                  }
                  // Dim non-neighbors when focused
                  if (selectedNodeId && !highlightedNodes.has(node.id)) {
                    return `hsl(var(--muted) / 0.2)`;
                  }
                  // Use cluster color at low opacity for normal nodes
                  return clusterId >= 0 ? getClusterColorWithOpacity(clusterId, 0.4) : `hsl(var(--muted) / 0.5)`;
                }}
                nodeVal={(node: any) => node.size || 5}
                nodeRelSize={1}
                linkColor={(link: any) => {
                  const sameCluster = link.sameCluster || false;
                  const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                  const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                  
                  // Brighten links from focused node
                  if (selectedNodeId) {
                    const isFromFocused = sourceId === selectedNodeId;
                    if (isFromFocused) {
                      // Brighten based on weight
                      const opacity = 0.3 + (link.weight || 0) * 0.7;
                      return `hsl(var(--accent) / ${opacity})`;
                    }
                    // Dim non-focused links
                    const isToFocused = targetId === selectedNodeId;
                    if (isToFocused) {
                      return `hsl(var(--accent) / 0.3)`;
                    }
                    return `hsl(var(--line) / 0.1)`;
                  }
                  
                  // Brighten cluster merge (links within active event cluster)
                  if (activeEventClusterId !== null) {
                    const sourceNode = graphData.nodes.find((n: any) => n.id === sourceId);
                    const targetNode = graphData.nodes.find((n: any) => n.id === targetId);
                    if (sourceNode?.clusterId === activeEventClusterId && targetNode?.clusterId === activeEventClusterId) {
                      return getClusterColorWithOpacity(activeEventClusterId, 0.7);
                    }
                  }
                  
                  // Normal mode: brighter for same-cluster links
                  if (sameCluster) {
                    return `hsl(var(--line) / 0.5)`;
                  }
                  return `hsl(var(--line) / 0.3)`;
                }}
                linkWidth={(link: any) => {
                  // Thicken links from focused node based on weight
                  if (selectedNodeId) {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    const isFromFocused = sourceId === selectedNodeId;
                    if (isFromFocused) {
                      return 1 + (link.weight || 0) * 3; // 1-4px for focused links
                    }
                    const isToFocused = targetId === selectedNodeId;
                    if (isToFocused) {
                      return 0.5 + (link.weight || 0) * 1.5; // 0.5-2px
                    }
                    return 0.5; // Thin for dimmed links
                  }
                  // Scale link width by weight (0.5 to 2)
                  return 0.5 + (link.weight || 0) * 1.5;
                }}
                nodeCanvasObjectMode={(node: any) => {
                  // Add halo ring for focused node and event nodes
                  if (selectedNodeId === node.id || activeEventNodeId === node.id || 
                      (activeEventClusterId !== null && node.clusterId === activeEventClusterId)) {
                    return 'after';
                  }
                  return null;
                }}
                nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
                  const size = node.size || 5;
                  const clusterId = node.clusterId ?? -1;
                  
                  // Draw halo ring around focused node using cluster color
                  if (selectedNodeId === node.id) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
                    ctx.strokeStyle = clusterId >= 0 
                      ? getClusterColorWithOpacity(clusterId, 0.7)
                      : `hsl(var(--accent) / 0.5)`;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                  }
                  
                  // Draw event halo for connectivity spikes and node births
                  if (activeEventNodeId === node.id) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size + 6, 0, 2 * Math.PI);
                    ctx.strokeStyle = clusterId >= 0 
                      ? getClusterColorWithOpacity(clusterId, 0.8)
                      : `hsl(var(--accent) / 0.8)`;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                  }
                  
                  // Draw cluster formation outline (blurred ring approximation)
                  if (activeEventClusterId !== null && clusterId === activeEventClusterId) {
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI);
                    ctx.strokeStyle = getClusterColorWithOpacity(clusterId, 0.6);
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                  }
                }}
                linkDirectionalArrowLength={4}
                linkDirectionalArrowRelPos={1}
                onNodeClick={handleNodeClick}
                onNodeDoubleClick={handleNodeDoubleClick}
                onLinkHover={(link: any) => {
                  if (link) {
                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                    setSelectedEdge({ from: sourceId, to: targetId });
                  } else {
                    setSelectedEdge(null);
                  }
                }}
                onBackgroundClick={() => {
                  setSelectedNodeId(null);
                  setHighlightedNodes(new Set());
                  setSelectedEdge(null);
                }}
                cooldownTicks={100}
                onEngineStop={() => {
                  // Graph has stabilized
                }}
                d3Force={{
                  charge: {
                    strength: -300,
                  },
                  link: {
                    distance: (link: any) => {
                      // Distance based on weight (inverse relationship)
                      return 50 + (1 - (link.weight || 0)) * 100;
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Focus Panel - Right side on desktop, bottom drawer on mobile */}
        {selectedNodeId && (() => {
          const selectedReflection = reflections.find(r => r.id === selectedNodeId);
          if (!selectedReflection) return null;
          
          const neighbors = graphEdges
            .filter(e => e.from === selectedNodeId || e.to === selectedNodeId)
            .map(e => {
              const neighborId = e.from === selectedNodeId ? e.to : e.from;
              const reflection = reflections.find(r => r.id === neighborId);
              return reflection ? { reflection, edge: e } : null;
            })
            .filter((n): n is { reflection: ReflectionEntry; edge: Edge } => n !== null)
            .sort((a, b) => (b.edge.weight || 0) - (a.edge.weight || 0))
            .slice(0, 8);

          return (
            <>
              {/* Desktop: Right-side panel */}
              <div className="hidden lg:block fixed inset-y-0 right-0 w-[420px] p-6 overflow-y-auto z-10 pointer-events-none">
                <div className="pointer-events-auto">
                  <FocusPanel
                    reflection={selectedReflection}
                    neighbors={neighbors}
                    clusterId={nodeToCluster.get(selectedNodeId) ?? -1}
                    clusterSize={clusterStats.get(nodeToCluster.get(selectedNodeId) ?? -1)?.nodeIds.length ?? 0}
                    onOpenReflection={(id) => router.push(`/?focus=${id}`)}
                    onCenterGraph={handleCenterGraph}
                    onClearFocus={() => {
                      setSelectedNodeId(null);
                      setHighlightedNodes(new Set());
                    }}
                    onSelectNeighbor={handleSelectNeighbor}
                    asOf={asOf}
                    onOpenThread={handleOpenThread}
                    onPinCluster={handlePinCluster}
                  />
                </div>
              </div>

              {/* Mobile: Bottom drawer */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto z-10 pointer-events-none">
                <div className="pointer-events-auto p-4">
                  <FocusPanel
                    reflection={selectedReflection}
                    neighbors={neighbors}
                    clusterId={nodeToCluster.get(selectedNodeId) ?? -1}
                    clusterSize={clusterStats.get(nodeToCluster.get(selectedNodeId) ?? -1)?.nodeIds.length ?? 0}
                    onOpenReflection={(id) => router.push(`/?focus=${id}`)}
                    onCenterGraph={handleCenterGraph}
                    onClearFocus={() => {
                      setSelectedNodeId(null);
                      setHighlightedNodes(new Set());
                    }}
                    onSelectNeighbor={handleSelectNeighbor}
                    asOf={asOf}
                    onOpenThread={handleOpenThread}
                    onPinCluster={handlePinCluster}
                  />
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </main>
  );
}


// src/app/components/ReflectionLinks.tsx
// Minimal Links section for reflection detail view

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import type {
  RelationshipGraph,
  RelationshipEdge,
  AnyRelationshipNode,
  ReflectionNode,
  SourceNode,
  TagNode,
} from '../lib/relationships/types';
import {
  encryptRelationshipGraph,
  decryptRelationshipGraph,
} from '../lib/relationships/encryption';
import {
  saveRelationshipPayload,
  loadRelationshipPayload,
  loadAllRelationshipPayloads,
} from '../lib/relationships/storage';
import { useRouter } from 'next/navigation';

type LinkType = 'tag' | 'reflection' | 'source';

interface ReflectionLinksProps {
  reflectionId: string;
  walletAddress: string;
  sessionKey: CryptoKey | null;
  encryptionReady: boolean;
}

export function ReflectionLinks({
  reflectionId,
  walletAddress,
  sessionKey,
  encryptionReady,
}: ReflectionLinksProps) {
  const router = useRouter();
  const [graph, setGraph] = useState<RelationshipGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('tag');
  const [linkReference, setLinkReference] = useState('');
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [backlinks, setBacklinks] = useState<Array<{ reflectionId: string; nodeId: string }>>([]);
  const [loadingBacklinks, setLoadingBacklinks] = useState(false);

  // Load relationships for this reflection
  const loadRelationships = useCallback(async () => {
    if (!encryptionReady || !sessionKey || !walletAddress) return;

    setLoading(true);
    try {
      // Try to find existing relationship ID for this reflection
      // For now, we'll use a deterministic ID based on reflection ID
      const id = `reflection_${reflectionId}`;
      setRelationshipId(id);

      const payload = await loadRelationshipPayload(walletAddress, id);
      if (payload) {
        const decrypted = await decryptRelationshipGraph(sessionKey, payload);
        setGraph(decrypted);
      } else {
        // Initialize empty graph with reflection node
        const reflectionNode: ReflectionNode = {
          id: `node_${reflectionId}`,
          type: 'reflection',
          reflectionId,
          createdAt: new Date().toISOString(),
        };
        setGraph({ nodes: [reflectionNode], edges: [] });
      }
    } catch (err: any) {
      console.error('Failed to load relationships', err);
      // Initialize empty graph on error
      const reflectionNode: ReflectionNode = {
        id: `node_${reflectionId}`,
        type: 'reflection',
        reflectionId,
        createdAt: new Date().toISOString(),
      };
      setGraph({ nodes: [reflectionNode], edges: [] });
    } finally {
      setLoading(false);
    }
  }, [reflectionId, walletAddress, sessionKey, encryptionReady]);

  // Save relationships
  const saveRelationships = useCallback(async () => {
    if (!encryptionReady || !sessionKey || !walletAddress || !relationshipId) return;

    setSaving(true);
    try {
      const payload = await encryptRelationshipGraph(sessionKey, graph);
      await saveRelationshipPayload(walletAddress, payload);
      toast.success('Links saved');
    } catch (err: any) {
      console.error('Failed to save relationships', err);
      toast.error('Failed to save links');
    } finally {
      setSaving(false);
    }
  }, [graph, walletAddress, sessionKey, encryptionReady, relationshipId]);

  // Load backlinks by scanning all relationship payloads
  const loadBacklinks = useCallback(async () => {
    if (!encryptionReady || !sessionKey || !walletAddress) return;

    setLoadingBacklinks(true);
    try {
      // Load all relationship payloads for the wallet
      const allPayloads = await loadAllRelationshipPayloads(walletAddress);

      const foundBacklinks: Array<{ reflectionId: string; nodeId: string }> = [];

      // Decrypt and scan each payload
      for (const { reflectionId: otherReflectionId, payload } of allPayloads) {
        // Skip the current reflection's own payload
        if (otherReflectionId === reflectionId) continue;

        try {
          const otherGraph = await decryptRelationshipGraph(sessionKey, payload);
          
          // Find edges that point TO the current reflection
          for (const edge of otherGraph.edges) {
            if (edge.deletedAt) continue;

            // Check if this edge points to the current reflection
            const targetNode = otherGraph.nodes.find((n) => n.id === edge.toNodeId);
            if (!targetNode) continue;

            // Check if target node is the current reflection
            if (
              targetNode.type === 'reflection' &&
              (targetNode as ReflectionNode).reflectionId === reflectionId
            ) {
              // Found a backlink! Get the source reflection
              const sourceNode = otherGraph.nodes.find((n) => n.id === edge.fromNodeId);
              if (sourceNode && sourceNode.type === 'reflection') {
                const sourceReflectionId = (sourceNode as ReflectionNode).reflectionId;
                // Avoid duplicates
                if (!foundBacklinks.find((b) => b.reflectionId === sourceReflectionId)) {
                  foundBacklinks.push({
                    reflectionId: sourceReflectionId,
                    nodeId: sourceNode.id,
                  });
                }
              }
            }
          }
        } catch (err) {
          // Skip payloads that can't be decrypted (might be from different sessions)
          console.debug(`Could not decrypt payload for reflection ${otherReflectionId}`, err);
        }
      }

      setBacklinks(foundBacklinks);
    } catch (err: any) {
      console.error('Failed to load backlinks', err);
      setBacklinks([]);
    } finally {
      setLoadingBacklinks(false);
    }
  }, [reflectionId, walletAddress, sessionKey, encryptionReady]);

  // Load on mount and when dependencies change
  useEffect(() => {
    loadRelationships();
    loadBacklinks();
  }, [loadRelationships, loadBacklinks]);

  // Get or create reflection node ID
  const reflectionNodeId = useMemo(() => {
    const existing = graph.nodes.find(
      (n) => n.type === 'reflection' && (n as ReflectionNode).reflectionId === reflectionId
    );
    if (existing) return existing.id;
    
    // If not found, create it (will be saved on next add)
    return `node_${reflectionId}`;
  }, [graph.nodes, reflectionId]);

  // Group edges by target node type
  const edgesByType = {
    tag: [] as Array<{ edge: RelationshipEdge; node: TagNode }>,
    reflection: [] as Array<{ edge: RelationshipEdge; node: ReflectionNode }>,
    source: [] as Array<{ edge: RelationshipEdge; node: SourceNode }>,
  };

  graph.edges
    .filter((e) => e.fromNodeId === reflectionNodeId && !e.deletedAt)
    .forEach((edge) => {
      const targetNode = graph.nodes.find((n) => n.id === edge.toNodeId);
      if (!targetNode) return;

      if (targetNode.type === 'tag') {
        edgesByType.tag.push({ edge, node: targetNode as TagNode });
      } else if (targetNode.type === 'reflection') {
        edgesByType.reflection.push({ edge, node: targetNode as ReflectionNode });
      } else if (targetNode.type === 'source') {
        edgesByType.source.push({ edge, node: targetNode as SourceNode });
      }
    });

  // Add a new link
  const handleAddLink = async () => {
    if (!linkReference.trim()) {
      toast.error('Please enter a reference');
      return;
    }

    if (!encryptionReady || !sessionKey) {
      toast.error('Encryption not ready');
      return;
    }

    try {
      // Create or find target node
      let targetNode: AnyRelationshipNode;
      let targetNodeId: string;

      if (linkType === 'tag') {
        const existingTagNode = graph.nodes.find(
          (n) => n.type === 'tag' && (n as TagNode).tagName.toLowerCase() === linkReference.trim().toLowerCase()
        ) as TagNode | undefined;

        if (existingTagNode) {
          targetNode = existingTagNode;
          targetNodeId = existingTagNode.id;
        } else {
          targetNodeId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          targetNode = {
            id: targetNodeId,
            type: 'tag',
            tagName: linkReference.trim(),
            createdAt: new Date().toISOString(),
          };
        }
      } else if (linkType === 'reflection') {
        targetNodeId = `node_${linkReference.trim()}`;
        const existingReflectionNode = graph.nodes.find(
          (n) => n.id === targetNodeId
        ) as ReflectionNode | undefined;

        if (existingReflectionNode) {
          targetNode = existingReflectionNode;
        } else {
          targetNode = {
            id: targetNodeId,
            type: 'reflection',
            reflectionId: linkReference.trim(),
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        // source
        targetNodeId = `source_${linkReference.trim()}`;
        const existingSourceNode = graph.nodes.find(
          (n) => n.id === targetNodeId
        ) as SourceNode | undefined;

        if (existingSourceNode) {
          targetNode = existingSourceNode;
        } else {
          targetNode = {
            id: targetNodeId,
            type: 'source',
            sourceId: linkReference.trim(),
            createdAt: new Date().toISOString(),
          };
        }
      }

      // Check if edge already exists
      const existingEdge = graph.edges.find(
        (e) => e.fromNodeId === reflectionNodeId && e.toNodeId === targetNodeId && !e.deletedAt
      );

      if (existingEdge) {
        toast.error('Link already exists');
        return;
      }

      // Create new edge
      const newEdge: RelationshipEdge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        fromNodeId: reflectionNodeId,
        toNodeId: targetNodeId,
        createdAt: new Date().toISOString(),
      };

      // Update graph
      const updatedNodes = [...graph.nodes];
      
      // Ensure reflection node exists
      if (!updatedNodes.find((n) => n.id === reflectionNodeId)) {
        const reflectionNode: ReflectionNode = {
          id: reflectionNodeId,
          type: 'reflection',
          reflectionId,
          createdAt: new Date().toISOString(),
        };
        updatedNodes.push(reflectionNode);
      }
      
      // Add target node if it doesn't exist
      if (!updatedNodes.find((n) => n.id === targetNodeId)) {
        updatedNodes.push(targetNode);
      }

      const updatedGraph: RelationshipGraph = {
        nodes: updatedNodes,
        edges: [...graph.edges, newEdge],
      };

      setGraph(updatedGraph);

      // Save immediately
      const payload = await encryptRelationshipGraph(sessionKey, updatedGraph);
      const { id } = await saveRelationshipPayload(walletAddress, payload, reflectionId);
      if (!relationshipId) {
        setRelationshipId(id);
      }

      // Reset form
      setLinkReference('');
      setShowAddForm(false);
      toast.success('Link added');
    } catch (err: any) {
      console.error('Failed to add link', err);
      toast.error('Failed to add link');
    }
  };

  // Remove a link
  const handleRemoveLink = async (edgeId: string) => {
    if (!encryptionReady || !sessionKey) {
      toast.error('Encryption not ready');
      return;
    }

    try {
      const updatedGraph: RelationshipGraph = {
        ...graph,
        edges: graph.edges.map((e) =>
          e.id === edgeId ? { ...e, deletedAt: new Date().toISOString() } : e
        ),
      };

      setGraph(updatedGraph);

      // Save immediately
      const payload = await encryptRelationshipGraph(sessionKey, updatedGraph);
      await saveRelationshipPayload(walletAddress, payload, reflectionId);

      toast.success('Link removed');
    } catch (err: any) {
      console.error('Failed to remove link', err);
      toast.error('Failed to remove link');
      // Revert on error
      loadRelationships();
    }
  };

  // Get display text for a node
  const getNodeDisplayText = (node: AnyRelationshipNode): string => {
    if (node.type === 'tag') {
      return (node as TagNode).tagName;
    } else if (node.type === 'reflection') {
      return (node as ReflectionNode).reflectionId;
    } else if (node.type === 'source') {
      return (node as SourceNode).sourceId;
    }
    return node.id;
  };

  const hasLinks = edgesByType.tag.length > 0 || edgesByType.reflection.length > 0 || edgesByType.source.length > 0;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/60">Links</p>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
            disabled={!encryptionReady}
          >
            + Add link
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex gap-2">
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as LinkType)}
              className="flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="tag">Tag</option>
              <option value="reflection">Reflection</option>
              <option value="source">Source</option>
            </select>
            <input
              type="text"
              value={linkReference}
              onChange={(e) => setLinkReference(e.target.value)}
              placeholder={linkType === 'tag' ? 'Tag name' : linkType === 'reflection' ? 'Reflection ID' : 'Source ID'}
              className="flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddLink();
                } else if (e.key === 'Escape') {
                  setShowAddForm(false);
                  setLinkReference('');
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddLink}
              disabled={saving || !linkReference.trim()}
              className="flex-1 rounded-lg border border-emerald-500/50 text-emerald-300 px-2 py-1.5 text-xs hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setLinkReference('');
              }}
              className="flex-1 rounded-lg border border-white/20 px-2 py-1.5 text-xs hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-xs text-white/40">Loading links…</p>
      ) : hasLinks ? (
        <div className="space-y-2 pt-2">
          {edgesByType.tag.length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {edgesByType.tag.map(({ edge, node }) => (
                  <span
                    key={edge.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-1 text-xs text-purple-300"
                  >
                    <span>#{getNodeDisplayText(node)}</span>
                    <button
                      onClick={() => handleRemoveLink(edge.id)}
                      className="hover:text-purple-200 transition-colors"
                      title="Remove link"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {edgesByType.reflection.length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-1.5">Reflections</p>
              <div className="flex flex-wrap gap-1.5">
                {edgesByType.reflection.map(({ edge, node }) => (
                  <span
                    key={edge.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-1 text-xs text-blue-300"
                  >
                    <span>{getNodeDisplayText(node)}</span>
                    <button
                      onClick={() => handleRemoveLink(edge.id)}
                      className="hover:text-blue-200 transition-colors"
                      title="Remove link"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {edgesByType.source.length > 0 && (
            <div>
              <p className="text-xs text-white/50 mb-1.5">Sources</p>
              <div className="flex flex-wrap gap-1.5">
                {edgesByType.source.map(({ edge, node }) => (
                  <span
                    key={edge.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300"
                  >
                    <span>{getNodeDisplayText(node)}</span>
                    <button
                      onClick={() => handleRemoveLink(edge.id)}
                      className="hover:text-emerald-200 transition-colors"
                      title="Remove link"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        !showAddForm && <p className="text-xs text-white/40">No links yet</p>
      )}

      {/* Backlinks section - read-only */}
      <div className="pt-2 border-t border-white/10 mt-2">
        <p className="text-xs text-white/60 mb-1.5">Linked from</p>
        {loadingBacklinks ? (
          <p className="text-xs text-white/40">Scanning…</p>
        ) : backlinks.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {backlinks.map((backlink) => (
              <button
                key={backlink.reflectionId}
                onClick={() => {
                  router.push(`/?focus=${backlink.reflectionId}`);
                }}
                className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/40 transition-colors"
                title={`View reflection ${backlink.reflectionId}`}
              >
                <span>{backlink.reflectionId}</span>
                <svg
                  className="w-3 h-3 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-white/30 italic">No other reflections link to this one</p>
        )}
      </div>
    </div>
  );
}


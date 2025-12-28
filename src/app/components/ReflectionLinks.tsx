// src/app/components/ReflectionLinks.tsx
// Minimal Links section for reflection detail view

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

// Feature flag: disable Backlinks scanning until ready
// Controlled via NEXT_PUBLIC_ENABLE_BACKLINKS environment variable
// Defaults to false (disabled) if env var is missing or not "true"
const ENABLE_BACKLINKS = process.env.NEXT_PUBLIC_ENABLE_BACKLINKS === "true";

// Dev mode check for local debug toggle
const isDev = process.env.NODE_ENV === 'development';

type LinkType = 'tag' | 'reflection' | 'source';

interface ReflectionItem {
  id: string;
  ts: string;
  note: string;
  deleted_at?: string | null;
}

interface ReflectionLinksProps {
  reflectionId: string;
  walletAddress: string;
  sessionKey: CryptoKey | null;
  encryptionReady: boolean;
  reflections?: ReflectionItem[]; // Optional list of reflections for picker
}

export function ReflectionLinks({
  reflectionId,
  walletAddress,
  sessionKey,
  encryptionReady,
  reflections = [],
}: ReflectionLinksProps) {
  const router = useRouter();
  const pickerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<RelationshipGraph>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [linkType, setLinkType] = useState<LinkType>('tag');
  const [linkReference, setLinkReference] = useState('');
  const [relationshipId, setRelationshipId] = useState<string | null>(null);
  const [backlinks, setBacklinks] = useState<Array<{ reflectionId: string; nodeId: string }>>([]);
  const [loadingBacklinks, setLoadingBacklinks] = useState(false);
  const [showReflectionPicker, setShowReflectionPicker] = useState(false);
  const [focusedReflectionIndex, setFocusedReflectionIndex] = useState(-1);

  // Compute backlinksEnabled inside component to access localStorage
  const backlinksEnabled = useMemo(() => {
    return ENABLE_BACKLINKS || (isDev && typeof window !== 'undefined' && localStorage.getItem('soe:debug:backlinks') === 'true');
  }, []);

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
    } catch (err: unknown) {
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


  // Load backlinks by scanning all relationship payloads
  const loadBacklinks = useCallback(async () => {
    if (!backlinksEnabled) return;
    if (!encryptionReady || !sessionKey || !walletAddress || !reflectionId) return;

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
          // Check edges where toId (target node) equals the current reflectionId
          for (const edge of otherGraph.edges) {
            if (edge.deletedAt) continue;

            // Get the target node (where the edge points TO)
            const targetNode = otherGraph.nodes.find((n) => n.id === edge.toNodeId);
            if (!targetNode) continue;

            // Check if target node is a reflection node with the current reflectionId
            if (
              targetNode.type === 'reflection' &&
              (targetNode as ReflectionNode).reflectionId === reflectionId
            ) {
              // Found a backlink! Get the source reflection (where the edge comes FROM)
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
          // Skip payloads that can't be decrypted (might be from different sessions or corrupted)
          // Handle failures gracefully - just skip this payload
          console.debug(`Could not decrypt payload for reflection ${otherReflectionId}`, err);
        }
      }

      setBacklinks(foundBacklinks);
    } catch (err: unknown) {
      console.error('Failed to load backlinks', err);
      setBacklinks([]);
    } finally {
      setLoadingBacklinks(false);
    }
  }, [reflectionId, walletAddress, sessionKey, encryptionReady, backlinksEnabled]);

  // Load on mount and when dependencies change
  useEffect(() => {
    loadRelationships();
    if (backlinksEnabled) {
      loadBacklinks();
    }
  }, [loadRelationships, loadBacklinks, backlinksEnabled]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowReflectionPicker(false);
      }
    };

    if (showReflectionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showReflectionPicker]);

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

  // Filter reflections for picker (exclude current reflection and deleted ones)
  const filteredReflections = useMemo(() => {
    if (linkType !== 'reflection' || !linkReference.trim() || linkReference.trim().length < 2) {
      return [];
    }
    const query = linkReference.trim().toLowerCase();
    return reflections
      .filter((r) => r.id !== reflectionId && !r.deleted_at)
      .filter((r) => {
        const idLower = r.id.toLowerCase();
        // Match against ID substring
        if (idLower.includes(query)) return true;
        
        // Match against note content (first 120 chars)
        const noteLower = r.note.toLowerCase();
        const notePreview = noteLower.slice(0, 120);
        if (notePreview.includes(query)) return true;
        
        return false;
      })
      .slice(0, 10); // Limit to 10 results
  }, [reflections, linkReference, linkType, reflectionId]);

  // Get display text for a reflection (title or first line)
  const getReflectionDisplayText = (reflection: ReflectionItem): string => {
    const firstLine = reflection.note.split('\n')[0].trim();
    return firstLine || reflection.id;
  };

  // Get preview snippet (1-2 lines, max 120 chars)
  const getReflectionPreview = (reflection: ReflectionItem): string => {
    const lines = reflection.note.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return '';
    
    const firstLine = lines[0].trim();
    if (firstLine.length <= 120) {
      // If first line is short, try to include second line
      if (lines.length > 1) {
        const secondLine = lines[1].trim();
        const combined = `${firstLine} ${secondLine}`;
        return combined.length > 120 ? combined.slice(0, 120) + '…' : combined;
      }
      return firstLine;
    }
    return firstLine.slice(0, 120) + '…';
  };

  // Add a new link
  const handleAddLink = async () => {
    if (!linkReference.trim()) {
      toast.error('Please enter a reference');
      return;
    }

    // Prevent self-links
    if (linkType === 'reflection' && linkReference.trim() === reflectionId) {
      toast.error('Cannot link a reflection to itself');
      return;
    }

    if (!encryptionReady || !sessionKey) {
      toast.error('Encryption not ready');
      return;
    }

    try {
      setSaving(true);
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
    } catch (err: unknown) {
      console.error('Failed to add link', err);
      toast.error('Failed to add link');
    } finally {
      setSaving(false);
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

      // Rescan backlinks after removal to reflect updated state
      // This ensures that if we removed a link from A to B, B's backlinks will update
      if (backlinksEnabled) {
        // Small delay to ensure the save has completed
        setTimeout(() => {
          loadBacklinks();
        }, 100);
      }
    } catch (err: unknown) {
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

  // Format reflection ID to short format (first 6 and last 4 characters)
  const formatShortReflectionId = (id: string): string => {
    if (id.length <= 10) return id;
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
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
              onChange={(e) => {
                setLinkType(e.target.value as LinkType);
                setLinkReference('');
                setShowReflectionPicker(false);
                setFocusedReflectionIndex(-1);
              }}
              className="flex-1 rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="tag">Tag</option>
              <option value="reflection">Reflection</option>
              <option value="source">Source</option>
            </select>
            <div className="flex-1 relative" ref={pickerRef}>
              <input
                type="text"
                value={linkReference}
                onChange={(e) => {
                  setLinkReference(e.target.value);
                  setFocusedReflectionIndex(-1);
                  if (linkType === 'reflection' && e.target.value.trim().length >= 2) {
                    setShowReflectionPicker(true);
                  } else {
                    setShowReflectionPicker(false);
                  }
                }}
                onFocus={() => {
                  if (linkType === 'reflection' && linkReference.trim().length >= 2) {
                    setShowReflectionPicker(true);
                  }
                }}
                placeholder={linkType === 'tag' ? 'Tag name' : linkType === 'reflection' ? 'Search reflections...' : 'Source ID'}
                className="w-full rounded-lg border border-white/20 bg-black/40 px-2 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/30"
                onKeyDown={(e) => {
                  if (linkType === 'reflection' && showReflectionPicker && filteredReflections.length > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setFocusedReflectionIndex((prev) => 
                        prev < filteredReflections.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setFocusedReflectionIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    } else if (e.key === 'Enter' && focusedReflectionIndex >= 0) {
                      e.preventDefault();
                      const selected = filteredReflections[focusedReflectionIndex];
                      setLinkReference(selected.id);
                      setShowReflectionPicker(false);
                      setFocusedReflectionIndex(-1);
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowReflectionPicker(false);
                      setFocusedReflectionIndex(-1);
                      if (!linkReference.trim()) {
                        setShowAddForm(false);
                      }
                    } else if (e.key === 'Enter' && focusedReflectionIndex === -1) {
                      // Enter without selection - try to add link
                      handleAddLink();
                    }
                  } else {
                    // Non-reflection type or no picker
                    if (e.key === 'Enter') {
                      handleAddLink();
                    } else if (e.key === 'Escape') {
                      setShowReflectionPicker(false);
                      setFocusedReflectionIndex(-1);
                      if (!linkReference.trim()) {
                        setShowAddForm(false);
                      }
                    }
                  }
                }}
              />
              {linkType === 'reflection' && showReflectionPicker && linkReference.trim().length >= 2 && filteredReflections.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-black border border-white/20 rounded-lg shadow-lg max-h-[280px] overflow-y-auto">
                  {filteredReflections.map((reflection, index) => {
                    const displayText = getReflectionDisplayText(reflection);
                    const preview = getReflectionPreview(reflection);
                    const isFocused = index === focusedReflectionIndex;
                    return (
                      <button
                        key={reflection.id}
                        type="button"
                        onClick={() => {
                          setLinkReference(reflection.id);
                          setShowReflectionPicker(false);
                          setFocusedReflectionIndex(-1);
                        }}
                        onMouseEnter={() => setFocusedReflectionIndex(index)}
                        className={`w-full text-left px-3 py-2 transition-colors border-b border-white/5 last:border-b-0 ${
                          isFocused ? 'bg-white/15' : 'hover:bg-white/10'
                        }`}
                      >
                        <div className="text-xs font-medium text-white/90 mb-1">{displayText}</div>
                        <div className="text-xs text-white/60 mb-1 line-clamp-2">{preview}</div>
                        <div className="text-xs text-white/40 font-mono">{reflection.id}</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {linkType === 'reflection' && showReflectionPicker && linkReference.trim().length >= 2 && filteredReflections.length === 0 && (
                <div className="absolute z-50 w-full mt-1 bg-black border border-white/20 rounded-lg shadow-lg px-3 py-2">
                  <div className="text-xs text-white/50">No matches</div>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddLink}
              disabled={saving || !linkReference.trim() || (linkType === 'reflection' && linkReference.trim() === reflectionId)}
              className="flex-1 rounded-lg border border-emerald-500/50 text-emerald-300 px-2 py-1.5 text-xs hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setLinkReference('');
                setShowReflectionPicker(false);
                setFocusedReflectionIndex(-1);
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
                {edgesByType.reflection.map(({ edge, node }) => {
                  const targetReflectionId = node.reflectionId;
                  // Prevent self-navigation
                  if (!targetReflectionId || targetReflectionId === reflectionId) {
                    return (
                      <span
                        key={edge.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-1 text-xs text-blue-300"
                      >
                        <span>{getNodeDisplayText(node)}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveLink(edge.id);
                          }}
                          className="hover:text-blue-200 transition-colors"
                          title="Remove link"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={edge.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-1 text-xs text-blue-300"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Navigate to reflection with focus query param
                          router.push(`/?focus=${encodeURIComponent(targetReflectionId)}`);
                        }}
                        className="flex-1 text-left cursor-pointer hover:text-blue-200 transition-colors"
                        title={`View reflection ${targetReflectionId}`}
                      >
                        {getNodeDisplayText(node)}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveLink(edge.id);
                        }}
                        className="hover:text-blue-200 transition-colors flex-shrink-0"
                        title="Remove link"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
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
        {!backlinksEnabled ? (
          <div className="space-y-2">
            <p className="text-xs text-white/40 italic">Backlinks coming soon</p>
            {isDev && (
              <button
                onClick={() => {
                  const currentValue = localStorage.getItem('soe:debug:backlinks') === 'true';
                  localStorage.setItem('soe:debug:backlinks', (!currentValue).toString());
                  window.location.reload();
                }}
                className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors underline"
                title="Toggle Backlinks in development mode"
              >
                Enable Backlinks (dev only)
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-white/60">Backlinks</p>
              {!loadingBacklinks && (
                <button
                  onClick={loadBacklinks}
                  className="text-xs text-white/50 hover:text-white/70 transition-colors"
                  title="Rescan for backlinks"
                >
                  Rescan
                </button>
              )}
            </div>
            {loadingBacklinks ? (
              <p className="text-xs text-white/40">Scanning…</p>
            ) : backlinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {backlinks.map((backlink) => {
                  const targetId = backlink.reflectionId;
                  // Prevent self-focus: if targetId equals current reflection id, do nothing
                  if (targetId === reflectionId) {
                    return null;
                  }
                  return (
                    <button
                      key={targetId}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Navigate to reflection with focus query param
                        // HomeClient will handle scrolling to the reflection if already loaded
                        router.push(`/?focus=${encodeURIComponent(targetId)}`);
                      }}
                      className="inline-flex items-center rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/40 transition-colors cursor-pointer"
                      title={`View reflection ${targetId}`}
                    >
                      <span>Reflection {formatShortReflectionId(targetId)}</span>
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
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-white/30 italic">No other reflections link to this one</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}


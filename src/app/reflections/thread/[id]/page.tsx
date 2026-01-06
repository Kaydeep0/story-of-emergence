// src/app/reflections/thread/[id]/page.tsx
// Thread View - Narrative chain of connected reflections
// Layer 3: Narrative layer

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../../lib/entries';
import { itemToReflectionEntry } from '../../../lib/insights/timelineSpikes';
import { getOrBuildGraph } from '../../../../lib/graph/graphCache';
import type { Edge } from '../../../../lib/graph/buildReflectionGraph';
import type { ReflectionEntry } from '../../../lib/insights/types';
import { fetchBridgesForWallet, upsertNarrativeBridgesBatch } from '../../../lib/meaningBridges/storage';
import { getSupabaseForWallet } from '../../../lib/supabase';
import type { MeaningBridge } from '../../../lib/meaningBridges/types';
import { buildNarrativeBridges } from '../../../lib/meaningBridges/buildNarrativeBridge';
import { useNarrativeBridges } from '../../../lib/meaningBridges/useNarrativeBridges';
import { NeoCard } from '../../../../components/ui/NeoCard';
import { WhyLinkedPanel } from '../../mind/components/WhyLinkedPanel';
import { buildThreadUrl } from '../../../lib/navigation';
import { ContinueThreadButton } from '../../../components/ContinueThreadButton';
import { resolveCabinMode } from '../../../lib/cabinResolution';
import { getBreadcrumbPath, addToBreadcrumbPath, truncateBreadcrumbPathAt } from '../../../lib/cabinBreadcrumbs';

function extractTitle(text: string | unknown): string {
  // Handle highlight objects
  if (typeof text === 'object' && text !== null && 'type' in text && (text as any).type === 'highlight') {
    const highlight = text as { title?: string; body?: string };
    return highlight.title || 'Highlight';
  }
  
  // Handle string plaintext
  const textStr = typeof text === 'string' ? text : JSON.stringify(text);
  const firstLine = textStr.split('\n')[0].trim();
  if (firstLine.length > 0) {
    return firstLine.length > 80 ? firstLine.slice(0, 80) + '...' : firstLine;
  }
  return textStr.slice(0, 80) + (textStr.length > 80 ? '...' : '');
}

/**
 * Check if entry is undecryptable
 */
function isUndecryptable(plaintext: unknown): boolean {
  if (typeof plaintext === 'string') {
    return plaintext.includes('Unable to decrypt this entry');
  }
  if (typeof plaintext === 'object' && plaintext !== null && 'note' in plaintext) {
    return (plaintext as any).note === 'Unable to decrypt this entry';
  }
  return false;
}

/**
 * Render undecryptable entry as redaction block (cabin mode only)
 */
function renderUndecryptable(cabin: boolean): React.ReactNode | null {
  if (!cabin) {
    return null; // Show normal content in debug mode
  }

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-medium text-white/70">
        Locked entry
      </h3>
      <div className="text-sm text-white/50 leading-relaxed space-y-1">
        <div>This entry could not be opened in this session.</div>
        <div>This reflection belongs to a different encryption context.</div>
      </div>
    </div>
  );
}

/**
 * Soft parse stringified JSON content
 * Tries to parse strings that look like JSON and render appropriately
 */
function softParseContent(plaintext: unknown): unknown {
  if (typeof plaintext !== 'string') {
    return plaintext; // Already an object or not a string
  }

  // Check if it looks like JSON (starts with { or [)
  const trimmed = plaintext.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return plaintext; // Not JSON-like
  }

  try {
    const parsed = JSON.parse(plaintext);
    return parsed; // Successfully parsed
  } catch {
    return plaintext; // Failed to parse, return original
  }
}

/**
 * Render highlight as prose (cabin mode)
 * Extracts title and body, hides all metadata
 */
function renderHighlight(plaintext: unknown, cabin: boolean): React.ReactNode {
  // First try to soft parse if it's a string
  const parsed = softParseContent(plaintext);
  
  // Check if it's a highlight object
  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed) || (parsed as any).type !== 'highlight') {
    // Check if it's an object with title and body (but not a highlight)
    if (typeof parsed === 'object' && parsed !== null && 'title' in parsed && 'body' in parsed) {
      const obj = parsed as { title?: string; body?: string };
      if (cabin) {
        // Treat title/body objects similarly to highlights - crystallized thoughts
        return (
          <div className="space-y-3">
            {obj.title && (
              <h3 className="text-lg font-semibold text-white/95 tracking-tight leading-tight mb-1">
                {obj.title}
              </h3>
            )}
            {obj.body && (
              <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                {obj.body}
              </div>
            )}
          </div>
        );
      }
      // Non-cabin: show as JSON
      return (
        <div className="text-sm text-white/80 whitespace-pre-wrap font-mono text-xs">
          {JSON.stringify(parsed, null, 2)}
        </div>
      );
    }
    return null; // Not a highlight or title/body object
  }

  const highlight = parsed as { title?: string; body?: string; [key: string]: unknown };
  const title = highlight.title || '';
  const body = highlight.body || '';

  if (cabin) {
    // Cabin mode: soft card, title as header, body as muted prose
    // Highlight titles get more typographic weight to feel "crystallized"
    return (
      <div className="space-y-3">
        {title && (
          <h3 className="text-lg font-semibold text-white/95 tracking-tight leading-tight mb-1">
            {title}
          </h3>
        )}
        {body && (
          <div className="text-sm text-white/60 italic leading-relaxed whitespace-pre-wrap">
            {body}
          </div>
        )}
      </div>
    );
  }

  // Non-cabin mode: show as JSON (existing behavior)
  return (
    <div className="text-sm text-white/80 whitespace-pre-wrap font-mono text-xs">
      {JSON.stringify(parsed, null, 2)}
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ThreadPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const reflectionId = params?.id;
  
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const router = useRouter();
  const pathname = `/reflections/thread/${reflectionId}`;

  const [mounted, setMounted] = useState(false);
  const [reflection, setReflection] = useState<ReflectionEntry | null>(null);
  const [neighbors, setNeighbors] = useState<Array<{
    reflection: ReflectionEntry;
    edge: Edge;
    bridge: MeaningBridge | { explanation: string; reasons: string[]; signals?: Record<string, any> } | null;
    bridgeType?: 'meaning' | 'narrative';
    qualityScore?: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflectionsForBridges, setReflectionsForBridges] = useState<Array<{ id: string; createdAt: string; text: string; sources?: any[] }>>([]);
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});
  const [showAllBridges, setShowAllBridges] = useState(false);
  const [hasHighlights, setHasHighlights] = useState(false);
  const [cabinReason, setCabinReason] = useState<'bridge' | 'depth' | 'highlights' | null>(null);
  const [showCabinPopover, setShowCabinPopover] = useState(false);
  const [exitingCabin, setExitingCabin] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ reflectionId: string; title: string; timestamp: number }>>([]);
  
  // Minimum quality score threshold (hide weak bridges by default)
  const MIN_QUALITY_SCORE = 0.4;

  const connected = isConnected && !!address;
  
  // Centralize cabin resolution: explicit mode, auto-cabin triggers, and opt-out
  // Note: hasHighlights and neighbors.length are computed in useEffect, so we'll resolve cabin after data loads
  const explicitMode = searchParams?.get('mode');
  const fromBridge = searchParams?.get('fromBridge') === 'true';
  const debug = searchParams?.get('debug') === 'true' || process.env.NODE_ENV === 'development';
  const optedOut = typeof window !== 'undefined' && sessionStorage.getItem('cabin_opt_out') === 'true';
  
  // Initial cabin state - respect URL on mount (prevents flicker on hard refresh)
  // If URL has mode=cabin, start in cabin mode immediately
  const [cabin, setCabin] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlMode = new URLSearchParams(window.location.search).get('mode');
      return urlMode === 'cabin';
    }
    return explicitMode === 'cabin';
  });

  // Narrative bridges hook
  const { build: buildBridges, isBuilding: isBuildingBridges, error: bridgeError } = useNarrativeBridges({
    wallet: address,
    aesKey: sessionKey || undefined,
    reflections: reflectionsForBridges,
  });

  useEffect(() => {
    setMounted(true);
    // Load breadcrumbs on mount if in cabin mode
    if (typeof window !== 'undefined') {
      setBreadcrumbs(getBreadcrumbPath());
    }
  }, []);

  // Load reflection and its neighbors
  useEffect(() => {
    if (!mounted || !connected || !address || !encryptionReady || !sessionKey || !reflectionId) {
      return;
    }

    let cancelled = false;

    async function loadThread() {
      if (!address || !sessionKey || !reflectionId) return;
      
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

        // Find the target reflection
        const targetItem = items.find(item => item.id === reflectionId);
        if (!targetItem) {
          setError('Reflection not found');
          setLoading(false);
          return;
        }

        const targetReflection = itemToReflectionEntry(targetItem, () => undefined);
        setReflection(targetReflection);

        // Convert to graph format and build graph
        const reflectionsForGraph = items.map(r => ({
          id: r.id,
          createdAt: r.createdAt.toISOString(),
          text: typeof r.plaintext === 'string' ? r.plaintext : JSON.stringify(r.plaintext),
        }));

        const edges = await getOrBuildGraph(address, sessionKey, reflectionsForGraph, 'lifetime', 6);

        // Find neighbors (edges where this reflection is from or to)
        const neighborEdges = edges
          .filter(e => e.from === reflectionId || e.to === reflectionId)
          .map(e => ({
            edge: e,
            neighborId: e.from === reflectionId ? e.to : e.from,
          }))
          .sort((a, b) => (b.edge.weight || 0) - (a.edge.weight || 0))
          .slice(0, 10); // Top 10 neighbors

        // Convert items to ReflectionLike format for narrative bridge building
        const reflectionsForBridgesData = items.map(item => {
          // Extract sourceId from plaintext if it exists (optional)
          let sourceId: string | undefined;
          if (typeof item.plaintext === 'object' && item.plaintext !== null && 'sourceId' in item.plaintext) {
            sourceId = String((item.plaintext as { sourceId?: unknown }).sourceId ?? '');
          }
          
          return {
          id: item.id,
          createdAt: item.createdAt.toISOString(),
          text: typeof item.plaintext === 'string' ? item.plaintext : JSON.stringify(item.plaintext),
            sources: sourceId ? [{ kind: 'unknown', title: sourceId }] : undefined,
          };
        });

        // Store for useNarrativeBridges hook
        if (!cancelled) {
          setReflectionsForBridges(reflectionsForBridgesData);
        }

        // Build narrative bridges for all reflections (legacy - can be removed later)
        const supabase = getSupabaseForWallet(address);
        const narrativeBridges = buildNarrativeBridges(reflectionsForBridgesData, {
          maxDays: 14,
          topK: 4,
        });

        // Store narrative bridges (async, don't await - fire and forget)
        if (narrativeBridges.length > 0) {
          upsertNarrativeBridgesBatch({
            supabase,
            wallet: address,
            bridges: narrativeBridges,
            key: sessionKey,
            debug: process.env.NODE_ENV === 'development',
          }).catch(err => {
            console.error('Failed to store narrative bridges', err);
          });
        }

        // Load existing bridges (both meaning and narrative) for these connections
        let bridgesMap = new Map<string, { bridge: any; bridgeType: 'meaning' | 'narrative' }>();
        
        try {
          const bridges = await fetchBridgesForWallet({
            supabase,
            wallet: address,
            key: sessionKey,
            limit: 300,
          });

          for (const { fromId, toId, bridge, bridgeType } of bridges) {
            const key1 = `${fromId}:${toId}`;
            const key2 = `${toId}:${fromId}`;
            bridgesMap.set(key1, { bridge, bridgeType: bridgeType || 'meaning' });
            bridgesMap.set(key2, { bridge, bridgeType: bridgeType || 'meaning' }); // Bridges are bidirectional
          }
        } catch (err) {
          console.error('Failed to load bridges', err);
        }

        // Also check narrative bridges we just built (in case they're not stored yet)
        for (const nb of narrativeBridges) {
          const key1 = `${nb.from}:${nb.to}`;
          const key2 = `${nb.to}:${nb.from}`;
          if (!bridgesMap.has(key1) && !bridgesMap.has(key2)) {
            bridgesMap.set(key1, { bridge: { explanation: nb.explanation, reasons: nb.reasons, signals: nb.signals }, bridgeType: 'narrative' });
            bridgesMap.set(key2, { bridge: { explanation: nb.explanation, reasons: nb.reasons, signals: nb.signals }, bridgeType: 'narrative' });
          }
        }

        // Build neighbor list with bridges
        const neighborList = neighborEdges
          .map(({ edge, neighborId }) => {
            const neighborItem = items.find(item => item.id === neighborId);
            if (!neighborItem) return null;

            const neighborReflection = itemToReflectionEntry(neighborItem, () => undefined);
            const bridgeKey = `${reflectionId}:${neighborId}`;
            const bridgeEntry = bridgesMap.get(bridgeKey) || bridgesMap.get(`${neighborId}:${reflectionId}`) || null;

            // Calculate quality score for filtering
            const bridge = bridgeEntry?.bridge;
            let qualityScore: number | undefined;
            if (bridge && typeof bridge === 'object') {
              const weight = (bridge as any).weight ?? 0.5;
              const reasons = (bridge as any).reasons || [];
              const diversityScore = new Set(reasons).size;
              qualityScore = weight * 0.7 + (diversityScore / 5) * 0.3;
            } else {
              // Use edge weight as fallback
              qualityScore = edge.weight ?? 0.5;
            }

            return {
              reflection: neighborReflection,
              edge,
              bridge: bridgeEntry?.bridge || null,
              bridgeType: bridgeEntry?.bridgeType || undefined,
              qualityScore,
            };
          })
          .filter((n): n is NonNullable<typeof n> => n !== null)
          // Deduplicate by reflection ID (in case multiple edges connect to the same reflection)
          .reduce((acc, neighbor) => {
            const existing = acc.find(n => n.reflection.id === neighbor.reflection.id);
            if (!existing) {
              acc.push(neighbor);
            } else {
              // Keep the neighbor with higher quality score
              if ((neighbor.qualityScore ?? 0) > (existing.qualityScore ?? 0)) {
                const index = acc.indexOf(existing);
                acc[index] = neighbor;
              }
            }
            return acc;
          }, [] as Array<{
            reflection: ReflectionEntry;
            edge: Edge;
            bridge: MeaningBridge | { explanation: string; reasons: string[]; signals?: Record<string, any> } | null;
            bridgeType?: 'meaning' | 'narrative';
            qualityScore?: number;
          }>)
          .sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));

        // Filter out main reflection from neighbors (prevents duplicate rendering)
        const filteredNeighbors = neighborList.filter(n => n.reflection.id !== reflectionId);
        
        // Dev diagnostic: log all reflection IDs being rendered
        if (process.env.NODE_ENV === "development" && !cancelled) {
          const renderSequence: string[] = [];
          renderSequence.push(`reflection:${reflectionId}`);
          filteredNeighbors.forEach(n => {
            renderSequence.push(`reflection:${n.reflection.id}`);
          });
          
          const seen = new Set<string>();
          const duplicates: string[] = [];
          renderSequence.forEach(id => {
            if (seen.has(id)) {
              duplicates.push(id);
            }
            seen.add(id);
          });
          
          if (duplicates.length > 0) {
            console.warn("[ThreadPage] DUPLICATE REFLECTIONS IN RENDER SEQUENCE:", duplicates);
            console.warn("[ThreadPage] Full render sequence:", renderSequence);
          }
        }

        if (!cancelled) {
          setNeighbors(filteredNeighbors);
          
          // Check for highlights in reflections (auto-cabin trigger)
          const allReflections = [targetReflection, ...filteredNeighbors.map(n => n.reflection)];
          const highlightsFound = allReflections.some(r => {
            const plaintext = r.plaintext;
            if (typeof plaintext === 'object' && plaintext !== null && 'type' in plaintext) {
              return (plaintext as any).type === 'highlight';
            }
            // Also check parsed content
            try {
              if (typeof plaintext === 'string' && plaintext.trim().startsWith('{')) {
                const parsed = JSON.parse(plaintext);
                return parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'highlight';
              }
            } catch {
              // Not JSON, ignore
            }
            return false;
          });
          
          setHasHighlights(highlightsFound);
          
          // Resolve auto-cabin after data loads using pure function (testable)
          const threadDepth = filteredNeighbors.length;
          const urlHasCabinMode = typeof window !== 'undefined' 
            ? new URLSearchParams(window.location.search).get('mode') === 'cabin'
            : false;
          
          const { cabin: resolvedCabin, reason } = resolveCabinMode({
            explicitMode: explicitMode === 'cabin' ? 'cabin' : null,
            fromBridge,
            optedOut,
            debug,
            threadDepth,
            highlightsFound,
            urlHasCabinMode,
          });
          setCabin(resolvedCabin);
          setCabinReason(reason);
          
          // Update breadcrumb path when in cabin mode
          if (resolvedCabin && targetReflection) {
            const reflectionTitle = extractTitle(targetReflection.plaintext);
            addToBreadcrumbPath(reflectionId, reflectionTitle);
            setBreadcrumbs(getBreadcrumbPath());
          } else if (!resolvedCabin) {
            // Clear breadcrumbs when exiting cabin
            setBreadcrumbs([]);
          } else {
            // Load breadcrumbs if already in cabin
            setBreadcrumbs(getBreadcrumbPath());
          }
          
          // Ensure URL always matches cabin state (deterministic)
          // Only update URL if it doesn't match the resolved state
          // Read mode directly from window.location to avoid stale searchParams
          const currentUrlMode = typeof window !== 'undefined' 
            ? new URLSearchParams(window.location.search).get('mode')
            : null;
          
          if (resolvedCabin && currentUrlMode !== 'cabin') {
            // Auto-cabin: update URL to include mode=cabin
            router.replace(`${pathname}?mode=cabin`, { scroll: false });
          } else if (!resolvedCabin && currentUrlMode === 'cabin' && !explicitMode) {
            // Cabin was disabled: remove mode=cabin from URL (but only if not explicitly set)
            router.replace(pathname, { scroll: false });
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load thread', err);
          setError(err.message ?? 'Failed to load thread');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadThread();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, reflectionId]);

  // Hide dev issue indicators in cabin mode
  // MUST be called before any early returns to satisfy React hooks rules
  useEffect(() => {
    if (!cabin) return;

    const styleId = "cabin-hide-dev-indicators";
    if (document.getElementById(styleId)) return;

    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = `
      /* hide next dev overlay badges etc */
      [data-nextjs-toast], .nextjs-toast-errors-parent, #__next-build-watcher {
        display: none !important;
      }
      /* Hide Next.js error overlay in cabin mode */
      [data-nextjs-dialog],
      [data-nextjs-dialog-overlay] {
        display: none !important;
      }
      /* Hide any fixed bottom-left dev indicators (red badges, error overlays) */
      [class*="error"],
      [class*="issue"],
      [id*="error"],
      [id*="issue"],
      [data-error],
      [data-issue] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
      /* Hide React DevTools badge */
      [id*="react-devtools"],
      [class*="react-devtools"] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
      /* Hide any fixed bottom-left elements */
      [style*="position: fixed"][style*="bottom"][style*="left"] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(el);

    return () => {
      el.remove();
    };
  }, [cabin]);

  // Compute render conditions (all hooks must be called before any conditional returns)
  const isLoading = !mounted || loading;
  const hasError = error || !reflection;
  const isNotConnected = !connected;

  // Determine render body based on state
  let body: React.ReactNode;

  if (!mounted) {
    body = null;
  } else if (isNotConnected) {
    body = (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Please connect your wallet to view thread.</p>
        </div>
    );
  } else if (isLoading) {
    body = (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Loading thread...</p>
        </div>
    );
  } else if (hasError) {
    body = (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <NeoCard className="p-6">
            <p className="text-center text-red-400">{error || 'Reflection not found'}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors"
            >
              Go back
            </button>
          </NeoCard>
        </div>
    );
  } else {
    // Main thread UI
    body = (
        <div className={`${cabin ? 'max-w-[720px]' : 'max-w-4xl'} mx-auto px-4 ${cabin ? 'py-12' : 'py-8'} relative ${cabin ? 'transition-all duration-300' : ''}`}>
          {/* Exit cabin overlay animation */}
          {exitingCabin && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center transition-opacity duration-400">
              <div className="text-white/60 text-sm">Exiting cabin...</div>
            </div>
          )}
        {/* Header */}
        <div className={`${cabin ? 'mb-8' : 'mb-6'}`}>
          {!cabin && (
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-[hsl(var(--muted))] hover:text-white/90 transition-colors"
          >
            ← Back
          </button>
          )}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`h-6 w-1 rounded-full bg-[hsl(var(--accent))] ${cabin ? '' : 'shadow-[var(--glow-mid)]'}`} />
              <h1 className={`${cabin ? 'text-3xl' : 'text-2xl'} font-semibold text-white/90`}>Thread</h1>
              
              {/* Cabin toggle button - always visible */}
              <div className="relative flex items-center gap-2">
                {cabin ? (
                  <>
                    {/* Cabin affordance pill with tooltip */}
                    <div className="relative">
                      <button
                        onClick={() => setShowCabinPopover(!showCabinPopover)}
                        onMouseEnter={() => setShowCabinPopover(true)}
                        onMouseLeave={() => setTimeout(() => setShowCabinPopover(false), 200)}
                        className="px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                      >
                        Cabin
                      </button>
                      
                      {/* Tooltip/Popover - "Why am I here" */}
                      {showCabinPopover && cabinReason && (
                        <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-lg border border-white/20 bg-black/95 backdrop-blur-sm p-3 shadow-lg pointer-events-none">
                          <div className="text-xs text-white/80 leading-relaxed">
                            {cabinReason === 'bridge' && "Entered from a bridge"}
                            {cabinReason === 'depth' && "This thread has depth"}
                            {cabinReason === 'highlights' && "Contains highlights"}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Exit cabin button */}
                    <button
                      onClick={async () => {
                        setExitingCabin(true);
                        // Animation overlay
                        await new Promise(resolve => setTimeout(resolve, 400));
                        // Set opt-out
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('cabin_opt_out', 'true');
                        }
                        // Update state and route (deterministic)
                        setCabin(false);
                        setCabinReason(null);
                        setBreadcrumbs([]); // Clear breadcrumbs on exit
                        router.replace(pathname, { scroll: false });
                        setExitingCabin(false);
                      }}
                      className="px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                    >
                      Exit cabin
                    </button>
                  </>
                ) : (
                  /* Enter cabin button */
                  <button
                    onClick={() => {
                      // Manual entry: clear opt-out and enter cabin
                      if (typeof window !== 'undefined') {
                        sessionStorage.removeItem('cabin_opt_out');
                      }
                      setCabin(true);
                      router.replace(`${pathname}?mode=cabin`, { scroll: false });
                    }}
                    className="px-2.5 py-1 rounded-full border border-white/20 bg-white/5 text-xs text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                  >
                    Enter cabin
                  </button>
                )}
              </div>
            </div>
            {/* Dev-only button - hidden in cabin mode */}
            {!cabin && process.env.NODE_ENV === 'development' && 
             process.env.NEXT_PUBLIC_ENABLE_BRIDGE_BUILDER === 'true' && (
              <button
                onClick={async () => {
                  try {
                    await buildBridges();
                    // Reload the page to see new bridges
                    window.location.reload();
                  } catch (err) {
                    console.error('Failed to build bridges', err);
                  }
                }}
                disabled={isBuildingBridges || !sessionKey}
                className="px-3 py-1.5 rounded border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBuildingBridges ? 'Building...' : 'Build Narrative Bridges'}
              </button>
            )}
          </div>
          {!cabin && (
          <p className="text-sm text-[hsl(var(--muted))] ml-3">
            Narrative chain of connected reflections
            </p>
          )}
          
          {/* Cabin reason line - shown when auto-entered */}
          {cabin && cabinReason && (
            <p className="text-xs text-[hsl(var(--accent))] ml-3 mt-2 font-medium">
              {cabinReason === 'bridge' && "Entered from a bridge"}
              {cabinReason === 'depth' && "Thread has depth"}
              {cabinReason === 'highlights' && "Contains highlights"}
            </p>
          )}
          
          {/* Cabin breadcrumb path */}
          {cabin && breadcrumbs.length > 1 && (
            <div className="ml-3 mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[hsl(var(--muted))]">Path:</span>
              {breadcrumbs.map((crumb, idx) => (
                <div key={crumb.reflectionId} className="flex items-center gap-1.5">
                  {idx > 0 && <span className="text-xs text-[hsl(var(--muted))]">→</span>}
                  <button
                    onClick={() => {
                      // Truncate path at clicked item (navigate back)
                      truncateBreadcrumbPathAt(crumb.reflectionId);
                      router.push(buildThreadUrl(crumb.reflectionId, { mode: 'cabin' }));
                    }}
                    className={`text-xs px-2 py-1 rounded border transition-colors ${
                      idx === breadcrumbs.length - 1
                        ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] font-medium'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {crumb.title}
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <p className={`${cabin ? 'text-sm' : 'text-xs'} text-[hsl(var(--muted))] ml-3 ${cabin && (cabinReason || breadcrumbs.length > 1) ? 'mt-1' : 'mt-2'} leading-relaxed ${cabin ? 'max-w-none' : 'max-w-2xl'}`}>
            Threads surface how your thinking connects across time. Not every thought connects — the gaps matter too.
          </p>
          {/* Dev-only error display - hidden in cabin mode */}
          {!cabin && process.env.NODE_ENV === 'development' && 
           process.env.NEXT_PUBLIC_ENABLE_BRIDGE_BUILDER === 'true' && 
           bridgeError && (
            <p className="text-xs text-red-400 ml-3 mt-1">Bridge error: {bridgeError}</p>
          )}
        </div>

        {/* Main Reflection */}
        <NeoCard className={`${cabin ? 'p-10 mb-10 border-[hsl(var(--line)/0.4)] bg-[hsl(var(--panel)/0.3)] backdrop-blur-sm' : 'p-6 mb-6'} transition-all duration-300`}>
          <div className={`${cabin ? 'mb-6' : 'mb-4'}`}>
            <div className={`${cabin ? 'text-sm' : 'text-xs'} text-[hsl(var(--muted))] mb-2`}>
              {formatDate(new Date(reflection.createdAt))}
            </div>
            {/* Check if entry is undecryptable (cabin mode only) */}
            {isUndecryptable(reflection.plaintext) && cabin ? (
              renderUndecryptable(cabin)
            ) : (
              <>
                {/* Try to render as highlight or parsed object */}
                {renderHighlight(reflection.plaintext, cabin) || (
                  // Regular reflection: render as normal
                  <>
                    <h2 className={`${cabin ? 'text-2xl mb-4' : 'text-xl mb-3'} font-semibold text-white/90`}>
              {extractTitle(reflection.plaintext)}
            </h2>
                    <div className={`${cabin ? 'text-base leading-relaxed' : 'text-sm'} text-white/80 whitespace-pre-wrap`}>
                      {(() => {
                        // Soft parse stringified JSON content
                        const parsed = softParseContent(reflection.plaintext);
                        if (typeof parsed === 'string') {
                          return parsed;
                        }
                        // If it parsed to an object, try rendering it
                        const highlightRender = renderHighlight(parsed, cabin);
                        if (highlightRender) {
                          return highlightRender;
                        }
                        // Fall back to stringified JSON
                        return JSON.stringify(parsed);
                      })()}
            </div>
                  </>
                )}
              </>
            )}
          </div>
        </NeoCard>

        {/* Neighbors */}
        {neighbors.length === 0 ? (
          <NeoCard className="p-6">
            <div className="space-y-3 text-center">
              <p className="text-sm text-[hsl(var(--muted))] font-medium">
                No connections found
              </p>
              <p className="text-xs text-[hsl(var(--muted))] leading-relaxed max-w-md mx-auto">
                This reflection stands alone for now. Some reflections explore unique ideas or capture moments that don't yet connect to other entries in your vault. This is information, not a gap—each reflection has value whether it's part of a thread or not.
              </p>
            </div>
          </NeoCard>
        ) : (
          <div className={`${cabin ? 'space-y-12' : 'space-y-6'} transition-all duration-300`}>
            {(() => {
              // Filter bridges by quality score (prefer fewer, stronger bridges)
              // In cabin mode, show all bridges (no filtering)
              const strongNeighbors = neighbors.filter(n => (n.qualityScore ?? 0) >= MIN_QUALITY_SCORE);
              const weakNeighbors = neighbors.filter(n => (n.qualityScore ?? 0) < MIN_QUALITY_SCORE);
              const visibleNeighbors = cabin ? neighbors : (showAllBridges ? neighbors : strongNeighbors);
              
              // Dev diagnostic: detect duplicate reflections in render sequence
              if (process.env.NODE_ENV === "development") {
                const seen = new Set<string>();
                // Check main reflection
                if (reflection) {
                  const mainKey = `reflection:${reflection.id}`;
                  if (seen.has(mainKey)) {
                    console.warn("DUP RENDER ITEM (main reflection duplicate)", mainKey, reflection);
                  }
                  seen.add(mainKey);
                }
                // Check neighbors
                for (const neighbor of visibleNeighbors) {
                  const neighborKey = `reflection:${neighbor.reflection.id}`;
                  if (seen.has(neighborKey)) {
                    console.warn("DUP RENDER ITEM (neighbor duplicate)", neighborKey, neighbor.reflection);
                  }
                  // Also check if neighbor matches main reflection
                  if (reflection && neighbor.reflection.id === reflection.id) {
                    console.warn("DUP RENDER ITEM (neighbor matches main)", neighborKey, {
                      main: reflection.id,
                      neighbor: neighbor.reflection.id,
                      edge: neighbor.edge,
                    });
                  }
                  seen.add(neighborKey);
                }
              }
              
              return (
                <>
                  {visibleNeighbors.map((neighbor, idx) => {
                    const bridgeData = neighbor.bridge as any;
                    const isDetailsOpen = showDetails[idx] || false;
                    
                    return (
                      <div key={neighbor.reflection.id} className={`${cabin ? 'space-y-6' : 'space-y-3'} transition-all duration-300`}>
                {/* Bridge - Why these are connected */}
                  {neighbor.bridge && neighbor.bridgeType === 'meaning' && !cabin && (
                  <WhyLinkedPanel bridge={neighbor.bridge as MeaningBridge} />
                )}
                {neighbor.bridge && neighbor.bridgeType === 'narrative' && (
                    <div className={`${cabin ? 'mb-6 px-0 py-0 border-none bg-transparent' : 'mb-3 px-4 py-3 rounded-lg border border-[hsl(var(--accent)/0.2)] bg-[hsl(var(--accent)/0.05)]'} transition-all duration-300`}>
                      {/* Bridge explanation - always shown */}
                      <div className={`${cabin ? 'text-sm text-white/70 italic leading-relaxed' : 'text-sm text-white/90 leading-relaxed mb-3'}`}>
                        {bridgeData.explanation}
                    </div>
                      {/* Reason tags - hidden in cabin mode */}
                      {!cabin && bridgeData.reasons && bridgeData.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {bridgeData.reasons.map((reason: string, reasonIdx: number) => (
                          <span
                              key={reasonIdx}
                            className="px-2 py-0.5 rounded border border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.1)] text-xs text-[hsl(var(--accent))] font-medium"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                      
                      {/* Details toggle - hidden in cabin mode */}
                      {!cabin && (
                        <button
                          onClick={() => setShowDetails({ ...showDetails, [idx]: !isDetailsOpen })}
                          className="text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))] transition-colors"
                        >
                          {isDetailsOpen ? 'Hide details' : 'Show details'}
                        </button>
                      )}
                      
                      {/* Diagnostic information (hidden by default, always hidden in cabin mode) */}
                      {!cabin && isDetailsOpen && (
                        <div className="mt-3 pt-3 border-t border-[hsl(var(--line)/0.3)] space-y-2 text-xs text-[hsl(var(--muted))]">
                          <div>Connection {idx + 1} • Edge weight: {(neighbor.edge.weight || 0).toFixed(2)}</div>
                          {bridgeData.weight !== undefined && (
                            <div>Bridge weight: {bridgeData.weight.toFixed(2)}</div>
                          )}
                          {bridgeData.anchorA && bridgeData.anchorB && (
                            <div className="space-y-1">
                              <div>Anchor A: {bridgeData.anchorA}</div>
                              <div>Anchor B: {bridgeData.anchorB}</div>
                            </div>
                          )}
                          {bridgeData.signals && (
                            <div className="space-y-1">
                              {bridgeData.signals.daysApart !== undefined && (
                                <div>Days apart: {bridgeData.signals.daysApart}</div>
                              )}
                              {bridgeData.signals.scaleHits && bridgeData.signals.scaleHits.length > 0 && (
                                <div>Scale hits: {bridgeData.signals.scaleHits.slice(0, 3).join(', ')}</div>
                              )}
                              {bridgeData.signals.systemicHits && bridgeData.signals.systemicHits.length > 0 && (
                                <div>Systemic hits: {bridgeData.signals.systemicHits.slice(0, 3).join(', ')}</div>
                              )}
                              {bridgeData.signals.contrastHits && bridgeData.signals.contrastHits.length > 0 && (
                                <div>Contrast hits: {bridgeData.signals.contrastHits.slice(0, 3).join(', ')}</div>
                              )}
                              {bridgeData.signals.mediaHits && bridgeData.signals.mediaHits.length > 0 && (
                                <div>Media hits: {bridgeData.signals.mediaHits.slice(0, 3).join(', ')}</div>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}

                {/* Neighbor Reflection */}
                <NeoCard className={`${cabin ? 'p-10 border-[hsl(var(--line)/0.4)] bg-[hsl(var(--panel)/0.3)] backdrop-blur-sm' : 'p-6'} transition-all duration-300`}>
                  <div className={cabin ? 'mb-6' : 'mb-4'}>
                    <div className={`${cabin ? 'text-sm mb-2' : 'text-xs mb-1'} text-[hsl(var(--muted))]`}>
                      {formatDate(new Date(neighbor.reflection.createdAt))}
                    </div>
                    {/* Check if entry is undecryptable (cabin mode only) */}
                    {isUndecryptable(neighbor.reflection.plaintext) && cabin ? (
                      renderUndecryptable(cabin)
                    ) : (
                      <>
                        {/* Try to render as highlight or parsed object */}
                        {renderHighlight(neighbor.reflection.plaintext, cabin) || (
                          // Regular reflection: render as normal
                          <>
                            <h3 className={`${cabin ? 'text-xl mb-4' : 'text-lg mb-3'} font-semibold text-white/90`}>
                      {extractTitle(neighbor.reflection.plaintext)}
                    </h3>
                            <div className={`${cabin ? 'text-base leading-relaxed' : 'text-sm'} text-white/80 whitespace-pre-wrap`}>
                              {(() => {
                                // Soft parse stringified JSON content
                                const parsed = softParseContent(neighbor.reflection.plaintext);
                                if (typeof parsed === 'string') {
                                  return parsed;
                                }
                                // If it parsed to an object, try rendering it
                                const highlightRender = renderHighlight(parsed, cabin);
                                if (highlightRender) {
                                  return highlightRender;
                                }
                                // Fall back to stringified JSON
                                return JSON.stringify(parsed);
                              })()}
                    </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <ContinueThreadButton 
                    nextReflectionId={neighbor.reflection.id} 
                    cabin={cabin}
                    currentReflectionId={reflection?.id}
                    currentReflectionTitle={reflection ? extractTitle(reflection.plaintext) : undefined}
                  />
                </NeoCard>
              </div>
                    );
                  })}
                  
                  {/* Show all bridges toggle (hidden in cabin mode) */}
                  {!cabin && weakNeighbors.length > 0 && (
                    <div className="pt-4 border-t border-[hsl(var(--line)/0.3)]">
                      <button
                        onClick={() => setShowAllBridges(!showAllBridges)}
                        className="w-full text-xs text-[hsl(var(--muted))] hover:text-[hsl(var(--accent))] transition-colors"
                      >
                        {showAllBridges 
                          ? `Hide ${weakNeighbors.length} weak bridge${weakNeighbors.length !== 1 ? 's' : ''}`
                          : `Show all (${weakNeighbors.length} weak bridge${weakNeighbors.length !== 1 ? 's' : ''} hidden)`
                        }
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  // Render the determined body within the page shell
  return (
    <main className={`min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))] ${cabin ? 'flex items-center justify-center bg-gradient-to-b from-[hsl(var(--bg0))] via-[hsl(var(--bg0)/0.95)] to-[hsl(var(--bg0))]' : ''} transition-all duration-300`}>
      {body}
    </main>
  );
}


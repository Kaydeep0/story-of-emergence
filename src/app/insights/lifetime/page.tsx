'use client';

/**
 * Lifetime - Signal Inventory View
 * 
 * Read-only structural table showing lifetime signals.
 * No interpretation, no summaries, no meaning.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { assembleYearNarrative } from '../../../lib/narrative/assembleYearNarrativeDeterministic';
import { buildLifetimeSignalInventory, generateLifetimeArtifact } from '../../../lib/lifetimeSignalInventory';
import { generateLifetimeCaption } from '../../../lib/artifacts/lifetimeCaption';
import { generateProvenanceLine } from '../../../lib/artifacts/provenance';
import { FEATURE_LIFETIME_INVENTORY } from '../../../lib/featureFlags';
import type {
  ReflectionMeta,
  DeterministicCandidate,
} from '../../../lib/lifetimeSignalInventory';

/**
 * Safe date parsing - returns null for invalid dates
 */
function safeDate(value: unknown): Date | null {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function LifetimePage() {
  // Route gate: return null immediately if feature flag is false
  // This prevents any hooks or data fetching from running
  if (!FEATURE_LIFETIME_INVENTORY) {
    return null;
  }
  const { address, isConnected } = useAccount();
  const wallet = address || '';
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

    // Convert to ReflectionMeta format with normalized timestamps
    // Prefer created_at, fallback to createdAt, exclude invalid dates
    const reflectionMetas: ReflectionMeta[] = allReflections
      .map((item) => {
        const timestamp = (item as any).created_at ?? (item as any).createdAt;
        const date = safeDate(timestamp);
        if (!date) return null;
        return {
          id: item.id,
          createdAt: date.toISOString(),
        };
      })
      .filter((x): x is ReflectionMeta => x !== null);

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

  // Build inventory (pure function, deterministic)
  const inventory = useMemo(() => {
    return buildLifetimeSignalInventory({
      reflections: reflectionMetas,
      candidates: deterministicCandidates,
    });
  }, [reflectionMetas, deterministicCandidates]);

  // Format date to YYYY-MM using safe date helper
  // Returns empty string for invalid dates (never shows "unknown")
  const formatYearMonth = (iso: string): string => {
    if (!iso) return '';
    const date = safeDate(iso);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Generate artifact for caption and share (async)
  const [artifact, setArtifact] = useState<import('../../../lib/lifetimeArtifact').ShareArtifact | null>(null);
  
  useEffect(() => {
    if (!FEATURE_LIFETIME_INVENTORY || !wallet || inventory.totalReflections === 0) {
      setArtifact(null);
      return;
    }
    
    generateLifetimeArtifact(inventory, wallet).then(setArtifact).catch((err) => {
      console.error('Failed to generate artifact', err);
      setArtifact(null);
    });
  }, [inventory, wallet]);

  // Generate simple PNG image from Lifetime data
  const generateLifetimeImage = async (): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;

    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Lifetime Signal Inventory', 60, 80);

    // Subtitle
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(`Generated from ${inventory.totalReflections} reflections`, 60, 130);
    ctx.fillText(`Found ${inventory.signals.length} structural signals`, 60, 170);

    // Table header
    let y = 250;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Label', 60, y);
    ctx.fillText('Category', 400, y);
    ctx.fillText('Count', 600, y);
    ctx.fillText('Months', 700, y);
    ctx.fillText('Confidence', 850, y);

    // Table rows (first 10 signals)
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cccccc';
    const signalsToShow = inventory.signals.slice(0, 10);
    for (let i = 0; i < signalsToShow.length; i++) {
      y += 40;
      const signal = signalsToShow[i];
      ctx.fillText(signal.label.slice(0, 30), 60, y);
      ctx.fillText(signal.category, 400, y);
      ctx.fillText(String(signal.totalCount), 600, y);
      ctx.fillText(String(signal.distinctMonths), 700, y);
      ctx.fillText(signal.confidence.toFixed(2), 850, y);
    }

    // Provenance line (under artifact body)
    y = canvas.height - 40;
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'center';
    if (artifact) {
      const provenanceLine = generateProvenanceLine(artifact);
      ctx.fillText(provenanceLine, canvas.width / 2, y);
    } else {
      ctx.fillText('Private reflection • Generated from encrypted data', canvas.width / 2, y);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate image'));
        }
      }, 'image/png');
    });
  };

  // Copy caption handler
  const handleCopyCaption = async () => {
    if (!FEATURE_LIFETIME_INVENTORY || !artifact) return;
    
    // Guardrail check
    if (!artifact.artifactId) {
      throw new Error('Artifact missing identity: artifactId is required');
    }
    
    const caption = generateLifetimeCaption(artifact);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(caption);
        toast('Caption copied');
      } else {
        // Fallback: create hidden textarea
        const textarea = document.createElement('textarea');
        textarea.value = caption;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        toast('Caption copied');
      }
    } catch (err) {
      toast.error('Failed to copy caption');
    }
  };

  // Download image handler
  const handleDownloadImage = async () => {
    if (!FEATURE_LIFETIME_INVENTORY || !artifact) return;
    
    // Guardrail check
    if (!artifact.artifactId) {
      throw new Error('Artifact missing identity: artifactId is required');
    }
    
    try {
      const blob = await generateLifetimeImage();
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const filename = `soe-lifetime-${year}-${month}-${day}.png`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast('Image downloaded');
    } catch (err) {
      toast.error('Failed to generate image');
    }
  };

  // Web share handler
  const handleWebShare = async () => {
    if (!FEATURE_LIFETIME_INVENTORY || !artifact) return;
    
    // Guardrail check
    if (!artifact.artifactId) {
      throw new Error('Artifact missing identity: artifactId is required');
    }
    
    if (!navigator.share) {
      toast('Share not available on this device');
      return;
    }

    try {
      const blob = await generateLifetimeImage();
      const caption = generateLifetimeCaption(artifact);
      const file = new File([blob], `soe-lifetime-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Story of Emergence — Lifetime Reflection',
          text: caption,
          files: [file],
        });
        toast('Ready to share');
      } else {
        // Fallback: share text only
        await navigator.share({
          title: 'Story of Emergence — Lifetime Reflection',
          text: caption,
        });
        toast('Ready to share');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

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

        {/* Share Actions (hidden behind feature flag) */}
        {FEATURE_LIFETIME_INVENTORY && (
          <div className="mb-6 flex gap-2 items-center">
            <button
              onClick={handleDownloadImage}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              PNG
            </button>
            <button
              onClick={handleCopyCaption}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Caption
            </button>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleWebShare}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share
              </button>
            )}
          </div>
        )}

        {/* Structural Table */}
        {inventory.totalReflections === 0 || inventory.signals.length === 0 ? (
          <div className="py-12 text-center">
            <h2 className="text-sm text-white/60 mb-2">No lifetime signals yet.</h2>
            <p className="text-xs text-white/40">
              Signals appear once enough dated reflections exist.
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}

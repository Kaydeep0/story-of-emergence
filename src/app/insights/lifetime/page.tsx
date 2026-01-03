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
import { computeInsightsForWindow } from '../../lib/insights/computeInsightsForWindow';
import { generateLifetimeArtifact } from '../../../lib/lifetimeSignalInventory';
import type { LifetimeSignalInventory } from '../../../lib/lifetimeSignalInventory';
import { generateLifetimeCaption } from '../../../lib/artifacts/lifetimeCaption';
import { generateProvenanceLine } from '../../../lib/artifacts/provenance';
import { FEATURE_LIFETIME_INVENTORY } from '../../../lib/featureFlags';
import { ShareCapsuleDialog } from '../../components/ShareCapsuleDialog';
import { InsightsTabs } from '../components/InsightsTabs';

/**
 * Safe date parsing - returns null for invalid dates
 */
function safeDate(value: unknown): Date | null {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

export default function LifetimePage() {
  // All hooks must be declared at the top, before any early returns
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allReflections, setAllReflections] = useState<any[]>([]);
  const [inventory, setInventory] = useState<LifetimeSignalInventory | null>(null);
  const [showCapsuleDialog, setShowCapsuleDialog] = useState(false);
  const [artifact, setArtifact] = useState<import('../../../lib/lifetimeArtifact').ShareArtifact | null>(null);

  const connected = isConnected && !!address;
  const wallet = address || '';

  // Compute readiness flags (used to gate logic inside hooks)
  const isReady = mounted && connected && !!address && encryptionReady && !!sessionKey && FEATURE_LIFETIME_INVENTORY;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load all reflections
  useEffect(() => {
    if (!isReady) {
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
  }, [isReady, address, sessionKey, encryptionError]);

  // Compute lifetime inventory via canonical engine
  useEffect(() => {
    if (!isReady || allReflections.length === 0 || !address) {
      setInventory(null);
      return;
    }

    try {
      // Convert reflections to UnifiedInternalEvent format (same pattern as other lenses)
      const walletAlias = address.toLowerCase();
      const events = allReflections.map((item) => ({
        id: item.id ?? crypto.randomUUID(),
        walletAlias,
        eventAt: ((item as any).created_at ?? (item as any).createdAt ?? new Date().toISOString()),
        eventKind: 'written' as const,
        sourceKind: 'journal' as const,
        plaintext: item.plaintext || '',
        length: (item.plaintext || '').length,
        sourceId: (item as any).sourceId ?? null,
        topics: [],
      }));

      // Determine window: use all available reflections (lifetime spans all time)
      // Use earliest and latest reflection dates, or default to last 10 years
      const dates = allReflections
        .map((item) => safeDate((item as any).created_at ?? (item as any).createdAt))
        .filter((d): d is Date => d !== null);
      
      const windowEnd = dates.length > 0 
        ? new Date(Math.max(...dates.map(d => d.getTime())))
        : new Date();
      const windowStart = dates.length > 0
        ? new Date(Math.min(...dates.map(d => d.getTime())))
        : new Date(windowEnd.getTime() - 10 * 365 * 24 * 60 * 60 * 1000); // Default to 10 years back

      // Compute lifetime artifact via canonical engine
      const artifact = computeInsightsForWindow({
        horizon: 'lifetime',
        events,
        windowStart,
        windowEnd,
        wallet: address ?? undefined,
        entriesCount: allReflections.length,
        eventsCount: events.length,
      });

      // Extract LifetimeSignalInventory from artifact card metadata
      const cards = artifact.cards ?? [];
      const lifetimeCard = cards.find((c) => c.kind === 'distribution');
      
      if (lifetimeCard && (lifetimeCard as any)._lifetimeInventory) {
        const inventoryData = (lifetimeCard as any)._lifetimeInventory as LifetimeSignalInventory;
        setInventory(inventoryData);
      } else {
        // No data in window
        setInventory(null);
      }
    } catch (err) {
      console.error('Failed to compute lifetime insights:', err);
      setInventory(null);
    }
  }, [isReady, allReflections, address]);

  // Generate artifact for caption and share (async)
  useEffect(() => {
    if (!isReady || !wallet || !inventory || inventory.totalReflections === 0) {
      setArtifact(null);
      return;
    }
    
    generateLifetimeArtifact(inventory, wallet).then(setArtifact).catch((err) => {
      console.error('Failed to generate artifact', err);
      setArtifact(null);
    });
  }, [isReady, inventory, wallet]);

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

  // Now early returns are safe because all hooks have run
  if (!mounted) {
    return null;
  }

  if (!FEATURE_LIFETIME_INVENTORY) {
    return (
      <div className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-2xl font-normal text-center mb-3">Lifetime</h1>
          <p className="text-center text-sm text-white/50 mb-8">Your encrypted activity across all time</p>
          <InsightsTabs />
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60 mb-4">
              Lifetime insights are coming soon. Keep writing and we will build your long arc.
            </p>
            <a
              href="/insights/summary"
              className="inline-block px-4 py-2 text-sm text-white/80 hover:text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
            >
              Back to Summary
            </a>
          </div>
        </section>
      </div>
    );
  }

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
    if (inventory) {
      ctx.fillText(`Generated from ${inventory.totalReflections} reflections`, 60, 130);
      ctx.fillText(`Found ${inventory.signals.length} structural signals`, 60, 170);
    }

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
    const signalsToShow = inventory?.signals.slice(0, 10) ?? [];
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
            <button
              onClick={() => setShowCapsuleDialog(true)}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Send privately
            </button>
          </div>
        )}
        
        {/* Share Capsule Dialog */}
        {FEATURE_LIFETIME_INVENTORY && artifact && wallet && (
          <ShareCapsuleDialog
            artifact={artifact}
            senderWallet={wallet}
            isOpen={showCapsuleDialog}
            onClose={() => setShowCapsuleDialog(false)}
          />
        )}

        {/* Structural Table */}
        {!inventory || inventory.totalReflections === 0 || inventory.signals.length === 0 ? (
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

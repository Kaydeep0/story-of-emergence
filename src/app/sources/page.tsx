'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../lib/useLogEvent';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { listExternalEntries } from '../lib/useSources';
import { rpcFetchEntries } from '../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../lib/insights/timelineSpikes';
import type { ReflectionEntry } from '../lib/insights/types';
import { SourceCard, type SourceEntry } from '../components/SourceCard';
import { SourceForm } from '../components/SourceForm';
import { insertExternalSource } from '../lib/sources';
import { toast } from 'sonner';
import { useReflectionLinks } from '../lib/reflectionLinks';

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, error: encryptionError, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event when page loads (connected wallet only)
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('navigate_sources');
  }, [mounted, connected, logEvent]);

  // Load sources when wallet is connected and encryption is ready
  useEffect(() => {
    if (!mounted || !connected || !encryptionReady || !address) return;
    
    async function loadSources() {
      setLoading(true);
      setError(null);
      try {
        const data = await listExternalEntries(address);
        setSources(data as SourceEntry[]);
      } catch (err) {
        console.error('Failed to load sources', err);
        setError('Failed to load external sources');
      } finally {
        setLoading(false);
      }
    }

    loadSources();
  }, [mounted, connected, encryptionReady, address]);

  // Load decrypted reflections for demo linking
  useEffect(() => {
    if (!mounted || !connected || !encryptionReady || !address || !sessionKey) {
      return;
    }

    let cancelled = false;

    async function loadReflections() {
      try {
        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 200,
          offset: 0,
        });

        if (cancelled) return;

        const reflectionEntries = attachDemoSourceLinks(items.map(itemToReflectionEntry));
        setReflections(reflectionEntries);
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load reflections for source linking', err);
          setReflections([]);
        }
      } finally {
        // no-op
      }
    }

    loadReflections();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, encryptionReady, address, sessionKey, getSourceIdFor]);

  const reflectionsBySource = useMemo(() => {
    const map = new Map<string, ReflectionEntry[]>();
    reflections.forEach((reflection) => {
      if (!reflection.sourceId) return;
      if (!map.has(reflection.sourceId)) {
        map.set(reflection.sourceId, []);
      }
      map.get(reflection.sourceId)!.push(reflection);
    });
    return map;
  }, [reflections]);

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view external sources.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!encryptionReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">
              {encryptionError || 'Encryption key not ready. Please sign the consent message.'}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
        <div className="flex items-center justify-between mb-4">
          {!loading && (
            <p className="text-sm text-white/60">
              You have {sources.length} external source{sources.length === 1 ? '' : 's'} linked to this wallet.
            </p>
          )}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/90 bg-white/10 hover:bg-white/15 transition-colors"
          >
            {adding ? 'Close' : 'Add source'}
          </button>
        </div>

        {adding && (
          <div className="mb-6">
            <SourceForm
              onSubmit={async ({ title, kind, sourceId, notes }) => {
                if (!address) return;
                const row = await insertExternalSource(address, {
                  title,
                  kind,
                  sourceId,
                  notes,
                });
                const mapped: SourceEntry = {
                  id: row.id,
                  walletAddress: row.wallet_address,
                  kind: row.kind,
                  sourceId: row.source_id,
                  title: row.title,
                  url: row.url,
                  createdAt: row.created_at,
                  notes: row.notes,
                  capturedAt: row.captured_at,
                };
                setSources((prev) => [mapped, ...prev]);
                toast.success('Source added');
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">Loading sources…</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sources.length === 0 && (
          <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium">No external sources yet</h2>
            <p className="text-sm text-white/60 max-w-md mx-auto">
              Once you import YouTube, books, or articles, they will appear here.
            </p>
          </div>
        )}

        {/* Sources list */}
        {!loading && !error && sources.length > 0 && (
          <div className="space-y-4">
            {sources.map((entry) => {
              const linkedReflections = entry.sourceId
                ? reflectionsBySource.get(entry.sourceId) ?? []
                : [];

              return (
                <SourceCard
                  key={entry.id}
                  entry={entry}
                  linkedReflections={linkedReflections}
                  expanded={expandedId === entry.id}
                  detailHref={entry.sourceId ? `/sources/${entry.sourceId}` : undefined}
                  onToggle={() =>
                    setExpandedId((prev) => (prev === entry.id ? null : entry.id))
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

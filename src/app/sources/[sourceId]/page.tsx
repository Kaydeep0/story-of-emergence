// src/app/sources/[sourceId]/page.tsx
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { listExternalEntries } from '../../lib/useSources';
import { rpcFetchEntries } from '../../lib/entries';
import { attachDemoSourceLinks, itemToReflectionEntry } from '../../lib/insights/timelineSpikes';
import type { ReflectionEntry } from '../../lib/insights/types';
import type { SourceEntry } from '../../components/SourceCard';
import { InsightsPanel } from './InsightsPanel';
import { useReflectionLinks, getSourceIdFor } from '../../lib/reflectionLinks';

/**
 * Source kind badge component with icons
 */
function SourceKindBadge({ kind }: { kind: string }) {
  const normalizedKind = kind.toLowerCase();

  if (normalizedKind === 'youtube') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase bg-red-500/20 text-red-300 border border-red-500/30">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
        {kind}
      </span>
    );
  }

  if (normalizedKind === 'article') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase bg-white/10 text-white/70 border border-white/15">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        {kind}
      </span>
    );
  }

  if (normalizedKind === 'book') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        {kind}
      </span>
    );
  }

  // Default fallback for unknown kinds
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase bg-white/10 text-white/70 border border-white/15">
      {kind}
    </span>
  );
}

export default function SourceDetailPage() {
  const params = useParams<{ sourceId: string }>();
  const sourceId = params?.sourceId;
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { links } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [source, setSource] = useState<SourceEntry | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load source metadata and reflections client-side
  useEffect(() => {
    if (!mounted || !connected || !encryptionReady || !address || !sessionKey || !sourceId) return;

    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Load sources and find the one matching sourceId
        const entries = (await listExternalEntries(address)) as SourceEntry[];
        if (cancelled) return;
        const match = entries.find((s) => s.sourceId === sourceId);
        setSource(match ?? null);

        // Load reflections and filter by sourceId
        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 500,
          offset: 0,
        });
        if (cancelled) return;
        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, (reflectionId) => getSourceIdFor(reflectionId, links)))
        );
        const linked = reflectionEntries.filter((r) => r.sourceId === sourceId);
        setReflections(linked);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load source detail', err);
          setError(err?.message ?? 'Failed to load source detail');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, encryptionReady, address, sessionKey, sourceId, links]);

  const previewReflections = useMemo(() => reflections.slice(0, 20), [reflections]);

  if (!mounted) return null;

  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Source</h1>
          <p className="text-white/60">Connect your wallet to view this source.</p>
          <Link href="/sources" className="text-sm text-emerald-300 hover:text-emerald-200">
            Back to Sources
          </Link>
        </section>
      </main>
    );
  }

  if (!encryptionReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-3xl mx-auto px-4 py-10 space-y-4">
          <h1 className="text-2xl font-semibold">Source</h1>
          <p className="text-white/60">
            {encryptionError || 'Encryption key not ready. Please sign the consent message.'}
          </p>
          <Link href="/sources" className="text-sm text-emerald-300 hover:text-emerald-200">
            Back to Sources
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Source</h1>
          <Link
            href="/sources"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:bg-white/10 transition-colors"
          >
            ← Back to Sources
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="text-white/70">Loading source…</p>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
            <p className="text-rose-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <SourceKindBadge kind={source?.kind || 'source'} />
                  {source?.sourceId && (
                    <span className="text-xs text-white/50">{source.sourceId}</span>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-white/90">
                  {source?.title || 'Untitled source'}
                </h2>
                <div className="text-sm text-white/60 space-y-1">
                  {source?.createdAt && (
                    <p>
                      Added{' '}
                      {new Date(source.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  <p>Linked reflections: {reflections.length}</p>
                  {source?.notes && <p className="text-white/70">{source.notes}</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white/90">Linked reflections</h3>
                  <span className="text-xs text-white/50">
                    {reflections.length} total
                  </span>
                </div>

                {previewReflections.length === 0 ? (
                  <p className="text-sm text-white/60">No reflections linked yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {previewReflections.map((ref) => {
                      const firstLine =
                        typeof ref.plaintext === 'string'
                          ? ref.plaintext.split('\n')[0]
                          : '';
                      return (
                        <li
                          key={ref.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white/80 truncate">
                              {firstLine || '(no content)'}
                            </p>
                            <p className="text-xs text-white/40">
                              {new Date(ref.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <Link
                            href={`/#${ref.id}`}
                            className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                          >
                            View
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <InsightsPanel reflections={reflections} />
          </div>
        )}
      </section>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../lib/useLogEvent';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { listExternalEntries } from '../lib/useSources';

type SourceEntry = {
  id: string;
  walletAddress: string;
  kind: string;
  sourceId?: string;
  title?: string;
  url?: string | null;
  createdAt: string;
  notes?: string | null;
  capturedAt: string;
};

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, error: encryptionError } = useEncryptionSession();
  const [mounted, setMounted] = useState(false);
  const [sources, setSources] = useState<SourceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        
        {/* Sources count summary */}
        {!loading && (
          <p className="text-center text-sm text-white/60 mb-8">
            You have {sources.length} external source{sources.length === 1 ? '' : 's'} linked to this wallet.
          </p>
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
            {sources.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3"
              >
                {/* Title and kind */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white/90 mb-2">
                      {entry.title || 'Untitled'}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase bg-white/10 text-white/70">
                        {entry.kind}
                      </span>
                      {entry.sourceId && (
                        <span className="text-xs text-white/50">
                          {entry.sourceId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta line */}
                <div className="text-xs text-white/50">
                  {entry.createdAt && (
                    <span>
                      added {new Date(entry.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                {/* Notes */}
                {entry.notes && (
                  <p className="text-sm text-white/70">{entry.notes}</p>
                )}

                {/* Open button */}
                {entry.url && (
                  <button
                    type="button"
                    onClick={() => {
                      window.open(entry.url!, '_blank', 'noopener,noreferrer');
                    }}
                    className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm text-white/90 transition-colors"
                  >
                    Open
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

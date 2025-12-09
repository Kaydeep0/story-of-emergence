'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useLogEvent } from '../lib/useLogEvent';
import { listSharesByRecipient, type ShareRow } from '../lib/shares';

function KindBadge({ kind }: { kind: string }) {
  const colors: Record<string, string> = {
    reflection: 'bg-amber-500/20 text-amber-300',
    timeline: 'bg-violet-500/20 text-violet-300',
    summary: 'bg-cyan-500/20 text-cyan-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[kind] || 'bg-white/10 text-white/60'}`}>
      {kind}
    </span>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/5 rounded w-16" />
          </div>
          <div className="h-4 bg-white/5 rounded w-2/3" />
          <div className="h-3 bg-white/5 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

function EmptySharedState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium">No shared content yet</h2>
      <p className="text-sm text-white/60 max-w-md mx-auto">
        When someone shares content with you, it will appear here.
      </p>
    </div>
  );
}

export default function SharedPage() {
  const { address, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);

  const { logEvent } = useLogEvent();
  const connected = isConnected && !!address;
  const wallet = address ? address.toLowerCase() : '';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_shared');
  }, [mounted, connected, logEvent]);

  async function loadShares() {
    if (!connected || !wallet) return;

    setLoading(true);
    setError(null);

    try {
      const items = await listSharesByRecipient(wallet, {
        limit: 50,
        offset: 0,
      });
      setShares(items);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('Failed to load shares', e);
      const msg = err?.message ?? 'Could not load shared content';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Load shares when connected
  useEffect(() => {
    if (!mounted) return;
    if (!connected) return;
    loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, connected, wallet]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Shared</h1>
        <p className="text-center text-sm text-white/60 mb-8">
          Private content shared with you.
        </p>

        {/* Loading state */}
        {connected && loading && <SharedSkeleton />}

        {/* Error state */}
        {connected && !loading && error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center space-y-3">
            <p className="text-sm text-rose-400">{error}</p>
            <button
              onClick={() => loadShares()}
              className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {connected && !loading && !error && shares.length === 0 && <EmptySharedState />}

        {/* Shares list */}
        {connected && !loading && !error && shares.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>{shares.length} shared item{shares.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => loadShares()}
                className="text-white/60 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            {shares.map((item) => {
              // Access capsule fields safely
              const capsule = item.capsule || {};
              const payload = (capsule.payload as { title?: string; ciphertext?: string }) || {};
              const title = payload.title || 'Untitled';
              const kind = capsule.kind || 'unknown';
              const createdDate = new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-white/70">From {item.owner_wallet.slice(0, 6)}...{item.owner_wallet.slice(-4)}</p>
                      <p className="text-xs text-white/40">{createdDate}</p>
                    </div>
                    <KindBadge kind={kind} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

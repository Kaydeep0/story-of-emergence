'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { keyFromSignatureHex } from '../../lib/crypto';
import { useLogEvent } from '../lib/useLogEvent';
import { rpcListAcceptedShares } from '../lib/shares';
import type { AcceptedShare, SliceKind } from '../../lib/sharing';

function humanizeSignError(e: unknown): string {
  const err = e as { code?: number; shortMessage?: string; message?: string };
  if (err?.code === 4001) return 'Signature request was rejected.';
  if (err?.code === -32002)
    return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return err?.shortMessage || err?.message || 'Unexpected signing error.';
}

function SliceKindBadge({ kind }: { kind: SliceKind }) {
  const labels: Record<SliceKind, string> = {
    topic_slice: 'Topic',
    link_collection: 'Links',
    reflection_excerpt: 'Reflection',
    reflection: 'Reflection',
  };
  const colors: Record<SliceKind, string> = {
    topic_slice: 'bg-violet-500/20 text-violet-300',
    link_collection: 'bg-cyan-500/20 text-cyan-300',
    reflection_excerpt: 'bg-amber-500/20 text-amber-300',
    reflection: 'bg-amber-500/20 text-amber-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[kind] || 'bg-white/10 text-white/60'}`}>
      {labels[kind] || kind}
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
        When someone shares a private slice with you, open the capsule link they send and it will appear here.
      </p>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">How it works</p>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Receive a capsule link from a contact</li>
          <li>• Open the link to preview and accept the shared slice</li>
          <li>• Accepted slices are re-encrypted under your key</li>
        </ul>
      </div>
    </div>
  );
}

export default function SharedPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signingConsentRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<AcceptedShare[]>([]);
  const [consentSig, setConsentSig] = useState<string | null>(null);

  const { logEvent } = useLogEvent();
  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
    const s = sessionStorage.getItem('soe-consent-sig');
    if (s) setConsentSig(s);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_shared');
  }, [mounted, connected, logEvent]);

  // Reset signature when wallet changes
  useEffect(() => {
    setConsentSig(null);
    sessionStorage.removeItem('soe-consent-sig');
  }, [address]);

  async function getSessionKey(): Promise<CryptoKey> {
    if (!connected || !address) throw new Error('Connect wallet first');

    let sig = consentSig;

    if (!sig) {
      if (signingConsentRef.current) {
        throw new Error('PENDING_SIG');
      }
      signingConsentRef.current = true;
      try {
        const msg = `Story of Emergence — encryption key consent for ${address}`;
        sig = await signMessageAsync({ message: msg });
        setConsentSig(sig);
        sessionStorage.setItem('soe-consent-sig', sig);
      } catch (e: unknown) {
        throw new Error(humanizeSignError(e));
      } finally {
        signingConsentRef.current = false;
      }
    }
    return keyFromSignatureHex(sig);
  }

  async function loadShares() {
    if (!connected || !address) return;

    setLoading(true);
    setError(null);

    try {
      const sessionKey = await getSessionKey();
      const { items } = await rpcListAcceptedShares(address, sessionKey, {
        limit: 50,
        offset: 0,
      });
      setShares(items);
    } catch (e: unknown) {
      const err = e as { message?: string };
      if (err?.message === 'PENDING_SIG') return;
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
  }, [mounted, connected, address]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Shared</h1>
        <p className="text-center text-sm text-white/60 mb-8">
          Private content shared with you from trusted contacts.
        </p>

        {/* Not connected state */}
        {!connected && (
          <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
            <h2 className="text-lg font-medium">Connect your wallet</h2>
            <p className="text-sm text-white/60">
              Connect your wallet to view shared content and open capsule links.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        )}

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

            {shares.map((share) => (
              <div
                key={share.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="font-medium">{share.title}</h3>
                    <p className="text-xs text-white/50">{share.sourceLabel}</p>
                  </div>
                  <SliceKindBadge kind={share.sliceKind} />
                </div>

                {/* Preview content (first few lines if string, or summary) */}
                {typeof share.decryptedPayload === 'object' &&
                  share.decryptedPayload !== null &&
                  'preview' in (share.decryptedPayload as Record<string, unknown>) && (
                    <p className="text-sm text-white/70 line-clamp-2">
                      {String((share.decryptedPayload as Record<string, unknown>).preview)}
                    </p>
                  )}

                {typeof share.decryptedPayload === 'object' &&
                  share.decryptedPayload !== null &&
                  'content' in (share.decryptedPayload as Record<string, unknown>) &&
                  typeof (share.decryptedPayload as Record<string, unknown>).content === 'string' && (
                    <p className="text-sm text-white/70 line-clamp-2">
                      {String((share.decryptedPayload as Record<string, unknown>).content).slice(0, 200)}
                      {String((share.decryptedPayload as Record<string, unknown>).content).length > 200 ? '…' : ''}
                    </p>
                  )}

                {typeof share.decryptedPayload === 'object' &&
                  share.decryptedPayload !== null &&
                  'links' in (share.decryptedPayload as Record<string, unknown>) &&
                  Array.isArray((share.decryptedPayload as Record<string, unknown>).links) && (
                    <p className="text-sm text-white/50">
                      {((share.decryptedPayload as Record<string, unknown>).links as unknown[]).length} links
                    </p>
                  )}

                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>
                    Received {new Date(share.receivedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}


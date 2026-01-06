'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useLogEvent } from '../../../lib/useLogEvent';
import { getWalletShare, decryptWalletShare, type WalletShareRow } from '../../../lib/wallet_shares';
import { UnlockBanner } from '../../../components/UnlockBanner';
import type { ShareArtifact } from '../../../../lib/artifacts/types';
import type { SharePack } from '../../../lib/share/sharePack';
import { SharePackRenderer } from '../../../lib/share/SharePackRenderer';

function WalletShareContent() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<WalletShareRow | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [artifact, setArtifact] = useState<ShareArtifact | null>(null);
  const [sharePack, setSharePack] = useState<SharePack | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const connected = isConnected && !!address;
  const wallet = address ? address.toLowerCase() : '';
  
  // Resolve shareId from params
  const shareId: string | undefined = Array.isArray(params.id) 
    ? (params.id[0] || undefined)
    : (params.id as string | undefined);

  // Load share and decrypt when ready
  useEffect(() => {
    if (!connected || !wallet || !shareId) {
      setLoading(false);
      if (!shareId) {
        setError('Share link is missing or invalid');
      }
      return;
    }

    async function loadAndDecrypt() {
      if (!shareId || !wallet) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setDecryptError(null);
      setArtifact(null);
      setSharePack(null);

      try {
        // Fetch share
        const fetchedShare = await getWalletShare(wallet, shareId);
        setShare(fetchedShare);

        // Decrypt share using wallet
        setDecrypting(true);
        const decrypted = await decryptWalletShare(fetchedShare, wallet);
        
        // Check if decrypted content is SharePack (preferred) or artifact (legacy)
        if (decrypted && typeof decrypted === 'object' && 'lens' in decrypted) {
          // It's a SharePack
          setSharePack(decrypted as SharePack);
        } else {
          // Legacy artifact format
          setArtifact(decrypted as ShareArtifact);
        }
        
        logEvent('wallet_share_opened');
      } catch (e: unknown) {
        const err = e as { message?: string };
        console.error('Failed to load or decrypt wallet share:', e);
        const errorMsg = err?.message ?? 'Failed to load shared content';
        
        if (errorMsg.includes('not found') || errorMsg.includes('not authorized')) {
          setError('This share is no longer available');
        } else {
          setError(errorMsg);
        }
        
        toast.error(errorMsg);
        logEvent('wallet_share_open_failed');
      } finally {
        setLoading(false);
        setDecrypting(false);
      }
    }

    loadAndDecrypt();
  }, [connected, wallet, shareId, logEvent]);

  if (loading || decrypting) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
          <svg
            className="w-6 h-6 text-white/40 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="text-white/60">{decrypting ? 'Decrypting…' : 'Loading share…'}</p>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.includes('no longer available') || error.includes('not found') || error.includes('not authorized');
    
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-rose-300">
          {isNotFound ? 'This share is no longer available' : 'Cannot open share'}
        </h2>
        <p className="text-sm text-white/60 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => router.push('/shared')}
          className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
        >
          Back to Shared
        </button>
      </div>
    );
  }

  if (!share || (!sharePack && !artifact)) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <p className="text-white/60">Loading share…</p>
      </div>
    );
  }

  const createdDate = new Date(share.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const senderShort = `${share.created_by_wallet.slice(0, 6)}…${share.created_by_wallet.slice(-4)}`;

  return (
    <div className="space-y-6">
      {/* Header with Back button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/shared')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Back to Shared"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">
            Shared {sharePack ? sharePack.lens : share.kind} insight
          </h1>
          <p className="text-sm text-white/60 mt-1">
            From {senderShort} · {createdDate}
          </p>
          {share.message && (
            <p className="text-sm text-white/70 mt-2 italic">"{share.message}"</p>
          )}
        </div>
      </div>

      {/* Content - Use SharePackRenderer for SharePack, fallback to JSON for legacy artifacts */}
      {decryptError ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{decryptError}</p>
          </div>
        </div>
      ) : sharePack ? (
        <SharePackRenderer sharePack={sharePack} mode="viewer" />
      ) : artifact ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="prose prose-invert max-w-none">
            <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono">
              {JSON.stringify(artifact, null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <div className="text-center py-8">
            <p className="text-white/60">No content available</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalletSharePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      {/* Unlock banner if encryption session is missing */}
      <UnlockBanner />

      <section className="max-w-2xl mx-auto px-4 py-10">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-white/60">Loading…</p>
            </div>
          }
        >
          <WalletShareContent />
        </Suspense>
      </section>
    </main>
  );
}

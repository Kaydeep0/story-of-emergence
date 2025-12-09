'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useLogEvent } from '../../../lib/useLogEvent';
import { rpcGetShare, type ShareRow } from '../../../lib/shares';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { UnlockBanner } from '../../../components/UnlockBanner';
import { decryptText, type EncryptionEnvelope } from '../../../../lib/crypto';

function ShareOpenContent() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { logEvent } = useLogEvent();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<ShareRow | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<{ title: string; text: string } | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const connected = isConnected && !!address;
  const wallet = address ? address.toLowerCase() : '';
  const shareId = params.id as string;

  // Load share and decrypt when ready
  useEffect(() => {
    if (!connected || !wallet || !shareId) {
      if (!connected) {
        setError('Wallet connection required');
      }
      setLoading(false);
      return;
    }

    async function loadAndDecrypt() {
      setLoading(true);
      setError(null);
      setDecryptError(null);
      setDecryptedContent(null);

      try {
        // Fetch share
        const fetchedShare = await rpcGetShare(wallet, shareId);
        setShare(fetchedShare);

        // Verify kind is reflection
        const capsule = fetchedShare.capsule;
        if (!capsule || typeof capsule !== 'object') {
          setError('Invalid capsule format');
          setLoading(false);
          return;
        }
        
        const kind = (capsule as { kind?: string }).kind || 'unknown';
        
        if (kind !== 'reflection') {
          setError(`Share type "${kind}" is not supported. Only "reflection" shares can be opened.`);
          setLoading(false);
          return;
        }

        // Check encryption session
        if (!encryptionReady || !sessionKey) {
          if (encryptionError) {
            setError(encryptionError);
          } else {
            setError('Encryption key not ready. Please sign the message in your wallet.');
          }
          setLoading(false);
          return;
        }

        // Decrypt content using envelope format
        const payload = ((capsule as { payload?: EncryptionEnvelope & { title?: string } }).payload || {}) as EncryptionEnvelope & { title?: string };
        
        if (!payload.ciphertext || !payload.iv || !payload.version) {
          setError('Invalid encryption envelope format');
          setLoading(false);
          return;
        }

        setDecrypting(true);
        
        // Decrypt using the envelope format
        const envelope: EncryptionEnvelope = {
          ciphertext: payload.ciphertext,
          iv: payload.iv,
          version: payload.version,
        };
        
        const plaintext = await decryptText(sessionKey, envelope);
        
        // Parse the decrypted JSON (same format as reflection entries)
        let decrypted: unknown;
        try {
          decrypted = JSON.parse(plaintext);
        } catch {
          setError('Failed to parse decrypted content');
          setLoading(false);
          return;
        }

        // Extract text from decrypted object (same format as entries)
        let text = '';
        if (typeof decrypted === 'object' && decrypted !== null) {
          if ('text' in decrypted && typeof decrypted.text === 'string') {
            text = decrypted.text;
          } else if ('note' in decrypted && typeof decrypted.note === 'string') {
            text = decrypted.note;
          } else {
            text = JSON.stringify(decrypted);
          }
        } else if (typeof decrypted === 'string') {
          text = decrypted;
        } else {
          text = String(decrypted);
        }

        setDecryptedContent({
          title: payload.title || 'Untitled',
          text,
        });
        logEvent('capsule_open_success');
      } catch (e: unknown) {
        const err = e as { message?: string };
        console.error('Failed to load or decrypt share:', e);
        const errorMsg = err?.message ?? 'Failed to load shared content';
        setError(errorMsg);
        toast.error(errorMsg);
        logEvent('capsule_open_failed');
      } finally {
        setLoading(false);
        setDecrypting(false);
      }
    }

    loadAndDecrypt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, wallet, shareId, encryptionReady, sessionKey]);

  // Loading state
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
        <p className="text-white/60">{decrypting ? 'Decrypting…' : 'Loading…'}</p>
      </div>
    );
  }

  // Error state
  if (error) {
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
        <h2 className="text-lg font-medium text-rose-300">Cannot open share</h2>
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

  // Missing key state (should be handled by error, but just in case)
  if (!encryptionReady || !sessionKey) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-amber-300">Encryption key required</h2>
        <p className="text-sm text-white/60 max-w-md mx-auto">
          Please sign the message in your wallet to unlock your encryption key.
        </p>
        <button
          onClick={() => router.push('/shared')}
          className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
        >
          Back to Shared
        </button>
      </div>
    );
  }

  // Success state - show decrypted content
  if (!share || !decryptedContent) {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <p className="text-white/60">No content to display</p>
        <button
          onClick={() => router.push('/shared')}
          className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
        >
          Back to Shared
        </button>
      </div>
    );
  }

  const capsule = share.capsule;
  const payload = (capsule && typeof capsule === 'object' && 'payload' in capsule 
    ? (capsule.payload as { title?: string; ciphertext?: string })
    : {}) as { title?: string; ciphertext?: string };
  const title = payload.title || 'Untitled';
  const createdDate = new Date(share.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const ownerShort = `${share.owner_wallet.slice(0, 6)}…${share.owner_wallet.slice(-4)}`;

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
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-white/60 mt-1">
            From {ownerShort} · {createdDate}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        {decryptError ? (
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{decryptError}</p>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{decryptedContent.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ShareOpenPage() {
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
          <ShareOpenContent />
        </Suspense>
      </section>
    </main>
  );
}


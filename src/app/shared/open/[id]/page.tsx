'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useLogEvent } from '../../../lib/useLogEvent';
import { rpcGetShare, type ShareRow } from '../../../lib/shares';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { UnlockBanner } from '../../../components/UnlockBanner';
import { decryptText, type EncryptionEnvelope } from '../../../../lib/crypto';
import { rpcInsertInternalEvent } from '../../../lib/internalEvents';

function ShareOpenContent() {
  const params = useParams();
  const searchParams = useSearchParams();
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
  
  // Resolve shareId from params
  const shareId: string | undefined = Array.isArray(params.id) 
    ? (params.id[0] || undefined)
    : (params.id as string | undefined);
  
  // Check if opened with preview query param (for logging purposes)
  const isPreview = searchParams.get('preview') === 'true';

  // Load share and decrypt when ready
  useEffect(() => {
    // Wait for all three conditions: wallet, encryption session, and shareId
    if (!connected || !wallet) {
      setLoading(false);
      return;
    }

    if (!shareId) {
      setError('Share link is missing or invalid');
      setLoading(false);
      return;
    }

    if (!encryptionReady || !sessionKey) {
      // Don't set error yet - let UnlockBanner be visible
      // Only set error if unlock was attempted and failed
      if (encryptionError) {
        setError('Encryption key not ready. Please unlock your session from the top bar.');
      }
      setLoading(false);
      return;
    }

    // All conditions met - fetch and decrypt
    async function loadAndDecrypt() {
      // Type guards - we know these are defined from the checks above
      if (!shareId || !sessionKey) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setDecryptError(null);
      setDecryptedContent(null);

      try {
        // Fetch share
        const fetchedShare = await rpcGetShare(wallet, shareId);
        setShare(fetchedShare);

        // Log share_opened event with metadata (only if preview param is present)
        if (isPreview) {
          try {
            await rpcInsertInternalEvent(
              wallet,
              sessionKey,
              new Date(),
              {
                type: 'share_opened',
                share_id: shareId,
                owner_wallet: fetchedShare.owner_wallet,
                timestamp: new Date().toISOString(),
              }
            );
          } catch (logErr) {
            // Silent fail for event logging - don't interrupt user flow
            console.error('[ShareOpen] Failed to log share_opened event:', logErr);
          }
        }

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

        // Proceed to decryption
        await decryptShareContent(fetchedShare, sessionKey);
      } catch (e: unknown) {
        const err = e as { message?: string };
        console.error('Failed to load or decrypt share:', e);
        const errorMsg = err?.message ?? 'Failed to load shared content';
        
        // Check if this is a "not found or revoked" error
        if (errorMsg.includes('not found') || errorMsg.includes('revoked') || errorMsg.includes('access denied')) {
          setError('This share is no longer available');
        } else {
          setError(errorMsg);
        }
        
        toast.error(errorMsg);
        logEvent('capsule_open_failed');
      } finally {
        setLoading(false);
      }
    }

    loadAndDecrypt();
    // Note: encryptionError is intentionally not in deps - it's only used for display
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, wallet, shareId, encryptionReady, sessionKey, isPreview]);

  // Decrypt share content
  async function decryptShareContent(fetchedShare: ShareRow, key: CryptoKey) {
    setDecrypting(true);
    setDecryptError(null);
    setDecryptedContent(null);

    try {
      // Decrypt content using envelope format
      const capsule = fetchedShare.capsule;
      const payload = ((capsule as { payload?: EncryptionEnvelope & { title?: string } }).payload || {}) as EncryptionEnvelope & { title?: string };
      
      if (!payload.ciphertext || !payload.iv || !payload.version) {
        setError('Invalid encryption envelope format');
        setDecrypting(false);
        return;
      }

      // Decrypt using the envelope format
      const envelope: EncryptionEnvelope = {
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        version: payload.version,
      };
      
      const plaintext = await decryptText(key, envelope);
      
      // Parse the decrypted JSON (same format as reflection entries)
      let decrypted: unknown;
      try {
        decrypted = JSON.parse(plaintext);
      } catch {
        setError('Failed to parse decrypted content');
        setDecrypting(false);
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
      console.error('Failed to decrypt share:', e);
      const errorMsg = err?.message ?? 'Failed to decrypt content';
      setDecryptError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setDecrypting(false);
    }
  }


  // Loading state - show loading message, not null
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

  // Error state
  if (error) {
    const isNotFoundOrRevoked = error.includes('no longer available') || error.includes('not found') || error.includes('revoked') || error.includes('access denied');
    const isKeyNotReady = error.includes('Encryption key not ready');
    
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
          {isNotFoundOrRevoked ? 'This share is no longer available' : isKeyNotReady ? 'Encryption key not ready' : 'Cannot open share'}
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

  // If key is missing and no error yet, show minimal state and let UnlockBanner be visible
  if (!encryptionReady || !sessionKey) {
    // If we have share but no key, show waiting message - UnlockBanner will be visible above
    if (share) {
      return (
        <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
          <p className="text-white/60">Waiting for encryption key...</p>
        </div>
      );
    }
    // Otherwise, still loading share
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <p className="text-white/60">Loading share…</p>
      </div>
    );
  }

  // Success state - show decrypted content
  // Only render content if we have both share and decryptedContent
  if (!share) {
    // Still loading share
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <p className="text-white/60">Loading share…</p>
      </div>
    );
  }

  if (!decryptedContent && !decrypting) {
    // Share loaded but content not decrypted yet - show preparing message
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <p className="text-white/60">Preparing content…</p>
      </div>
    );
  }

  if (!decryptedContent) {
    // Still decrypting
    return null; // Will show loading state from above
  }

  // Extract title from the capsule payload
  const capsule = share.capsule;
  const payload = (capsule && typeof capsule === 'object' && 'payload' in capsule 
    ? (capsule.payload as EncryptionEnvelope & { title?: string })
    : {}) as EncryptionEnvelope & { title?: string };
  const title = payload.title || decryptedContent.title || 'Untitled';
  const createdDate = new Date(share.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const ownerShort = `${share.owner_wallet.slice(0, 6)}…${share.owner_wallet.slice(-4)}`;
  
  // Only show "No content" if text is actually empty
  const hasContent = decryptedContent.text && decryptedContent.text.trim().length > 0;

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
          ) : hasContent ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{decryptedContent.text}</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-white/60">This shared item has no content</p>
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


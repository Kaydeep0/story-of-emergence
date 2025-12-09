'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useLogEvent } from '../lib/useLogEvent';
import { listSharesByRecipient, type ShareRow } from '../lib/shares';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { UnlockBanner } from '../components/UnlockBanner';
import { decryptText, type EncryptionEnvelope } from '../../lib/crypto';

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

// Helper to decrypt using envelope format
async function decryptShareContent(sessionKey: CryptoKey, payload: EncryptionEnvelope & { title?: string }): Promise<unknown> {
  if (!payload.ciphertext || !payload.iv || !payload.version) {
    throw new Error('Invalid encryption envelope format');
  }
  
  const envelope: EncryptionEnvelope = {
    ciphertext: payload.ciphertext,
    iv: payload.iv,
    version: payload.version,
  };
  
  const plaintext = await decryptText(sessionKey, envelope);
  return JSON.parse(plaintext);
}

// Share Preview Modal Component
function SharePreviewModal({
  share,
  isOpen,
  onClose,
  sessionKey,
}: {
  share: ShareRow | null;
  isOpen: boolean;
  onClose: () => void;
  sessionKey: CryptoKey | null;
}) {
  const [decrypting, setDecrypting] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<{ title: string; text: string } | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Decrypt content when share is selected and session key is available
  useEffect(() => {
    if (!isOpen || !share || !sessionKey) {
      setDecryptedContent(null);
      setDecryptError(null);
      return;
    }

    const capsule = share.capsule || {};
    const kind = capsule.kind || 'unknown';
    const payload = (capsule.payload as EncryptionEnvelope & { title?: string }) || {};

    // Only decrypt reflection kind
    if (kind !== 'reflection') {
      setDecryptedContent(null);
      setDecryptError(null);
      return;
    }

    if (!payload.ciphertext || !payload.iv || !payload.version) {
      setDecryptError('Invalid encryption envelope format');
      return;
    }

    setDecrypting(true);
    setDecryptError(null);

    decryptShareContent(sessionKey, payload)
      .then((decrypted) => {
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
      })
      .catch((err) => {
        console.error('Decryption failed:', err);
        const errorMsg = err instanceof Error ? err.message : 'Failed to decrypt content';
        setDecryptError(errorMsg);
        toast.error('Failed to decrypt shared content');
      })
      .finally(() => {
        setDecrypting(false);
      });
  }, [isOpen, share, sessionKey]);

  if (!share) return null;

  const capsule = share.capsule || {};
  const kind = capsule.kind || 'unknown';
  const payload = (capsule.payload as EncryptionEnvelope & { title?: string }) || {};
  const title = payload.title || 'Untitled';
  const createdDate = new Date(share.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const senderShort = `${share.owner_wallet.slice(0, 6)}…${share.owner_wallet.slice(-4)}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-[220ms] ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Mobile panel: slide from bottom */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto z-[70] shadow-2xl transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-xs text-white/60 mt-1">
                From {senderShort} · {createdDate}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {kind !== 'reflection' ? (
            <div className="text-center py-8">
              <p className="text-sm text-white/60">This share type is not supported yet</p>
            </div>
          ) : decrypting ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div>
            </div>
          ) : decryptError ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm text-rose-400">{decryptError}</p>
            </div>
          ) : decryptedContent ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{decryptedContent.text}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Desktop panel: side panel */}
      <div
        className={`hidden sm:flex fixed inset-y-0 right-0 w-[480px] bg-black border-l border-white/10 z-[70] flex-col shadow-2xl transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{title}</h3>
            <p className="text-xs text-white/60 mt-1">
              From {senderShort} · {createdDate}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {kind !== 'reflection' ? (
            <div className="text-center py-8">
              <p className="text-sm text-white/60">This share type is not supported yet</p>
            </div>
          ) : decrypting ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30"></div>
            </div>
          ) : decryptError ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm text-rose-400">{decryptError}</p>
            </div>
          ) : decryptedContent ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{decryptedContent.text}</p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function SharedPage() {
  const { address, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [selectedShare, setSelectedShare] = useState<ShareRow | null>(null);

  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
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
      {/* Unlock banner if encryption session is missing */}
      {connected && !encryptionReady && <UnlockBanner />}

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
              const payload = (capsule.payload as EncryptionEnvelope & { title?: string }) || {};
              const title = payload.title || 'Untitled';
              const kind = capsule.kind || 'unknown';
              const createdDate = new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedShare(item)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-white/70">From {item.owner_wallet.slice(0, 6)}...{item.owner_wallet.slice(-4)}</p>
                      <p className="text-xs text-white/40">{createdDate}</p>
                    </div>
                    <KindBadge kind={kind} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Share Preview Modal */}
      <SharePreviewModal
        share={selectedShare}
        isOpen={!!selectedShare}
        onClose={() => setSelectedShare(null)}
        sessionKey={sessionKey}
      />
    </main>
  );
}

'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { keyFromSignatureHex } from '../../../lib/crypto';
import {
  isCapsuleExpired,
  unwrapKeyForRecipient,
  decryptSlice,
  createSourceLabel,
  formatWalletShort,
  type CapsulePayload,
  type SliceKind,
} from '../../../lib/sharing';
import { rpcGetShare, rpcInsertAcceptedShare } from '../../lib/shares';
import { useLogEvent } from '../../lib/useLogEvent';

/**
 * Decode a base64url string (URL-safe base64) back to original string.
 * Local helper to keep decoding self-contained.
 */
function fromBase64Url(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  return atob(base64);
}

/**
 * Safely decode and parse the capsule query parameter.
 * Handles URL decoding, base64url decoding, and JSON parsing.
 * Returns null if any step fails.
 */
function safeParseCapsuleParam(capsuleParam: string | null): CapsulePayload | null {
  if (!capsuleParam) return null;
  
  try {
    // URL-decode the parameter first (handles encodeURIComponent from sender)
    const urlDecoded = decodeURIComponent(capsuleParam);
    // Base64url decode to get JSON string
    const json = fromBase64Url(urlDecoded);
    // Parse JSON and validate
    const parsed = JSON.parse(json);
    
    // Basic validation
    if (
      typeof parsed.shareId !== 'string' ||
      typeof parsed.wrappedKey !== 'string' ||
      typeof parsed.senderWallet !== 'string'
    ) {
      return null;
    }
    
    return parsed as CapsulePayload;
  } catch (err) {
    console.error('Failed to decode capsule:', err);
    return null;
  }
}

function humanizeSignError(e: unknown): string {
  const err = e as { code?: number; shortMessage?: string; message?: string };
  if (err?.code === 4001) return 'Signature request was rejected.';
  if (err?.code === -32002)
    return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return err?.shortMessage || err?.message || 'Unexpected signing error.';
}

type OpenState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'need_wallet' }
  | { status: 'preview'; capsule: CapsulePayload; title: string; sliceKind: SliceKind; preview: string; decryptedPayload: unknown }
  | { status: 'accepted' }
  | { status: 'dismissed' };

function SliceKindBadge({ kind }: { kind: SliceKind }) {
  const labels: Record<SliceKind, string> = {
    topic_slice: 'Topic Slice',
    link_collection: 'Link Collection',
    reflection_excerpt: 'Reflection Excerpt',
    reflection: 'Reflection',
  };
  const colors: Record<SliceKind, string> = {
    topic_slice: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    link_collection: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    reflection_excerpt: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    reflection: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };
  return (
    <span className={`text-sm px-3 py-1 rounded-full border ${colors[kind] || 'bg-white/10 text-white/60 border-white/20'}`}>
      {labels[kind] || kind}
    </span>
  );
}

function CapsuleOpenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signingConsentRef = useRef(false);

  const [state, setState] = useState<OpenState>({ status: 'loading' });
  const [consentSig, setConsentSig] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  const { logEvent } = useLogEvent();
  const connected = isConnected && !!address;

  // Load consent sig from session
  useEffect(() => {
    const s = sessionStorage.getItem('soe-consent-sig');
    if (s) setConsentSig(s);
  }, []);

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

  // Process the capsule when page loads
  useEffect(() => {
    async function processCapsule() {
      // Check if wallet connected
      if (!connected) {
        setState({ status: 'need_wallet' });
        return;
      }

      const capsuleParam = searchParams.get('capsule');
      if (!capsuleParam) {
        setState({ status: 'error', message: 'No capsule parameter found in URL.' });
        logEvent('capsule_open_failed');
        return;
      }

      // Decode capsule (handles URL decoding + base64url decoding + JSON parsing)
      const capsule = safeParseCapsuleParam(capsuleParam);
      if (!capsule) {
        setState({ status: 'error', message: 'Invalid capsule format. The link may be corrupted.' });
        logEvent('capsule_open_failed');
        return;
      }

      // Check expiry
      if (isCapsuleExpired(capsule)) {
        setState({ status: 'error', message: 'This shared capsule has expired.' });
        logEvent('capsule_open_failed');
        return;
      }

      try {
        // Get session key
        const sessionKey = await getSessionKey();

        // Fetch share from Supabase
        const share = await rpcGetShare(address!, capsule.shareId);
        if (!share) {
          setState({
            status: 'error',
            message: 'This shared capsule cannot be opened. The link may be expired or you may be on a different wallet than the intended recipient.',
          });
          logEvent('capsule_open_failed');
          return;
        }

        // Unwrap the content key
        const contentKey = await unwrapKeyForRecipient(capsule.wrappedKey, sessionKey);

        // Decrypt the slice
        const decryptedPayload = await decryptSlice(share.ciphertext, contentKey);

        // Generate preview
        let preview = '';
        if (typeof decryptedPayload === 'object' && decryptedPayload !== null) {
          const payload = decryptedPayload as Record<string, unknown>;
          if (typeof payload.preview === 'string') {
            preview = payload.preview;
          } else if (typeof payload.content === 'string') {
            preview = payload.content.slice(0, 300);
            if (payload.content.length > 300) preview += '…';
          } else if (Array.isArray(payload.links)) {
            preview = `${payload.links.length} links shared`;
          } else if (typeof payload.summary === 'string') {
            preview = payload.summary;
          }
        }

        setState({
          status: 'preview',
          capsule,
          title: share.title,
          sliceKind: share.slice_kind as SliceKind,
          preview,
          decryptedPayload,
        });
        logEvent('capsule_open_success');
      } catch (e: unknown) {
        const err = e as { message?: string };
        if (err?.message === 'PENDING_SIG') return;
        console.error('Capsule open error:', e);
        setState({
          status: 'error',
          message: 'This shared capsule cannot be opened. The link may be expired or you may be on a different wallet than the intended recipient.',
        });
        logEvent('capsule_open_failed');
      }
    }

    processCapsule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address, searchParams]);

  async function handleAccept() {
    if (state.status !== 'preview') return;
    if (!connected || !address) return;

    setAccepting(true);
    try {
      const sessionKey = await getSessionKey();
      const sourceLabel = createSourceLabel(state.capsule.senderWallet, new Date());

      await rpcInsertAcceptedShare(
        address,
        sessionKey,
        state.capsule.shareId,
        state.sliceKind,
        state.title,
        state.decryptedPayload,
        sourceLabel
      );

      toast.success('Shared content accepted!');
      logEvent('share_accepted');
      setState({ status: 'accepted' });

      // Redirect to shared page after brief delay
      setTimeout(() => {
        router.push('/shared');
      }, 1500);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('Accept error:', e);
      toast.error(err?.message ?? 'Failed to accept share');
    } finally {
      setAccepting(false);
    }
  }

  function handleDismiss() {
    logEvent('share_dismissed');
    setState({ status: 'dismissed' });
    router.push('/shared');
  }

  // Render based on state
  if (state.status === 'loading') {
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
        <p className="text-white/60">Opening capsule…</p>
      </div>
    );
  }

  if (state.status === 'need_wallet') {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"
            />
          </svg>
        </div>
        <h2 className="text-lg font-medium">Connect your wallet</h2>
        <p className="text-sm text-white/60 max-w-sm mx-auto">
          Connect the wallet that this capsule was shared with to decrypt and view the content.
        </p>
        <div className="flex justify-center pt-2">
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
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
        <h2 className="text-lg font-medium text-rose-300">Cannot open capsule</h2>
        <p className="text-sm text-white/60 max-w-md mx-auto">{state.message}</p>
        <button
          onClick={() => router.push('/shared')}
          className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
        >
          Go to Shared
        </button>
      </div>
    );
  }

  if (state.status === 'accepted') {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-emerald-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-emerald-300">Accepted!</h2>
        <p className="text-sm text-white/60">Redirecting to your shared content…</p>
      </div>
    );
  }

  if (state.status === 'dismissed') {
    return (
      <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
        <p className="text-white/60">Dismissed. Redirecting…</p>
      </div>
    );
  }

  // Preview state
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SliceKindBadge kind={state.sliceKind} />
          {state.capsule.expiresAt && (
            <span className="text-xs text-white/40">
              Expires {new Date(state.capsule.expiresAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <h2 className="text-xl font-semibold">{state.title}</h2>
        <p className="text-sm text-white/50">
          From {formatWalletShort(state.capsule.senderWallet)}
        </p>
      </div>

      {/* Preview content */}
      {state.preview && (
        <div className="rounded-xl bg-black/30 border border-white/5 p-4">
          <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Preview</p>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{state.preview}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 rounded-xl bg-white text-black py-3 font-medium hover:bg-white/90 disabled:opacity-50 transition-colors"
        >
          {accepting ? 'Accepting…' : 'Accept'}
        </button>
        <button
          onClick={handleDismiss}
          disabled={accepting}
          className="flex-1 rounded-xl border border-white/20 py-3 font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
        >
          Dismiss
        </button>
      </div>

      <p className="text-xs text-white/40 text-center">
        Accepting will store this content encrypted under your wallet key. It will not merge into your reflections.
      </p>
    </div>
  );
}

export default function CapsuleOpenPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Open Shared Capsule</h1>
        <p className="text-center text-sm text-white/60 mb-8">
          Preview and accept privately shared content.
        </p>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 p-8 text-center">
              <p className="text-white/60">Loading…</p>
            </div>
          }
        >
          <CapsuleOpenContent />
        </Suspense>
      </section>
    </main>
  );
}


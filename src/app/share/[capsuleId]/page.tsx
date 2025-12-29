'use client';

/**
 * Capsule Acceptance Flow
 * /share/[capsuleId]
 * 
 * Behavior:
 * - Wallet connect required
 * - Wallet public key must match recipientPublicKey
 * - Wrapped key decrypted client-side
 * - Share Pack decrypted client-side
 * - Render read-only Yearly Wrap view
 * 
 * No persistence unless user explicitly imports.
 */

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { unwrapKeyForRecipient, decryptSlice } from '../../../lib/sharing';
import { deriveKeyFromSignature } from '../../../lib/crypto';
import type { SharePack } from '../../lib/share/sharePack';
import { YearlyWrapContainer } from '../../components/wrap/YearlyWrapContainer';
import { UnlockBanner } from '../../components/UnlockBanner';

function CapsuleContent() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [sharePack, setSharePack] = useState<SharePack | null>(null);

  const connected = isConnected && !!address;
  const wallet = address ? address.toLowerCase() : '';
  
  const capsuleId: string | undefined = Array.isArray(params.capsuleId) 
    ? (params.capsuleId[0] || undefined)
    : (params.capsuleId as string | undefined);

  // Load and decrypt capsule
  useEffect(() => {
    if (!connected || !wallet) {
      setLoading(false);
      return;
    }

    if (!capsuleId) {
      setError('Capsule ID is missing');
      setLoading(false);
      return;
    }

    if (!encryptionReady || !sessionKey) {
      if (encryptionError) {
        setError('Encryption key not ready. Please unlock your session.');
      }
      setLoading(false);
      return;
    }

    async function loadAndDecrypt() {
      if (!capsuleId || !sessionKey || !wallet) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setDecrypting(false);
      setSharePack(null);

      try {
        // Fetch capsule
        const response = await fetch(`/api/capsules/${capsuleId}`, {
          headers: {
            'x-wallet-address': wallet,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load capsule');
        }

        const capsule = await response.json();

        // Verify recipient matches
        if (capsule.recipientPublicKey.toLowerCase() !== wallet) {
          throw new Error('This capsule is not addressed to your wallet');
        }

        // Check expiry
        if (capsule.expiresAt) {
          const expiryDate = new Date(capsule.expiresAt);
          if (expiryDate.getTime() < Date.now()) {
            throw new Error('This capsule has expired');
          }
        }

        // Decrypt wrapped key using recipient's derived key
        setDecrypting(true);
        
        // Derive recipient's key from signature
        const recipientDerivedKey = await deriveKeyFromSignature(wallet);
        
        // Unwrap content key
        const contentKey = await unwrapKeyForRecipient(capsule.wrappedKey, recipientDerivedKey);
        
        // Decrypt Share Pack
        const decryptedSharePack = await decryptSlice(capsule.payload, contentKey) as SharePack;
        
        // Verify checksum
        if (decryptedSharePack.checksum !== capsule.sharePackChecksum) {
          throw new Error('Checksum verification failed');
        }

        setSharePack(decryptedSharePack);
      } catch (e: unknown) {
        const err = e as { message?: string };
        console.error('Failed to load or decrypt capsule:', e);
        const errorMsg = err?.message ?? 'Failed to load capsule';
        setError(errorMsg);
      } finally {
        setLoading(false);
        setDecrypting(false);
      }
    }

    loadAndDecrypt();
  }, [connected, wallet, capsuleId, encryptionReady, sessionKey, encryptionError]);

  if (loading || decrypting) {
    return (
      <YearlyWrapContainer>
        <div className="text-center py-12">
          <p className="text-gray-600">{decrypting ? 'Decrypting capsule…' : 'Loading capsule…'}</p>
        </div>
      </YearlyWrapContainer>
    );
  }

  if (error) {
    return (
      <YearlyWrapContainer>
        <div className="border border-red-200 bg-red-50 p-6 rounded">
          <h2 className="text-lg font-medium text-red-800 mb-2">Cannot open capsule</h2>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </YearlyWrapContainer>
    );
  }

  if (!encryptionReady || !sessionKey) {
    return (
      <YearlyWrapContainer>
        <div className="text-center py-12">
          <p className="text-gray-600">Waiting for encryption key...</p>
        </div>
      </YearlyWrapContainer>
    );
  }

  if (!sharePack) {
    return (
      <YearlyWrapContainer>
        <div className="text-center py-12">
          <p className="text-gray-600">No content available</p>
        </div>
      </YearlyWrapContainer>
    );
  }

  // Render Yearly Wrap view
  return (
    <YearlyWrapContainer>
      {/* Headline */}
      <div className="mb-16">
        <h1 className="text-4xl font-normal text-gray-900 mb-6 leading-tight">
          {sharePack.title}
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed max-w-[65ch]">
          {sharePack.summary}
        </p>
      </div>

      {/* Density and Cadence Labels */}
      {(sharePack.density || sharePack.cadence) && (
        <div className="mb-16 flex gap-2 flex-wrap">
          {sharePack.density && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
              {sharePack.density.charAt(0).toUpperCase() + sharePack.density.slice(1)} density
            </span>
          )}
          {sharePack.cadence && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
              {sharePack.cadence.charAt(0).toUpperCase() + sharePack.cadence.slice(1)} cadence
            </span>
          )}
        </div>
      )}

      {/* Key Moments */}
      {sharePack.moments.length > 0 && (
        <div className="mb-16">
          <h3 className="text-lg font-normal text-gray-900 mb-8">Key Moments</h3>
          <div className="space-y-8">
            {sharePack.moments.map((moment, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="text-base font-medium text-gray-900">{moment.headline}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">{moment.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shifts */}
      {sharePack.shifts.length > 0 && (
        <div className="mb-16 pt-12 border-t border-gray-200">
          <h3 className="text-sm font-normal text-gray-600 mb-6">Shifts</h3>
          <div className="space-y-4">
            {sharePack.shifts.map((shift, idx) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 mt-0.5 shrink-0 text-base">
                  {shift.direction === 'intensifying' ? '↑' : 
                   shift.direction === 'stabilizing' ? '→' : 
                   shift.direction === 'fragmenting' ? '↯' : '—'}
                </span>
                <div className="flex-1">
                  <p className="font-normal text-gray-700 mb-1">{shift.headline}</p>
                  <p className="text-gray-600 leading-relaxed">{shift.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note about revocation */}
      <div className="mt-16 pt-12 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Note: This capsule was shared with you. If the sender revokes it, you will no longer be able to access it. Past views cannot be revoked.
        </p>
      </div>
    </YearlyWrapContainer>
  );
}

export default function ShareCapsulePage() {
  return (
    <main className="min-h-screen bg-white">
      <UnlockBanner />
      <Suspense
        fallback={
          <YearlyWrapContainer>
            <div className="text-center py-12">
              <p className="text-gray-600">Loading…</p>
            </div>
          </YearlyWrapContainer>
        }
      >
        <CapsuleContent />
      </Suspense>
    </main>
  );
}


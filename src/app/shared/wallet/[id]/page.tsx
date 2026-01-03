// src/app/shared/wallet/[id]/page.tsx
// Recipient page for unlocking wallet-based shares

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { getSupabaseForWallet } from '../../../lib/supabase';
import { getWalletShare, decryptWalletShare } from '../../../lib/walletShares';
import type { ShareArtifact } from '../../../lib/artifacts/lifetimeArtifact';

export default function WalletSharePage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [artifact, setArtifact] = useState<ShareArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shareId = params?.id as string;

  useEffect(() => {
    if (!shareId) {
      setError('Invalid share ID');
      setLoading(false);
      return;
    }

    if (!isConnected || !address) {
      setError('Please connect your wallet to view this share');
      setLoading(false);
      return;
    }

    // Auto-unlock if wallet is connected
    handleUnlock();
  }, [shareId, isConnected, address]);

  const handleUnlock = async () => {
    if (!shareId || !address) return;

    setUnlocking(true);
    setError(null);

    try {
      // Get share from database
      const supabase = getSupabaseForWallet(address);
      const share = await getWalletShare(supabase, shareId);

      // Decrypt share using recipient's wallet
      const decryptedArtifact = await decryptWalletShare(share, address);
      setArtifact(decryptedArtifact);
    } catch (err: any) {
      console.error('Failed to unlock share:', err);
      
      if (err.message?.includes('User rejected')) {
        setError('Decryption was cancelled');
      } else if (err.message?.includes('not support')) {
        setError('Your wallet does not support decryption. Please use MetaMask or a compatible wallet.');
      } else if (err.message?.includes('not found')) {
        setError('Share not found or expired');
      } else {
        setError(err.message || 'Failed to unlock share');
      }
    } finally {
      setUnlocking(false);
      setLoading(false);
    }
  };

  if (loading || unlocking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 mb-4">
            {unlocking ? 'Unlocking share...' : 'Loading...'}
          </div>
          {unlocking && (
            <p className="text-xs text-white/40">
              Your wallet will prompt you to decrypt
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="text-white mb-4">{error}</div>
          <button
            onClick={() => router.push('/insights')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
          >
            Go to Insights
          </button>
        </div>
      </div>
    );
  }

  if (!artifact) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60">No artifact found</div>
        </div>
      </div>
    );
  }

  // Render decrypted artifact
  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/insights')}
            className="text-white/60 hover:text-white transition-colors text-sm"
          >
            ← Back to Insights
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h1 className="text-xl font-medium text-white">Shared Reflection</h1>
          
          <div className="space-y-3 text-sm text-white/70">
            <p>
              <span className="text-white/50">Kind:</span> {artifact.kind}
            </p>
            {artifact.inventory.firstReflectionDate && (
              <p>
                <span className="text-white/50">First reflection:</span>{' '}
                {new Date(artifact.inventory.firstReflectionDate).toLocaleDateString()}
              </p>
            )}
            {artifact.inventory.lastReflectionDate && (
              <p>
                <span className="text-white/50">Last reflection:</span>{' '}
                {new Date(artifact.inventory.lastReflectionDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Render artifact content based on kind */}
          {artifact.kind === 'weekly' && artifact.signals && (
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-medium text-white">Summary</h2>
              {artifact.signals.map((signal, idx) => (
                <div key={idx} className="text-sm text-white/70">
                  {signal.label}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-white/50">
              This share was decrypted using your wallet. You can save or import this content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { useConsentMemory } from '../lib/vault/useConsentMemory';
import { toast } from 'sonner';

export function UnlockBanner() {
  const { isConnected } = useAccount();
  const { ready, error, ensureEncryptionSession } = useEncryptionSession();
  const { openConnectModal } = useConnectModal();
  const { wasHereRecently } = useConsentMemory();
  const [unlocking, setUnlocking] = useState(false);

  // Don't show if already unlocked
  if (ready) return null;

  // Check if user was here recently
  const showReturnOrientation = isConnected && !ready && !error && wasHereRecently();

  const handleUnlock = async () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }

    setUnlocking(true);
    try {
      const result = await ensureEncryptionSession();
      if (result.needsWallet) {
        openConnectModal?.();
      } else if (result.isReady) {
        toast.success('Encryption session unlocked');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to unlock';
      toast.error(errMsg);
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="sticky top-[57px] z-20 border-b border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
      <div className="mx-auto max-w-4xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-200">
                {!isConnected
                  ? 'Connect your wallet to unlock encrypted data'
                  : error
                  ? `Encryption error: ${error}`
                  : 'Unlock to view encrypted data'}
              </p>
              {!isConnected && (
                <p className="text-xs text-amber-300/70 mt-0.5">
                  Your data is encrypted and requires wallet connection
                </p>
              )}
              {showReturnOrientation && (
                <p className="text-xs text-amber-300/50 mt-0.5">
                  You were here recently
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {!isConnected ? (
              <ConnectButton />
            ) : (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {unlocking ? 'Unlocking…' : 'Unlock'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


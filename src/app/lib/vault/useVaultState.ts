'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../useEncryptionSession';
import { useConsentMemory } from './useConsentMemory';

export type VaultState = 'locked' | 'unlocking' | 'unlocked' | 'locking';

/**
 * Vault state hook
 * Derives vault state from encryption readiness
 * No timers that lie - state is directly mapped to encryption state
 */
export function useVaultState(): VaultState {
  const { isConnected, address } = useAccount();
  const { ready, signing, error, aesKey, walletAddress } = useEncryptionSession();
  const { recordUnlock, clear } = useConsentMemory();
  
  const [wasUnlocked, setWasUnlocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [lastWalletAddress, setLastWalletAddress] = useState<string | null>(null);

  // Clear consent memory when wallet changes or disconnects
  useEffect(() => {
    const currentWallet = address?.toLowerCase() || null;
    
    // Clear if wallet changed
    if (lastWalletAddress !== null && lastWalletAddress !== currentWallet) {
      clear();
    }
    
    // Clear if wallet disconnected
    if (!isConnected) {
      clear();
    }
    
    setLastWalletAddress(currentWallet);
  }, [address, isConnected, lastWalletAddress, clear]);

  // Track if we were previously unlocked and record successful unlock
  useEffect(() => {
    if (ready && aesKey) {
      setWasUnlocked(true);
      setIsLocking(false);
      // Record successful unlock in consent memory
      recordUnlock();
    }
  }, [ready, aesKey, recordUnlock]);

  // Detect locking transition (wallet disconnect, session expiry)
  useEffect(() => {
    if (wasUnlocked && (!isConnected || !ready || !aesKey)) {
      setIsLocking(true);
      // Reset locking state after brief animation
      const timeout = setTimeout(() => {
        setIsLocking(false);
        setWasUnlocked(false);
      }, 600); // Match animation duration
      return () => clearTimeout(timeout);
    } else if (isConnected && ready && aesKey) {
      // If we're connected and ready again, cancel locking
      setIsLocking(false);
    }
  }, [wasUnlocked, isConnected, ready, aesKey]);

  // Derive state from encryption readiness
  const state = useMemo((): VaultState => {
    // If key derivation failed, return to locked
    if (error && !ready) {
      return 'locked';
    }

    // Locking transition
    if (isLocking) {
      return 'locking';
    }

    // Unlocked state
    if (ready && aesKey && isConnected) {
      return 'unlocked';
    }

    // Unlocking state (signing or key derivation in progress)
    if (isConnected && (signing || (!ready && !error))) {
      return 'unlocking';
    }

    // Default: locked
    return 'locked';
  }, [isConnected, ready, signing, error, aesKey, isLocking]);

  return state;
}


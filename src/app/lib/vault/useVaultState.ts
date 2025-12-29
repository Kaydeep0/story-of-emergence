'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../useEncryptionSession';

export type VaultState = 'locked' | 'unlocking' | 'unlocked' | 'locking';

/**
 * Vault state hook
 * Derives vault state from encryption readiness
 * No timers that lie - state is directly mapped to encryption state
 */
export function useVaultState(): VaultState {
  const { isConnected } = useAccount();
  const { ready, signing, error, aesKey } = useEncryptionSession();
  
  const [wasUnlocked, setWasUnlocked] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  // Track if we were previously unlocked
  useEffect(() => {
    if (ready && aesKey) {
      setWasUnlocked(true);
      setIsLocking(false);
    }
  }, [ready, aesKey]);

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


'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';

type VaultPhase = 'APPROACH' | 'TRAVEL' | 'UNLOCK' | 'RESOLVE' | 'ERROR';

// Helper function to derive encryption state from hooks
// Maps the current situation into: 'idle' | 'awaiting_signature' | 'unlocking' | 'unlocked' | 'error'
function deriveEncryptionState(
  isConnected: boolean,
  ready: boolean,
  error: string | null,
  wasReady: boolean
): 'idle' | 'awaiting_signature' | 'unlocking' | 'unlocked' | 'error' {
  if (!isConnected) {
    return 'idle';
  }
  
  if (error) {
    return 'error';
  }
  
  if (ready) {
    // If we just transitioned to ready, show unlocking briefly, then unlocked
    if (!wasReady) {
      return 'unlocking';
    }
    return 'unlocked';
  }
  
  // Connected but not ready and no error = awaiting signature
  return 'awaiting_signature';
}

export function VaultUnlockOverlay() {
  const { isConnected } = useAccount();
  const { ready, error } = useEncryptionSession();
  
  // Track previous ready state to detect transitions
  const [wasReady, setWasReady] = useState(ready);
  
  // Derive encryption state from hooks
  const encryptionState = deriveEncryptionState(isConnected, ready, error, wasReady);
  
  // React state for the current vault phase
  const [phase, setPhase] = useState<VaultPhase>('APPROACH');
  
  // Control overlay visibility
  // Overlay is visible when wallet is connected and encryption state is not idle
  // But hide it after RESOLVE phase completes
  const [showOverlay, setShowOverlay] = useState(false);

  // Track previous ready state to detect transitions
  useEffect(() => {
    if (ready && !wasReady) {
      setWasReady(true);
    } else if (!ready) {
      setWasReady(false);
    }
  }, [ready, wasReady]);

  // Control overlay visibility based on encryption state
  useEffect(() => {
    // Hide overlay when idle
    if (encryptionState === 'idle') {
      setShowOverlay(false);
    } else if (isConnected) {
      // Show overlay when connected and encryption state is not idle
      setShowOverlay(true);
    }
  }, [encryptionState, isConnected]);

  // Map encryption state to vault phase
  useEffect(() => {
    if (encryptionState === 'idle') {
      setPhase('APPROACH');
    } else if (encryptionState === 'awaiting_signature') {
      setPhase('TRAVEL');
    } else if (encryptionState === 'unlocking') {
      setPhase('UNLOCK');
    } else if (encryptionState === 'unlocked') {
      setPhase('RESOLVE');
    } else if (encryptionState === 'error') {
      setPhase('ERROR');
    }
  }, [encryptionState]);

  // Don't render if overlay should be hidden
  if (!showOverlay) {
    return null;
  }

  return (
    <div
      data-vault-overlay
      data-vault-phase={phase}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none"
      >
      <div className="text-white">Vault Unlock Overlay</div>
    </div>
  );
}


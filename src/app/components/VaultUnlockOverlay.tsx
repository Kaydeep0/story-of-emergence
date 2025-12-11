'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';

type UnlockPhase = 'idle' | 'approach' | 'travel' | 'unlock' | 'resolve' | 'error';

type Props = {
  onClose?: () => void;
};

/**
 * Pure function to get CSS class for current phase
 */
function getPhaseClass(phase: UnlockPhase): string {
  return `vault-${phase}`;
}

export function VaultUnlockOverlay({ onClose }: Props) {
  const { isConnected } = useAccount();
  const { ready, error, signing } = useEncryptionSession();
  
  const [phase, setPhase] = useState<UnlockPhase>('idle');
  const hasCalledOnClose = useRef(false);
  const resolveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset onClose flag when component mounts
  useEffect(() => {
    hasCalledOnClose.current = false;
  }, []);

  // State machine: Map encryption status to phases
  useEffect(() => {
    // Clear any existing timeout
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }

    // Determine phase from encryption status
    if (!isConnected) {
      setPhase('idle');
      return;
    }

    if (error) {
      setPhase('error');
      return;
    }

    // Key has been derived successfully
    if (ready) {
      if (phase !== 'unlock' && phase !== 'resolve') {
        setPhase('unlock');
        
        // Auto-transition to resolve after 700ms
        resolveTimeoutRef.current = setTimeout(() => {
          setPhase('resolve');
          
          // Call onClose once in resolve phase
          if (onClose && !hasCalledOnClose.current) {
            hasCalledOnClose.current = true;
            onClose();
          }
        }, 700);
      }
      return;
    }

    // Not ready yet - determine if we're waiting or in progress
    // Key request is in progress (signing)
    if (signing) {
      setPhase('travel');
    } else {
      // Waiting on the key (component first appeared)
      setPhase('approach');
    }

    // Cleanup timeout on unmount
    return () => {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
      }
    };
  }, [isConnected, ready, error, signing, phase, onClose]);

  // Don't render if idle
  if (phase === 'idle') {
    return null;
  }

  const phaseClass = getPhaseClass(phase);

  // Phase-based text
  const getText = (): string => {
    switch (phase) {
      case 'approach':
        return 'Approaching vault…';
      case 'travel':
        return 'Passing threshold…';
      case 'unlock':
        return 'Unlocking…';
      case 'resolve':
        return 'Returning to awareness…';
      case 'error':
        return 'Vault access failed';
      default:
        return '';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 ${phaseClass}`}>
      {/* Background ring for travel phase blur */}
      <div className="vault-ring" />
      
      <div className="text-center">
        <div className="vault-content">
          <p className="vault-text">{getText()}</p>
        </div>
      </div>
    </div>
  );
}

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
    // Determine phase from encryption status
    if (!isConnected) {
      // Clear timeout if disconnecting
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      setPhase('idle');
      return;
    }

    // Error state takes precedence - clear any unlock timeout
    if (error) {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
      setPhase('error');
      return;
    }

    // Key has been derived successfully
    if (ready) {
      setPhase((currentPhase) => {
        // If already in resolve, don't change
        if (currentPhase === 'resolve') {
          return currentPhase;
        }
        
        // If not in unlock yet, transition to unlock and set up timeout
        if (currentPhase !== 'unlock') {
          // Clear any existing timeout before setting new one
          if (resolveTimeoutRef.current) {
            clearTimeout(resolveTimeoutRef.current);
          }
          
          // Set up timeout to transition to resolve
          resolveTimeoutRef.current = setTimeout(() => {
            setPhase('resolve');
            
            // Call onClose once in resolve phase
            if (onClose && !hasCalledOnClose.current) {
              hasCalledOnClose.current = true;
              onClose();
            }
          }, 700);
          
          return 'unlock';
        }
        
        // Already in unlock - ensure timeout is still running (handles remount case)
        if (!resolveTimeoutRef.current) {
          resolveTimeoutRef.current = setTimeout(() => {
            setPhase('resolve');
            
            // Call onClose once in resolve phase
            if (onClose && !hasCalledOnClose.current) {
              hasCalledOnClose.current = true;
              onClose();
            }
          }, 700);
        }
        
        return currentPhase;
      });
      
      return;
    }

    // Not ready yet - clear any unlock timeout
    if (resolveTimeoutRef.current) {
      clearTimeout(resolveTimeoutRef.current);
      resolveTimeoutRef.current = null;
    }

    // Determine if we're waiting or in progress
    // Key request is in progress (signing)
    if (signing) {
      setPhase('travel');
    } else {
      // Waiting on the key (component first appeared)
      setPhase('approach');
    }

    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (resolveTimeoutRef.current) {
        clearTimeout(resolveTimeoutRef.current);
        resolveTimeoutRef.current = null;
      }
    };
  }, [isConnected, ready, error, signing, onClose]);

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
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${phaseClass}`}>
      {/* Deep background fog layer */}
      <div className="vault-fog" />
      
      {/* Radial tunnel effect - stronger during approach/travel */}
      <div className="vault-tunnel" />
      
      {/* Vignette/darkening around edges */}
      <div className="vault-vignette" />
      
      {/* Outer ring - subtle during approach */}
      <div className="vault-ring vault-ring-outer" />
      
      {/* Middle ring - active during travel */}
      <div className="vault-ring vault-ring-middle" />
      
      {/* Inner ring - pulses during unlock */}
      <div className="vault-ring vault-ring-inner" />
      
      {/* Center glow during unlock */}
      <div className="vault-glow" />
      
      {/* Bloom effect during unlock */}
      <div className="vault-bloom" />
      
      {/* Unlock flash effect */}
      <div className="vault-flash" />
      
      {/* Main content with parallax */}
      <div className="text-center">
        <div className="vault-content">
          {/* Metallic chrome glow wrapper */}
          <div className="vault-text-wrapper">
            <p className="vault-text">{getText()}</p>
            {phase === 'unlock' && (
              <p className="vault-text vault-text-success">Vault unlocked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

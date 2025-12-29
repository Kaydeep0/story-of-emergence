'use client';

import { useEffect, useRef } from 'react';
import { useVaultState } from '../../lib/vault/useVaultState';

type Props = {
  onClose?: () => void;
};

/**
 * Vault Unlock Overlay
 * Cinematic, stateful unlock experience that maps directly to encryption state
 * Solemn, not triumphant - no celebratory effects
 */
export function VaultUnlockOverlay({ onClose }: Props) {
  const vaultState = useVaultState();
  const hasCalledOnClose = useRef(false);
  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset onClose flag when component mounts
  useEffect(() => {
    hasCalledOnClose.current = false;
  }, []);

  // Handle unlock completion
  useEffect(() => {
    if (vaultState === 'unlocked') {
      // Brief delay before dismissing (allows unlock animation to complete)
      unlockTimeoutRef.current = setTimeout(() => {
        if (onClose && !hasCalledOnClose.current) {
          hasCalledOnClose.current = true;
          onClose();
        }
      }, 800); // Match animation duration

      return () => {
        if (unlockTimeoutRef.current) {
          clearTimeout(unlockTimeoutRef.current);
          unlockTimeoutRef.current = null;
        }
      };
    } else {
      // Clear timeout if state changes away from unlocked
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
        unlockTimeoutRef.current = null;
      }
    }
  }, [vaultState, onClose]);

  // Don't render if locked
  if (vaultState === 'locked') {
    return null;
  }

  // Get state-specific text
  const getText = (): string => {
    switch (vaultState) {
      case 'unlocking':
        return 'Unlocking vault…';
      case 'unlocked':
        return 'Vault unlocked';
      case 'locking':
        return 'Securing vault…';
      default:
        return '';
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center vault-overlay vault-state-${vaultState}`}
      style={{ pointerEvents: vaultState === 'unlocking' || vaultState === 'locking' ? 'auto' : 'none' }}
    >
      {/* Dark background with subtle depth */}
      <div className="vault-background" />
      
      {/* Inward motion effect - single direction, ease-in */}
      <div className="vault-motion" />
      
      {/* Subtle vignette */}
      <div className="vault-vignette" />
      
      {/* Center content */}
      <div className="text-center relative z-10">
        <p className="vault-text">{getText()}</p>
      </div>
    </div>
  );
}


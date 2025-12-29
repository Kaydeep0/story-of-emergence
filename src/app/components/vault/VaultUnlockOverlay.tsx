'use client';

import { useEffect, useRef, useState } from 'react';
import { useVaultState, type VaultState } from '../../lib/vault/useVaultState';

/**
 * Vault Unlock & Lock Ritual
 * 
 * Experiential only - no inference logic, no data changes, no interpretation changes.
 * 
 * Unlock semantics:
 * - Represents permission to observe, not permission to change
 * - No language of success, completion, or progress
 * - No celebratory feedback
 * 
 * Lock semantics:
 * - Represents withdrawal of observation
 * - No error states
 * - No warning language
 * 
 * Visual behavior:
 * - Full-screen overlay
 * - Dark, dense visual field
 * - Slow, deliberate transition (300-600ms, ease-in-out)
 * - Subtle motion inward (depth, not forward)
 * - Metallic or stone-like texture
 * - Single focal point (vault aperture/iris)
 * - Optional neutral text: "Unlocking" or no text
 */
export function VaultUnlockOverlay() {
  const vaultState = useVaultState();
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const previousStateRef = useRef<VaultState | null>(null);

  // Track state transitions
  useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = vaultState;

    // Show overlay on unlock/lock transitions
    if (vaultState === 'unlocking' || vaultState === 'locking') {
      setIsVisible(true);
      setHasAnimated(false);
    } else if (vaultState === 'unlocked' && previousState === 'unlocking') {
      // Unlock complete - fade out after animation
      setTimeout(() => {
        setIsVisible(false);
        setHasAnimated(true);
      }, 600);
    } else if (vaultState === 'locked' && previousState === 'locking') {
      // Lock complete - fade out after animation
      setTimeout(() => {
        setIsVisible(false);
        setHasAnimated(true);
      }, 500);
    } else if (vaultState === 'locked') {
      // Already locked - hide immediately
      setIsVisible(false);
    } else if (vaultState === 'unlocked' && !hasAnimated) {
      // Already unlocked - hide immediately (no replay unless session resets)
      setIsVisible(false);
      setHasAnimated(true);
    }
  }, [vaultState, hasAnimated]);

  // Don't render if not visible
  if (!isVisible || vaultState === 'locked') {
    return null;
  }

  const isUnlocking = vaultState === 'unlocking';
  const isLocking = vaultState === 'locking';

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center vault-ritual-overlay ${
        isUnlocking ? 'vault-ritual-unlocking' : 
        isLocking ? 'vault-ritual-locking' : 
        ''
      }`}
      style={{ pointerEvents: isUnlocking || isLocking ? 'auto' : 'none' }}
    >
      {/* Dark, dense visual field */}
      <div className="vault-ritual-background" />
      
      {/* Subtle motion inward/outward - depth effect */}
      <div className="vault-ritual-motion" />
      
      {/* Single focal point - vault aperture/iris */}
      <div className="vault-ritual-aperture">
        <div className="vault-ritual-iris" />
      </div>
      
      {/* Optional neutral text - only during transition */}
      {(isUnlocking || isLocking) && (
        <div className="vault-ritual-text">
          {isUnlocking ? 'Unlocking' : 'Locking'}
        </div>
      )}
    </div>
  );
}

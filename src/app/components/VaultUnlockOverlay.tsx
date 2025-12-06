'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';

type EncryptionState = 'idle' | 'awaiting_signature' | 'unlocking' | 'unlocked' | 'error';

function deriveEncryptionState(
  isConnected: boolean,
  ready: boolean,
  error: string | null,
  wasReady: boolean
): EncryptionState {
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
  const [wasReady, setWasReady] = useState(ready);
  const [showOverlay, setShowOverlay] = useState(false);
  const [state, setState] = useState<EncryptionState>('idle');
  const unlockTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownOverlayRef = useRef(false);


  // Track previous ready state to detect transitions
  useEffect(() => {
    const currentState = deriveEncryptionState(isConnected, ready, error, wasReady);
    setState(currentState);
    
    // Update wasReady after state is set
    if (ready && !wasReady) {
      setWasReady(true);
    } else if (!ready) {
      setWasReady(false);
    }
  }, [isConnected, ready, error, wasReady]);

  // Control overlay visibility based on state
  useEffect(() => {
    // Only show overlay if we've entered awaiting_signature state
    // This ensures we don't show it if key was cached (ready on mount)
    if (state === 'awaiting_signature') {
      hasShownOverlayRef.current = true;
      setShowOverlay(true);
    }
    
    // Continue showing during unlocking if we've shown it before
    if (state === 'unlocking' && hasShownOverlayRef.current) {
      setShowOverlay(true);
    }
    
    // When unlocked, wait for unlock animation then fade out (220ms)
    if (state === 'unlocked' && showOverlay) {
      // Clear any existing timeout
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
      }
      
      // Wait for unlock animation (~600ms), then fade out (220ms), then hide
      unlockTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 600 + 220); // Unlock animation + fade-out duration
    }
    
    // Hide overlay on error after showing error animation
    if (state === 'error' && showOverlay) {
      // Show error animation for a bit, then hide
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
      }
      unlockTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 1500);
    }
    
    // Hide overlay when idle
    if (state === 'idle') {
      setShowOverlay(false);
    }
    
    return () => {
      if (unlockTimeoutRef.current) {
        clearTimeout(unlockTimeoutRef.current);
      }
    };
  }, [state, showOverlay]);

  // Don't render if overlay should be hidden
  if (!showOverlay) {
    return null;
  }

  const isUnlocking = state === 'unlocking';
  const isUnlocked = state === 'unlocked';
  const isError = state === 'error';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm ${
        isUnlocked ? 'animate-[fadeOut_220ms_ease-out_forwards]' : 'opacity-100'
      }`}
    >
      
      <div className="relative">
        {/* Outer rotating ring */}
        <div
          className={`absolute inset-0 rounded-full border-4 ${
            isError
              ? 'border-rose-500/60'
              : 'border-zinc-600/40'
          }`}
          className={
            isError
              ? 'animate-[shake_0.5s_ease-in-out,errorPulse_1.5s_ease-in-out_infinite]'
              : isUnlocking || isUnlocked
              ? 'transition-transform duration-300 ease-out'
              : 'animate-[rotateRing_3s_linear_infinite]'
          }
          style={{
            width: '200px',
            height: '200px',
            transform: isUnlocking || isUnlocked ? 'rotate(0deg)' : undefined,
          }}
        />
        
        {/* Inner vault plate */}
        <div
          className={`relative rounded-full ${
            isError
              ? 'bg-gradient-to-br from-rose-900/80 to-rose-700/60'
              : isUnlocking || isUnlocked
              ? 'bg-gradient-to-br from-emerald-900/80 to-emerald-700/60'
              : 'bg-gradient-to-br from-zinc-800/90 to-zinc-700/70'
          } border-2 ${
            isError
              ? 'border-rose-500/50'
              : isUnlocking || isUnlocked
              ? 'border-emerald-500/50'
              : 'border-zinc-600/50'
          }`}
          className={
            isError
              ? 'animate-[shake_0.5s_ease-in-out]'
              : isUnlocking || isUnlocked
              ? 'animate-[unlockPlate_0.6s_ease-out,glow_1s_ease-in-out_0.3s] transition-[box-shadow,background] duration-300 ease-out'
              : undefined
          }
          style={{
            width: '160px',
            height: '160px',
            boxShadow: isUnlocking || isUnlocked
              ? '0 0 30px rgba(34, 197, 94, 0.4), inset 0 0 20px rgba(34, 197, 94, 0.2)'
              : 'inset 0 0 20px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Vault door pattern */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`h-1 w-24 rounded-full ${
                isError
                  ? 'bg-rose-400/60'
                  : isUnlocking || isUnlocked
                  ? 'bg-emerald-400/60'
                  : 'bg-zinc-500/40'
              }`}
              style={{
                transform: isUnlocking || isUnlocked ? 'scaleX(0)' : 'scaleX(1)',
                transition: 'transform 0.4s ease-out',
              }}
            />
          </div>
          
          {/* Center lock icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isError ? (
              <svg
                className="w-12 h-12 text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            ) : isUnlocking || isUnlocked ? (
              <svg
                className="w-12 h-12 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            ) : (
              <svg
                className="w-12 h-12 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


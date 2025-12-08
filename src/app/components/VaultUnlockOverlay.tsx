'use client';

import { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';

type VaultPhase = 'APPROACH' | 'TRAVEL' | 'UNLOCK' | 'RESOLVE' | 'ERROR';

// Phase duration constants
const RESOLVE_DURATION_MS = 2400; // RESOLVE phase displays awareness message for ~2.4 seconds before overlay hides

// Audio context singleton
let soeAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!soeAudioContext) {
    soeAudioContext = new AC();
  }
  if (soeAudioContext.state === 'suspended') {
    soeAudioContext
      .resume()
      .catch(() => {
        // ignore if the browser refuses to resume
      });
  }
  return soeAudioContext;
}

function playTone(frequency: number, durationMs: number, volume = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, now);

  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.05);
}

function tryVibrate(pattern: number | number[]) {
  if (typeof window === 'undefined') return;
  const nav = window.navigator as any;
  if (!nav?.vibrate) return;

  const prefersReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if (prefersReduce && prefersReduce.matches) return;

  nav.vibrate(pattern);
}

// Helper function to derive encryption state from hooks
// Maps the current situation into: 'idle' | 'awaiting_signature' | 'unlocking' | 'unlocked' | 'error'
// Prioritizes signing state to show APPROACH phase immediately when consent signature is requested
function deriveEncryptionState(
  isConnected: boolean,
  ready: boolean,
  error: string | null,
  wasReady: boolean,
  signing: boolean
): 'idle' | 'awaiting_signature' | 'unlocking' | 'unlocked' | 'error' {
  if (!isConnected) {
    return 'idle';
  }
  
  if (error) {
    return 'error';
  }
  
  // If actively signing (signature request in progress), show awaiting_signature immediately
  // This ensures APPROACH phase appears as soon as MetaMask consent dialog opens
  if (signing) {
    return 'awaiting_signature';
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
  const { ready, error, signing } = useEncryptionSession();
  
  // Track previous ready state to detect transitions
  const [wasReady, setWasReady] = useState(ready);
  
  // Derive encryption state from hooks
  // signing state ensures APPROACH phase appears immediately when consent signature is requested
  const encryptionState = deriveEncryptionState(isConnected, ready, error, wasReady, signing);
  
  // React state for the current vault phase
  const [phase, setPhase] = useState<VaultPhase>('APPROACH');
  
  // Track the last vault phase for sound/haptic triggers
  const phaseRef = useRef<VaultPhase>('APPROACH');
  
  // Control overlay visibility
  const [showOverlay, setShowOverlay] = useState(true);
  
  // Track phase entry time to enforce minimum durations
  const phaseEntryTimeRef = useRef<number>(Date.now());

  // Track previous ready state to detect transitions
  useEffect(() => {
    if (ready && !wasReady) {
      setWasReady(true);
    } else if (!ready) {
      setWasReady(false);
    }
  }, [ready, wasReady]);

  // State machine: Map encryptionState to vault phases with transitions
  useEffect(() => {
    let timeoutId1: NodeJS.Timeout | null = null;
    let timeoutId2: NodeJS.Timeout | null = null;
    let timeoutId3: NodeJS.Timeout | null = null;

    // Clear any existing timeouts
    const clearExistingTimeouts = () => {
      if (timeoutId1) {
        clearTimeout(timeoutId1);
        timeoutId1 = null;
      }
      if (timeoutId2) {
        clearTimeout(timeoutId2);
        timeoutId2 = null;
      }
      if (timeoutId3) {
        clearTimeout(timeoutId3);
        timeoutId3 = null;
      }
    };

    const now = Date.now();
    const timeSincePhaseEntry = now - phaseEntryTimeRef.current;

    // Map encryptionState to initial phase
    if (encryptionState === 'idle' || encryptionState === 'awaiting_signature') {
      clearExistingTimeouts();
      phaseRef.current = 'APPROACH';
      setPhase('APPROACH');
      phaseEntryTimeRef.current = now;
      // Show overlay immediately when signature is requested (awaiting_signature) or when idle but connected
      // This ensures APPROACH phase appears as soon as MetaMask consent dialog opens
      if (encryptionState === 'awaiting_signature') {
        setShowOverlay(true);
      } else {
        setShowOverlay(false);
      }
    } else if (encryptionState === 'unlocking') {
      // Slower timing for testing: APPROACH stays visible for 800ms before transitioning to TRAVEL
      if (phase === 'APPROACH' && timeSincePhaseEntry < 800) {
        // Wait for minimum APPROACH duration
        const remainingTime = 800 - timeSincePhaseEntry;
        if (!timeoutId1) {
          timeoutId1 = setTimeout(() => {
            phaseRef.current = 'TRAVEL';
            setPhase('TRAVEL');
            phaseEntryTimeRef.current = Date.now();
            setShowOverlay(true);
          }, remainingTime);
        }
      } else {
        clearExistingTimeouts();
        phaseRef.current = 'TRAVEL';
        setPhase('TRAVEL');
        phaseEntryTimeRef.current = now;
        setShowOverlay(true);
      }
    } else if (encryptionState === 'unlocked') {
      // Slower timing for testing: TRAVEL lasts 1500ms before transitioning to UNLOCK
      if (phase === 'TRAVEL' && timeSincePhaseEntry < 1500) {
        // Wait for minimum TRAVEL duration
        const remainingTime = 1500 - timeSincePhaseEntry;
        if (!timeoutId1) {
          timeoutId1 = setTimeout(() => {
            phaseRef.current = 'UNLOCK';
            setPhase('UNLOCK');
            phaseEntryTimeRef.current = Date.now();
            setShowOverlay(true);
            
            timeoutId2 = setTimeout(() => {
              phaseRef.current = 'RESOLVE';
              setPhase('RESOLVE');
              phaseEntryTimeRef.current = Date.now();
              timeoutId3 = setTimeout(() => {
                setShowOverlay(false);
              }, RESOLVE_DURATION_MS);
            }, 1500); // Slower timing for testing: UNLOCK stays visible for 1500ms before transitioning to RESOLVE
          }, remainingTime);
        }
      } else {
        clearExistingTimeouts();
        // Transition: UNLOCK → RESOLVE → hide overlay
        phaseRef.current = 'UNLOCK';
        setPhase('UNLOCK');
        phaseEntryTimeRef.current = now;
        setShowOverlay(true);
        
        timeoutId1 = setTimeout(() => {
          phaseRef.current = 'RESOLVE';
          setPhase('RESOLVE');
          phaseEntryTimeRef.current = Date.now();
          timeoutId2 = setTimeout(() => {
            setShowOverlay(false);
          }, RESOLVE_DURATION_MS);
        }, 1500); // Slower timing for testing: UNLOCK stays visible for 1500ms before transitioning to RESOLVE
      }
    } else if (encryptionState === 'error') {
      // Slower timing for testing: TRAVEL lasts 1500ms before transitioning to ERROR
      if (phase === 'TRAVEL' && timeSincePhaseEntry < 1500) {
        // Wait for minimum TRAVEL duration
        const remainingTime = 1500 - timeSincePhaseEntry;
        if (!timeoutId1) {
          timeoutId1 = setTimeout(() => {
            phaseRef.current = 'ERROR';
            setPhase('ERROR');
            phaseEntryTimeRef.current = Date.now();
            setShowOverlay(true);
            
            timeoutId2 = setTimeout(() => {
              phaseRef.current = 'RESOLVE';
              setPhase('RESOLVE');
              phaseEntryTimeRef.current = Date.now();
              timeoutId3 = setTimeout(() => {
                setShowOverlay(false);
              }, RESOLVE_DURATION_MS);
            }, 1500); // Slower timing for testing: ERROR stays visible for 1500ms before transitioning to RESOLVE
          }, remainingTime);
        }
      } else {
        clearExistingTimeouts();
        // Transition: ERROR → RESOLVE → hide overlay
        phaseRef.current = 'ERROR';
        setPhase('ERROR');
        phaseEntryTimeRef.current = now;
        setShowOverlay(true);
        
        timeoutId1 = setTimeout(() => {
          phaseRef.current = 'RESOLVE';
          setPhase('RESOLVE');
          phaseEntryTimeRef.current = Date.now();
          timeoutId2 = setTimeout(() => {
            setShowOverlay(false);
          }, RESOLVE_DURATION_MS);
        }, 1500); // Slower timing for testing: ERROR stays visible for 1500ms before transitioning to RESOLVE
      }
    }

    // Cleanup function to clear timeouts on unmount or state change
    return () => {
      clearExistingTimeouts();
    };
  }, [encryptionState]);

  // Trigger sound and haptics on phase change
  useEffect(() => {
    const current = phaseRef.current;

    // Skip if not in browser
    if (typeof window === 'undefined') return;

    // Optional global mute using reduced motion as a proxy
    const prefersReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const muted = prefersReduce && prefersReduce.matches;

    if (current === 'UNLOCK') {
      if (!muted) {
        playTone(660, 140);
        tryVibrate([10, 30, 10]);
      }
    } else if (current === 'RESOLVE') {
      if (!muted) {
        playTone(440, 120, 0.12);
        tryVibrate(20);
      }
    } else if (current === 'ERROR') {
      if (!muted) {
        playTone(220, 220, 0.18);
        tryVibrate([30, 40, 30]);
      }
    }
  }, [phase]);

  // Don't render if overlay should be hidden
  if (!showOverlay) {
    return null;
  }

  // Phase-based cinematic text mapping
  const getCinematicText = (phase: VaultPhase): string => {
    const phaseText: Record<VaultPhase, string> = {
      APPROACH: 'Approaching vault…',
      TRAVEL: 'Passing threshold…',
      UNLOCK: 'Unlocking…',
      RESOLVE: 'Returning to awareness…',
      ERROR: 'Vault access failed',
    };
    return phaseText[phase];
  };

  const cinematicText = getCinematicText(phase);

  return (
    <div
      data-vault-phase={phase}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 pointer-events-none"
    >
      {/* Temporary debug phase badge */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          color: 'white',
          fontSize: '12px',
          fontFamily: 'monospace',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
          pointerEvents: 'none',
          zIndex: 1000,
          opacity: 0.9,
        }}
      >
        {phase}
      </div>
      
      {/* Background layer with radial gradient and grain */}
      <div className="soe-vault-bg" />
      
      {/* Deep fog field */}
      <div className="vault-fog" data-phase={phase}></div>
      
      {/* Vault signature pulse */}
      <div className="vault-pulse" data-phase={phase} />
      
      {/* Aperture iris layer */}
      <div className="vault-aperture" data-phase={phase}></div>
      
      {/* Lens bloom layers */}
      <div className="vault-vertical-streak" data-phase={phase}></div>
      <div className="vault-horizontal-flare" data-phase={phase}></div>
      
      {/* Light sweep layer - visible only in UNLOCK phase */}
      <div className="soe-vault-light" />
      
      {/* Observer silhouette layer */}
      <div className="soe-vault-observer" />
      
      {/* NEW Light Sweep Layer */}
      <div className="vault-light-sweep" data-phase={phase} />
      
      {/* Observer silhouette layer */}
      <div className="vault-observer" data-phase={phase}></div>
      
      {/* Iris layer */}
      <div className="vault-iris" />
      
      {/* Dust particle field */}
      <div className="vault-dust" />
      
      {/* Fractal bloom cinematic layer */}
      <div className="vault-bloom" />
      
      {/* Chromatic refraction layer */}
      <div className="vault-refraction" />
      
      {/* Phase-based text */}
      <div className={`vault-text vault-text-${phase}`}>
        {cinematicText}
      </div>
    </div>
  );
}


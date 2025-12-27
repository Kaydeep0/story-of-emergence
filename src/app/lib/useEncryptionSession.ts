'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { keyFromSignatureHex } from '../../lib/crypto';

const SESSION_STORAGE_KEY = 'soe-encryption-session';
const CONSENT_EXPIRY_HOURS = 12;

interface EncryptionSession {
  signature: string;
  consentTimestamp: string;
  walletAddress: string;
}

function humanizeSignError(e: unknown): string {
  const err = e as { code?: number; shortMessage?: string; message?: string };
  if (err?.code === 4001) return 'Signature request was rejected.';
  if (err?.code === -32002)
    return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return err?.shortMessage || err?.message || 'Unexpected signing error.';
}

function loadSessionFromStorage(): EncryptionSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored) as EncryptionSession;
    
    // Validate structure
    if (
      typeof parsed.signature === 'string' &&
      typeof parsed.consentTimestamp === 'string' &&
      typeof parsed.walletAddress === 'string'
    ) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse session from storage:', e);
  }
  
  return null;
}

function saveSessionToStorage(session: EncryptionSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save session to storage:', e);
  }
}

function clearSessionFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    // Also clear legacy key for backward compatibility
    sessionStorage.removeItem('soe-consent-sig');
  } catch (e) {
    console.error('Failed to clear session from storage:', e);
  }
}

function isConsentExpired(timestamp: string): boolean {
  try {
    const consentDate = new Date(timestamp);
    const now = new Date();
    const hoursSinceConsent = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60);
    return hoursSinceConsent >= CONSENT_EXPIRY_HOURS;
  } catch (e) {
    console.error('Failed to parse consent timestamp:', e);
    return true; // If we can't parse, treat as expired
  }
}

export function useEncryptionSession() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signingRef = useRef(false);
  
  const [ready, setReady] = useState(false);
  const [aesKey, setAesKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const connected = isConnected && !!address;
  const currentWallet = address?.toLowerCase() ?? null;

  // Initialize session on mount or when wallet changes
  // This is passive - loads from storage, only requests signature if no valid session exists
  useEffect(() => {
    if (!connected || !currentWallet) {
      setReady(false);
      setAesKey(null);
      setWalletAddress(null);
      setError(null);
      return;
    }

    // If already ready with the correct wallet, no need to re-initialize
    if (ready && aesKey && walletAddress?.toLowerCase() === currentWallet) {
      return;
    }

    async function initializeSession() {
      // Check if wallet changed - clear old session
      const stored = loadSessionFromStorage();
      if (stored && stored.walletAddress.toLowerCase() !== currentWallet) {
        clearSessionFromStorage();
        setReady(false);
        setAesKey(null);
        setWalletAddress(null);
        return;
      }

      // Try to load from storage
      const session = loadSessionFromStorage();
      
      if (session && session.walletAddress.toLowerCase() === currentWallet) {
        // Check if consent is still valid
        if (!isConsentExpired(session.consentTimestamp)) {
          // Derive key from stored signature
          try {
            const key = await keyFromSignatureHex(session.signature);
            setAesKey(key);
            setWalletAddress(currentWallet);
            setReady(true);
            setError(null);
            return;
          } catch (e) {
            console.error('Failed to derive key from stored signature:', e);
            // Fall through to request new signature
          }
        } else {
          // Consent expired, clear it
          clearSessionFromStorage();
        }
      }

      // No valid session found - request signature automatically
      // This only happens when wallet first connects or session is missing/expired
      if (signingRef.current) {
        return; // Already signing
      }

      signingRef.current = true;
      setSigning(true);
      setReady(false);
      setError(null);

      try {
        if (!currentWallet) {
          throw new Error('Wallet address is required');
        }
        const msg = `Story of Emergence — encryption key consent for ${currentWallet}`;
        const signature = await signMessageAsync({ message: msg });
        
        // Save session
        const newSession: EncryptionSession = {
          signature,
          consentTimestamp: new Date().toISOString(),
          walletAddress: currentWallet,
        };
        saveSessionToStorage(newSession);

        // Derive key
        const key = await keyFromSignatureHex(signature);
        setAesKey(key);
        setWalletAddress(currentWallet);
        setReady(true);
        setError(null);
      } catch (e: unknown) {
        const err = e as { message?: string };
        const errorMsg = err?.message === 'PENDING_SIG' 
          ? 'Signature request already pending'
          : humanizeSignError(e);
        setError(errorMsg);
        setReady(false);
        setAesKey(null);
        setWalletAddress(null);
      } finally {
        signingRef.current = false;
        setSigning(false);
      }
    }

    initializeSession();
  }, [connected, currentWallet, ready, aesKey, walletAddress, signMessageAsync]);

  // Clear session when wallet disconnects
  useEffect(() => {
    if (!connected) {
      clearSessionFromStorage();
      setReady(false);
      setAesKey(null);
      setWalletAddress(null);
      setError(null);
    }
  }, [connected]);

  const refreshSession = useCallback(async () => {
    if (!connected || !currentWallet) {
      throw new Error('Connect wallet first');
    }

    if (signingRef.current) {
      throw new Error('Signature request already pending');
    }

    signingRef.current = true;
    setSigning(true);
    setReady(false);
    setError(null);

    try {
      // Clear old session
      clearSessionFromStorage();

      if (!currentWallet) {
        throw new Error('Wallet address is required');
      }
      const msg = `Story of Emergence — encryption key consent for ${currentWallet}`;
      const signature = await signMessageAsync({ message: msg });
      
      // Save new session
      const newSession: EncryptionSession = {
        signature,
        consentTimestamp: new Date().toISOString(),
        walletAddress: currentWallet,
      };
      saveSessionToStorage(newSession);

      // Derive key
      const key = await keyFromSignatureHex(signature);
      setAesKey(key);
      setWalletAddress(currentWallet);
      setReady(true);
      setError(null);
    } catch (e: unknown) {
      const err = e as { message?: string };
      const errorMsg = err?.message === 'PENDING_SIG'
        ? 'Signature request already pending'
        : humanizeSignError(e);
      setError(errorMsg);
      setReady(false);
      setAesKey(null);
      setWalletAddress(null);
      throw new Error(errorMsg);
    } finally {
      signingRef.current = false;
      setSigning(false);
    }
  }, [connected, currentWallet, signMessageAsync]);

  /**
   * Unified handler for ensuring encryption session is active.
   * Returns status indicating what action (if any) is needed.
   * This function is idempotent and safe to call from multiple places.
   */
  const ensureEncryptionSession = useCallback(async (): Promise<{
    needsWallet: boolean;
    needsConsent: boolean;
    isReady: boolean;
  }> => {
    // If wallet not connected, caller should open RainbowKit modal
    if (!connected || !currentWallet) {
      return { needsWallet: true, needsConsent: false, isReady: false };
    }

    // If already ready, no action needed
    if (ready && aesKey) {
      return { needsWallet: false, needsConsent: false, isReady: true };
    }

    // If signing is already in progress, wait
    if (signingRef.current) {
      return { needsWallet: false, needsConsent: true, isReady: false };
    }

    // Check if we have a valid session in storage
    const session = loadSessionFromStorage();
    if (session && session.walletAddress.toLowerCase() === currentWallet) {
      if (!isConsentExpired(session.consentTimestamp)) {
        // Session is valid, derive key if not already done
        if (!aesKey) {
          try {
            const key = await keyFromSignatureHex(session.signature);
            setAesKey(key);
            setWalletAddress(currentWallet);
            setReady(true);
            setError(null);
            return { needsWallet: false, needsConsent: false, isReady: true };
          } catch (e) {
            console.error('Failed to derive key from stored signature:', e);
            // Fall through to request new signature
          }
        } else {
          return { needsWallet: false, needsConsent: false, isReady: true };
        }
      }
    }

    // Need to request consent signature
    signingRef.current = true;
    setSigning(true);
    setReady(false);
    setError(null);

    try {
      if (!currentWallet) {
        return { needsWallet: false, needsConsent: true, isReady: false };
      }
      const msg = `Story of Emergence — encryption key consent for ${currentWallet}`;
      const signature = await signMessageAsync({ message: msg });
      
      // Save session
      const newSession: EncryptionSession = {
        signature,
        consentTimestamp: new Date().toISOString(),
        walletAddress: currentWallet,
      };
      saveSessionToStorage(newSession);

      // Derive key
      const key = await keyFromSignatureHex(signature);
      setAesKey(key);
      setWalletAddress(currentWallet);
      setReady(true);
      setError(null);
      return { needsWallet: false, needsConsent: false, isReady: true };
    } catch (e: unknown) {
      const err = e as { message?: string };
      const errorMsg = err?.message === 'PENDING_SIG' 
        ? 'Signature request already pending'
        : humanizeSignError(e);
      setError(errorMsg);
      setReady(false);
      setAesKey(null);
      setWalletAddress(null);
      return { needsWallet: false, needsConsent: true, isReady: false };
    } finally {
      signingRef.current = false;
      setSigning(false);
    }
  }, [connected, currentWallet, ready, aesKey, signMessageAsync]);

  return {
    ready,
    aesKey,
    walletAddress,
    error,
    signing,
    refreshSession,
    ensureEncryptionSession,
  };
}


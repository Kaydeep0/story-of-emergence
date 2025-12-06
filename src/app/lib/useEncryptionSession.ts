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

  const connected = isConnected && !!address;
  const currentWallet = address?.toLowerCase() ?? null;

  // Initialize session on mount or when wallet changes
  useEffect(() => {
    if (!connected || !currentWallet) {
      setReady(false);
      setAesKey(null);
      setWalletAddress(null);
      setError(null);
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

      // Need to request signature
      if (signingRef.current) {
        setError('Signature request already pending');
        return;
      }

      signingRef.current = true;
      setReady(false);
      setError(null);

      try {
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
      }
    }

    initializeSession();
  }, [connected, currentWallet, signMessageAsync]);

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
    setReady(false);
    setError(null);

    try {
      // Clear old session
      clearSessionFromStorage();

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
    }
  }, [connected, currentWallet, signMessageAsync]);

  return {
    ready,
    aesKey,
    walletAddress,
    error,
    refreshSession,
  };
}


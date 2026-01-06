'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useVaultState } from '../../lib/vault/useVaultState';
import { useConsentMemory } from '../../lib/vault/useConsentMemory';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { getSupabaseForWallet } from '../../lib/supabase';
import { rpcFetchEntries } from '../../lib/entries';

type VaultHealthData = {
  vaultStatus: 'locked' | 'unlocked';
  lastUnlockedAt: number | null;
  sessionMemoryActive: boolean;
  activeCapsulesCount: number | null;
  yearlyWrapAvailable: boolean | null;
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 */
function formatRelativeTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  return 'just now';
}

/**
 * Vault Health Panel
 * Read-only observational view of vault health and trust surface
 * Neutral, factual, no warnings unless something is broken
 */
export function VaultHealthPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { address, isConnected } = useAccount();
  const vaultState = useVaultState();
  const { getTimeSinceUnlock, wasHereRecently } = useConsentMemory();
  const { ready, walletAddress, aesKey } = useEncryptionSession();
  
  const [healthData, setHealthData] = useState<VaultHealthData>({
    vaultStatus: 'locked',
    lastUnlockedAt: null,
    sessionMemoryActive: false,
    activeCapsulesCount: null,
    yearlyWrapAvailable: null,
  });
  const [loading, setLoading] = useState(true);

  // Load health data
  useEffect(() => {
    if (!isOpen || !isConnected || !address || !aesKey) {
      setLoading(false);
      return;
    }

    async function loadHealthData() {
      setLoading(true);
      try {
        if (!address || !aesKey) return;
        const wallet = address.toLowerCase();
        
        // Vault status
        const vaultStatus: 'locked' | 'unlocked' = ready ? 'unlocked' : 'locked';
        
        // Last unlocked time
        const timeSinceUnlock = getTimeSinceUnlock();
        const lastUnlockedAt = timeSinceUnlock !== null ? Date.now() - timeSinceUnlock : null;
        
        // Session memory
        const sessionMemoryActive = wasHereRecently();
        
        // Active wallet shares count (sent by this wallet)
        // ⚠️ DEPRECATED: Previously used capsules table, now uses wallet_shares
        let activeCapsulesCount: number | null = null;
        try {
          const { listWalletSharesSent } = await import('../../lib/wallet_shares');
          const shares = await listWalletSharesSent(wallet, { limit: 1000 });
          activeCapsulesCount = shares.filter(s => !s.revoked_at && (!s.expires_at || new Date(s.expires_at) > new Date())).length;
        } catch (err) {
          console.error('Failed to fetch wallet shares count:', err);
          // Don't set error, just leave as null
        }
        
        // Yearly wrap availability (check if there are reflections)
        let yearlyWrapAvailable: boolean | null = null;
        try {
          if (!aesKey) {
            yearlyWrapAvailable = null;
          } else {
            const result = await rpcFetchEntries(wallet, aesKey, { includeDeleted: false, limit: 1000 });
          const currentYear = new Date().getFullYear();
          const yearStart = new Date(currentYear, 0, 1);
          const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
          
            const yearEntries = result.items.filter((entry) => {
              if (entry.deletedAt) return false;
              const entryDate = entry.createdAt;
              return entryDate >= yearStart && entryDate <= yearEnd;
            });
            
            yearlyWrapAvailable = yearEntries.length > 0;
          }
        } catch (err) {
          console.error('Failed to check yearly wrap availability:', err);
          // Don't set error, just leave as null
        }
        
        setHealthData({
          vaultStatus,
          lastUnlockedAt,
          sessionMemoryActive,
          activeCapsulesCount,
          yearlyWrapAvailable,
        });
      } catch (err) {
        console.error('Failed to load vault health data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHealthData();
  }, [isOpen, isConnected, address, ready, aesKey, getTimeSinceUnlock, wasHereRecently]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-4 top-20 z-50 w-80 max-w-[calc(100vw-2rem)] bg-black border border-white/10 rounded-lg shadow-lg">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white/90">Vault Health</h3>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/60 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-white/40 py-4">Loading…</div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Vault Status */}
              <div>
                <div className="text-white/60 mb-1">Vault status</div>
                <div className="text-white/90">
                  {healthData.vaultStatus === 'unlocked' ? 'Unlocked' : 'Locked'}
                </div>
                {healthData.lastUnlockedAt !== null && (
                  <div className="text-white/40 mt-0.5">
                    Last unlocked {formatRelativeTime(Date.now() - healthData.lastUnlockedAt)}
                  </div>
                )}
              </div>

              {/* Session Memory */}
              <div>
                <div className="text-white/60 mb-1">Session memory</div>
                <div className="text-white/90">
                  {healthData.sessionMemoryActive ? 'Active' : 'Not active'}
                </div>
                <div className="text-white/40 mt-0.5">
                  Expires on session end
                </div>
              </div>

              {/* Encryption */}
              <div>
                <div className="text-white/60 mb-1">Encryption</div>
                <div className="text-white/90">Client-side only</div>
                <div className="text-white/40 mt-0.5">
                  Keys never leave device
                </div>
              </div>

              {/* Share Capsules */}
              <div>
                <div className="text-white/60 mb-1">Share capsules</div>
                {healthData.activeCapsulesCount !== null ? (
                  <>
                    <div className="text-white/90">
                      {healthData.activeCapsulesCount} {healthData.activeCapsulesCount === 1 ? 'capsule' : 'capsules'} active
                    </div>
                    <div className="text-white/40 mt-0.5">
                      No recipient details stored
                    </div>
                  </>
                ) : (
                  <div className="text-white/40">Unable to load</div>
                )}
              </div>

              {/* Exports */}
              <div>
                <div className="text-white/60 mb-1">Exports</div>
                {healthData.yearlyWrapAvailable !== null ? (
                  <div className="text-white/90">
                    Yearly wrap export {healthData.yearlyWrapAvailable ? 'available' : 'not available'}
                  </div>
                ) : (
                  <div className="text-white/40">Unable to determine</div>
                )}
              </div>

              {/* Sharing & Revocation - Only show if capsules exist */}
              {healthData.activeCapsulesCount !== null && healthData.activeCapsulesCount > 0 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="text-white/60 mb-2">Sharing & Revocation</div>
                  <div className="space-y-2 text-white/70 leading-relaxed">
                    <p className="text-xs">
                      Revoking a capsule prevents future access. If someone already opened it, they keep what they saw—like a letter that&apos;s been read.
                    </p>
                    <p className="text-xs">
                      Your content stays encrypted. The server never sees what&apos;s inside, and each share uses its own encryption key.
                    </p>
                    <p className="text-xs">
                      We don&apos;t know if recipients opened capsules or what they did with them.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


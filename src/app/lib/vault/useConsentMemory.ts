'use client';

const CONSENT_MEMORY_KEY = 'soe-consent-memory';
const CONSENT_MEMORY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export type ConsentMemory = {
  lastUnlockedAt: number;
};

/**
 * Load consent memory from sessionStorage
 * Returns null if not found or invalid
 */
function loadConsentMemory(): ConsentMemory | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(CONSENT_MEMORY_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as ConsentMemory;

    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.lastUnlockedAt === 'number' &&
      Number.isFinite(parsed.lastUnlockedAt) &&
      parsed.lastUnlockedAt > 0
    ) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse consent memory:', e);
  }

  return null;
}

/**
 * Save consent memory to sessionStorage
 */
function saveConsentMemory(memory: ConsentMemory): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(CONSENT_MEMORY_KEY, JSON.stringify(memory));
  } catch (e) {
    console.error('Failed to save consent memory:', e);
  }
}

/**
 * Clear consent memory from sessionStorage
 */
function clearConsentMemory(): void {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(CONSENT_MEMORY_KEY);
  } catch (e) {
    console.error('Failed to clear consent memory:', e);
  }
}

/**
 * Check if consent memory is within threshold
 */
function isConsentMemoryValid(memory: ConsentMemory | null): boolean {
  if (!memory) return false;

  const now = Date.now();
  const age = now - memory.lastUnlockedAt;

  return age >= 0 && age < CONSENT_MEMORY_THRESHOLD_MS;
}

/**
 * Hook for managing consent memory
 * Session-scoped only - no persistence across browsers/devices/wallets
 */
export function useConsentMemory() {
  /**
   * Record successful unlock
   * Call this when vault transitions to unlocked state
   */
  const recordUnlock = () => {
    const memory: ConsentMemory = {
      lastUnlockedAt: Date.now(),
    };
    saveConsentMemory(memory);
  };

  /**
   * Check if user was here recently
   * Returns true if consent memory exists and is within threshold
   */
  const wasHereRecently = (): boolean => {
    const memory = loadConsentMemory();
    return isConsentMemoryValid(memory);
  };

  /**
   * Get time since last unlock (in milliseconds)
   * Returns null if no valid memory
   */
  const getTimeSinceUnlock = (): number | null => {
    const memory = loadConsentMemory();
    if (!memory) return null;

    const now = Date.now();
    const age = now - memory.lastUnlockedAt;

    return age >= 0 ? age : null;
  };

  /**
   * Clear consent memory
   * Call this on wallet change, session expiry, or explicit logout
   */
  const clear = () => {
    clearConsentMemory();
  };

  return {
    recordUnlock,
    wasHereRecently,
    getTimeSinceUnlock,
    clear,
  };
}


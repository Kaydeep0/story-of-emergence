/**
 * Observer Trace & Self-Influence Boundary
 * 
 * Formally acknowledges that the observer exists without allowing
 * the observer to change inference.
 * 
 * Core rule: The observer affects the environment only by being present,
 * never by acting.
 * 
 * Requirements:
 * - Track that a user viewed an insight
 * - Track frequency and recurrence of viewing
 * - Do NOT track interpretation changes
 * - Do NOT alter inference, weights, or thresholds
 * - Observer data must never increase emergence likelihood, prolong persistence, prevent collapse
 * - Viewing does not "reward" meaning
 * 
 * Epistemic firewall:
 * - Observer trace lives in a separate internal channel
 * - Inference layer cannot import observer data
 * - Only the meta layer may read it
 * 
 * Session-scoped memory:
 * - Observer trace resets on new wallet session
 * - No longitudinal profiling
 * - No identity accumulation
 */

export type ObserverViewTrace = {
  insightId: string;
  viewCount: number;
  firstViewedAt: string; // ISO timestamp
  lastViewedAt: string; // ISO timestamp
  viewTimestamps: string[]; // ISO timestamps, limited to recent views
};

export type ObserverTraceSession = {
  walletAddress: string;
  sessionStart: string; // ISO timestamp
  views: Map<string, ObserverViewTrace>;
};

const MAX_TIMESTAMPS_PER_VIEW = 10; // Limit memory usage
const SESSION_STORAGE_KEY = 'soe_observer_trace';

/**
 * Get current observer trace session from sessionStorage
 * Returns null if no session exists or wallet address doesn't match
 */
export function getObserverTraceSession(
  walletAddress: string | null
): ObserverTraceSession | null {
  if (!walletAddress) {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    
    // Verify wallet address matches (session-scoped)
    if (parsed.walletAddress !== walletAddress.toLowerCase()) {
      // Wallet changed - reset session
      clearObserverTraceSession();
      return null;
    }

    // Reconstruct Map from stored data
    const views = new Map<string, ObserverViewTrace>();
    if (parsed.views && Array.isArray(parsed.views)) {
      for (const [id, trace] of parsed.views) {
        views.set(id, trace);
      }
    }

    return {
      walletAddress: parsed.walletAddress,
      sessionStart: parsed.sessionStart,
      views,
    };
  } catch {
    // Invalid data - reset session
    clearObserverTraceSession();
    return null;
  }
}

/**
 * Save observer trace session to sessionStorage
 */
function saveObserverTraceSession(session: ObserverTraceSession): void {
  try {
    // Convert Map to array for JSON serialization
    const viewsArray = Array.from(session.views.entries());
    
    const toStore = {
      walletAddress: session.walletAddress,
      sessionStart: session.sessionStart,
      views: viewsArray,
    };

    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toStore));
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}

/**
 * Initialize or get observer trace session
 * Creates new session if wallet address changed or session doesn't exist
 */
function getOrCreateObserverTraceSession(
  walletAddress: string
): ObserverTraceSession {
  const existing = getObserverTraceSession(walletAddress);
  
  if (existing) {
    return existing;
  }

  // Create new session
  const newSession: ObserverTraceSession = {
    walletAddress: walletAddress.toLowerCase(),
    sessionStart: new Date().toISOString(),
    views: new Map(),
  };

  saveObserverTraceSession(newSession);
  return newSession;
}

/**
 * Trace observer view of an insight
 * 
 * Passive only - tracks viewing, does not alter inference.
 * 
 * @param insightId - Unique identifier for the insight
 * @param walletAddress - Current wallet address (for session scoping)
 */
export function traceObserverView(
  insightId: string,
  walletAddress: string | null
): void {
  if (!walletAddress) {
    return;
  }

  const session = getOrCreateObserverTraceSession(walletAddress);
  const now = new Date().toISOString();

  const existingTrace = session.views.get(insightId);

  if (existingTrace) {
    // Update existing trace
    const updatedTrace: ObserverViewTrace = {
      ...existingTrace,
      viewCount: existingTrace.viewCount + 1,
      lastViewedAt: now,
      viewTimestamps: [
        ...existingTrace.viewTimestamps.slice(-(MAX_TIMESTAMPS_PER_VIEW - 1)),
        now,
      ],
    };

    session.views.set(insightId, updatedTrace);
  } else {
    // Create new trace
    const newTrace: ObserverViewTrace = {
      insightId,
      viewCount: 1,
      firstViewedAt: now,
      lastViewedAt: now,
      viewTimestamps: [now],
    };

    session.views.set(insightId, newTrace);
  }

  saveObserverTraceSession(session);
}

/**
 * Get observer trace for a specific insight
 * 
 * @param insightId - Unique identifier for the insight
 * @param walletAddress - Current wallet address (for session scoping)
 * @returns ObserverViewTrace or null if not viewed
 */
export function getObserverTrace(
  insightId: string,
  walletAddress: string | null
): ObserverViewTrace | null {
  if (!walletAddress) {
    return null;
  }

  const session = getObserverTraceSession(walletAddress);
  if (!session) {
    return null;
  }

  return session.views.get(insightId) || null;
}

/**
 * Clear observer trace session
 * Called when wallet disconnects or changes
 */
export function clearObserverTraceSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Silently fail if sessionStorage is unavailable
  }
}

/**
 * Get all observer traces for current session
 * 
 * @param walletAddress - Current wallet address (for session scoping)
 * @returns Map of insightId to ObserverViewTrace
 */
export function getAllObserverTraces(
  walletAddress: string | null
): Map<string, ObserverViewTrace> {
  if (!walletAddress) {
    return new Map();
  }

  const session = getObserverTraceSession(walletAddress);
  if (!session) {
    return new Map();
  }

  return new Map(session.views);
}


/**
 * Safe navigation helpers for Next.js App Router
 * Prevents string interpolation mistakes by using structured data
 */

/**
 * Builds a thread URL safely
 * @param reflectionId - The reflection ID to navigate to
 * @param options - Optional query parameters
 * @param options.mode - Explicit mode ('cabin' or undefined)
 * @param options.fromBridge - If true, indicates navigation from a narrative bridge (auto-cabin trigger)
 * @returns A safe URL string
 */
export function buildThreadUrl(
  reflectionId: string,
  options?: { mode?: 'cabin'; fromBridge?: boolean }
): string {
  if (!reflectionId || typeof reflectionId !== 'string') {
    throw new Error('buildThreadUrl: reflectionId must be a non-empty string');
  }

  // TEMPORARY: Log ID format to verify it's a reflection ID (UUID)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUUID = uuidPattern.test(reflectionId);
  console.log('[buildThreadUrl] reflectionId:', reflectionId);
  console.log('[buildThreadUrl] ID length:', reflectionId.length);
  console.log('[buildThreadUrl] Is UUID format:', isUUID);
  if (!isUUID) {
    console.warn('[buildThreadUrl] WARNING: reflectionId does not match UUID format!', {
      id: reflectionId,
      length: reflectionId.length,
      type: typeof reflectionId,
    });
  }

  const url = `/reflections/thread/${reflectionId}`;
  
  const params = new URLSearchParams();
  
  // Explicit mode always wins
  if (options?.mode) {
    params.set('mode', options.mode);
  } else if (options?.fromBridge) {
    // Navigation from bridge triggers auto-cabin (will be resolved in ThreadPage)
    params.set('fromBridge', 'true');
  }
  
  if (params.toString()) {
    return `${url}?${params.toString()}`;
  }

  return url;
}


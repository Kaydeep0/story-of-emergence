// src/app/lib/reflectionLinks.ts
// Supabase-backed reflection → source links (persistent across reloads)
// Legacy reflection links - now uses entry_sources table via entrySources.ts

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { getSupabaseForWallet } from './supabase';

export type ReflectionLink = {
  id: string;
  walletAddress: string;
  reflectionId: string;
  sourceId: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Result type for fetchReflectionLinks
 */
export type FetchReflectionLinksResult = {
  links: ReflectionLink[];
  error: string | null;
};

/**
 * Fetch all reflection links for a wallet (legacy - use entrySources.ts for new code)
 * Returns primary source (most recently linked) per reflection
 * Never throws - returns empty array and error string on failure
 */
export async function fetchReflectionLinks(walletAddress: string): Promise<FetchReflectionLinksResult> {
  // Step 2: Guard against invalid wallet addresses
  if (!walletAddress || walletAddress.length !== 42 || !walletAddress.startsWith("0x")) {
    return { links: [], error: "Wallet not ready" };
  }
  
  console.log("[reflectionLinks] wallet", walletAddress, "len", walletAddress?.length);
  
  const supabase = getSupabaseForWallet(walletAddress);
  const { data, error } = await supabase.rpc("list_reflection_links", {
    w: walletAddress,
    p_limit: 1000, // Reasonable default for fetching all links
    p_offset: 0,
  });

  // Step 1: Fix logging to show actual error (not just {})
  if (error) {
    console.error("[reflectionLinks] RPC raw error", error);
    console.error("[reflectionLinks] RPC stringified", JSON.stringify(error, null, 2));
    
    // Build user-friendly error message
    let errorMessage = error.message || 'Failed to fetch reflection links';
    if ((error as any).details) {
      errorMessage += `: ${(error as any).details}`;
    }
    if ((error as any).hint) {
      errorMessage += ` (${(error as any).hint})`;
    }
    
    return { links: [], error: errorMessage };
  }

  if (!data || data.length === 0) {
    return { links: [], error: null };
  }

  // RPC returns data already ordered by created_at desc, so we can group by entry_id
  // Group by entry_id and pick the most recent (first after descending sort)
  const reflectionMap = new Map<string, typeof data[0]>();
  for (const row of data) {
    if (!reflectionMap.has(row.entry_id)) {
      reflectionMap.set(row.entry_id, row);
    }
  }

  // Convert to ReflectionLink format (using most recent link per entry)
  // RPC returns: id, wallet_address, entry_id, source_id, created_at
  const links = Array.from(reflectionMap.values()).map((row: any) => ({
    id: row.id,
    walletAddress: row.wallet_address,
    reflectionId: row.entry_id, // Note: column name is entry_id in entry_sources table
    sourceId: row.source_id,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  }));

  return { links, error: null };
}

/**
 * Upsert or delete a reflection link
 * Legacy function - use entrySources.ts linkSourceToEntry for new code
 * If sourceId is null, deletes the specific link (not all links for that reflection)
 * Otherwise, creates a new link (entry_sources allows multiple links per entry)
 */
export async function upsertReflectionLink(
  walletAddress: string,
  reflectionId: string,
  sourceId: string | null
): Promise<void> {
  if (!walletAddress || !reflectionId) return;

  const supabase = getSupabaseForWallet(walletAddress);
  const w = walletAddress.toLowerCase();

  // If sourceId is null, delete the specific link
  // Note: This function is called from setLink which should pass the current sourceId
  // For now, we'll delete any link for this reflection (legacy behavior)
  // The actual removal of specific source is handled in HomeClient.setSourceLink
  if (sourceId === null) {
    // This path is deprecated - specific source removal should use reflectionSources.unlinkSourceFromReflection
    // But keeping for backward compatibility with setLink calls
    const { error } = await supabase
      .from('entry_sources')
      .delete()
      .eq('user_wallet', w)
      .eq('entry_id', reflectionId);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[reflectionLinks] Failed to delete reflection link:', error);
      }
      throw error;
    }
    return;
  }

  // Insert new link (entry_sources allows multiple links, so we always insert)
  // The unique constraint will prevent duplicates
  const { error } = await supabase
    .from('entry_sources')
    .insert({
      user_wallet: w,
      entry_id: reflectionId,
      source_id: sourceId,
    });

  if (error) {
    // If it's a unique constraint violation, the link already exists - that's fine
    if (error.code === '23505') {
      return;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[reflectionLinks] Failed to insert reflection link:', error);
    }
    throw error;
  }
}

/**
 * Delete a reflection link
 * Legacy function - use entrySources.ts unlinkSourceFromEntry for new code
 */
export async function deleteReflectionLink(
  walletAddress: string,
  reflectionId: string
): Promise<void> {
  if (!walletAddress || !reflectionId) return;

  const supabase = getSupabaseForWallet(walletAddress);
  const { error } = await supabase
    .from('entry_sources')
    .delete()
    .eq('user_wallet', walletAddress.toLowerCase())
    .eq('entry_id', reflectionId);

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[reflectionLinks] Failed to delete reflection link:', error);
    }
    throw error;
  }
}

/**
 * Get sourceId for a reflection from a links array
 */
export function getSourceIdFor(
  reflectionId: string,
  links: ReflectionLink[],
): string | undefined {
  const link = links.find((l) => l.reflectionId === reflectionId);
  return link?.sourceId;
}

/**
 * Get all links for a specific source
 */
export function getLinksForSource(
  sourceId: string,
  links: ReflectionLink[],
): ReflectionLink[] {
  return links.filter((l) => l.sourceId === sourceId);
}

/**
 * React hook for managing reflection links
 * Provides links array, getSourceIdFor helper, setLink function, and refetch function
 */
export function useReflectionLinks(walletAddress?: string) {
  const [links, setLinks] = useState<ReflectionLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refetch function that can be called manually
  const refetch = useCallback(async () => {
    if (!walletAddress) {
      setLinks([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchReflectionLinks(walletAddress);
      setLinks(result.links);
      // Step 2: Don't treat "Wallet not ready" as an error (don't show scary banner)
      setError(result.error === "Wallet not ready" ? null : result.error);
    } catch (err) {
      // Fallback catch (shouldn't happen now, but keep for safety)
      console.error('[reflectionLinks] Unexpected error loading reflection links:', err);
      setLinks([]);
      setError(err instanceof Error ? err.message : 'Failed to load reflection links');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Load links when walletAddress changes
  useEffect(() => {
    refetch();
  }, [refetch]);

  // Get sourceId for a reflection
  const getSourceIdForFromState = useCallback(
    (reflectionId: string): string | undefined =>
      getSourceIdFor(reflectionId, links),
    [links],
  );

  // Set or remove a link (optimistic update)
  const setLink = useCallback(
    async (reflectionId: string, sourceId: string | null) => {
      if (!walletAddress) {
        toast.error('Wallet not connected');
        return;
      }

      // Optimistic update
      const previousLinks = [...links];
      let newLinks: ReflectionLink[];

      if (sourceId === null) {
        // Remove link
        newLinks = links.filter((l) => l.reflectionId !== reflectionId);
      } else {
        // Add or update link
        const existing = links.find((l) => l.reflectionId === reflectionId);
        if (existing) {
          newLinks = links.map((l) =>
            l.reflectionId === reflectionId
              ? { ...l, sourceId, updatedAt: new Date().toISOString() }
              : l
          );
        } else {
          // Create a temporary link object (will be replaced on next fetch)
          newLinks = [
            ...links,
            {
              id: 'temp-' + Date.now(),
              walletAddress: walletAddress.toLowerCase(),
              reflectionId,
              sourceId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
        }
      }

      setLinks(newLinks);

      try {
        await upsertReflectionLink(walletAddress, reflectionId, sourceId);
        // Optionally refresh to get the real data from DB
        // For now, optimistic update is sufficient
      } catch (err: any) {
        // Revert on error
        setLinks(previousLinks);
        const errMsg = err?.message ?? 'Failed to update reflection link';
        toast.error(errMsg);
        if (process.env.NODE_ENV === 'development') {
          console.error('[reflectionLinks] Failed to set reflection link:', err);
        }
      }
    },
    [walletAddress, links]
  );

  return {
    links,
    loading,
    error,
    getSourceIdFor: getSourceIdForFromState,
    setLink,
    refetch,
  };
}

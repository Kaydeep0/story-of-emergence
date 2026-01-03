// src/app/lib/reflectionLinks.ts
// Supabase-backed reflection → source links (persistent across reloads)
// Now reads from reflection_sources table (migrated from reflection_links)

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
 * Fetch all reflection links for a wallet from reflection_sources table
 * Returns primary source (most recently linked) per reflection
 */
export async function fetchReflectionLinks(walletAddress: string): Promise<ReflectionLink[]> {
  if (!walletAddress) return [];
  
  const supabase = getSupabaseForWallet(walletAddress);
  const { data, error } = await supabase
    .from('reflection_sources')
    .select('id, user_wallet, reflection_id, source_id, created_at')
    .eq('user_wallet', walletAddress.toLowerCase())
    .order('created_at', { ascending: false });

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[reflectionLinks] Failed to fetch reflection links:', error);
    }
    throw error;
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Group by reflection_id and pick the most recent (first after descending sort)
  const reflectionMap = new Map<string, typeof data[0]>();
  for (const row of data) {
    if (!reflectionMap.has(row.reflection_id)) {
      reflectionMap.set(row.reflection_id, row);
    }
  }

  // Convert to ReflectionLink format (using most recent link per reflection)
  return Array.from(reflectionMap.values()).map((row) => ({
    id: row.id,
    walletAddress: row.user_wallet,
    reflectionId: row.reflection_id,
    sourceId: row.source_id,
    createdAt: row.created_at,
    updatedAt: row.created_at, // reflection_sources doesn't have updated_at, use created_at
  }));
}

/**
 * Upsert or delete a reflection link
 * Now uses reflection_sources table (migrated from reflection_links)
 * If sourceId is null, deletes the specific link (not all links for that reflection)
 * Otherwise, creates a new link (reflection_sources allows multiple links per reflection)
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
      .from('reflection_sources')
      .delete()
      .eq('user_wallet', w)
      .eq('reflection_id', reflectionId);

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[reflectionLinks] Failed to delete reflection link:', error);
      }
      throw error;
    }
    return;
  }

  // Insert new link (reflection_sources allows multiple links, so we always insert)
  // The unique constraint will prevent duplicates
  const { error } = await supabase
    .from('reflection_sources')
    .insert({
      user_wallet: w,
      reflection_id: reflectionId,
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
 * Now uses reflection_sources table
 */
export async function deleteReflectionLink(
  walletAddress: string,
  reflectionId: string
): Promise<void> {
  if (!walletAddress || !reflectionId) return;

  const supabase = getSupabaseForWallet(walletAddress);
  const { error } = await supabase
    .from('reflection_sources')
    .delete()
    .eq('user_wallet', walletAddress.toLowerCase())
    .eq('reflection_id', reflectionId);

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
 * Provides links array, getSourceIdFor helper, and setLink function
 */
export function useReflectionLinks(walletAddress?: string) {
  const [links, setLinks] = useState<ReflectionLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load links when walletAddress changes
  useEffect(() => {
    if (!walletAddress) {
      setLinks([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchReflectionLinks(walletAddress)
      .then((data) => {
        if (!cancelled) {
          setLinks(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (process.env.NODE_ENV === 'development') {
          console.error('[reflectionLinks] Failed to load reflection links:', err);
        }
          setError(err?.message ?? 'Failed to load reflection links');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

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
  };
}

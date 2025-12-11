// src/app/lib/reflectionLinks.ts
// Supabase-backed reflection → source links (persistent across reloads)

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
 * Fetch all reflection links for a wallet
 */
export async function fetchReflectionLinks(walletAddress: string): Promise<ReflectionLink[]> {
  if (!walletAddress) return [];
  
  const supabase = getSupabaseForWallet(walletAddress);
  const { data, error } = await supabase
    .from('reflection_links')
    .select('*')
    .eq('wallet_address', walletAddress.toLowerCase());

  if (error) {
    console.error('Failed to fetch reflection links:', error);
    throw error;
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    walletAddress: row.wallet_address,
    reflectionId: row.reflection_id,
    sourceId: row.source_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Upsert or delete a reflection link
 * If sourceId is null, deletes any existing link for that reflection
 * Otherwise, updates existing link or creates a new one
 */
export async function upsertReflectionLink(
  walletAddress: string,
  reflectionId: string,
  sourceId: string | null
): Promise<void> {
  if (!walletAddress || !reflectionId) return;

  const supabase = getSupabaseForWallet(walletAddress);
  const w = walletAddress.toLowerCase();

  // If sourceId is null, delete any existing link
  if (sourceId === null) {
    const { error } = await supabase
      .from('reflection_links')
      .delete()
      .eq('wallet_address', w)
      .eq('reflection_id', reflectionId);

    if (error) {
      console.error('Failed to delete reflection link:', error);
      throw error;
    }
    return;
  }

  // Check if a link already exists
  const { data: existing } = await supabase
    .from('reflection_links')
    .select('id')
    .eq('wallet_address', w)
    .eq('reflection_id', reflectionId)
    .maybeSingle();

  if (existing) {
    // Update existing link
    const { error } = await supabase
      .from('reflection_links')
      .update({
        source_id: sourceId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update reflection link:', error);
      throw error;
    }
  } else {
    // Insert new link
    const { error } = await supabase
      .from('reflection_links')
      .insert({
        wallet_address: w,
        reflection_id: reflectionId,
        source_id: sourceId,
      });

    if (error) {
      console.error('Failed to insert reflection link:', error);
      throw error;
    }
  }
}

/**
 * Delete a reflection link
 */
export async function deleteReflectionLink(
  walletAddress: string,
  reflectionId: string
): Promise<void> {
  if (!walletAddress || !reflectionId) return;

  const supabase = getSupabaseForWallet(walletAddress);
  const { error } = await supabase
    .from('reflection_links')
    .delete()
    .eq('wallet_address', walletAddress.toLowerCase())
    .eq('reflection_id', reflectionId);

  if (error) {
    console.error('Failed to delete reflection link:', error);
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
          console.error('Failed to load reflection links:', err);
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
        console.error('Failed to set reflection link:', err);
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

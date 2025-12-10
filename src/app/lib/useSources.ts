// src/app/lib/useSources.ts
// Hook for loading external source entries (temporary mock implementation)

'use client';

import type { ExternalEntry } from '../../lib/sources';
import { getSupabaseForWallet } from '../../lib/supabase';

/**
 * Temporary mock function that returns 3 fake external entries for testing
 * This will be replaced with real RPC calls later
 */
export function getMockSources(): ExternalEntry[] {
  return [
    {
      id: crypto.randomUUID(),
      kind: 'youtube',
      sourceId: 'abc123',
      title: 'How the mind creates patterns',
      snippet: 'Pattern recognition emerges from repeated attention...',
      capturedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      kind: 'article',
      sourceId: 'https://example.com/article',
      title: 'The Science of Emergence',
      snippet: 'Complex systems arise from simple interactions...',
      capturedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
      id: crypto.randomUUID(),
      kind: 'book',
      sourceId: '978-0123456789',
      title: 'Thinking in Systems',
      snippet: 'Systems thinking helps us understand interconnectedness...',
      capturedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
  ];
}

/**
 * Future RPC function to list external entries
 * This will replace useMockSources once the API is wired
 */
export async function listExternalEntries(walletAddress: string) {
  const supabase = getSupabaseForWallet(walletAddress);
  const { data, error } = await supabase.rpc('list_external_entries', {
    w: walletAddress,
    p_limit: 50,
    p_offset: 0,
  });

  if (error) {
    console.error('Error loading external entries', error);
    return [];
  }

  return (data ?? []).map((row: any) => {
    // Extract URL and notes from snippet if it contains "URL:"
    let url: string | null = null;
    let notes: string | null = null;
    
    if (row.snippet) {
      if (row.snippet.includes('URL:')) {
        const parts = row.snippet.split('URL:');
        notes = parts[0]?.trim() || null;
        url = parts[1]?.trim() || null;
      } else {
        notes = row.snippet;
        // If source_id looks like a URL, use it
        if (row.source_id && (row.source_id.startsWith('http://') || row.source_id.startsWith('https://'))) {
          url = row.source_id;
        }
      }
    } else if (row.source_id && (row.source_id.startsWith('http://') || row.source_id.startsWith('https://'))) {
      url = row.source_id;
    }

    return {
      id: row.id,
      walletAddress: row.wallet_address,
      kind: row.kind,
      sourceId: row.source_id,
      title: row.title,
      url,
      createdAt: row.created_at || row.captured_at,
      notes,
      capturedAt: row.captured_at,
    };
  });
}

// src/app/lib/useSources.ts
// Hook for loading external source entries (temporary mock implementation)
//
// DATA FLOW: Source → Reflection → Internal Event → Insight
//
// 1. SOURCE: External entries (YouTube, articles, books) are stored in external_entries table
// 2. REFLECTION: User imports a source, creating a reflection entry linked via reflection_links
// 3. INTERNAL EVENT: When reflection is created, an internal event is logged (source_event)
// 4. INSIGHT: Insights engine analyzes reflections (including source-linked ones) to generate:
//    - Timeline spikes (days with high activity)
//    - Topic drift (how themes change over time)
//    - Source insights (summary, top words, highlights from linked reflections)
//
// This file handles step 1: Loading sources from Supabase.

'use client';

import type { ExternalEntry } from '../../lib/sources';
import { getSupabaseForWallet } from './supabase';
// getLocalExternalEntries removed - use listSources from sources.ts instead

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
  let data: any[] = [];
  try {
    const supabase = getSupabaseForWallet(walletAddress);
    const res = await supabase.rpc('list_external_entries', {
      w: walletAddress,
      p_limit: 50,
      p_offset: 0,
    });
    if (res.error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useSources] Error loading external entries', res.error);
      }
    } else {
      data = res.data ?? [];
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[useSources] Error loading external entries', e);
    }
  }

  // Note: getLocalExternalEntries removed - all sources now come from database
  return data.map((row: any) => {
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

    // Infer platform and sourceType from kind (for backward compatibility)
    // This will be replaced when database schema is updated
    let platform: 'manual' | 'youtube' | 'x' | 'article' | 'other' = 'other';
    if (row.kind === 'manual') platform = 'manual';
    else if (row.kind === 'youtube') platform = 'youtube';
    else if (row.kind === 'x') platform = 'x';
    else if (row.kind === 'article') platform = 'article';

    let sourceType: 'video' | 'post' | 'article' | 'note' | 'link' = 'note';
    if (row.kind === 'youtube') sourceType = 'video';
    else if (row.kind === 'article') sourceType = 'article';
    else if (row.kind === 'book') sourceType = 'note';

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
      platform,
      sourceType,
    };
  });
}

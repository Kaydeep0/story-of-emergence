// src/app/lib/useSources.ts
// Hook for loading external source entries (temporary mock implementation)

'use client';

import type { ExternalEntry } from '../../lib/sources';

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
export async function listExternalEntries(
  wallet: string
): Promise<ExternalEntry[]> {
  // TODO: Implement RPC call to list_external_entries
  // For now, return mock data
  return getMockSources();
}

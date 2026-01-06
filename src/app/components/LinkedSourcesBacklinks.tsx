'use client';

import { useEffect, useState } from 'react';
import { listSourcesForEntry } from '../lib/entrySources';
import type { SourceDecrypted } from '../lib/sources';

interface LinkedSourcesBacklinksProps {
  entryId: string;
  walletAddress: string;
  sessionKey: CryptoKey | null;
  encryptionReady: boolean;
}

export function LinkedSourcesBacklinks({
  entryId,
  walletAddress,
  sessionKey,
  encryptionReady,
}: LinkedSourcesBacklinksProps) {
  const [linkedSources, setLinkedSources] = useState<SourceDecrypted[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress || !sessionKey || !encryptionReady) {
      setLinkedSources([]);
      return;
    }

    async function loadLinkedSources() {
      if (!sessionKey) return; // Guard against null
      setLoading(true);
      try {
        const sources = await listSourcesForEntry(walletAddress, entryId, sessionKey);
        setLinkedSources(sources);
      } catch (err) {
        console.error('Failed to load linked sources', err);
        setLinkedSources([]);
      } finally {
        setLoading(false);
      }
    }

    loadLinkedSources();
  }, [entryId, walletAddress, sessionKey, encryptionReady]);

  if (loading || linkedSources.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 pt-2 border-t border-white/5">
      <p className="text-xs text-white/50 mb-1">Influenced by</p>
      <div className="flex flex-wrap gap-1.5">
        {linkedSources.map((source) => (
          <span
            key={source.id}
            className="inline-flex items-center gap-1 text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10"
          >
            <span className="capitalize">{source.kind}</span>
            <span className="text-white/40">·</span>
            <span className="truncate max-w-[120px]">{source.title}</span>
          </span>
        ))}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { listSourcesForReflection } from '../lib/reflectionSources';
import type { ExternalSourceDecrypted } from '../lib/externalSources';

interface LinkedSourcesBacklinksProps {
  reflectionId: string;
  walletAddress: string;
  sessionKey: CryptoKey | null;
  encryptionReady: boolean;
}

export function LinkedSourcesBacklinks({
  reflectionId,
  walletAddress,
  sessionKey,
  encryptionReady,
}: LinkedSourcesBacklinksProps) {
  const [linkedSources, setLinkedSources] = useState<ExternalSourceDecrypted[]>([]);
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
        const sources = await listSourcesForReflection(walletAddress, reflectionId, sessionKey);
        setLinkedSources(sources);
      } catch (err) {
        console.error('Failed to load linked sources', err);
        setLinkedSources([]);
      } finally {
        setLoading(false);
      }
    }

    loadLinkedSources();
  }, [reflectionId, walletAddress, sessionKey, encryptionReady]);

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
            <span className="capitalize">{source.source_type}</span>
            <span className="text-white/40">·</span>
            <span className="truncate max-w-[120px]">{source.title}</span>
          </span>
        ))}
      </div>
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { listReflectionsForSource } from '../../lib/reflectionSources';
import type { ExternalSourceDecrypted } from '../../lib/externalSources';

interface SourceCardWithBacklinksProps {
  source: ExternalSourceDecrypted;
  walletAddress: string;
  onDelete: (id: string) => void;
}

export function SourceCardWithBacklinks({
  source,
  walletAddress,
  onDelete,
}: SourceCardWithBacklinksProps) {
  const [linkedReflectionIds, setLinkedReflectionIds] = useState<string[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setLinkedReflectionIds([]);
      return;
    }

    async function loadLinkedReflections() {
      setLoadingLinks(true);
      try {
        const reflectionIds = await listReflectionsForSource(walletAddress, source.id);
        setLinkedReflectionIds(reflectionIds);
      } catch (err) {
        console.error('Failed to load linked reflections', err);
        setLinkedReflectionIds([]);
      } finally {
        setLoadingLinks(false);
      }
    }

    loadLinkedReflections();
  }, [walletAddress, source.id]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/60 capitalize">
              {source.source_type}
            </span>
            <span className="text-xs text-white/40">
              {source.occurred_at_year}
            </span>
          </div>
          <h3 className="text-lg font-medium text-white/90 mb-1">
            {source.title}
          </h3>
          {source.author && (
            <p className="text-sm text-white/60 mb-1">
              by {source.author}
            </p>
          )}
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/50 hover:text-white/70 break-all"
            >
              {source.url}
            </a>
          )}
          {source.metadata?.notes && (
            <p className="text-sm text-white/60 mt-2">
              {source.metadata.notes}
            </p>
          )}
          
          {/* Linked reflections backlinks (read-only) */}
          {!loadingLinks && linkedReflectionIds.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-xs text-white/50 mb-1">Echoed in</p>
              <div className="flex flex-wrap gap-1.5">
                {linkedReflectionIds.map((reflectionId) => (
                  <a
                    key={reflectionId}
                    href={`/?focus=${reflectionId}`}
                    className="inline-flex items-center text-xs text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <span className="truncate max-w-[100px]">{reflectionId.slice(0, 8)}…</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(source.id)}
          className="text-white/30 hover:text-white/50 transition-colors p-1"
          title="Remove source"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}


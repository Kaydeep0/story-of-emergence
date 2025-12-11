// src/app/components/SourceCard.tsx
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ReflectionEntry } from '../lib/insights/types';

/**
 * Source kind badge component with icons
 */
function SourceKindBadge({ kind }: { kind: string }) {
  const normalizedKind = kind.toLowerCase();

  if (normalizedKind === 'youtube') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase bg-red-500/20 text-red-300 border border-red-500/30">
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
        </svg>
        {kind}
      </span>
    );
  }

  if (normalizedKind === 'article') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase bg-white/10 text-white/70 border border-white/15">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        {kind}
      </span>
    );
  }

  if (normalizedKind === 'book') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
        {kind}
      </span>
    );
  }

  // Default fallback for unknown kinds
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase bg-white/10 text-white/70 border border-white/15">
      {kind}
    </span>
  );
}

export type SourceEntry = {
  id: string;
  walletAddress: string;
  kind: string;
  sourceId?: string;
  title?: string;
  url?: string | null;
  createdAt: string;
  notes?: string | null;
  capturedAt: string;
};

type Props = {
  entry: SourceEntry;
  linkedReflections: ReflectionEntry[];
  expanded: boolean;
  onToggle: () => void;
  detailHref?: string;
};

export function SourceCard({ entry, linkedReflections, expanded, onToggle, detailHref }: Props) {
  const firstFive = useMemo(
    () => linkedReflections.slice(0, 5),
    [linkedReflections]
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
      {/* Title and kind */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-white/90 mb-2">
            {detailHref ? (
              <Link href={detailHref} className="hover:text-emerald-300 transition-colors">
                {entry.title || 'Untitled'}
              </Link>
            ) : (
              entry.title || 'Untitled'
            )}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <SourceKindBadge kind={entry.kind} />
            {entry.sourceId && (
              <span className="text-xs text-white/50">
                {entry.sourceId}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Meta line */}
      <div className="text-xs text-white/50 space-y-1">
        {entry.createdAt && (
          <span>
            added {new Date(entry.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="block text-left text-neutral-400 hover:text-white/80 transition-colors"
        >
          Linked reflections: {linkedReflections.length}
        </button>
      </div>

      {/* Notes */}
      {entry.notes && (
        <p className="text-sm text-white/70">{entry.notes}</p>
      )}

      {/* Open button */}
      {entry.url && (
        <button
          type="button"
          onClick={() => {
            window.open(entry.url!, '_blank', 'noopener,noreferrer');
          }}
          className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-sm text-white/90 transition-colors"
        >
          Open
        </button>
      )}

      {detailHref && (
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
        >
          View details
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}

      {/* Linked reflections preview */}
      {expanded && (
        <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
          <p className="text-xs text-white/60 uppercase tracking-wide">
            Linked reflections
          </p>

          {firstFive.length === 0 ? (
            <p className="text-sm text-white/50">No reflections linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {firstFive.map((ref) => (
                <li key={ref.id} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">
                      {ref.plaintext || '(no text)'}
                    </p>
                    <p className="text-xs text-white/40">
                      {new Date(ref.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/#${ref.id}`}
                    className="text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {linkedReflections.length > 5 && (
            <p className="text-xs text-white/40">
              +{linkedReflections.length - 5} more linked reflections
            </p>
          )}
        </div>
      )}
    </div>
  );
}

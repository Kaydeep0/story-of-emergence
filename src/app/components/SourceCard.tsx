// src/app/components/SourceCard.tsx
'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ReflectionEntry } from '../lib/insights/types';

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
  platform?: string;
  sourceType?: string;
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
            {entry.sourceType && (
              <span className="text-xs text-white/60 uppercase">
                {entry.sourceType}
              </span>
            )}
            <span className="text-xs text-white/50">
              {entry.platform === 'manual' ? 'Manual source' : entry.platform || entry.kind || 'Source'}
            </span>
            {entry.sourceId && (
              <span className="text-xs text-white/40">
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
        {linkedReflections.length === 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/40 italic">No reflections linked yet</span>
            {detailHref && (
              <Link
                href={detailHref}
                className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-emerald-200 transition-colors underline"
              >
                Link or import reflections
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="block text-left text-neutral-400 hover:text-white/80 transition-colors"
          >
            Linked reflections: {linkedReflections.length}
          </button>
        )}
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

// src/app/components/SourceLinkMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

type Source = {
  sourceId?: string;
  source_id?: string;
  title?: string;
  kind?: string;
};

type Props = {
  reflectionId: string;
  currentSourceId: string | null | undefined;
  sources: Source[];
  onLink: (reflectionId: string, sourceId: string | null) => Promise<void>;
};

export function SourceLinkMenu({ reflectionId, currentSourceId, sources, onLink }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentSource = sources.find(
    (s) => (s.sourceId ?? s.source_id) === currentSourceId
  );

  const handleSelectSource = async (sourceId: string | null) => {
    await onLink(reflectionId, sourceId);
    setIsOpen(false);
  };

  if (sources.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <p className="text-xs text-white/50">Connect a source to link reflections.</p>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Current link badge or "Add link" button */}
      {currentSourceId ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm text-white/80 font-medium truncate">
              {currentSource?.title || currentSourceId}
            </span>
            {currentSource?.kind && (
              <span className="text-[11px] uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15 flex-shrink-0">
                {currentSource.kind}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex-shrink-0 rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isOpen ? 'Close' : 'Change'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors text-left flex items-center justify-between"
        >
          <span>Add source link</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border border-white/20 bg-black/95 backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {/* Remove link option (only if linked) */}
            {currentSourceId && (
              <button
                onClick={() => handleSelectSource(null)}
                className="w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                <span>Remove link</span>
              </button>
            )}

            {/* Divider */}
            {currentSourceId && sources.length > 0 && (
              <div className="border-t border-white/10" />
            )}

            {/* Source list */}
            {sources.map((source) => {
              const sid = source.sourceId ?? source.source_id;
              const isSelected = sid === currentSourceId;
              
              return (
                <button
                  key={sid}
                  onClick={() => handleSelectSource(sid)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-white/10 text-emerald-300'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {source.title || sid}
                    </div>
                    {source.kind && (
                      <div className="text-xs text-white/50">{source.kind}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

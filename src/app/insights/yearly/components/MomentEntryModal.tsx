'use client';

import { useEffect } from 'react';
import type { ReflectionEntry } from '../../../lib/insights/types';

interface MomentEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moment: { entryId: string; date: string } | null;
  entriesById: Record<string, ReflectionEntry>;
  formatDate: (dateStr: string) => string;
}

export function MomentEntryModal({
  open,
  onOpenChange,
  moment,
  entriesById,
  formatDate,
}: MomentEntryModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    if (!open) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!moment) return null;

  const entry = entriesById[moment.entryId];
  const entryDate = entry ? new Date(entry.createdAt) : null;
  const formattedDate = entryDate ? formatDate(moment.date) : formatDate(moment.date);
  const formattedTime = entryDate
    ? entryDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-[220ms] ease-out ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />

      {/* Mobile panel: slide from bottom */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto z-[70] shadow-2xl transform transition-transform duration-[220ms] ease-out ${
          open ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Reflection</h3>
              <p className="text-xs text-white/60 mt-1">
                {formattedDate} {formattedTime && `at ${formattedTime}`}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {entry && entry.plaintext ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{entry.plaintext}</p>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/60 leading-relaxed">
                This entry is not available in this view. It may be deleted, locked, or missing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop panel: side panel */}
      <div
        className={`hidden sm:flex fixed inset-y-0 right-0 w-[480px] bg-black border-l border-white/10 z-[70] flex-col shadow-2xl transform transition-transform duration-[220ms] ease-out ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Reflection</h3>
            <p className="text-xs text-white/60 mt-1">
              {formattedDate} {formattedTime && `at ${formattedTime}`}
            </p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {entry && entry.plaintext ? (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{entry.plaintext}</p>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-white/60 leading-relaxed">
                This entry is not available in this view. It may be deleted, locked, or missing.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


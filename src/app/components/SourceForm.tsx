/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical source management components
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

// src/app/components/SourceForm.tsx
'use client';

import { useState } from 'react';
import type { SourceKind } from '../lib/sources';

type Props = {
  onSubmit: (data: { title: string; kind: string; sourceId: string; notes?: string; url?: string; sourceType?: SourceKind }) => Promise<void>;
  onCancel: () => void;
};

const SOURCE_TYPE_OPTIONS: { value: SourceKind; label: string }[] = [
  { value: 'note', label: 'Note' },
  { value: 'article', label: 'Article' },
  { value: 'link', label: 'Link' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'book', label: 'Book' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'file', label: 'File' },
  { value: 'other', label: 'Other' },
];

export function SourceForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<SourceKind>('note');
  const [url, setUrl] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    // Generate sourceId from title if not provided
    const finalSourceId = sourceId.trim() || `manual_${Date.now()}`;
    try {
      setSubmitting(true);
      await onSubmit({ 
        title: title.trim(), 
        kind: 'manual', // Default platform to "manual"
        sourceId: finalSourceId, 
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
        sourceType,
      });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add source.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4" onSubmit={handleSubmit}>
      <div className="mb-2">
        <h3 className="text-sm font-medium text-white/90">Add Source</h3>
        <p className="text-xs text-white/50 mt-1">Add an external source (not a reflection)</p>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">
          Title <span className="text-rose-400">*</span>
        </label>
        <input
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Naval Notes 2"
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">Source Type</label>
        <select
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value as SourceKind)}
        >
          {SOURCE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">URL (optional)</label>
        <input
          type="url"
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">Source ID (optional, auto-generated if empty)</label>
        <input
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="Auto-generated if empty"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">Notes (optional)</label>
        <textarea
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 disabled:opacity-60"
        >
          {submitting ? 'Adding…' : 'Add source'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-sm text-white/70 hover:text-white/90"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

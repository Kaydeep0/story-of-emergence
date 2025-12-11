// src/app/components/SourceForm.tsx
'use client';

import { useState } from 'react';

type Props = {
  onSubmit: (data: { title: string; kind: string; sourceId: string; notes?: string }) => Promise<void>;
  onCancel: () => void;
};

const KIND_OPTIONS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'article', label: 'Article' },
  { value: 'book', label: 'Book' },
];

export function SourceForm({ onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('youtube');
  const [sourceId, setSourceId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !sourceId.trim()) {
      setError('Title and Source ID are required.');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({ title: title.trim(), kind, sourceId: sourceId.trim(), notes: notes.trim() || undefined });
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add source.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-xs text-white/60">Title</label>
        <input
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Naval Notes 2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">Kind</label>
        <select
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {KIND_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-white/60">Source ID</label>
        <input
          className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="yt_demo_2"
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

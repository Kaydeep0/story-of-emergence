'use client';

/**
 * Sources Page - Phase 5.1
 * Read-only ingestion prep - references only, no content processing
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { 
  listExternalSources, 
  insertExternalSource,
  deleteExternalSource,
  type ExternalSourceDecrypted,
  type ExternalSourceType 
} from '../lib/externalSources';
import { toast } from 'sonner';

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  
  const [mounted, setMounted] = useState(false);
  const [sources, setSources] = useState<ExternalSourceDecrypted[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    source_type: 'note' as ExternalSourceType,
    title: '',
    author: '',
    url: '',
    occurred_at_year: new Date().getFullYear(),
    notes: '',
  });

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load sources when wallet is connected and encryption is ready
  useEffect(() => {
    if (!mounted || !connected || !encryptionReady || !address || !sessionKey) return;
    
    async function loadSources() {
      if (!address || !sessionKey) return;
      setLoading(true);
      setError(null);
      try {
        const data = await listExternalSources(address, sessionKey);
        setSources(data);
      } catch (err) {
        console.error('Failed to load sources', err);
        setError('Failed to load external sources');
      } finally {
        setLoading(false);
      }
    }

    loadSources();
  }, [mounted, connected, encryptionReady, address, sessionKey]);

  const handleAddSource = async () => {
    if (!address || !sessionKey) return;
    
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);
      await insertExternalSource(address, sessionKey, {
        source_type: formData.source_type,
        title: formData.title.trim(),
        author: formData.author.trim() || null,
        url: formData.url.trim() || null,
        occurred_at_year: formData.occurred_at_year,
        metadata: {
          notes: formData.notes.trim() || undefined,
        },
      });
      
      // Reload sources
      const data = await listExternalSources(address, sessionKey);
      setSources(data);
      
      // Reset form
      setFormData({
        source_type: 'note',
        title: '',
        author: '',
        url: '',
        occurred_at_year: new Date().getFullYear(),
        notes: '',
      });
      setAdding(false);
      toast.success('Source added');
    } catch (err: any) {
      console.error('Failed to add source', err);
      toast.error(err.message || 'Failed to add source');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!address) return;
    
    if (!confirm('Delete this source reference?')) return;
    
    try {
      await deleteExternalSource(address, id);
      setSources(sources.filter(s => s.id !== id));
      toast.success('Source deleted');
    } catch (err: any) {
      console.error('Failed to delete source', err);
      toast.error(err.message || 'Failed to delete source');
    }
  };

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view external sources.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!encryptionReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">
              {encryptionError || 'Encryption key not ready. Please sign the consent message.'}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
        
        <div className="flex items-center justify-between mb-4">
          {!loading && (
            <p className="text-sm text-white/60">
              {sources.length} source{sources.length === 1 ? '' : 's'}
            </p>
          )}
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/90 bg-white/10 hover:bg-white/15 transition-colors"
          >
            {adding ? 'Close' : 'Add source'}
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="mb-6 rounded-2xl border border-white/10 p-6 space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Type</label>
              <select
                value={formData.source_type}
                onChange={(e) => setFormData({ ...formData, source_type: e.target.value as ExternalSourceType })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              >
                <option value="youtube">YouTube</option>
                <option value="book">Book</option>
                <option value="article">Article</option>
                <option value="conversation">Conversation</option>
                <option value="note">Note</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-1">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                placeholder="Source title"
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-1">Author</label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                placeholder="Author name"
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-1">URL</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                placeholder="https://..."
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-1">Year</label>
              <input
                type="number"
                value={formData.occurred_at_year}
                onChange={(e) => setFormData({ ...formData, occurred_at_year: parseInt(e.target.value) || new Date().getFullYear() })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
                min="1900"
                max={new Date().getFullYear() + 1}
              />
            </div>
            
            <div>
              <label className="block text-sm text-white/60 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 resize-none"
                rows={3}
                placeholder="Optional notes"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddSource}
                disabled={loading}
                className="flex-1 rounded-lg border border-white/20 px-3 py-2 text-sm text-white/90 bg-white/10 hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setFormData({
                    source_type: 'note',
                    title: '',
                    author: '',
                    url: '',
                    occurred_at_year: new Date().getFullYear(),
                    notes: '',
                  });
                }}
                className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !adding && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">Loading sources…</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && sources.length === 0 && (
          <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white/40"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
                />
              </svg>
            </div>
            <h2 className="text-lg font-medium">No external sources yet</h2>
            <p className="text-sm text-white/60 max-w-md mx-auto">
              Sources are references, not imports. Add references to YouTube videos, books, articles, conversations, or notes that have influenced your thinking.
            </p>
          </div>
        )}

        {/* Sources list */}
        {!loading && !error && sources.length > 0 && (
          <div className="space-y-4">
            {sources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl border border-white/10 p-6 space-y-2"
              >
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
                        className="text-sm text-blue-400 hover:text-blue-300 break-all"
                      >
                        {source.url}
                      </a>
                    )}
                    {source.metadata?.notes && (
                      <p className="text-sm text-white/60 mt-2">
                        {source.metadata.notes}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSource(source.id)}
                    className="text-white/40 hover:text-white/60 transition-colors"
                    title="Delete source"
                  >
                    <svg
                      className="w-5 h-5"
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
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

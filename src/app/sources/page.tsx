'use client';

/**
 * Sources Page - Phase 5.1
 * Read-only ingestion prep - references only, no content processing
 */

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { 
  listSources, 
  insertSource,
  deleteSource,
  type SourceDecrypted,
  type SourceKind 
} from '../lib/sources';
import { toast } from 'sonner';
import { SourceCardWithBacklinks } from './components/SourceCardWithBacklinks';

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  
  const [mounted, setMounted] = useState(false);
  const [sources, setSources] = useState<SourceDecrypted[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    kind: 'note' as SourceKind,
    title: '',
    author: '',
    url: '',
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
        const data = await listSources(address, sessionKey);
        // Empty array is a valid state, not an error
        // Always default to [] - never null or undefined
        setSources(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load sources', err);
        // Only set error for actual failures, not empty results
        const errMessage = err instanceof Error ? err.message : String(err);
        // Only show error for real failures (network, auth, etc.)
        // Empty results from database are not errors
        if (errMessage && !errMessage.includes('No rows') && !errMessage.includes('empty')) {
          setError('Unable to load sources');
          // Still set empty array so UI doesn't break
          setSources([]);
        } else {
          // Empty result or no data - valid state
          setSources([]);
        }
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
      // Write to sources table
      await insertSource(address, sessionKey, {
        kind: formData.kind,
        title: formData.title.trim() || null,
        author: formData.author.trim() || null,
        url: formData.url.trim() || null,
        metadata: {
          notes: formData.notes.trim() || undefined,
        },
      });
      
      // Refetch sources after successful insert
      const data = await listSources(address, sessionKey);
      setSources(Array.isArray(data) ? data : []);
      
      // Reset form and close modal quietly
      setFormData({
        kind: 'note',
        title: '',
        author: '',
        url: '',
        notes: '',
      });
      setAdding(false);
      // No success toast - no celebration, no dopamine
    } catch (err: any) {
      console.error('Failed to add source', err);
      // Only show toast on failure
      toast.error(err.message || 'Failed to add source');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!address) return;
    
    if (!confirm('Delete this source reference?')) return;
    
    try {
      await deleteSource(address, id);
      // Optimistically remove from list
      setSources(sources.filter(s => s.id !== id));
      // No success toast - quiet removal
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
        <h1 className="text-2xl font-normal text-center mb-3">Sources</h1>
        <p className="text-center text-sm text-white/50 mb-2">
          External material that entered your private space.
        </p>
        <p className="text-center text-xs text-white/40 mb-8">
          These are not recommendations or a feed. They are inputs you chose to keep.
        </p>

        {/* Sources list */}
        {!loading && !error && sources.length > 0 && (
          <div className="space-y-4 mb-8">
            {sources.map((source) => (
              <SourceCardWithBacklinks
                key={source.id}
                source={source}
                walletAddress={address ?? ''}
                onDelete={handleDeleteSource}
              />
            ))}
          </div>
        )}

        {/* Add form */}
        {adding && (
          <div className="mb-6 rounded-2xl border border-white/10 p-6 space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-1">Type</label>
              <select
                value={formData.kind}
                onChange={(e) => setFormData({ ...formData, kind: e.target.value as SourceKind })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20"
              >
                <option value="youtube">YouTube</option>
                <option value="book">Book</option>
                <option value="article">Article</option>
                <option value="podcast">Podcast</option>
                <option value="note">Note</option>
                <option value="link">Link</option>
                <option value="file">File</option>
                <option value="other">Other</option>
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
                    kind: 'note',
                    title: '',
                    author: '',
                    url: '',
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

        {/* Empty state - shown when no sources or when error (sanctuary-safe) */}
        {!loading && (sources.length === 0 || error) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-4">
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
            <h2 className="text-lg font-normal text-white/80">
              {error ? 'Unable to load sources' : 'No external material has been saved yet'}
            </h2>
            <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
              Sources appear here only when you choose to keep them.
            </p>
          </div>
        )}

        {/* Secondary add button - bottom aligned, subtle */}
        {!loading && (
          <div className="flex justify-center pt-6">
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="text-white/40 hover:text-white/60 transition-colors p-2"
              title={adding ? 'Close' : 'Add source'}
            >
              {adding ? (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              )}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

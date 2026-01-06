// src/app/reflections/pins/page.tsx
// Pins View - Saved clusters and threads
// Layer 4: Visual encoding

'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcListPins, rpcDeletePin, rpcUpdatePin, type DerivedArtifact, type PinKind, type ClusterPinPayload, type ThreadPinPayload, type BridgePinPayload, type NarrativeBridgePinPayload } from '../../lib/pins';
import { NeoCard } from '../../../components/ui/NeoCard';
import { ClusterPreview } from '../../../components/reflections/pins/ClusterPreview';
import { ThreadPreview } from '../../../components/reflections/pins/ThreadPreview';
import { PinPreview } from './components/PinPreview';
import { buildThreadUrl } from '../../lib/navigation';

export default function PinsPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<PinKind | 'bridge_pin'>('cluster_pin');
  const [pins, setPins] = useState<DerivedArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load pins
  const loadPins = useCallback(async () => {
    if (!mounted || !connected || !address || !encryptionReady || !sessionKey) {
      setPins([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const artifacts = await rpcListPins(address, sessionKey, activeTab);
      setPins(artifacts);
    } catch (err: any) {
      console.error('Failed to load pins', err);
      setError(err.message ?? 'Failed to load pins');
    } finally {
      setLoading(false);
    }
  }, [mounted, connected, address, encryptionReady, sessionKey, activeTab]);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  const handleDelete = useCallback(async (artifactId: string) => {
    if (!address || !confirm('Delete this pin?')) return;

    try {
      await rpcDeletePin(address, artifactId);
      await loadPins();
    } catch (err: any) {
      console.error('Failed to delete pin', err);
      alert('Failed to delete pin: ' + (err.message ?? 'Unknown error'));
    }
  }, [address, loadPins]);

  const handleStartEdit = useCallback((pin: DerivedArtifact) => {
    setEditingId(pin.id);
    setEditLabel(pin.payload.label);
  }, []);

  const handleSaveEdit = useCallback(async (pin: DerivedArtifact) => {
    if (!address || !sessionKey) return;

    try {
      const updatedPayload = { ...pin.payload, label: editLabel };
      await rpcUpdatePin(address, sessionKey, pin.id, updatedPayload);
      setEditingId(null);
      setEditLabel('');
      await loadPins();
    } catch (err: any) {
      console.error('Failed to update pin', err);
      alert('Failed to rename pin: ' + (err.message ?? 'Unknown error'));
    }
  }, [address, sessionKey, editLabel, loadPins]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditLabel('');
  }, []);

  const handleOpen = useCallback((pin: DerivedArtifact) => {
    if (pin.kind === 'cluster_pin') {
      const payload = pin.payload as ClusterPinPayload;
      const params = new URLSearchParams();
      params.set('clusterId', payload.clusterId.toString());
      if (payload.asOf) {
        params.set('asOf', payload.asOf);
      }
      router.push(`/reflections/mind?${params.toString()}`);
    } else if (pin.kind === 'thread_pin') {
      const payload = pin.payload as ThreadPinPayload;
      const params = new URLSearchParams();
      params.set('seedReflectionId', payload.seedReflectionId);
      if (payload.asOf) {
        params.set('asOf', payload.asOf);
      }
      router.push(`/reflections/thread?${params.toString()}`);
    } else if (pin.kind === 'bridge_pin') {
      const payload = pin.payload as BridgePinPayload;
      // Navigate to thread view starting from the "from" reflection
      const reflectionId = payload.fromReflectionId;
      if (!reflectionId) {
        console.error('[pins] Bridge pin missing fromReflectionId');
        return;
      }
      router.push(buildThreadUrl(reflectionId));
    } else if (pin.kind === 'narrative_bridge_pin') {
      const payload = pin.payload as NarrativeBridgePinPayload;
      // Navigate to thread view starting from the "from" reflection
      const reflectionId = payload.fromReflectionId;
      if (!reflectionId) {
        console.error('[pins] Narrative bridge pin missing fromReflectionId');
        return;
      }
      router.push(buildThreadUrl(reflectionId, { mode: 'cabin' }));
    }
  }, [router]);

  // Format date helper (not a hook, but defined before useMemo)
  const formatDate = useCallback((date: Date): string => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Filter pins by active tab (must be called unconditionally)
  const filteredPins = useMemo(() => {
    return pins.filter(p => {
      if (activeTab === 'bridge_pin') {
        return p.kind === 'bridge_pin' || p.kind === 'narrative_bridge_pin';
      }
      return p.kind === activeTab;
    });
  }, [pins, activeTab]);

  // Early return states (after all hooks)
  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Please connect your wallet to view pins.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-1 rounded-full bg-[hsl(var(--accent))] shadow-[var(--glow-mid)]" />
            <h1 className="text-2xl font-semibold text-white/90">Pins</h1>
          </div>
          <p className="text-sm text-[hsl(var(--muted))] ml-3">
            Saved clusters, threads, and bridges you want to return to.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('cluster_pin')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              activeTab === 'cluster_pin'
                ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]'
                : 'border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)]'
            }`}
          >
            Clusters
          </button>
          <button
            onClick={() => setActiveTab('thread_pin')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              activeTab === 'thread_pin'
                ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]'
                : 'border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)]'
            }`}
          >
            Threads
          </button>
          <button
            onClick={() => setActiveTab('bridge_pin')}
            className={`px-4 py-2 rounded-lg border transition-all ${
              activeTab === 'bridge_pin'
                ? 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))]'
                : 'border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)]'
            }`}
          >
            Bridges
          </button>
        </div>

        {/* Error */}
        {error && (
          <NeoCard className="p-4 mb-4 border-red-500/50">
            <p className="text-sm text-red-400">Error: {error}</p>
          </NeoCard>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-center text-[hsl(var(--muted))]">Loading pins...</p>
        )}

        {/* Empty state */}
        {!loading && filteredPins.length === 0 && (
          <NeoCard className="p-8">
            <p className="text-center text-[hsl(var(--muted))]">
              No {activeTab === 'cluster_pin' ? 'clusters' : activeTab === 'thread_pin' ? 'threads' : 'bridges'} pinned yet.
            </p>
          </NeoCard>
        )}

        {/* Pins list */}
        {!loading && filteredPins.length > 0 && (
          <div className="space-y-4">
            {filteredPins.map((pin) => {
              if (pin.kind === 'cluster_pin') {
                const payload = pin.payload as ClusterPinPayload;
                // Generate seed from pin ID + cluster ID for deterministic preview
                const previewSeed = `${pin.id}-${payload.clusterId}`;
                // Calculate intensity based on cluster size (normalized to 0.5-1.0)
                const intensity = Math.min(1.0, Math.max(0.5, payload.size / 50));
                
                return (
                  <NeoCard key={pin.id} className="p-6 relative overflow-hidden">
                    {/* Futuristic preview background */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <PinPreview seed={previewSeed} intensity={intensity} />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingId === pin.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(pin);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="flex-1 px-3 py-1 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-white/90 focus:outline-none focus:border-[hsl(var(--accent)/0.5)]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(pin)}
                                className="px-3 py-1 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-white/90">{payload.label}</h3>
                          )}
                          <p className="text-sm text-[hsl(var(--muted))] mt-1">
                            {formatDate(pin.createdAt)} • {payload.size} reflections
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editingId !== pin.id && (
                            <>
                              <button
                                onClick={() => handleStartEdit(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleOpen(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => handleDelete(pin.id)}
                                className="px-3 py-1.5 rounded border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="w-full h-[120px] md:h-[140px] relative">
                        <ClusterPreview
                          payload={payload}
                          walletAddress={address || ''}
                          width={800}
                          height={140}
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted))]">
                        <span>Cluster {payload.clusterId + 1}</span>
                        {payload.asOf && (
                          <span>As of {formatDate(new Date(payload.asOf))}</span>
                        )}
                        <span>
                          {formatDate(new Date(payload.timeRange.earliest))} → {formatDate(new Date(payload.timeRange.latest))}
                        </span>
                      </div>
                    </div>
                  </NeoCard>
                );
              } else if (pin.kind === 'thread_pin') {
                const payload = pin.payload as ThreadPinPayload;
                // Generate seed from pin ID + seed reflection ID for deterministic preview
                const previewSeed = `${pin.id}-${payload.seedReflectionId}`;
                // Calculate intensity based on thread length (normalized to 0.5-1.0)
                const intensity = Math.min(1.0, Math.max(0.5, payload.orderedReflectionIds.length / 20));
                
                return (
                  <NeoCard key={pin.id} className="p-6 relative overflow-hidden">
                    {/* Futuristic preview background */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <PinPreview seed={previewSeed} intensity={intensity} />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingId === pin.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(pin);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="flex-1 px-3 py-1 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-white/90 focus:outline-none focus:border-[hsl(var(--accent)/0.5)]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(pin)}
                                className="px-3 py-1 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-white/90">{payload.label}</h3>
                          )}
                          <p className="text-sm text-[hsl(var(--muted))] mt-1">
                            {formatDate(pin.createdAt)} • {payload.orderedReflectionIds.length} reflections
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editingId !== pin.id && (
                            <>
                              <button
                                onClick={() => handleStartEdit(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleOpen(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => handleDelete(pin.id)}
                                className="px-3 py-1.5 rounded border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="w-full h-[120px] md:h-[140px] relative">
                        <ThreadPreview
                          payload={payload}
                          walletAddress={address || ''}
                          width={800}
                          height={140}
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted))]">
                        {payload.asOf && (
                          <span>As of {formatDate(new Date(payload.asOf))}</span>
                        )}
                        <span>{payload.keyBridges.length} key bridges</span>
                      </div>
                    </div>
                  </NeoCard>
                );
              } else if (pin.kind === 'bridge_pin') {
                const payload = pin.payload as BridgePinPayload;
                // Generate seed from pin ID + bridge IDs for deterministic preview
                const previewSeed = `${pin.id}-${payload.fromReflectionId}-${payload.toReflectionId}`;
                const intensity = 0.8; // Fixed intensity for bridges
                
                return (
                  <NeoCard key={pin.id} className="p-6 relative overflow-hidden">
                    {/* Futuristic preview background */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <PinPreview seed={previewSeed} intensity={intensity} />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingId === pin.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(pin);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="flex-1 px-3 py-1 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-white/90 focus:outline-none focus:border-[hsl(var(--accent)/0.5)]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(pin)}
                                className="px-3 py-1 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-white/90">{payload.label}</h3>
                          )}
                          <p className="text-sm text-[hsl(var(--muted))] mt-1">
                            {formatDate(pin.createdAt)} • Bridge
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editingId !== pin.id && (
                            <>
                              <button
                                onClick={() => handleStartEdit(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleOpen(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => handleDelete(pin.id)}
                                className="px-3 py-1.5 rounded border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bridge Content */}
                      <div className="space-y-3">
                        <div className="text-sm text-white/80">{payload.bridge.claim}</div>
                        {payload.bridge.translation && (
                          <div className="text-sm text-white/70">{payload.bridge.translation}</div>
                        )}
                        {payload.bridge.consequences?.length > 0 && (
                          <ul className="space-y-1 text-sm text-white/70">
                            {payload.bridge.consequences.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        )}
                        <div className="text-xs text-white/60">{payload.bridge.frame}</div>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted))]">
                        <span>From → To</span>
                        <span>{payload.bridge.signals.length} signals</span>
                      </div>
                    </div>
                  </NeoCard>
                );
              } else if (pin.kind === 'narrative_bridge_pin') {
                const payload = pin.payload as NarrativeBridgePinPayload;
                // Generate seed from pin ID + bridge IDs for deterministic preview
                const previewSeed = `${pin.id}-${payload.fromReflectionId}-${payload.toReflectionId}`;
                const intensity = 0.8; // Fixed intensity for bridges
                
                return (
                  <NeoCard key={pin.id} className="p-6 relative overflow-hidden">
                    {/* Futuristic preview background */}
                    <div className="absolute inset-0 opacity-30 pointer-events-none">
                      <PinPreview seed={previewSeed} intensity={intensity} />
                    </div>
                    
                    <div className="space-y-4 relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingId === pin.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(pin);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                className="flex-1 px-3 py-1 rounded-lg border border-[hsl(var(--line))] bg-[hsl(var(--bg1)/0.5)] text-white/90 focus:outline-none focus:border-[hsl(var(--accent)/0.5)]"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(pin)}
                                className="px-3 py-1 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="px-3 py-1 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <h3 className="text-lg font-semibold text-white/90">{payload.label}</h3>
                          )}
                          <p className="text-sm text-[hsl(var(--muted))] mt-1">
                            {formatDate(pin.createdAt)} • Narrative Bridge
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {editingId !== pin.id && (
                            <>
                              <button
                                onClick={() => handleStartEdit(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.5)] text-white/70 hover:bg-[hsl(var(--panel)/0.7)] transition-colors text-sm"
                              >
                                Rename
                              </button>
                              <button
                                onClick={() => handleOpen(pin)}
                                className="px-3 py-1.5 rounded border border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.2)] transition-colors text-sm font-medium"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => handleDelete(pin.id)}
                                className="px-3 py-1.5 rounded border border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bridge Content */}
                      <div className="space-y-3">
                        <div className="text-sm text-white/80 italic">"{payload.explanation}"</div>
                        {payload.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {payload.reasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded border border-white/20 bg-white/5 text-xs text-white/50"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm text-[hsl(var(--muted))]">
                        <span>Weight: {payload.weight.toFixed(2)}</span>
                        {payload.tags && payload.tags.length > 0 && (
                          <span>{payload.tags.length} tag{payload.tags.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                  </NeoCard>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </main>
  );
}


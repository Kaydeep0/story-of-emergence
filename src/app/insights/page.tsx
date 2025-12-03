'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { rpcListInternalEvents } from '../lib/internalEvents';
import { computeWeeklyInsights, WeeklyInsight } from '../lib/weeklyInsights';
import { keyFromSignatureHex } from '../../lib/crypto';
import { useLogEvent } from '../lib/useLogEvent';
import { rpcFetchEntries } from '../lib/entries';
import { computeTimelineSpikes, itemToReflectionEntry } from '../lib/insights/timelineSpikes';
import { computeAlwaysOnSummary } from '../lib/insights/alwaysOnSummary';
import { useHighlights } from '../lib/insights/useHighlights';
import type { TimelineSpikeCard, AlwaysOnSummaryCard, InsightCard } from '../lib/insights/types';

function humanizeSignError(e: any) {
  if (e?.code === 4001) return 'Signature request was rejected.';
  if (e?.code === -32002) return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return e?.shortMessage || e?.message || 'Unexpected signing error.';
}

// Icon component for timeline events
function EventIcon({ eventType }: { eventType: string }) {
  const className = "w-4 h-4 text-white/60";
  
  switch (eventType) {
    case 'page_reflections':
      // Pencil icon
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
      );
    case 'page_insights':
      // Sparkles icon
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
      );
    case 'page_sources':
      // Link icon
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
        </svg>
      );
    default:
      // Default activity icon (circle)
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
  }
}

function formatWeekDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type InsightsMode = 'weekly' | 'timeline' | 'summary';

type SimpleEvent = {
  id: string;
  eventAt: string;
  eventType: string;
};

const MODE_OPTIONS: { value: InsightsMode; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'summary', label: 'Summary' },
];

export default function InsightsPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signingConsentRef = useRef(false);
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [consentSig, setConsentSig] = useState<string | null>(null);
  const [mode, setMode] = useState<InsightsMode>('weekly');

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<SimpleEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // Summary state
  const [summaryData, setSummaryData] = useState<{
    streak: number;
    entries: number;
    totalEvents: number;
    lastActiveAt: string | null;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Always On Summary insight cards (computed from decrypted reflections)
  const [summaryInsights, setSummaryInsights] = useState<AlwaysOnSummaryCard[]>([]);
  const [summaryReflectionsLoading, setSummaryReflectionsLoading] = useState(false);
  const [summaryReflectionsError, setSummaryReflectionsError] = useState<string | null>(null);

  // Timeline spikes state (computed from decrypted reflections)
  const [spikeInsights, setSpikeInsights] = useState<TimelineSpikeCard[]>([]);
  const [reflectionsLoading, setReflectionsLoading] = useState(false);
  const [reflectionsError, setReflectionsError] = useState<string | null>(null);

  // Expansion state for spike cards (tracks which dates are expanded)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Highlights state (backed by localStorage)
  const { highlights, isHighlighted, toggleHighlight } = useHighlights();

  // Helper to check if a spike card is expanded
  function isExpanded(dateKey: string): boolean {
    return expandedDates.has(dateKey);
  }

  // Helper to toggle expansion state for a spike card
  function toggleExpanded(dateKey: string): void {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  }

  const { logEvent } = useLogEvent();
  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
    const s = sessionStorage.getItem('soe-consent-sig');
    if (s) setConsentSig(s);
  }, []);

  // Log navigation event when page loads
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_insights');
  }, [mounted, connected, logEvent]);

  // Reset signature when wallet changes
  useEffect(() => {
    setConsentSig(null);
    sessionStorage.removeItem('soe-consent-sig');
  }, [address]);

  async function getSessionKey(): Promise<CryptoKey> {
    if (!connected || !address) throw new Error('Connect wallet first');

    let sig = consentSig;

    if (!sig) {
      if (signingConsentRef.current) {
        throw new Error('PENDING_SIG');
      }
      signingConsentRef.current = true;
      try {
        const msg = `Story of Emergence — encryption key consent for ${address}`;
        sig = await signMessageAsync({ message: msg });
        setConsentSig(sig);
        sessionStorage.setItem('soe-consent-sig', sig);
      } catch (e: any) {
        throw new Error(humanizeSignError(e));
      } finally {
        signingConsentRef.current = false;
      }
    }
    return keyFromSignatureHex(sig);
  }

  async function loadInsights() {
    if (!connected || !address) return;

    setLoading(true);
    setError(null);

    try {
      const sessionKey = await getSessionKey();
      const { items } = await rpcListInternalEvents(address, sessionKey, {
        limit: 500,
        offset: 0,
      });

      const weekly = computeWeeklyInsights(items);
      setInsights(weekly);
    } catch (e: any) {
      if (e?.message === 'PENDING_SIG') return;
      console.error('Failed to load insights', e);
      const msg = e?.message ?? 'Could not load insights';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Load insights on mount when connected
  useEffect(() => {
    if (!mounted) return;
    if (!connected) return;
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, connected, address]);

  // Load timeline events when Timeline mode is active
  useEffect(() => {
    if (mode !== 'timeline') return;
    if (!connected || !address) return;

    let cancelled = false;

    async function loadTimeline() {
      try {
        setTimelineLoading(true);
        setTimelineError(null);

        const res = await fetch('/api/timeline', {
          headers: {
            'x-wallet-address': address!.toLowerCase(),
          },
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error ?? 'Failed to load timeline');
        }

        const json = await res.json();

        if (!cancelled) {
          setTimelineEvents((json.events ?? []) as SimpleEvent[]);
        }
      } catch (err: any) {
        if (!cancelled) {
          setTimelineError(err.message ?? 'Failed to load timeline');
        }
      } finally {
        if (!cancelled) {
          setTimelineLoading(false);
        }
      }
    }

    loadTimeline();

    return () => {
      cancelled = true;
    };
  }, [mode, connected, address]);

  // Load summary data when Summary mode is active
  useEffect(() => {
    if (mode !== 'summary') return;
    if (!connected || !address) return;

    let cancelled = false;

    async function loadSummary() {
      try {
        setSummaryLoading(true);
        setSummaryError(null);

        const res = await fetch('/api/summary', {
          headers: {
            'x-wallet-address': address!.toLowerCase(),
          },
        });

        if (!res.ok) {
          throw new Error('Failed to load summary');
        }

        const json = await res.json();

        if (!cancelled) {
          setSummaryData(json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setSummaryError(err.message ?? 'Failed to load summary');
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [mode, connected, address]);

  // Load decrypted reflections and compute Always On Summary when Summary mode is active
  useEffect(() => {
    if (mode !== 'summary') return;
    if (!connected || !address) return;

    let cancelled = false;

    async function loadReflectionsAndComputeSummaryInsights() {
      try {
        setSummaryReflectionsLoading(true);
        setSummaryReflectionsError(null);
        setSummaryInsights([]);

        // Get session key for decryption
        const sessionKey = await getSessionKey();

        // Fetch all reflections (up to 500 for analysis)
        const { items } = await rpcFetchEntries(address!, sessionKey, {
          includeDeleted: false,
          limit: 500,
          offset: 0,
        });

        if (cancelled) return;

        // Convert to ReflectionEntry format
        const reflectionEntries = items.map(itemToReflectionEntry);

        // Compute always-on summary insights (pure function, no network calls)
        const insights = computeAlwaysOnSummary(reflectionEntries);

        if (!cancelled) {
          setSummaryInsights(insights);
        }
      } catch (err: any) {
        if (err?.message === 'PENDING_SIG') return;
        if (!cancelled) {
          console.error('Failed to load reflections for summary analysis', err);
          setSummaryReflectionsError(err.message ?? 'Failed to analyze reflections');
        }
      } finally {
        if (!cancelled) {
          setSummaryReflectionsLoading(false);
        }
      }
    }

    loadReflectionsAndComputeSummaryInsights();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, connected, address, consentSig]);

  // Load decrypted reflections and compute spikes when Timeline mode is active
  useEffect(() => {
    if (mode !== 'timeline') return;
    if (!connected || !address) return;

    let cancelled = false;

    async function loadReflectionsAndComputeSpikes() {
      try {
        setReflectionsLoading(true);
        setReflectionsError(null);
        setSpikeInsights([]);

        // Get session key for decryption
        const sessionKey = await getSessionKey();

        // Fetch all reflections (up to 500 for analysis)
        const { items } = await rpcFetchEntries(address!, sessionKey, {
          includeDeleted: false,
          limit: 500,
          offset: 0,
        });

        if (cancelled) return;

        // Convert to ReflectionEntry format
        const reflectionEntries = items.map(itemToReflectionEntry);

        // Compute spikes (pure function, no network calls)
        const spikes = computeTimelineSpikes(reflectionEntries);

        if (!cancelled) {
          setSpikeInsights(spikes);
        }
      } catch (err: any) {
        if (err?.message === 'PENDING_SIG') return;
        if (!cancelled) {
          console.error('Failed to load reflections for spike analysis', err);
          setReflectionsError(err.message ?? 'Failed to analyze reflections');
        }
      } finally {
        if (!cancelled) {
          setReflectionsLoading(false);
        }
      }
    }

    loadReflectionsAndComputeSpikes();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, connected, address, consentSig]);

  if (!mounted) return null;

  // Derive latest insight if available
  const latest = insights.length > 0 ? insights[0] : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur px-4 py-2 flex items-center justify-between">
        <span className="font-semibold">Story of Emergence</span>
        <ConnectButton />
      </header>

      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Insights</h1>
        <p className="text-center text-sm text-white/60 mb-6">
          Different ways to view your encrypted activity.
        </p>

        {/* Mode switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl border border-white/10 p-1 bg-white/5">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  mode === opt.value
                    ? 'bg-white text-black font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline view */}
        {mode === 'timeline' && (
          <div className="mt-8 space-y-8">
            {/* Not connected state */}
            {!connected && (
              <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
                <h2 className="text-lg font-medium">Connect your wallet</h2>
                <p className="text-sm text-white/60">
                  Connect your wallet to view your activity timeline.
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            )}

            {/* Timeline Spikes Section */}
            {connected && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                  Timeline Spikes
                </h2>

                {reflectionsLoading && (
                  <div className="rounded-2xl border border-white/10 p-6 animate-pulse space-y-3">
                    <div className="h-5 bg-white/10 rounded w-1/2" />
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/3" />
                  </div>
                )}

                {!reflectionsLoading && reflectionsError && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                    <p className="text-sm text-rose-400">{reflectionsError}</p>
                  </div>
                )}

                {!reflectionsLoading && !reflectionsError && spikeInsights.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="text-sm text-white/60">
                      No writing spikes detected yet. Keep adding reflections — when you have days with unusually high activity, they&apos;ll show up here.
                    </p>
                    <p className="text-xs text-white/40 mt-2">
                      Spikes are detected when a day has at least 3 entries and 2× your typical daily activity.
                    </p>
                  </div>
                )}

                {!reflectionsLoading && !reflectionsError && spikeInsights.length > 0 && (
                  <div className="space-y-4">
                    {spikeInsights.map((spike) => {
                      const dateKey = spike.data.date;
                      const expanded = isExpanded(dateKey);
                      const visibleCount = expanded ? spike.evidence.length : 5;
                      const visibleEntries = spike.evidence.slice(0, visibleCount);
                      const hiddenCount = spike.evidence.length - 5;
                      const hasMore = spike.evidence.length > 5;

                      const highlighted = isHighlighted(spike);

                      return (
                        <div
                          key={spike.id}
                          className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3"
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-amber-200">{spike.title}</h3>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleHighlight(spike)}
                                className="p-1 rounded-full transition-colors hover:bg-white/10"
                                title={highlighted ? 'Remove from highlights' : 'Add to highlights'}
                              >
                                {highlighted ? (
                                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-white/40 hover:text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                                  </svg>
                                )}
                              </button>
                              <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                                {spike.data.count} entries
                              </span>
                            </div>
                          </div>

                          {/* Explanation */}
                          <p className="text-sm text-white/70">{spike.explanation}</p>

                          {/* Evidence list */}
                          {spike.evidence.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-white/50 uppercase tracking-wide">
                                Entries on this day
                              </p>
                              <ul className="space-y-1.5">
                                {visibleEntries.map((ev) => (
                                  <li
                                    key={ev.entryId}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="text-white/40 min-w-[60px]">
                                      {new Date(ev.timestamp).toLocaleTimeString(undefined, {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span className="text-white/60 truncate">
                                      {ev.preview || '(no preview)'}
                                    </span>
                                  </li>
                                ))}
                                {hasMore && (
                                  <li className="pl-[68px]">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpanded(dateKey)}
                                      className="text-xs text-amber-300/70 hover:text-amber-200 transition-colors"
                                    >
                                      {expanded ? 'Show fewer' : `+${hiddenCount} more`}
                                    </button>
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Activity Timeline Section */}
            {connected && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Activity Timeline
                </h2>

                {timelineLoading && (
                  <p className="text-sm text-white/60">Loading timeline…</p>
                )}

                {!timelineLoading && timelineError && (
                  <p className="text-sm text-rose-400">
                    Failed to load timeline: {timelineError}
                  </p>
                )}

                {!timelineLoading && !timelineError && timelineEvents.length === 0 && (
                  <p className="text-sm text-white/60">
                    No internal events recorded yet. As you write reflections and
                    connect sources, your activity will appear here in time order.
                  </p>
                )}

                {!timelineLoading && !timelineError && timelineEvents.length > 0 && (() => {
                // Group events by calendar day
                const groupedByDay = timelineEvents.reduce((acc, ev) => {
                  const d = new Date(ev.eventAt);
                  const dateKey = d.toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  if (!acc[dateKey]) acc[dateKey] = [];
                  acc[dateKey].push(ev);
                  return acc;
                }, {} as Record<string, typeof timelineEvents>);

                return (
                  <div className="space-y-6">
                    {Object.entries(groupedByDay).map(([dateLabel, events]) => (
                      <div key={dateLabel}>
                        {/* Date header */}
                        <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3 px-1">
                          {dateLabel}
                        </h3>

                        {/* Events for this day */}
                        <ul className="space-y-3">
                          {events.map((ev) => {
                            const d = new Date(ev.eventAt);
                            const timeLabel = d.toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                            });
                            const isUnknown = ev.eventType === 'unknown';

                            // Badge color based on event type
                            const badgeClass = isUnknown
                              ? 'bg-zinc-700/50 text-zinc-400'
                              : 'bg-white/10 text-white';

                            return (
                              <li
                                key={ev.id}
                                className="group rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4 flex items-center gap-4 shadow-md shadow-black/30 transition-all duration-200 hover:bg-white/[0.04] hover:border-white/15 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
                              >
                                {/* Icon on left */}
                                <EventIcon eventType={ev.eventType} />

                                {/* Time - bold */}
                                <span className="text-sm font-semibold text-white min-w-[70px]">
                                  {timeLabel}
                                </span>

                                {/* Event type badge */}
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                                >
                                  {ev.eventType}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                );
              })()}
              </div>
            )}
          </div>
        )}

        {/* Summary view */}
        {mode === 'summary' && (
          <div className="mt-8 space-y-6">
            {/* Not connected state */}
            {!connected && (
              <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
                <h2 className="text-lg font-medium">Connect your wallet</h2>
                <p className="text-sm text-white/60">
                  Connect your wallet to view your summary statistics.
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            )}

            {/* Loading state */}
            {connected && summaryLoading && (
              <div className="rounded-2xl border border-white/10 p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-white/5 rounded-xl" />
                  <div className="h-24 bg-white/5 rounded-xl" />
                </div>
              </div>
            )}

            {/* Error state */}
            {connected && !summaryLoading && summaryError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
                <p className="text-sm text-rose-400">{summaryError}</p>
              </div>
            )}

            {/* Summary data */}
            {connected && !summaryLoading && !summaryError && summaryData && (
              <>
                <div className="rounded-2xl border border-white/10 p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-zinc-50">
                    Your Activity Summary
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-3xl font-semibold">{summaryData.streak}</div>
                      <div className="text-xs text-white/50 mt-1">Day streak</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-3xl font-semibold">{summaryData.entries}</div>
                      <div className="text-xs text-white/50 mt-1">Total reflections</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-3xl font-semibold">{summaryData.totalEvents}</div>
                      <div className="text-xs text-white/50 mt-1">Total events</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-sm font-medium">
                        {summaryData.lastActiveAt
                          ? new Date(summaryData.lastActiveAt).toLocaleDateString()
                          : '—'}
                      </div>
                      <div className="text-xs text-white/50 mt-1">Last active</div>
                    </div>
                  </div>
                </div>

                {/* Always On Summary Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                    </svg>
                    Always On Summary
                  </h2>

                  {summaryReflectionsLoading && (
                    <div className="rounded-2xl border border-white/10 p-6 animate-pulse space-y-3">
                      <div className="h-5 bg-white/10 rounded w-1/2" />
                      <div className="h-4 bg-white/5 rounded w-3/4" />
                    </div>
                  )}

                  {!summaryReflectionsLoading && summaryReflectionsError && (
                    <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <p className="text-sm text-rose-400">{summaryReflectionsError}</p>
                    </div>
                  )}

                  {!summaryReflectionsLoading && !summaryReflectionsError && summaryInsights.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                      <p className="text-sm text-white/60">
                        No summary insights yet. Keep writing reflections — once you have at least a week of activity, insights will appear here.
                      </p>
                    </div>
                  )}

                  {!summaryReflectionsLoading && !summaryReflectionsError && summaryInsights.length > 0 && (
                    <div className="space-y-4">
                      {summaryInsights.map((insight) => {
                        const highlighted = isHighlighted(insight);
                        return (
                          <div
                            key={insight.id}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3"
                          >
                            {/* Card header */}
                            <div className="flex items-start justify-between">
                              <h3 className="font-medium text-emerald-200">{insight.title}</h3>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleHighlight(insight)}
                                  className="p-1 rounded-full transition-colors hover:bg-white/10"
                                  title={highlighted ? 'Remove from highlights' : 'Add to highlights'}
                                >
                                  {highlighted ? (
                                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-5 h-5 text-white/40 hover:text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                                    </svg>
                                  )}
                                </button>
                                <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
                                  {insight.data.summaryType === 'writing_change' ? 'Trend' : 'Consistency'}
                                </span>
                              </div>
                            </div>

                          {/* Explanation */}
                          <p className="text-sm text-white/70">{insight.explanation}</p>

                          {/* Evidence (optional, compact display) */}
                          {insight.evidence.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {insight.evidence.slice(0, 4).map((ev) => (
                                <span
                                  key={ev.entryId}
                                  className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded"
                                >
                                  {new Date(ev.timestamp).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              ))}
                              {insight.evidence.length > 4 && (
                                <span className="text-xs text-white/40">
                                  +{insight.evidence.length - 4} more
                                </span>
                              )}
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Highlights Section */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Highlights
                  </h2>

                  {highlights.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                      <p className="text-sm text-white/60">
                        Tap the star on any insight to save it here.
                      </p>
                    </div>
                  )}

                  {highlights.length > 0 && (
                    <div className="space-y-3">
                      {highlights.map((highlight) => (
                        <div
                          key={highlight.id}
                          className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2"
                        >
                          <div className="flex items-start justify-between">
                            <h3 className="font-medium text-yellow-200 text-sm">{highlight.title}</h3>
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                              {highlight.kind === 'timeline_spike' ? 'Spike' : 'Summary'}
                            </span>
                          </div>
                          <p className="text-xs text-white/60">{highlight.explanation}</p>
                          <p className="text-xs text-white/30">
                            Saved {new Date(highlight.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Coming soon</p>
                  <ul className="text-sm text-zinc-300 space-y-1">
                    <li>• Activity heatmap by day of week</li>
                    <li>• Source engagement breakdown</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {/* Weekly view (existing content) */}
        {mode === 'weekly' && (
          <>
            {/* Not connected state */}
            {!connected && (
              <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
                <h2 className="text-lg font-medium">Connect your wallet</h2>
                <p className="text-sm text-white/60">
                  Connect the same wallet you use on the Reflections tab to view your weekly insights.
                </p>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            )}

            {/* Loading state */}
            {connected && loading && (
              <div className="rounded-2xl border border-white/10 p-6 space-y-4 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-1/3 mx-auto" />
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-20 bg-white/5 rounded-xl" />
                  <div className="h-20 bg-white/5 rounded-xl" />
                  <div className="h-20 bg-white/5 rounded-xl" />
                </div>
                <div className="h-4 bg-white/5 rounded w-2/3 mx-auto" />
                <div className="h-4 bg-white/5 rounded w-1/2 mx-auto" />
              </div>
            )}

            {/* Empty state */}
            {connected && !loading && insights.length === 0 && (
              <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
                <h2 className="text-lg font-medium">No internal events yet</h2>
                <p className="text-sm text-white/60">
                  Save at least one reflection on the Reflections tab. We log those events here and build weekly snapshots from them.
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="text-sm text-white/80 underline underline-offset-2 hover:text-white"
                >
                  Go to Reflections
                </button>
              </div>
            )}

            {/* Main insight card */}
            {connected && !loading && latest && (
              <>
                <div className="rounded-2xl border border-white/10 p-6 mb-8 space-y-4">
                  <h2 className="text-lg font-medium">
                    Week of {formatWeekDate(latest.startDate)}
                  </h2>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-2xl font-semibold">{latest.totalEvents}</div>
                      <div className="text-xs text-white/50 mt-1">Total events</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-2xl font-semibold">{latest.journalEvents}</div>
                      <div className="text-xs text-white/50 mt-1">Journal entries</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-2xl font-semibold">{latest.avgJournalLength.toFixed(0)}</div>
                      <div className="text-xs text-white/50 mt-1">Avg length (chars)</div>
                    </div>
                  </div>

                  {latest.topGuessedTopics.length > 0 && (
                    <div>
                      <div className="text-xs text-white/50 mb-2">Topics</div>
                      <div className="flex flex-wrap gap-2">
                        {latest.topGuessedTopics.map((topic) => (
                          <span
                            key={topic}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {latest.summaryText && (
                    <div>
                      <div className="text-xs text-white/50 mb-2">Summary</div>
                      <p className="text-sm text-white/70 leading-relaxed">
                        {latest.summaryText}
                      </p>
                    </div>
                  )}
                </div>

                {/* Previous weeks */}
                {insights.length > 1 && (
                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-3">Previous weeks</h3>
                    <div className="space-y-2">
                      {insights.slice(1).map((week) => (
                        <div
                          key={week.weekId}
                          className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                        >
                          <span className="text-sm">Week of {formatWeekDate(week.startDate)}</span>
                          <span className="text-sm text-white/50">
                            {week.totalEvents} event{week.totalEvents === 1 ? '' : 's'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

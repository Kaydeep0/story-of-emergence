'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { rpcListInternalEvents } from '../lib/internalEvents';
import { computeWeeklyInsights, WeeklyInsight } from '../lib/weeklyInsights';
import { keyFromSignatureHex } from '../../lib/crypto';

function humanizeSignError(e: any) {
  if (e?.code === 4001) return 'Signature request was rejected.';
  if (e?.code === -32002) return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return e?.shortMessage || e?.message || 'Unexpected signing error.';
}

function formatWeekDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type InsightsMode = 'weekly' | 'timeline' | 'summary';

type TimelineEvent = {
  id: string;
  ts: string;
  // these are optional because we do not want TS to complain
  kind?: string | null;
  source?: string | null;
  note_count?: number | null;
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
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
    const s = sessionStorage.getItem('soe-consent-sig');
    if (s) setConsentSig(s);
  }, []);

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

    let cancelled = false;

    async function loadTimeline() {
      try {
        setTimelineLoading(true);
        setTimelineError(null);

        const res = await fetch('/api/timeline');
        if (!res.ok) {
          throw new Error('Failed to load timeline');
        }

        const json = await res.json();

        if (!cancelled) {
          // Defensive cast because we do not know the exact RPC row type
          setTimelineEvents((json.events ?? []) as TimelineEvent[]);
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
  }, [mode]);

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
          <div className="mt-8">
            {timelineLoading && (
              <p className="text-sm text-white/60">Loading timeline…</p>
            )}

            {!timelineLoading && timelineError && (
              <p className="text-sm text-rose-400">
                {timelineError}
              </p>
            )}

            {!timelineLoading &&
              !timelineError &&
              timelineEvents.length === 0 && (
                <p className="text-sm text-white/60">
                  No internal events recorded yet. As you write reflections and
                  connect sources, your activity will appear here in time order.
                </p>
              )}

            {!timelineLoading &&
              !timelineError &&
              timelineEvents.length > 0 && (
                <ul className="space-y-4">
                  {timelineEvents
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(b.ts).getTime() - new Date(a.ts).getTime(),
                    )
                    .map((ev) => {
                      const d = new Date(ev.ts);
                      const dateLabel = d.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      });
                      const timeLabel = d.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      });

                      return (
                        <li
                          key={ev.id}
                          className="rounded-2xl border border-white/10 px-4 py-3"
                        >
                          <p className="text-xs text-white/50">
                            {dateLabel} · {timeLabel}
                          </p>
                          <p className="mt-1 text-sm text-white">
                            {ev.kind || 'activity'}
                            {ev.source ? ` · ${ev.source}` : ''}
                          </p>
                        </li>
                      );
                    })}
                </ul>
              )}
          </div>
        )}

        {/* Summary placeholder */}
        {mode === 'summary' && (
          <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
            <div className="text-4xl opacity-40">✨</div>
            <h2 className="text-lg font-medium">Always-on summary is coming soon</h2>
            <p className="text-sm text-white/60 max-w-md mx-auto">
              This view will give you periodic summaries of your recent reflections, highlighting patterns and themes in your activity.
            </p>
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

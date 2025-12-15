'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeYearlyWrap, getAvailableYears, type YearlyWrap } from '../../lib/insights/yearlyWrap';
import type { ReflectionEntry } from '../../lib/insights/types';
import { listExternalEntries } from '../../lib/useSources';

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [sources, setSources] = useState<Array<{ id: string; sourceId: string; title: string }>>([]);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_insights');
  }, [mounted, connected, logEvent]);

  // Load external sources for source titles
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    let cancelled = false;

    async function loadSources() {
      try {
        const data = await listExternalEntries(address);
        if (cancelled) return;
        setSources(
          (data as any[]).map((s) => ({
            id: s.id,
            sourceId: s.sourceId ?? s.source_id ?? '',
            title: s.title ?? 'Untitled Source',
          }))
        );
      } catch {
        if (!cancelled) {
          setSources([]);
        }
      }
    }

    loadSources();
    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address]);

  // Load reflections
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    if (!encryptionReady || !sessionKey) return;

    let cancelled = false;

    async function loadReflections() {
      try {
        setLoading(true);
        setError(null);

        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 1000, // Load more for yearly analysis
          offset: 0,
        });

        if (cancelled) return;

        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        setReflections(reflectionEntries);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load reflections', err);
          setError(err.message ?? 'Failed to load reflections');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReflections();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Get available years and set default to current year or most recent
  const availableYears = useMemo(() => {
    const years = getAvailableYears(reflections);
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]); // Set to most recent year if current selection not available
    }
    return years;
  }, [reflections, selectedYear]);

  // Compute yearly wrap for selected year
  const yearlyWrap = useMemo<YearlyWrap | null>(() => {
    if (reflections.length === 0) return null;
    return computeYearlyWrap(reflections, selectedYear);
  }, [reflections, selectedYear]);

  // Get source title by sourceId
  const getSourceTitle = (sourceId: string): string => {
    const source = sources.find((s) => s.sourceId === sourceId);
    return source?.title || sourceId;
  };

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view your yearly wrap.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!encryptionReady) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
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
        <h1 className="text-2xl font-semibold text-center mb-6">Yearly Wrap</h1>

        {/* Year Selector */}
        <div className="mb-6">
          <label htmlFor="year-select" className="block text-sm text-white/60 mb-2">
            Select Year
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            {availableYears.length === 0 ? (
              <option value={new Date().getFullYear()}>No data available</option>
            ) : (
              availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">Loading reflections…</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && (!yearlyWrap || yearlyWrap.entryCount === 0) && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">No reflections found for {selectedYear}.</p>
          </div>
        )}

        {/* Yearly Wrap Content */}
        {!loading && !error && yearlyWrap && yearlyWrap.entryCount > 0 && (
          <div className="space-y-6">
            {/* Headline */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{yearlyWrap.year}</h2>
                  <p className="text-white/80 text-lg">{yearlyWrap.headline}</p>
                </div>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
                  Pattern: {yearlyWrap.distributionLabel}
                </span>
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-white">{yearlyWrap.entryCount}</div>
                  <div className="text-sm text-white/60">Entries</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{yearlyWrap.activeDays}</div>
                  <div className="text-sm text-white/60">Active Days</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{yearlyWrap.avgLengthChars}</div>
                  <div className="text-sm text-white/60">Avg Length</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {yearlyWrap.dominantThemes.length > 0 ? yearlyWrap.dominantThemes.length : 0}
                  </div>
                  <div className="text-sm text-white/60">Themes</div>
                </div>
              </div>
            </div>

            {/* Dominant Themes Section */}
            {yearlyWrap.dominantThemes.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold mb-3">Dominant Themes</h2>
                <div className="flex flex-wrap gap-2">
                  {yearlyWrap.dominantThemes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/90"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Rising Topics Section */}
            {yearlyWrap.risingTopics.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
                <h2 className="text-lg font-semibold mb-3 text-emerald-200">Rising Topics</h2>
                <div className="flex flex-wrap gap-2">
                  {yearlyWrap.risingTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Fading Topics Section */}
            {yearlyWrap.fadingTopics.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                <h2 className="text-lg font-semibold mb-3 text-amber-200">Fading Topics</h2>
                <div className="flex flex-wrap gap-2">
                  {yearlyWrap.fadingTopics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-200"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Key Moments Section */}
            {yearlyWrap.keyMoments.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold mb-3">Key Moments</h2>
                <div className="space-y-3">
                  {yearlyWrap.keyMoments.map((moment, index) => (
                    <div key={index} className="border-l-2 border-white/20 pl-4">
                      <div className="text-sm text-white/60 mb-1">
                        {new Date(moment.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                      <p className="text-white/80">{moment.summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Sources Section */}
            {yearlyWrap.topSources.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold mb-3">Top Sources</h2>
                <div className="space-y-2">
                  {yearlyWrap.topSources.map((source) => (
                    <div key={source.sourceId} className="flex items-center justify-between">
                      <span className="text-white/90">{getSourceTitle(source.sourceId)}</span>
                      <span className="text-sm text-white/60">{source.count} reference{source.count === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}


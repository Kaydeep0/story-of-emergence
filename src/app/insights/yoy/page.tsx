// src/app/insights/yoy/page.tsx
// Year-over-Year lens - Compare two moments in time
// Task E: Wire Year over Year into the real Insights navigation

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeYearOverYearCard } from '../../lib/insights/computeYearOverYear';
import type { ReflectionEntry } from '../../lib/insights/types';
import type { YearOverYearCard } from '../../lib/insights/computeYearOverYear';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';
import { InsightCardSkeleton } from '../components/InsightsSkeleton';
import { ShareActionsBar } from '../components/ShareActionsBar';
import { InsightDrawer, normalizeInsight } from '../components/InsightDrawer';
import { YearSelector } from '../components/YearSelector';

/**
 * Group reflections by year
 */
function groupByYear(reflections: ReflectionEntry[]): Map<number, ReflectionEntry[]> {
  const grouped = new Map<number, ReflectionEntry[]>();
  
  for (const reflection of reflections) {
    const date = new Date(reflection.createdAt);
    const year = date.getFullYear();
    
    if (!grouped.has(year)) {
      grouped.set(year, []);
    }
    grouped.get(year)!.push(reflection);
  }
  
  return grouped;
}

export default function YearOverYearPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const [mounted, setMounted] = useState(false);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year1, setYear1] = useState<number | null>(null);
  const [year2, setYear2] = useState<number | null>(null);
  const [yoyCard, setYoyCard] = useState<YearOverYearCard | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load reflections
  useEffect(() => {
    if (!mounted || !isConnected || !address || !encryptionReady || !sessionKey) {
      setReflections([]);
      return;
    }

    let cancelled = false;

    async function loadReflections() {
      try {
        setLoading(true);
        setError(null);
        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 1000,
          offset: 0,
        });

        if (cancelled) return;

        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        setReflections(reflectionEntries);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load reflections:', err);
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
  }, [mounted, isConnected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Get available years
  const availableYears = useMemo(() => {
    const grouped = groupByYear(reflections);
    return Array.from(grouped.keys()).sort((a, b) => b - a);
  }, [reflections]);

  // Set default years (most recent two)
  useEffect(() => {
    if (availableYears.length >= 2 && year1 === null && year2 === null) {
      setYear1(availableYears[0]);
      setYear2(availableYears[1]);
    } else if (availableYears.length >= 1 && year1 === null) {
      setYear1(availableYears[0]);
    }
  }, [availableYears, year1, year2]);

  // Compute year-over-year card
  useEffect(() => {
    if (reflections.length === 0 || year1 === null || year2 === null) {
      setYoyCard(null);
      return;
    }

    try {
      const year1Reflections = reflections.filter(r => {
        const year = new Date(r.createdAt).getFullYear();
        return year === year1;
      });
      const year2Reflections = reflections.filter(r => {
        const year = new Date(r.createdAt).getFullYear();
        return year === year2;
      });

      if (year1Reflections.length === 0 || year2Reflections.length === 0) {
        setYoyCard(null);
        return;
      }

      const card = computeYearOverYearCard(reflections, { fromYear: year1, toYear: year2 });
      setYoyCard(card);
    } catch (err) {
      console.error('Failed to compute year-over-year insights:', err);
      setYoyCard(null);
    }
  }, [reflections, year1, year2]);

  if (!mounted) return null;

  const lens = LENSES.yoy;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        {loading && (
          <div className="space-y-4">
            <InsightCardSkeleton />
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-rose-400">{error}</p>
          </div>
        )}

        {!loading && !error && reflections.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              No reflections yet. Start writing reflections to see year-over-year comparisons.
            </p>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && availableYears.length < 2 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/60">
              Need at least 2 years of reflections to compare. You currently have {availableYears.length} year{availableYears.length !== 1 ? 's' : ''} of data.
            </p>
          </div>
        )}

        {!loading && !error && reflections.length > 0 && availableYears.length >= 2 && (
          <div className="space-y-6">
            {/* Year Selectors */}
            <div className="flex items-center gap-4 justify-center">
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">Year 1</label>
                <select
                  value={year1 ?? ''}
                  onChange={(e) => setYear1(Number(e.target.value))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="pt-6 text-white/40">vs</div>
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/60">Year 2</label>
                <select
                  value={year2 ?? ''}
                  onChange={(e) => setYear2(Number(e.target.value))}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Year-over-Year Card */}
            {yoyCard ? (
              <div className="space-y-4">
                <div
                  className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    const normalized = normalizeInsight(yoyCard);
                    setSelectedInsight(normalized);
                    setDrawerOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-emerald-200">{yoyCard.title}</h3>
                    </div>
                  </div>

                  <p className="text-sm text-white/70">{yoyCard.explanation}</p>

                  {yoyCard.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {yoyCard.evidence.slice(0, 4).map((ev) => (
                        <span
                          key={ev.entryId}
                          className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded"
                        >
                          {new Date(ev.timestamp).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      ))}
                      {yoyCard.evidence.length > 4 && (
                        <span className="text-xs text-white/40">
                          +{yoyCard.evidence.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Share Actions */}
                <ShareActionsBar
                  artifact={null}
                  senderWallet={address}
                  encryptionReady={encryptionReady}
                />
              </div>
            ) : year1 !== null && year2 !== null ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-sm text-white/60">
                  Computing comparison between {year1} and {year2}...
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Insight Detail Drawer */}
        <InsightDrawer
          insight={selectedInsight}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedInsight(null);
          }}
          originalCard={yoyCard ?? undefined}
          reflectionEntries={reflections}
        />
      </section>
    </div>
  );
}


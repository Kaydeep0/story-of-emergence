'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../lib/insights/distributionLayer';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import { useHighlights } from '../../lib/insights/useHighlights';
import { rpcInsertEntry } from '../../lib/entries';
import { toast } from 'sonner';
import { YearlyWrapShareCard } from '../../components/share/YearlyWrapShareCard';
import { exportPng } from '../../lib/share/exportPng';
import { extractKeywords, computeWordShift, getMoments, MeaningCard, Glossary } from './components/YearlyMeaning';

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);
  const { isHighlighted, toggleHighlight } = useHighlights();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<Date | null>(null);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_insights');
  }, [mounted, connected, logEvent]);

  // Load reflections (same pattern as Distributions page)
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    if (!encryptionReady || !sessionKey) return;

    let cancelled = false;

    async function loadReflections() {
      if (!address || !sessionKey) {
        setReflections([]);
        return;
      }
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

  // Compute yearly distribution (365 days)
  useEffect(() => {
    if (reflections.length === 0) {
      setDistributionResult(null);
      setWindowDistribution(null);
      return;
    }

    // Compute distribution for 365 days
    const result = computeDistributionLayer(reflections, { windowDays: 365 });
    setDistributionResult(result);
    
    // Also get window distribution for classification
    const windowDist = computeWindowDistribution(reflections, 365);
    setWindowDistribution(windowDist);
  }, [reflections]);

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format classification label
  const formatClassification = (classification: string): string => {
    if (classification === 'lognormal') return 'Log Normal';
    if (classification === 'powerlaw') return 'Power Law';
    return 'Normal';
  };

  // Compute narrative insight
  const narrativeInsight = useMemo<InsightCard | null>(() => {
    if (!distributionResult || !windowDistribution || distributionResult.totalEntries === 0) {
      return null;
    }

    const activeDays = computeActiveDays(distributionResult.dailyCounts);
    const topSpikeDates = getTopSpikeDates(distributionResult, 3);
    const topDay = distributionResult.topDays[0];
    const biggestSpikeDay = topDay ? formatDate(topDay.date) : null;
    const top10PercentShare = distributionResult.stats.top10PercentDaysShare;

    const classification = windowDistribution.classification;
    const classificationLabel = formatClassification(classification);

    // Build narrative
    const title = `Your year followed a ${classificationLabel.toLowerCase()} pattern`;
    
    let body = `You wrote ${distributionResult.totalEntries} reflections across ${activeDays} active days. `;
    
    if (top10PercentShare > 0.5) {
      body += `Your most intense days account for ${Math.round(top10PercentShare * 100)}% of your total output. `;
    } else {
      body += `Your writing was spread across ${activeDays} days. `;
    }
    
    if (biggestSpikeDay) {
      body += `Your biggest day was ${biggestSpikeDay} with ${topDay.count} entries.`;
    }

    return {
      id: `yearly-wrap-${Date.now()}`,
      kind: 'distribution',
      title,
      explanation: body,
      evidence: topSpikeDates.slice(0, 3).map((date, idx) => {
        const dayData = distributionResult.topDays.find(d => d.date === date);
        return {
          entryId: `spike-${idx}`,
          timestamp: new Date(date).toISOString(),
          preview: `${dayData?.count || 0} entries on ${formatDate(date)}`,
        };
      }),
      computedAt: new Date().toISOString(),
    };
  }, [distributionResult, windowDistribution]);

  // Compute Mirror insights (keywords, word shift, moments)
  const mirrorInsights = useMemo(() => {
    if (reflections.length === 0 || !distributionResult) {
      return null;
    }

    const keywords = extractKeywords(reflections, 14);
    const wordShift = computeWordShift(reflections);
    const topSpikeDates = getTopSpikeDates(distributionResult, 3);
    const moments = getMoments(reflections, topSpikeDates);

    return {
      keywords,
      wordShift,
      moments,
    };
  }, [reflections, distributionResult]);

  // Compute most common day count
  const mostCommonDayCount = useMemo(() => {
    if (!distributionResult || distributionResult.dailyCounts.length === 0) {
      return null;
    }

    const counts = distributionResult.dailyCounts.filter(c => c > 0);
    if (counts.length === 0) return null;

    const frequency = new Map<number, number>();
    counts.forEach(count => {
      frequency.set(count, (frequency.get(count) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])[0][0];
  }, [distributionResult]);

  // Handle downloading PNG
  const handleDownloadPng = async () => {
    const exportCard = document.getElementById('yearly-wrap-export-card');
    if (!exportCard) {
      toast.error('Share card not ready');
      return;
    }

    try {
      setIsGenerating(true);
      await exportPng(exportCard as HTMLElement);
      setLastGeneratedAt(new Date());
      toast.success('Share card downloaded');
    } catch (err: any) {
      console.error('Failed to export PNG:', err);
      toast.error(err?.message ?? 'Failed to export PNG');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle copying caption
  const handleCopyCaption = async () => {
    if (!distributionResult || !windowDistribution) {
      toast.error('No data available');
      return;
    }

    const activeDays = computeActiveDays(distributionResult.dailyCounts);
    const classificationLabel = formatClassification(windowDistribution.classification);
    
    const caption = `My year followed a ${classificationLabel.toLowerCase()} pattern. ${distributionResult.totalEntries} entries across ${activeDays} active days. Computed locally in Story of Emergence.`;

    try {
      await navigator.clipboard.writeText(caption);
      toast.success('Caption copied to clipboard');
    } catch (err: any) {
      console.error('Failed to copy caption:', err);
      toast.error('Failed to copy caption');
    }
  };

  // Handle saving highlight
  const handleSaveHighlight = async () => {
    if (!connected || !address) {
      toast.error('Connect wallet to save');
      return;
    }

    if (!encryptionReady || !sessionKey) {
      toast.error('Unlock vault to save');
      return;
    }

    if (!narrativeInsight || !distributionResult || !windowDistribution) {
      toast.error('No insight to save');
      return;
    }

    try {
      const topSpikeDates = getTopSpikeDates(distributionResult, 3);
      const activeDays = computeActiveDays(distributionResult.dailyCounts);

      const highlightPayload = {
        type: 'highlight',
        subtype: 'yearly_wrap',
        title: narrativeInsight.title,
        body: narrativeInsight.explanation,
        evidence: narrativeInsight.evidence.map(ev => ({
          entryId: ev.entryId,
          timestamp: ev.timestamp,
          preview: ev.preview,
        })),
        metadata: {
          insightId: narrativeInsight.id,
          kind: narrativeInsight.kind,
          computedAt: narrativeInsight.computedAt,
          windowDays: 365,
          classification: windowDistribution.classification,
          totalEntries: distributionResult.totalEntries,
          activeDays,
          topDays: distributionResult.topDays.slice(0, 10),
          spikeDates: topSpikeDates,
          mostCommonDayCount: distributionResult.stats.mostCommonDayCount,
          variance: distributionResult.stats.variance,
          spikeRatio: distributionResult.stats.spikeRatio,
          top10PercentDaysShare: distributionResult.stats.top10PercentDaysShare,
          narrative: narrativeInsight.explanation,
        },
        ts: Date.now(),
      };

      await rpcInsertEntry(address, sessionKey, highlightPayload);
      toggleHighlight(narrativeInsight);
      toast.success('Saved to Highlights');
    } catch (err: any) {
      console.error('Failed to save highlight', err);
      toast.error(err?.message ?? 'Failed to save highlight');
    }
  };

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <main className="min-h-screen bg-black text-white">
        <section className="max-w-4xl mx-auto px-4 py-10">
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
        <section className="max-w-4xl mx-auto px-4 py-10">
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
      <section className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-6">Yearly Wrap</h1>

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
        {!loading && !error && (!distributionResult || distributionResult.totalEntries === 0) && (
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70">No reflections found in the last 365 days. Start writing to see your yearly wrap.</p>
          </div>
        )}

        {/* Yearly Wrap Content */}
        {!loading && !error && distributionResult && distributionResult.totalEntries > 0 && (
          <div className="space-y-6">
            {/* Share this year section */}
            {windowDistribution && (() => {
              const activeDays = computeActiveDays(distributionResult.dailyCounts);
              const classificationLabel = formatClassification(windowDistribution.classification);
              const caption = `My year followed a ${classificationLabel.toLowerCase()} pattern. ${distributionResult.totalEntries} entries across ${activeDays} active days. Computed locally in Story of Emergence.`;
              
              return (
                <div className="w-full">
                  {/* Hidden full-size card for export - fixed 1080x1350 */}
                  <div 
                    style={{ 
                      position: 'absolute', 
                      left: '-9999px', 
                      top: 0,
                      visibility: 'hidden',
                    }}
                  >
                    <YearlyWrapShareCard
                      id="yearly-wrap-export-card"
                      mode="export"
                      year={new Date().getFullYear()}
                      classificationLabel={classificationLabel}
                      totalEntries={distributionResult.totalEntries}
                      activeDays={activeDays}
                      spikeRatio={distributionResult.stats.spikeRatio}
                      top10PercentShare={distributionResult.stats.top10PercentDaysShare}
                    />
                  </div>

                  {/* Two-column layout: preview left, controls right */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left column: Preview card */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
                      <YearlyWrapShareCard
                        mode="preview"
                        year={new Date().getFullYear()}
                        classificationLabel={classificationLabel}
                        totalEntries={distributionResult.totalEntries}
                        activeDays={activeDays}
                        spikeRatio={distributionResult.stats.spikeRatio}
                        top10PercentShare={distributionResult.stats.top10PercentDaysShare}
                      />
                    </div>

                    {/* Right column: Controls and caption */}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold">Share this year</h3>
                        <p className="mt-2 text-sm text-white/60">
                          Export a card you can post anywhere.
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={handleDownloadPng}
                            disabled={isGenerating}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {isGenerating ? 'Generating...' : 'Download PNG'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyCaption}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm"
                          >
                            Copy Caption
                          </button>
                        </div>

                        <div className="mt-4">
                          <label className="text-xs text-white/60">Caption</label>
                          <textarea
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 resize-none"
                            rows={6}
                            value={caption}
                            readOnly
                          />
                        </div>
                      </div>

                      {/* Your year, interpreted */}
                      {windowDistribution && (
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Your year, interpreted</h3>
                          <div className="space-y-3">
                            <MeaningCard
                              title={formatClassification(windowDistribution.classification) + ' rhythm'}
                              explanation={`Your writing follows a ${formatClassification(windowDistribution.classification).toLowerCase()} pattern.`}
                              rhythmNote={windowDistribution.classification === 'lognormal' 
                                ? 'This suggests steady baseline days with occasional intense bursts—common in creative work.'
                                : windowDistribution.classification === 'powerlaw'
                                ? 'This suggests a few massive days drive most of your output—highly concentrated energy.'
                                : 'This suggests consistent daily volume with moderate variation.'}
                              metricChip={formatClassification(windowDistribution.classification)}
                            />
                            <MeaningCard
                              title="Variance"
                              explanation={`Your days vary by ${distributionResult.stats.variance.toFixed(1)} entries on average.`}
                              rhythmNote={distributionResult.stats.variance > 5 
                                ? 'High variance means quiet stretches followed by big bursts.'
                                : 'Low variance means you maintain a steady daily rhythm.'}
                              metricChip={`${distributionResult.stats.variance.toFixed(1)}`}
                            />
                            <MeaningCard
                              title="Spike ratio"
                              explanation={`Your biggest day was ${distributionResult.stats.spikeRatio.toFixed(1)}x your typical day.`}
                              rhythmNote={distributionResult.stats.spikeRatio > 3
                                ? 'You tend to pour it all out in intense sessions rather than steady daily output.'
                                : 'Your output stays relatively consistent day to day.'}
                              metricChip={`${distributionResult.stats.spikeRatio.toFixed(1)}x`}
                            />
                            <MeaningCard
                              title="Top 10% days share"
                              explanation={`${(distributionResult.stats.top10PercentDaysShare * 100).toFixed(0)}% of your writing happened on your busiest days.`}
                              rhythmNote={distributionResult.stats.top10PercentDaysShare > 0.5
                                ? 'Your year was driven by a few "gravity well" days that pulled everything together.'
                                : 'Your writing was spread more evenly across the year.'}
                              metricChip={`${(distributionResult.stats.top10PercentDaysShare * 100).toFixed(0)}%`}
                            />
                            {mostCommonDayCount !== null && (
                              <MeaningCard
                                title="Most common day"
                                explanation={`Your most typical day had ${mostCommonDayCount} ${mostCommonDayCount === 1 ? 'entry' : 'entries'}.`}
                                rhythmNote="This is your baseline rhythm—the daily output level you naturally gravitate toward."
                                metricChip={`${mostCommonDayCount}`}
                              />
                            )}
                          </div>
                          <Glossary />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Mirror section */}
            {mirrorInsights && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold mb-6">Mirror: what you wrote about</h2>
                
                <div className="grid gap-6 lg:grid-cols-3">
                  {/* Recurring words */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 mb-3">Recurring words</h3>
                    <div className="flex flex-wrap gap-2">
                      {mirrorInsights.keywords.map((word) => (
                        <span
                          key={word}
                          className="px-2 py-1 rounded-lg bg-white/10 text-white/80 text-xs"
                        >
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Your shift this year */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 mb-3">Your shift this year</h3>
                    <div className="space-y-3">
                      {mirrorInsights.wordShift.rising.length > 0 && (
                        <div>
                          <div className="text-xs text-white/60 mb-1">Rising</div>
                          <div className="flex flex-wrap gap-2">
                            {mirrorInsights.wordShift.rising.map(({ word }) => (
                              <span
                                key={word}
                                className="px-2 py-1 rounded-lg bg-green-500/20 text-green-300 text-xs"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {mirrorInsights.wordShift.fading.length > 0 && (
                        <div>
                          <div className="text-xs text-white/60 mb-1">Fading</div>
                          <div className="flex flex-wrap gap-2">
                            {mirrorInsights.wordShift.fading.map(({ word }) => (
                              <span
                                key={word}
                                className="px-2 py-1 rounded-lg bg-white/10 text-white/50 text-xs"
                              >
                                {word}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Three moments */}
                  <div>
                    <h3 className="text-sm font-semibold text-white/90 mb-3">Three moments</h3>
                    <div className="space-y-3">
                      {mirrorInsights.moments.map((moment) => (
                        <div key={moment.date} className="rounded-lg border border-white/10 bg-black/30 p-3">
                          <div className="text-xs text-white/60 mb-1">{formatDate(moment.date)}</div>
                          <p className="text-xs text-white/80 leading-relaxed">{moment.preview}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Narrative Insight Card */}
            {narrativeInsight && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-orange-200">{narrativeInsight.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isHighlighted(narrativeInsight)) {
                          toggleHighlight(narrativeInsight);
                        } else {
                          handleSaveHighlight();
                        }
                      }}
                      className="p-1 rounded-full transition-colors hover:bg-white/10"
                      title={isHighlighted(narrativeInsight) ? 'Remove from highlights' : 'Save to Highlights'}
                    >
                      {isHighlighted(narrativeInsight) ? (
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white/40 hover:text-yellow-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/70">{narrativeInsight.explanation}</p>
                <p className="text-xs text-white/40">Computed locally</p>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Year in Numbers</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Total Entries</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.totalEntries}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Active Days</div>
                  <div className="text-2xl font-bold text-white">{computeActiveDays(distributionResult.dailyCounts)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Top 10% Days Share</div>
                  <div className="text-2xl font-bold text-white">{(distributionResult.stats.top10PercentDaysShare * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Spike Ratio</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.spikeRatio.toFixed(2)}x</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Variance</div>
                  <div className="text-2xl font-bold text-white">{distributionResult.stats.variance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Classification</div>
                  <div className="text-2xl font-bold text-white">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      windowDistribution?.classification === 'normal' 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : windowDistribution?.classification === 'lognormal'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    }`}>
                      {windowDistribution ? formatClassification(windowDistribution.classification) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 10 Days */}
            {distributionResult.topDays.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="text-md font-semibold mb-3">Top 10 Days</h3>
                <div className="space-y-2">
                  {distributionResult.topDays.slice(0, 10).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-white/70">{formatDate(day.date)}</span>
                      <span className="text-white/90 font-medium">{day.count} entries</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Distribution Table (365d window) */}
            {windowDistribution && (
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Window</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Classification</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Top 3 Spike Dates</th>
                      <th className="text-left p-4 text-sm font-semibold text-white/80">Explanation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-white/90 font-medium">365d</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          windowDistribution.classification === 'normal' 
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : windowDistribution.classification === 'lognormal'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        }`}>
                          {formatClassification(windowDistribution.classification)}
                        </span>
                      </td>
                      <td className="p-4 text-white/70 text-sm">
                        {windowDistribution.topSpikeDates.length > 0 ? (
                          <ul className="space-y-1">
                            {windowDistribution.topSpikeDates.map((date, idx) => (
                              <li key={idx}>{formatDate(date)}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-white/40">No spikes</span>
                        )}
                      </td>
                      <td className="p-4 text-white/70 text-sm">{windowDistribution.explanation}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

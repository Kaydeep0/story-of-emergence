'use client';

/**
 * Yearly Wrap v1 - Locked
 * 
 * This page provides a complete, stable view of a user's reflection patterns over the past year.
 * 
 * Scope: Single year analysis (365 days) using decrypted reflection entries.
 * Data source: Yearly Wrap only - no fallbacks, no lifetime data, no external sources.
 * 
 * Locked as v1: No new features, no expansion. This is a finished artifact.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../../lib/useLogEvent';
import { useEncryptionSession } from '../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../lib/reflectionLinks';
import { computeDistributionLayer, computeWindowDistribution, computeActiveDays, getTopSpikeDates, type DistributionResult, type WindowDistribution } from '../../lib/insights/distributionLayer';
import type { ReflectionEntry, InsightCard } from '../../lib/insights/types';
import { rpcInsertEntry } from '../../lib/entries';
import { toast } from 'sonner';
import { YearlyWrapShareCard } from '../../components/share/YearlyWrapShareCard';
import { extractKeywords, computeWordShift, getMoments, MeaningCard, Glossary } from './components/YearlyMeaning';
import { IdentityLine } from '../../components/yearly/IdentityLine';
import { YearShapeGlyph } from '../../components/yearly/YearShapeGlyph';
import { GrowthStory } from '../../components/yearly/GrowthStory';
import { ThreeMoments } from '../../components/yearly/ThreeMoments';
import { determineArchetype } from '../../lib/yearlyArchetype';
import { SharePackBuilder } from './components/SharePackBuilder';
import { UnderlyingRhythmCard } from './components/UnderlyingRhythmCard';
import { MirrorSection } from './components/MirrorSection';
import { generateYearlyArtifact } from '../../../lib/artifacts/yearlyArtifact';
import { generateLifetimeCaption } from '../../../lib/artifacts/lifetimeCaption';
import { generateProvenanceLine } from '../../../lib/artifacts/provenance';
import { ShareCapsuleDialog } from '../../components/ShareCapsuleDialog';

// Yearly Wrap v1 - Locked
const YEARLY_WRAP_VERSION = 'v1' as const;

export default function YearlyWrapPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [distributionResult, setDistributionResult] = useState<DistributionResult | null>(null);
  const [windowDistribution, setWindowDistribution] = useState<WindowDistribution | null>(null);
  const [identitySentence, setIdentitySentence] = useState<string>('');
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [privateMode, setPrivateMode] = useState(true);

  // Yearly artifact share state (moved to top level to avoid hooks order violation)
  const [yearlyArtifact, setYearlyArtifact] = useState<import('../../../lib/lifetimeArtifact').ShareArtifact | null>(null);
  const [showYearlyCapsuleDialog, setShowYearlyCapsuleDialog] = useState(false);

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

  // Compute most common day count - FIX CRASH: compute before any use
  const mostCommonDayCount = useMemo(() => {
    if (!distributionResult || !distributionResult.dailyCounts || distributionResult.dailyCounts.length === 0) {
      return null;
    }

    const counts = distributionResult.dailyCounts.filter(c => c > 0);
    if (counts.length === 0) return null;

    const frequency = new Map<number, number>();
    counts.forEach(count => {
      frequency.set(count, (frequency.get(count) || 0) + 1);
    });

    const sorted = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }, [distributionResult]);

  // Compute archetype
  const archetype = useMemo(() => {
    if (!distributionResult || !windowDistribution) return null;
    return determineArchetype({
      classification: windowDistribution.classification,
      spikeRatio: distributionResult.stats.spikeRatio,
      top10Share: distributionResult.stats.top10PercentDaysShare,
      activeDays: computeActiveDays(distributionResult.dailyCounts),
      variance: distributionResult.stats.variance,
    });
  }, [distributionResult, windowDistribution]);

  // Get top spike date
  const topSpikeDate = useMemo(() => {
    if (!distributionResult || distributionResult.topDays.length === 0) return undefined;
    return distributionResult.topDays[0]?.date;
  }, [distributionResult]);

  // Generate yearly artifact when reflections and distribution change (moved to top level to avoid hooks order violation)
  useEffect(() => {
    if (!address || !reflections || reflections.length === 0 || !distributionResult) {
      setYearlyArtifact(null);
      return;
    }
    generateYearlyArtifact(reflections, distributionResult, address).then(setYearlyArtifact).catch((err) => {
      console.error('Failed to generate yearly artifact', err);
      setYearlyArtifact(null);
    });
  }, [reflections, distributionResult, address]);


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
          mostCommonDayCount: mostCommonDayCount ?? 0,
          variance: distributionResult.stats.variance,
          spikeRatio: distributionResult.stats.spikeRatio,
          top10PercentDaysShare: distributionResult.stats.top10PercentDaysShare,
          narrative: narrativeInsight.explanation,
        },
        ts: Date.now(),
      };

      await rpcInsertEntry(address, sessionKey, highlightPayload);
      toast.success('Saved');
    } catch (err: any) {
      console.error('Failed to save highlight', err);
      toast.error(err?.message ?? 'Failed to save highlight');
    }
  };

  if (!mounted) return null;

  // Show wallet/encryption messaging if not ready
  if (!connected) {
    return (
      <div>
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">Connect your wallet to view your yearly wrap.</p>
          </div>
        </section>
      </div>
    );
  }

  if (!encryptionReady) {
    return (
      <div>
        <section className="max-w-4xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">Yearly Wrap</h1>
          <div className="rounded-2xl border border-white/10 p-6 text-center">
            <p className="text-white/70 mb-3">
              {encryptionError || 'Encryption key not ready. Please sign the consent message.'}
            </p>
          </div>
        </section>
      </div>
    );
  }

  return (
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

        {/* Yearly Wrap Content - 5 Narrative Beats: Identity → Behavior → Pattern → Memory → Implication */}
        {!loading && !error && distributionResult && distributionResult.totalEntries > 0 && windowDistribution && (
          <div className="space-y-8">
            {/* Year in review header context */}
            <div className="pb-4">
              <p className="text-sm text-white/60 italic">
                A reflection of how this year concentrated your attention, effort, and emotion.
              </p>
            </div>

            {/* Share Actions */}
            {address && yearlyArtifact && (() => {
              const caption = generateLifetimeCaption(yearlyArtifact);
              
              const handleCopyCaption = async () => {
                try {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(caption);
                    toast('Caption copied');
                  } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = caption;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    textarea.style.left = '-999999px';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    toast('Caption copied');
                  }
                } catch (err) {
                  toast.error('Failed to copy caption');
                }
              };

              const handleDownloadImage = async () => {
                if (!yearlyArtifact) return;
                
                // Guardrail check
                if (!yearlyArtifact.artifactId) {
                  throw new Error('Artifact missing identity: artifactId is required');
                }
                
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (!ctx) throw new Error('Canvas not available');
                  
                  canvas.width = 1200;
                  canvas.height = 800;
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 48px sans-serif';
                  ctx.textAlign = 'left';
                  ctx.fillText('Story of Emergence — Yearly Reflection', 60, 80);
                  
                  ctx.font = '24px sans-serif';
                  ctx.fillStyle = '#cccccc';
                  ctx.fillText(`Year ${new Date().getFullYear()}`, 60, 130);
                  ctx.fillText(`${distributionResult.totalEntries} reflections`, 60, 170);
                  ctx.fillText(`${computeActiveDays(distributionResult.dailyCounts)} active days`, 60, 210);
                  
                  if (yearlyArtifact.signals.length > 0) {
                    let y = 280;
                    ctx.font = 'bold 18px sans-serif';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText('Observed Patterns', 60, y);
                    ctx.font = '16px sans-serif';
                    ctx.fillStyle = '#cccccc';
                    yearlyArtifact.signals.slice(0, 5).forEach((signal) => {
                      y += 30;
                      ctx.fillText(`• ${signal.label}`, 80, y);
                    });
                  }
                  
                  // Provenance line
                  y = canvas.height - 40;
                  ctx.font = '14px sans-serif';
                  ctx.fillStyle = '#666666';
                  ctx.textAlign = 'center';
                  const provenanceLine = generateProvenanceLine(yearlyArtifact);
                  ctx.fillText(provenanceLine, canvas.width / 2, y);
                  
                  const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed')), 'image/png');
                  });
                  
                  const url = URL.createObjectURL(blob);
                  const now = new Date();
                  const filename = `soe-yearly-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.png`;
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast('Image downloaded');
                } catch (err) {
                  toast.error('Failed to generate image');
                }
              };

              const handleWebShare = async () => {
                if (!yearlyArtifact) return;
                
                // Guardrail check
                if (!yearlyArtifact.artifactId) {
                  throw new Error('Artifact missing identity: artifactId is required');
                }
                
                if (!navigator.share) {
                  toast('Share not available on this device');
                  return;
                }
                try {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  if (!ctx) throw new Error('Canvas not available');
                  
                  canvas.width = 1200;
                  canvas.height = 800;
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 48px sans-serif';
                  ctx.fillText('Story of Emergence — Yearly Reflection', 60, 80);
                  
                  const blob = await new Promise<Blob>((resolve, reject) => {
                    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed')), 'image/png');
                  });
                  
                  const file = new File([blob], `soe-yearly-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
                  if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({ title: 'Story of Emergence — Yearly Reflection', text: caption, files: [file] });
                    toast('Ready to share');
                  } else {
                    await navigator.share({ title: 'Story of Emergence — Yearly Reflection', text: caption });
                    toast('Ready to share');
                  }
                } catch (err: any) {
                  if (err.name !== 'AbortError') {
                    toast.error('Failed to share');
                  }
                }
              };

              return (
                <>
                  <div className="mb-6 flex gap-2 items-center">
                    <button
                      onClick={handleDownloadImage}
                      className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      PNG
                    </button>
                    <button
                      onClick={handleCopyCaption}
                      className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      Caption
                    </button>
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button
                        onClick={handleWebShare}
                        className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="18" cy="5" r="3"></circle>
                          <circle cx="6" cy="12" r="3"></circle>
                          <circle cx="18" cy="19" r="3"></circle>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                        </svg>
                        Share
                      </button>
                    )}
                    <button
                      onClick={() => setShowYearlyCapsuleDialog(true)}
                      className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                      Send privately
                    </button>
                  </div>
                </>
              );
            })()}

            {/* Hidden export card for share */}
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
                classificationLabel={formatClassification(windowDistribution.classification)}
                totalEntries={distributionResult.totalEntries}
                activeDays={computeActiveDays(distributionResult.dailyCounts)}
                spikeRatio={distributionResult.stats.spikeRatio}
                top10PercentShare={distributionResult.stats.top10PercentDaysShare}
              />
            </div>

            {/* 1️⃣ IDENTITY: Year, Badge (smaller), Sentence (larger) */}
            <IdentityLine
              totalEntries={distributionResult.totalEntries}
              activeDays={computeActiveDays(distributionResult.dailyCounts)}
              spikeRatio={distributionResult.stats.spikeRatio}
              top10PercentShare={distributionResult.stats.top10PercentDaysShare}
              classification={windowDistribution.classification}
              onSentenceChange={setIdentitySentence}
            />

            {/* 3️⃣ BEHAVIOR: The shape of your year (moved immediately after Identity) */}
            {distributionResult.dailyCounts.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
                <p className="text-sm text-white/70 mb-4 italic">This is how your attention actually moved.</p>
                <YearShapeGlyph
                  dailyCounts={distributionResult.dailyCounts}
                  topSpikeDates={getTopSpikeDates(distributionResult, 3)}
                  mode="page"
                />
              </div>
            )}

            {/* Divider before pattern analysis */}
            <div className="border-t border-white/10" />

            {/* 2️⃣ PATTERN: Your underlying rhythm (collapsible) */}
            <UnderlyingRhythmCard
              distributionResult={distributionResult}
              windowDistribution={windowDistribution}
              mostCommonDayCount={mostCommonDayCount}
              formatClassification={formatClassification}
            />

            {/* Why this mattered - Emotional hinge */}
            <div className="rounded-2xl border border-white/15 bg-white/8 p-6 sm:p-8">
              <h3 className="text-lg font-semibold mb-3">Why this mattered</h3>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed">
                You didn&apos;t spread your attention thin. You let quiet stretches do their work, then arrived fully when something was ready to move. This rhythm favors depth over noise—and it compounds more than it appears.
              </p>
            </div>

            {/* Share Pack Builder - Secondary, collapsible */}
            <SharePackBuilder
              year={new Date().getFullYear()}
              identitySentence={identitySentence || 'My year in reflection.'}
              archetype={archetype?.name}
              yearShape={
                distributionResult.dailyCounts.length > 0
                  ? {
                      dailyCounts: distributionResult.dailyCounts,
                      topSpikeDates: getTopSpikeDates(distributionResult, 3),
                    }
                  : undefined
              }
              moments={mirrorInsights?.moments.map(m => ({
                date: m.date,
                preview: m.preview,
              }))}
              numbers={{
                totalEntries: distributionResult.totalEntries,
                activeDays: computeActiveDays(distributionResult.dailyCounts),
                spikeRatio: distributionResult.stats.spikeRatio,
              }}
              mirrorInsight={narrativeInsight?.explanation}
              entries={reflections}
              distributionResult={distributionResult}
              windowDistribution={windowDistribution}
              encryptionReady={encryptionReady}
            />

            {/* 4️⃣ MEMORY: Mirror section (Recurring words + Three moments, word shift hidden by default) */}
            <MirrorSection
              mirrorInsights={mirrorInsights}
              formatDate={formatDate}
              entries={reflections}
              topSpikeDates={distributionResult ? getTopSpikeDates(distributionResult, 3) : []}
            />

            {/* Growth Story - Keep but less prominent */}
            {reflections.length >= 10 && <GrowthStory entries={reflections} />}

            {/* Three Moments - Keep */}
            <ThreeMoments
              entries={reflections}
              topSpikeDate={topSpikeDate}
              formatDate={formatDate}
            />

            {/* Narrative Insight Card - Keep */}
            {narrativeInsight && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-orange-200">{narrativeInsight.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                  </div>
                </div>
                <p className="text-sm text-white/70">{narrativeInsight.explanation}</p>
                <p className="text-xs text-white/40">Computed locally</p>
              </div>
            )}


            {/* 5️⃣ IMPLICATION: Future rhythm (Last section, emphasized) */}
            {archetype && (
              <div className="rounded-2xl border-2 border-white/20 bg-white/10 p-8 sm:p-10">
                <h3 className="text-xl sm:text-2xl font-semibold mb-4">If you keep this rhythm…</h3>
                <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                  {archetype.name.includes('Deep Diver')
                    ? 'Reflection patterns show periods of activity and pause.'
                    : archetype.name.includes('Steady Builder')
                    ? 'Consistent activity observed. Patterns continue over time.'
                    : archetype.name.includes('Sprinter')
                    ? 'Activity spikes observed. Patterns vary in frequency.'
                    : 'Activity patterns vary over time.'}
                </p>
              </div>
            )}

            {/* Closing Reflection - Final section */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
              <h3 className="text-lg font-semibold mb-3">A year, observed</h3>
              <p className="text-sm sm:text-base text-white/75 leading-relaxed">
                This wasn&apos;t a highlight reel. It was a record of attention, taken as it actually moved. Nothing here was optimized—only noticed.
              </p>
            </div>

            {/* Footer note */}
            <div className="pt-6 border-t border-white/10">
              <p className="text-xs text-white/40 text-center">
                Yearly Wrap · Private · Computed Locally
              </p>
            </div>
          </div>
        )}

        {/* Share Capsule Dialog */}
        {address && yearlyArtifact && (
          <ShareCapsuleDialog
            artifact={yearlyArtifact}
            senderWallet={address}
            isOpen={showYearlyCapsuleDialog}
            onClose={() => setShowYearlyCapsuleDialog(false)}
          />
        )}
      </section>
  );
}

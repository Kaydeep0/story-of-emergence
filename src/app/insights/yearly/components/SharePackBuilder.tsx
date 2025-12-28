'use client';

/**
 * Share Pack Builder - Yearly Wrap v1
 * 
 * Generates shareable content from Yearly Wrap data only.
 * Uses: identitySentence, archetype, yearShape, moments, numbers, mirrorInsight from Yearly Wrap.
 * No fallbacks to lifetime data or external sources.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { YearlyShareCard, type ShareCardPlatform, PLATFORM_DIMENSIONS } from '../../../components/share/YearlyShareCard';
import { buildShareText, type Platform, pickTopMomentsForShare, isProbablySystemOrErrorText, cleanForShare } from '../../../lib/share/buildShareText';
import { exportPng } from '../../../lib/share/exportPng';
import { toast } from 'sonner';
import type { ReflectionEntry } from '../../../lib/insights/types';
import type { DistributionResult } from '../../../lib/insights/distributionLayer';
import { getTopSpikeDates } from '../../../lib/insights/distributionLayer';

// Share pack selection type - drives which modules render
export interface SharePackSelection {
  yearSentence: boolean;
  archetype: boolean;
  yearShape: boolean;
  topMoments: boolean;
  threeNumbers: boolean;
  wholesomeMirror: boolean;
}


// Privacy filter: Sanitize text to remove decrypt errors, JSON, and system messages
// Strips tokens matching: "decrypt", "Unable to decrypt", "entryid", "rpc", "supabase", stack traces, JSON error blobs
function sanitizeText(text: string | undefined): string | undefined {
  if (!text || !text.trim()) return undefined;
  
  const trimmed = text.trim();
  const lowerText = trimmed.toLowerCase();
  
  // Exclude if contains unsafe patterns
  if (
    lowerText.includes('decrypt') ||
    lowerText.includes('unable to decrypt') ||
    lowerText.includes('entryid') ||
    lowerText.includes('entry id') ||
    lowerText.includes('rpc') ||
    lowerText.includes('supabase') ||
    lowerText.includes('error:') ||
    lowerText.includes('exception:') ||
    lowerText.includes('at src') ||
    lowerText.includes('stack trace') ||
    trimmed.startsWith('{') ||
    trimmed.includes('"metadata"') ||
    trimmed.includes('"note":') ||
    (trimmed.includes(' at ') && (trimmed.includes('.ts') || trimmed.includes('.js'))) ||
    trimmed.includes('{') && trimmed.includes('}')
  ) {
    return undefined; // Return undefined to hide unsafe content
  }
  
  return trimmed;
}


// Map Platform to ShareCardPlatform for card dimensions
function getCardPlatform(platform: Platform): ShareCardPlatform {
  if (platform === 'linkedin') return 'linkedin-square';
  if (platform === 'instagram') return 'instagram-square'; // Use square for Instagram
  if (platform === 'tiktok') return 'tiktok';
  if (platform === 'threads') return 'instagram-square'; // Threads uses Instagram square
  // X uses Instagram portrait format
  return 'instagram-portrait';
}

// Get platform-specific download button label
function getDownloadLabel(platform: Platform): string {
  const labels: Record<Platform, string> = {
    instagram: 'Download for Instagram',
    linkedin: 'Download for LinkedIn',
    tiktok: 'Download for TikTok',
    threads: 'Download for Threads',
    x: 'Download for X',
  };
  return labels[platform] || 'Download image';
}

// Generate platform-specific filename
function getDownloadFilename(platform: Platform, year: number): string {
  const platformTag = platform === 'x' ? 'x' : platform;
  return `story-of-emergence-${year}-${platformTag}.png`;
}

// Get platform-specific micro copy (one line intent reinforcement)
function getPlatformMicroCopy(platform: Platform): string {
  const microCopy: Record<Platform, string> = {
    instagram: 'Perfect for a feed post or story.',
    linkedin: 'Best shared as a post with your reflection.',
    tiktok: 'Use as a photo post or background.',
    threads: 'Works great as a first-thread image.',
    x: 'Perfect for a post with your reflection.',
  };
  return microCopy[platform] || '';
}

// PreviewCard component - semantic preview, separate from export card
// This is NOT the export card - it's a readable story preview
// Max width: 500px - always readable and scaled to fit container
// Normal readable font sizes, no pixel-perfect constraints
interface PreviewCardProps {
  year: number;
  content: {
    identitySentence?: string;
    archetype?: string;
    yearShape?: {
      dailyCounts: number[];
      topSpikeDates: string[];
    };
    numbers?: {
      totalEntries: number;
      activeDays: number;
      spikeRatio: number;
    };
    moments?: Array<{ date: string; preview: string; context?: string }>;
    mirrorInsight?: string;
  };
}

function PreviewCard({ year, content }: PreviewCardProps) {
  const maxWidth = 500;
  
  return (
    <div
      style={{
        maxWidth: `${maxWidth}px`,
        width: '100%',
        backgroundColor: '#000000',
        color: '#ffffff',
        padding: '32px',
        borderRadius: '12px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Title */}
      <div>
        <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
          Story of Emergence
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
          Yearly Wrap
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700' }}>
          {year}
        </div>
      </div>

      {/* Year sentence */}
      {content.identitySentence && (
        <div style={{ fontSize: '18px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.9)' }}>
          {content.identitySentence}
        </div>
      )}

      {/* Archetype */}
      {content.archetype && (
        <div style={{ fontSize: '16px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)' }}>
          {content.archetype}
        </div>
      )}

      {/* Year shape summary */}
      {content.yearShape && (
        <div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
            Year shape
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
            {content.yearShape.dailyCounts.length} weeks of activity, {content.yearShape.topSpikeDates.length} spike days
          </div>
        </div>
      )}

      {/* Numbers */}
      {content.numbers && (
        <div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
            Numbers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Total Entries</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{content.numbers.totalEntries}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Active Days</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{content.numbers.activeDays}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>Spike Ratio</div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>{content.numbers.spikeRatio.toFixed(1)}x</div>
            </div>
          </div>
        </div>
      )}

      {/* Moments summary */}
      {content.moments && content.moments.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '12px' }}>
            Top Moments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {content.moments.slice(0, 3).map((moment, idx) => (
              <div key={idx}>
                <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.8)', marginBottom: moment.context ? '4px' : '0' }}>
                  {moment.preview}
                </div>
                {moment.context && (
                  <div style={{ fontSize: '12px', lineHeight: '1.4', color: 'rgba(255, 255, 255, 0.6)', fontStyle: 'italic' }}>
                    {moment.context}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mirror insight */}
      {content.mirrorInsight && (
        <div style={{ fontSize: '15px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.85)', fontStyle: 'italic' }}>
          {content.mirrorInsight}
        </div>
      )}

      {/* Footer */}
      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginTop: 'auto', paddingTop: '24px' }}>
        Computed locally. Nothing uploaded.
      </div>
    </div>
  );
}

export interface SharePackBuilderProps {
  year: number;
  identitySentence: string;
  archetype?: string;
  yearShape?: {
    dailyCounts: number[];
    topSpikeDates: string[];
  };
  moments?: Array<{ date: string; preview: string }>;
  numbers?: {
    totalEntries: number;
    activeDays: number;
    spikeRatio: number;
  };
  mirrorInsight?: string;
  entries?: ReflectionEntry[]; // For computing moment context
  distributionResult?: DistributionResult | null; // For computing moment context
}

export function SharePackBuilder({
  year,
  identitySentence,
  archetype,
  yearShape,
  moments,
  numbers,
  mirrorInsight,
  entries = [],
  distributionResult = null,
}: SharePackBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selection, setSelection] = useState<SharePackSelection>({
    yearSentence: true,
    archetype: true,
    threeNumbers: true,
    yearShape: false,
    topMoments: false,
    wholesomeMirror: false,
  });
  const [generatedSelection, setGeneratedSelection] = useState<SharePackSelection | null>(null);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTexts, setGeneratedTexts] = useState<{ caption: string; tiktokOverlay?: string[] } | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const expandedPanelRef = useRef<HTMLDivElement>(null);

  // Compute contextual fact for a moment based on entries and distribution
  const computeMomentContext = (
    momentDate: string,
    entriesData: ReflectionEntry[],
    distributionData: DistributionResult | null
  ): string | undefined => {
    if (!distributionData || entriesData.length === 0) return undefined;

    const momentDateObj = new Date(momentDate);
    const momentDateKey = momentDate.split('T')[0]; // YYYY-MM-DD

    // Get entries for this day
    const dayEntries = entriesData.filter(e => {
      const entryDate = new Date(e.createdAt).toISOString().split('T')[0];
      return entryDate === momentDateKey;
    });

    if (dayEntries.length === 0) return undefined;

    // Find entries in the 2 weeks after this moment
    const twoWeeksAfter = new Date(momentDateObj);
    twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);
    
    const entriesAfter = entriesData.filter(e => {
      const entryDate = new Date(e.createdAt);
      return entryDate > momentDateObj && entryDate <= twoWeeksAfter;
    });

    // Count consecutive days with entries after this moment (streak)
    const daysAfter = new Set<string>();
    entriesAfter.forEach(e => {
      const dateKey = new Date(e.createdAt).toISOString().split('T')[0];
      daysAfter.add(dateKey);
    });
    
    // Check if this was part of a spike pattern
    const dayCount = dayEntries.length;
    const medianCount = distributionData.stats.mostCommonDayCount || 1;
    const isSpike = dayCount > medianCount * 2;

    // Check if this day had the highest spike ratio
    const thisDayData = distributionData.topDays.find(d => d.date === momentDateKey);
    const isTopSpike = thisDayData && distributionData.topDays[0]?.date === momentDateKey;

    // Generate contextual facts
    if (isTopSpike && distributionData.stats.spikeRatio > 2) {
      return `This day had your highest spike ratio (${distributionData.stats.spikeRatio.toFixed(1)}x above typical).`;
    }

    if (daysAfter.size >= 7) {
      return `This was followed by your longest reflection streak (${daysAfter.size} days).`;
    }

    if (isSpike && entriesAfter.length > dayEntries.length * 2) {
      return `This entry marked a shift in tone that persisted for weeks.`;
    }

    if (daysAfter.size >= 3) {
      return `This was followed by ${daysAfter.size} consecutive days of reflection.`;
    }

    if (isSpike) {
      return `This day preceded your highest spike ratio.`;
    }

    return undefined; // No context if nothing notable
  };

  // Check if selections changed after generation
  const selectionsChanged = generatedSelection && JSON.stringify(selection) !== JSON.stringify(generatedSelection);

  // Auto-scroll to expanded panel when it opens
  useEffect(() => {
    if (isExpanded && expandedPanelRef.current) {
      expandedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isExpanded]);

  const toggleSelection = (key: keyof SharePackSelection) => {
    setSelection(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleGenerate = () => {
    const content = {
      identitySentence: selection.yearSentence ? identitySentence : undefined,
      archetype: selection.archetype ? archetype : undefined,
      hasYearShape: selection.yearShape && !!yearShape,
      hasMoments: selection.topMoments && !!moments,
      numbers: selection.threeNumbers ? numbers : undefined,
      mirrorInsight: selection.wholesomeMirror ? mirrorInsight : undefined,
    };

    const texts = buildShareText(platform, content);
    setGeneratedTexts(texts);
    setGeneratedSelection({ ...selection }); // Store snapshot of selection
    setShowConfirmation(false); // Reset confirmation when regenerating
  };

  const handleDownloadImage = async () => {
    const exportCard = document.getElementById('yearly-share-export-card');
    if (!exportCard) {
      toast.error('Share card not ready. Generate share pack first.');
      return;
    }

    try {
      setIsGenerating(true);
      const filename = getDownloadFilename(platform, year);
      await exportPng(exportCard as HTMLElement, filename);
      
      // Auto-copy caption after successful download
      if (generatedTexts?.caption) {
        try {
          await navigator.clipboard.writeText(generatedTexts.caption);
        } catch (err) {
          // Silent fail - caption copy is nice-to-have
        }
      }
      
      // Show confirmation banner
      setShowConfirmation(true);
    } catch (err: any) {
      console.error('Failed to export image:', err);
      toast.error(err?.message ?? 'Failed to export image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareAnotherPlatform = () => {
    setShowConfirmation(false);
    setPlatform('instagram'); // Reset to default
  };

  const handleDone = () => {
    setShowConfirmation(false);
  };


  const handleCopyCaption = async () => {
    if (!generatedTexts) {
      toast.error('Generate share pack first');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedTexts.caption);
      toast.success('Caption copied to clipboard');
    } catch (err: any) {
      console.error('Failed to copy caption:', err);
      toast.error('Failed to copy caption');
    }
  };

  const handleCopyTikTokOverlay = async () => {
    if (!generatedTexts?.tiktokOverlay) {
      toast.error('TikTok overlay not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedTexts.tiktokOverlay.join('\n'));
      toast.success('TikTok overlay copied');
    } catch (err: any) {
      console.error('Failed to copy TikTok overlay:', err);
      toast.error('Failed to copy TikTok overlay');
    }
  };

  // Determine privacy badge based on what could show personal text
  // Only counts and archetype = Privacy safe
  // Anything else = May include personal text
  const hasPersonalContent = selection.topMoments || selection.wholesomeMirror || selection.yearSentence;
  const privacyBadge = hasPersonalContent ? 'May include personal text' : 'Privacy safe';

  // Get card dimensions for current platform - use single source of truth
  const cardPlatform = getCardPlatform(platform);
  const cardDimensions = PLATFORM_DIMENSIONS[cardPlatform];
  
  // Build card model from selection - single source of truth for both preview and export
  // Apply privacy filtering to all text fields before generating share pack content
  const buildCardModel = (sel: SharePackSelection) => {
    // Get sanitized moments using pickTopMomentsForShare
    let safeMoments: Array<{ date: string; preview: string; context?: string }> | undefined = undefined;
    if (sel.topMoments && entries.length > 0 && distributionResult) {
      const topSpikeDates = getTopSpikeDates(distributionResult, 3);
      const pickedMoments = pickTopMomentsForShare(entries, topSpikeDates, 3);
      // Add context to picked moments
      safeMoments = pickedMoments.map(moment => ({
        ...moment,
        context: computeMomentContext(moment.date, entries, distributionResult),
      }));
    }
    
    // Sanitize mirror insight
    let safeMirrorInsight: string | undefined = undefined;
    if (sel.wholesomeMirror && mirrorInsight) {
      const cleaned = cleanForShare(mirrorInsight);
      if (cleaned && !isProbablySystemOrErrorText(cleaned)) {
        safeMirrorInsight = cleaned;
      } else {
        // Fallback if filtered out
        safeMirrorInsight = 'A quiet year can still be a powerful one. Your reflection is building underneath the surface.';
      }
    }
    
    return {
      identitySentence: sel.yearSentence ? sanitizeText(identitySentence) : undefined,
      archetype: sel.archetype ? sanitizeText(archetype) : undefined,
      yearShape: sel.yearShape && yearShape ? yearShape : undefined,
      numbers: sel.threeNumbers && numbers ? numbers : undefined,
      moments: safeMoments,
      mirrorInsight: safeMirrorInsight,
    };
  };

  // Get included items list for display - updates immediately when checkboxes toggle
  const getIncludedItems = (sel: SharePackSelection): string[] => {
    const items: string[] = [];
    if (sel.yearSentence) items.push('Year sentence');
    if (sel.archetype) items.push('Archetype');
    if (sel.yearShape) items.push('Year shape');
    if (sel.threeNumbers) items.push('3 numbers');
    if (sel.topMoments) items.push('Top moments');
    if (sel.wholesomeMirror) items.push('Mirror insight');
    return items;
  };

  // Collapsed state: Show CTA only
  if (!isExpanded) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Share this year</h3>
            <p className="text-sm text-white/60 mb-4">
              Create a shareable version of your yearly wrap.
            </p>
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm font-medium"
            >
              Create a shareable version
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state: Show full share UI
  // Main container - no overflow clipping to allow preview to display fully
  return (
    <div ref={expandedPanelRef} className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6 space-y-6" style={{ overflow: 'visible' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2">Share this year</h3>
          <p className="text-sm text-white/60">
            Choose what you want to share. We&apos;ll generate a beautiful card and caption.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsExpanded(false);
            setGeneratedTexts(null); // Reset generated content when collapsing
          }}
          className="text-xs text-white/60 hover:text-white/80 transition-colors whitespace-nowrap"
        >
          Collapse
        </button>
      </div>

      {/* Content selection */}
      <div>
        <label className="text-xs text-white/60 mb-2 block">Select content</label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
            <input
              type="checkbox"
              checked={selection.yearSentence}
              onChange={() => toggleSelection('yearSentence')}
              className="rounded border-white/20"
            />
            <span className="text-xs text-white/80">Your year in one sentence</span>
          </label>
          <label className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
            <input
              type="checkbox"
              checked={selection.archetype}
              onChange={() => toggleSelection('archetype')}
              className="rounded border-white/20"
            />
            <span className="text-xs text-white/80">Your archetype</span>
          </label>
          {yearShape && (
            <label className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
              <input
                type="checkbox"
                checked={selection.yearShape}
                onChange={() => toggleSelection('yearShape')}
                className="rounded border-white/20"
              />
              <span className="text-xs text-white/80">Your year shape</span>
            </label>
          )}
          {moments && moments.length > 0 && (
            <label className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
              <input
                type="checkbox"
                checked={selection.topMoments}
                onChange={() => toggleSelection('topMoments')}
                className="rounded border-white/20"
              />
              <span className="text-xs text-white/80">Top 3 moments</span>
            </label>
          )}
          {numbers && (
            <label className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
              <input
                type="checkbox"
                checked={selection.threeNumbers}
                onChange={() => toggleSelection('threeNumbers')}
                className="rounded border-white/20"
              />
              <span className="text-xs text-white/80">3 numbers</span>
            </label>
          )}
          {mirrorInsight && (
            <label className="flex items-center gap-2 p-2 rounded-lg border border-white/10 bg-black/30 cursor-pointer hover:bg-black/50 transition-colors">
              <input
                type="checkbox"
                checked={selection.wholesomeMirror}
                onChange={() => toggleSelection('wholesomeMirror')}
                className="rounded border-white/20"
              />
              <span className="text-xs text-white/80">A wholesome mirror insight</span>
            </label>
          )}
        </div>
      </div>

      {/* Platform selector */}
      <div>
        <label className="text-xs text-white/60 mb-2 block">Platform</label>
        <div className="flex flex-wrap gap-2">
          {(['instagram', 'linkedin', 'x', 'tiktok', 'threads'] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                setGeneratedTexts(null); // Reset when platform changes
                setGeneratedSelection(null);
                setShowConfirmation(false); // Reset confirmation when platform changes
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                platform === p
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              {p === 'x' ? 'X' : p === 'threads' ? 'Threads' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy badge */}
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-1 rounded ${
          hasPersonalContent
            ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
            : 'bg-green-500/20 text-green-300 border border-green-500/30'
        }`}>
          {privacyBadge}
        </span>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm font-medium"
      >
        Generate Share Pack
      </button>

      {/* Preview - always shows current selection (live updates) */}
      {/* Show preview even before Generate is clicked */}
      <div className="pt-4 border-t border-white/10">
        {/* Max width container for whole Share Pack area */}
        <div className="max-w-5xl mx-auto">
          {/* Two column layout: Preview left, Caption/actions right */}
          {/* Responsive: 1 column on mobile, 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left column: Preview */}
            <div className="space-y-4">
              {/* Included items list - updates immediately when checkboxes toggle */}
              <div className="mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-white/60">
                    This card includes:
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {getIncludedItems(selection).map((item) => {
                      // Map item name back to selection key
                      const itemKeyMap: Record<string, keyof SharePackSelection> = {
                        'Year sentence': 'yearSentence',
                        'Archetype': 'archetype',
                        'Year shape': 'yearShape',
                        '3 numbers': 'threeNumbers',
                        'Top moments': 'topMoments',
                        'Mirror insight': 'wholesomeMirror',
                      };
                      const key = itemKeyMap[item];
                      const isSelected = key ? selection[key] : false;
                      
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => key && toggleSelection(key)}
                          className={`text-xs px-2 py-0.5 rounded transition-colors ${
                            isSelected
                              ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                              : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Out of date badge - shown when selections change after generation */}
              {selectionsChanged && (
                <div className="mb-3 text-xs text-orange-300 bg-orange-500/20 border border-orange-500/30 rounded-lg px-3 py-2">
                  Selections changed, regenerate to update preview.
                </div>
              )}

              {/* Card container - centered */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                {/* Empty preview placeholder - shown before generation */}
                {!generatedSelection ? (
                  <div 
                    className="flex flex-col items-center justify-center"
                    style={{
                      minHeight: '400px',
                      border: '2px dashed rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      padding: '48px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <p className="text-sm text-white/70 mb-2">
                      Generate a preview to review your card before sharing.
                    </p>
                  </div>
                ) : (
                  /* PreviewCard - semantic preview, separate from export */
                  <PreviewCard
                    year={year}
                    content={buildCardModel(generatedSelection)}
                  />
                )}
              </div>
            </div>

            {/* Right column: Caption and actions - only show after Generate */}
            {generatedTexts && generatedSelection && (
              <div className="space-y-4">
                {/* Caption */}
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Caption</label>
                  <textarea
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 resize-none"
                    rows={6}
                    value={generatedTexts.caption}
                    readOnly
                  />
                </div>

                {/* TikTok overlay */}
                {platform === 'tiktok' && generatedTexts.tiktokOverlay && (
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">TikTok Overlay</label>
                    <textarea
                      className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80 resize-none"
                      rows={3}
                      value={generatedTexts.tiktokOverlay.join('\n')}
                      readOnly
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadImage}
                    disabled={isGenerating || selectionsChanged || !generatedSelection}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    title={
                      !generatedSelection 
                        ? 'Generate a preview first' 
                        : selectionsChanged 
                        ? 'Regenerate to apply changes before downloading' 
                        : undefined
                    }
                  >
                    {isGenerating ? 'Generating...' : getDownloadLabel(platform)}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyCaption}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm"
                  >
                    Copy caption
                  </button>
                  {platform === 'tiktok' && generatedTexts.tiktokOverlay && (
                    <button
                      type="button"
                      onClick={handleCopyTikTokOverlay}
                      className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm"
                    >
                      Copy TikTok overlay
                    </button>
                  )}
                </div>

                {/* Platform-specific micro copy */}
                <p className="text-xs text-white/50 italic">
                  {getPlatformMicroCopy(platform)}
                </p>

                {/* Privacy reassurance */}
                <p className="text-xs text-white/40">
                  Computed locally. Nothing uploaded.
                </p>

                {/* Post-export confirmation banner */}
                {showConfirmation && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-white mb-1">
                          Your Yearly Wrap is ready to share.
                        </p>
                        <p className="text-xs text-white/60">
                          Image saved. Caption copied. Nothing uploaded.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleCopyCaption}
                          className="px-3 py-1.5 rounded text-xs bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                        >
                          Copy caption
                        </button>
                        <button
                          type="button"
                          onClick={handleShareAnotherPlatform}
                          className="px-3 py-1.5 rounded text-xs bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                        >
                          Share another platform
                        </button>
                        <button
                          type="button"
                          onClick={handleDone}
                          className="px-3 py-1.5 rounded text-xs bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hidden export card - rendered in isolation at 1x scale for crisp export */}
          {/* Uses generatedSelection to ensure export matches what was generated */}
          {/* Apply same privacy filtering to export */}
          {generatedSelection && (
            <div
              id="yearly-share-export-card"
              style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}
            >
              <YearlyShareCard
                year={year}
                {...buildCardModel(generatedSelection)}
                mode="export"
                platform={cardPlatform}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


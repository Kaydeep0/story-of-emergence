'use client';

/**
 * Share Pack Builder - Yearly Wrap v1
 * 
 * Generates shareable content from Yearly Wrap data only.
 * Uses: identitySentence, archetype, yearShape, moments, numbers, mirrorInsight from Yearly Wrap.
 * No fallbacks to lifetime data or external sources.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { buildShareText, type Platform, pickTopMomentsForShare, isProbablySystemOrErrorText, cleanForShare } from '../../../lib/share/buildShareText';
import { exportPng } from '../../../lib/share/exportPng';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import type { ReflectionEntry } from '../../../lib/insights/types';
import type { DistributionResult, WindowDistribution } from '../../../lib/insights/distributionLayer';
import { getTopSpikeDates } from '../../../lib/insights/distributionLayer';
import { buildSharePack, type SharePack, type SharePackSelection, type SharePackPlatform } from '../share/sharePack';
import { renderSharePack, type ShareFrame } from '../../../share/renderers/renderSharePack';
import { ShareActions } from './ShareActions';

// SharePackSelection is now imported from sharePack.ts


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

// Get platform-specific share intent URL and label
function getPlatformShareIntent(platform: Platform): { label: string; url: string } {
  const intents: Record<Platform, { label: string; url: string }> = {
    instagram: {
      label: 'Open Instagram',
      url: 'https://www.instagram.com/',
    },
    linkedin: {
      label: 'Open LinkedIn',
      url: 'https://www.linkedin.com/feed/?shareActive=true',
    },
    tiktok: {
      label: 'Open TikTok',
      url: 'https://www.tiktok.com/upload',
    },
    threads: {
      label: 'Open Threads',
      url: 'https://www.threads.net/',
    },
    x: {
      label: 'Open X',
      url: 'https://x.com/compose/tweet',
    },
  };
  return intents[platform] || { label: 'Open platform', url: 'https://www.instagram.com/' };
}

// Get platform-specific instruction text
function getPlatformInstruction(platform: Platform): string {
  const instructions: Record<Platform, string> = {
    instagram: 'Click Create, select the saved image, paste caption.',
    linkedin: 'Click Start a post, upload the saved image, paste caption.',
    tiktok: 'Upload the saved image, paste caption.',
    threads: 'Upload the saved image, paste caption.',
    x: 'Upload the saved image, paste caption.',
  };
  return instructions[platform] || 'Upload the saved image, paste caption.';
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
  windowDistribution?: WindowDistribution | null; // For distribution label
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
  windowDistribution = null,
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
  const [generatedPack, setGeneratedPack] = useState<SharePack | null>(null);
  const [platform, setPlatform] = useState<Platform>('instagram');
  const [frame, setFrame] = useState<ShareFrame>('ig_square');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTexts, setGeneratedTexts] = useState<{ caption: string; tiktokOverlay?: string[] } | null>(null);
  const [shareComplete, setShareComplete] = useState(false);
  const [lastExport, setLastExport] = useState<{ platform: Platform; filename?: string } | null>(null);
  const [lastPngBlob, setLastPngBlob] = useState<Blob | null>(null);
  const [isGeneratingBlob, setIsGeneratingBlob] = useState(false);
  const [isFirstGeneration, setIsFirstGeneration] = useState(true);
  const [containerMinHeight, setContainerMinHeight] = useState<number | null>(null);
  const expandedPanelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastGeneratedPackKeyRef = useRef<string | null>(null);

  // Generate PNG blob immediately after pack is generated and rendered
  useEffect(() => {
    // Only generate if we have a pack, texts, and not already generating
    if (!generatedPack || !generatedTexts || isGeneratingBlob) {
      return;
    }

    // Create a unique key for this pack generation (platform + year + pack year)
    const packKey = `${platform}-${year}-${generatedPack.year}`;
    
    // Skip if we already generated for this exact pack
    if (shareComplete && lastPngBlob && lastGeneratedPackKeyRef.current === packKey) {
      return;
    }

    // Mark that we're generating for this pack
    lastGeneratedPackKeyRef.current = packKey;

    const generateBlobAsync = async () => {
      setIsGeneratingBlob(true);
      
      try {
        // Wait for React to render the export card
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const exportCard = document.getElementById('yearly-share-export-card');
        if (!exportCard) {
          console.warn('Export card not found, retrying...');
          // Retry after a bit more time
          await new Promise(resolve => setTimeout(resolve, 300));
          const retryCard = document.getElementById('yearly-share-export-card');
          if (!retryCard) {
            console.error('Export card still not found after retry');
            setIsGeneratingBlob(false);
            return;
          }
        }

        const card = exportCard || document.getElementById('yearly-share-export-card');
        if (!card) {
          console.error('Failed to find export card');
          setIsGeneratingBlob(false);
          return;
        }

        const filename = getDownloadFilename(platform, year);
        
        // Generate PNG blob
        const blob = await generatePngBlob(card as HTMLElement);
        
        // Store blob and filename
        setLastPngBlob(blob);
        setLastExport({ platform, filename });
        
        // Set share complete state immediately
        setShareComplete(true);
        
        // Release minHeight after shareComplete is set to allow natural layout
        setContainerMinHeight(null);
      } catch (err: any) {
        console.error('Failed to generate PNG blob:', err);
        toast.error('Failed to generate image. Please try again.');
        setShareComplete(false);
        // Release minHeight on error too
        setContainerMinHeight(null);
      } finally {
        setIsGeneratingBlob(false);
      }
    };

    generateBlobAsync();
  }, [generatedPack, generatedTexts, platform, year, isGeneratingBlob, shareComplete, lastPngBlob]);

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
      return `This was followed by your longest consecutive reflection period (${daysAfter.size} days).`;
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

  // Auto-scroll to expanded panel when it opens (but not during generation)
  useEffect(() => {
    if (isExpanded && expandedPanelRef.current && !isGeneratingBlob) {
      expandedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isExpanded, isGeneratingBlob]);

  const toggleSelection = (key: keyof SharePackSelection) => {
    setSelection(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Map Platform to SharePackPlatform
  const mapPlatform = (p: Platform): SharePackPlatform => {
    return p as SharePackPlatform; // They have the same values
  };

  // Build SharePack from current selection
  const buildCurrentSharePack = (sel: SharePackSelection): SharePack => {
    return buildSharePack({
      year,
      selection: sel,
      platform: mapPlatform(platform),
      identitySentence,
      archetype,
      yearShape,
      moments,
      numbers,
      mirrorInsight,
      entries,
      distributionResult,
      windowDistribution,
    });
  };

  const handleGenerate = () => {
    // Capture container height to prevent layout jump
    if (containerRef.current) {
      const height = containerRef.current.getBoundingClientRect().height;
      setContainerMinHeight(height);
    }

    // Track if this is the first generation (no blob existed before)
    const wasFirstGeneration = !lastPngBlob;
    setIsFirstGeneration(wasFirstGeneration);

    // Build SharePack
    const pack = buildCurrentSharePack(selection);
    setGeneratedPack(pack);
    
    // Build caption text (for compatibility with existing UI)
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
    // Reset completion state when regenerating - useEffect will set it to true after blob generation
    setShareComplete(false);
    setLastPngBlob(null); // Clear previous blob
    setLastExport(null); // Clear previous export
    lastGeneratedPackKeyRef.current = null; // Reset pack key to allow regeneration
  };

  // Generate PNG blob from export card element using an offscreen clone
  const generatePngBlob = async (element: HTMLElement): Promise<Blob> => {
    // Clone the element to avoid modifying the live preview
    const clone = element.cloneNode(true) as HTMLElement;
    
    // Style clone so it cannot be seen
    clone.style.position = 'fixed';
    clone.style.left = '-10000px';
    clone.style.top = '0';
    clone.style.opacity = '0';
    clone.style.pointerEvents = 'none';
    clone.style.transform = 'none';
    clone.style.visibility = 'visible';
    clone.style.zIndex = '-1';
    
    // Append clone to document.body
    document.body.appendChild(clone);
    
    try {
      // Small delay to ensure rendering
      await new Promise(resolve => setTimeout(resolve, 100));

      // Export to PNG with high quality settings
      const dataUrl = await toPng(clone, {
        quality: 1.0,
        pixelRatio: 1,
        backgroundColor: '#000000',
        cacheBust: true,
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      return blob;
    } finally {
      // Remove clone from DOM
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  };

  // Download blob as file
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadImage = async () => {
    // Use stored blob if available, otherwise generate
    if (lastPngBlob && lastExport?.filename) {
      downloadBlob(lastPngBlob, lastExport.filename);
      
      // Auto-copy caption after successful download
      if (generatedTexts?.caption) {
        try {
          await navigator.clipboard.writeText(generatedTexts.caption);
        } catch (err) {
          // Silent fail - caption copy is nice-to-have
        }
      }
      return;
    }

    // Fallback: generate if blob not available
    const exportCard = document.getElementById('yearly-share-export-card');
    if (!exportCard) {
      toast.error('Share card not ready. Generate share pack first.');
      return;
    }

    try {
      setIsGenerating(true);
      const filename = getDownloadFilename(platform, year);
      
      // Generate PNG blob
      const blob = await generatePngBlob(exportCard as HTMLElement);
      
      // Download the blob
      downloadBlob(blob, filename);
      
      // Store blob and filename for later use
      setLastPngBlob(blob);
      setLastExport({ platform, filename });
      
      // Auto-copy caption after successful download
      if (generatedTexts?.caption) {
        try {
          await navigator.clipboard.writeText(generatedTexts.caption);
        } catch (err) {
          // Silent fail - caption copy is nice-to-have
        }
      }
    } catch (err: any) {
      console.error('Failed to export image:', err);
      toast.error(err?.message ?? 'Failed to export image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareAnotherPlatform = () => {
    // Reset completion state but keep all selections and generated content
    setShareComplete(false);
    // Platform can be changed by user clicking platform chips
    // No need to reset platform here
  };

  const handleDone = () => {
    // Reset completion state and clear transient export state
    setShareComplete(false);
    setLastExport(null);
    setLastPngBlob(null);
    // Optionally collapse the share section
    // For now, just reset to pre-export state without navigation
  };


  const handleCopyCaption = async () => {
    if (!generatedTexts) {
      toast.error('Generate share pack first');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedTexts.caption);
      toast.success('Caption copied.');
    } catch (err: any) {
      console.error('Failed to copy caption:', err);
      toast.error('Failed to copy caption');
    }
  };

  const handleOpenPlatform = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const intent = getPlatformShareIntent(platform);
    // Open platform in new tab - no file upload, no API calls, just navigation
    window.open(intent.url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyImage = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!lastPngBlob) {
      toast.error('No image available. Generate share pack first.');
      return;
    }

    if (!navigator.clipboard || !navigator.clipboard.write) {
      toast.error('Clipboard API not supported');
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': lastPngBlob }),
      ]);
      toast.success('Image copied');
    } catch (err: any) {
      console.error('Failed to copy image:', err);
      toast.error('Failed to copy image');
    }
  };

  const handleDownloadAgain = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!lastPngBlob || !lastExport?.filename) {
      toast.error('No image available. Generate again.');
      return;
    }

    // After first download, mark as not first generation
    if (isFirstGeneration) {
      setIsFirstGeneration(false);
    }

    try {
      downloadBlob(lastPngBlob, lastExport.filename);
      toast.success('Downloaded again');
    } catch (err: any) {
      console.error('Failed to download again:', err);
      toast.error('Failed to download again');
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

  // Build SharePack for preview (live updates as selection changes)
  const previewPack = useMemo(() => {
    return buildCurrentSharePack(selection);
  }, [selection, year, identitySentence, archetype, yearShape, moments, numbers, mirrorInsight, entries, distributionResult, windowDistribution, platform]);

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
    <div 
      ref={(node) => {
        expandedPanelRef.current = node;
        containerRef.current = node;
      }}
      className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6 space-y-6" 
      style={{ 
        overflow: 'visible',
        minHeight: containerMinHeight ? `${containerMinHeight}px` : undefined,
        transition: containerMinHeight ? 'none' : 'min-height 0.2s ease-out',
      }}
    >
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

      {/* Content selection - disabled when share is complete */}
      {!shareComplete && (
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
      )}

      {/* Frame selector */}
      <div>
        <label className="text-xs text-white/60 mb-2 block">Frame</label>
        <div className="flex flex-wrap gap-2">
          {(['ig_square', 'ig_story', 'linkedin'] as ShareFrame[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFrame(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                frame === f
                  ? 'bg-white/20 text-white border border-white/30'
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              {f === 'ig_square' ? 'Instagram Square' : f === 'ig_story' ? 'Instagram Story' : 'LinkedIn'}
            </button>
          ))}
        </div>
      </div>

      {/* Platform selector - always visible, regenerates when changed during share complete */}
      <div>
        <label className="text-xs text-white/60 mb-2 block">Platform</label>
        <div className="flex flex-wrap gap-2">
          {(['instagram', 'linkedin', 'x', 'tiktok', 'threads'] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPlatform(p);
                if (shareComplete && generatedSelection) {
                  // Regenerate SharePack and caption for new platform
                  const pack = buildCurrentSharePack(generatedSelection);
                  setGeneratedPack(pack);
                  
                  const content = {
                    identitySentence: generatedSelection.yearSentence ? identitySentence : undefined,
                    archetype: generatedSelection.archetype ? archetype : undefined,
                    hasYearShape: generatedSelection.yearShape && !!yearShape,
                    hasMoments: generatedSelection.topMoments && !!moments,
                    numbers: generatedSelection.threeNumbers ? numbers : undefined,
                    mirrorInsight: generatedSelection.wholesomeMirror ? mirrorInsight : undefined,
                  };
                  const texts = buildShareText(p, content);
                  setGeneratedTexts(texts);
                } else {
                  // Normal behavior: reset when platform changes
                  setGeneratedTexts(null);
                  setGeneratedSelection(null);
                }
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

      {/* Privacy badge - hidden when share is complete */}
      {!shareComplete && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            hasPersonalContent
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              : 'bg-green-500/20 text-green-300 border border-green-500/30'
          }`}>
            {privacyBadge}
          </span>
        </div>
      )}

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
      <div className="pt-4 border-t border-white/10" style={{ overflow: 'visible' }}>
        {/* Max width container for whole Share Pack area */}
        <div className="max-w-5xl mx-auto" style={{ overflow: 'visible' }}>
          {/* Two column layout: Preview left, Caption/actions right */}
          {/* Responsive: 1 column on mobile, 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" style={{ overflow: 'visible' }}>
            {/* Left column: Preview - stage presentation */}
            <div className="space-y-4" style={{ overflow: 'visible' }}>
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

              {/* Stage container - fixed dimensions matching export, centered with padding */}
              <div className="rounded-xl border border-white/10 bg-black/30 p-6">
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  width: '100%',
                  position: 'relative',
                }}>
                  {/* Stage frame - fixed dimensions matching export size, overflow hidden */}
                  {(() => {
                    const FRAME_PRESETS: Record<ShareFrame, { width: number; height: number }> = {
                      ig_square: { width: 1080, height: 1080 },
                      ig_story: { width: 1080, height: 1920 },
                      linkedin: { width: 1200, height: 628 },
                    };
                    const dimensions = FRAME_PRESETS[frame];
                    const scale = 0.4;
                    
                    const stageWidth = dimensions.width * scale;
                    const stageHeight = dimensions.height * scale;
                    
                    return (
                      <div style={{
                        width: `${stageWidth}px`,
                        height: `${stageHeight}px`,
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#000000',
                        borderRadius: '8px',
                      }}>
                        {/* Scaled layer - full export dimensions, scaled down */}
                        <div style={{
                          width: `${dimensions.width}px`,
                          height: `${dimensions.height}px`,
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                          position: 'relative',
                        }}>
                          {/* renderSharePack at full export dimensions - always mounted */}
                          {renderSharePack(previewPack, frame)}
                        </div>
                        {/* Loading overlay - shown during blob generation */}
                        {isGeneratingBlob && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              zIndex: 10,
                            }}
                          >
                            <div className="text-white/80 text-sm">Generating...</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right column: Caption and actions - show when generated, or share complete panel */}
            {shareComplete ? (
              /* Share Complete Panel */
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-white mb-1">
                      Your Yearly Wrap is ready to share.
                    </p>
                    <p className="text-xs text-white/60 mb-1">
                      Image saved locally. Nothing uploaded.
                    </p>
                  </div>

                  {/* Saved filename */}
                  {lastExport?.filename && (
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-white/60 mb-1">Saved file</div>
                      <div className="text-xs text-white font-mono break-all">
                        {lastExport.filename}
                      </div>
                    </div>
                  )}

                  {/* Share Actions */}
                  <ShareActions
                    imageBlob={lastPngBlob}
                    captionText={generatedTexts?.caption || ''}
                    frame={frame}
                    platform={platform}
                    tiktokOverlay={generatedTexts?.tiktokOverlay}
                    filename={lastExport?.filename || getDownloadFilename(platform, year)}
                  />
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleShareAnotherPlatform}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
                    >
                      Share another platform
                    </button>
                    <button
                      type="button"
                      onClick={handleDone}
                      className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm"
                    >
                      Done
                    </button>
                  </div>
                  <p className="text-xs text-white/50">
                    {getPlatformInstruction(platform)}
                  </p>
                </div>
              </div>
            ) : generatedTexts && generatedSelection ? (
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

                {/* Share Actions */}
                <ShareActions
                  imageBlob={lastPngBlob}
                  captionText={generatedTexts.caption}
                  frame={frame}
                  platform={platform}
                  tiktokOverlay={generatedTexts.tiktokOverlay}
                  filename={lastExport?.filename || getDownloadFilename(platform, year)}
                />

                {/* Platform-specific micro copy */}
                <p className="text-xs text-white/50 italic">
                  {getPlatformMicroCopy(platform)}
                </p>
              </div>
            ) : null}
          </div>

          {/* Hidden export card - rendered in isolation at 1x scale for crisp export */}
          {/* Uses generatedPack to ensure export matches what was generated */}
          {/* Uses same renderSharePack function as preview */}
          {generatedPack && (
            <div
              id="yearly-share-export-card"
              style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}
            >
              {renderSharePack(generatedPack, frame)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


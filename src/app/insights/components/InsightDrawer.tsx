'use client';

import { useEffect, useState, useRef } from 'react';
import type { AlwaysOnSummaryCard, InsightEvidence, InsightCard, ReflectionEntry } from '../../lib/insights/types';
import type { TopicDriftBucket } from '../../lib/insights/topicDrift';
import type { ContrastPair } from '../../lib/insights/contrastPairs';
import type { SourceEntryLite } from '../../lib/insights/fromSources';

/**
 * Normalized insight type that the drawer can consume
 */
export type NormalizedInsight = {
  id: string;
  title: string;
  type: 'Trend' | 'Consistency' | 'Spike' | 'Pattern' | 'Topic Drift' | 'Contrast Pair';
  summary: string;
  whyThisMatters: string;
  evidence: InsightEvidence[];
  confidence?: number;
  strength?: string;
};

/**
 * Generate a text snippet from a reflection entry (first 100 characters)
 */
function generateReflectionSnippet(entry: ReflectionEntry, maxLength = 100): string {
  const text = entry.plaintext || '';
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '…';
}

/**
 * Helper to normalize Always On Summary insights
 */
function normalizeAlwaysOnSummary(insight: AlwaysOnSummaryCard): NormalizedInsight {
  const typeMap: Record<AlwaysOnSummaryCard['data']['summaryType'], NormalizedInsight['type']> = {
    writing_change: 'Trend',
    consistency: 'Consistency',
    weekly_pattern: 'Pattern',
    activity_spike: 'Spike',
  };

  const type = typeMap[insight.data.summaryType];

  // Generate "Why this matters" text based on type
  let whyThisMatters = '';
  if (insight.data.summaryType === 'writing_change') {
    if (insight.data.percentChange && insight.data.percentChange > 0) {
      whyThisMatters = 'Increasing writing activity suggests you\'re building momentum. This pattern can help you maintain consistency and deepen your reflection practice.';
    } else if (insight.data.percentChange && insight.data.percentChange < 0) {
      whyThisMatters = 'A decrease in writing activity might indicate shifting priorities or challenges. Recognizing this pattern helps you adjust and get back on track.';
    } else {
      whyThisMatters = 'Maintaining steady writing activity shows consistency in your reflection practice. This stability helps build long-term habits.';
    }
  } else if (insight.data.summaryType === 'consistency') {
    whyThisMatters = 'Consistent writing days create stronger habits and deeper insights. Regular reflection helps you notice patterns and track progress over time.';
  } else if (insight.data.summaryType === 'weekly_pattern') {
    whyThisMatters = 'Recognizing your preferred writing days helps you plan and maintain your reflection practice. Patterns reveal when you\'re most likely to engage deeply.';
  } else if (insight.data.summaryType === 'activity_spike') {
    whyThisMatters = 'Activity spikes often indicate moments of high engagement or important events. Understanding what triggers these bursts can help you recreate productive periods.';
  }

  return {
    id: insight.id,
    title: insight.title,
    type,
    summary: insight.explanation,
    whyThisMatters,
    evidence: insight.evidence,
  };
}

/**
 * Helper to normalize Topic Drift buckets
 */
function normalizeTopicDrift(bucket: TopicDriftBucket): NormalizedInsight {
  const trendDescriptions = {
    rising: 'This topic is becoming more prominent in your reflections.',
    stable: 'This topic maintains a steady presence in your writing.',
    fading: 'This topic appears less frequently in recent reflections.',
  };

  const whyThisMattersText = {
    rising: 'Rising topics often reflect growing interests, concerns, or priorities. Paying attention to what\'s emerging can reveal important shifts in your thinking or circumstances.',
    stable: 'Stable topics represent core themes in your life. These consistent patterns form the foundation of your reflection practice.',
    fading: 'Fading topics might indicate resolved issues, changing priorities, or natural evolution. Understanding what\'s receding helps you see how your focus shifts over time.',
  };

  // Convert sample titles to evidence format
  // Note: Topic drift buckets don't have entry IDs or timestamps, only sample titles
  const evidence: InsightEvidence[] = bucket.sampleTitles.map((title, idx) => ({
    entryId: `topic-${bucket.topic}-${idx}`,
    timestamp: '', // Topic drift doesn't provide timestamps
    preview: title,
  }));

  return {
    id: `topic-drift-${bucket.topic}`,
    title: bucket.topic.charAt(0).toUpperCase() + bucket.topic.slice(1),
    type: 'Topic Drift',
    summary: trendDescriptions[bucket.trend],
    whyThisMatters: whyThisMattersText[bucket.trend],
    evidence,
    strength: bucket.strengthLabel.charAt(0).toUpperCase() + bucket.strengthLabel.slice(1) + ' Drift',
  };
}

/**
 * Helper to normalize Contrast Pairs
 */
function normalizeContrastPair(pair: ContrastPair, index: number): NormalizedInsight {
  const whyThisMatters = 'Contrast pairs reveal how your attention shifts between different areas of life. These opposing trends can highlight important transitions, conflicts, or evolving priorities that deserve deeper reflection.';

  // Contrast pairs don't have direct evidence, so we create a summary evidence item
  const evidence: InsightEvidence[] = [
    {
      entryId: `contrast-${pair.topicA}-${pair.topicB}`,
      timestamp: new Date().toISOString(),
      preview: `${pair.topicA} (${pair.trendA}) vs ${pair.topicB} (${pair.trendB})`,
    },
  ];

  return {
    id: `contrast-pair-${index}`,
    title: `${pair.topicA.charAt(0).toUpperCase() + pair.topicA.slice(1)} vs ${pair.topicB.charAt(0).toUpperCase() + pair.topicB.slice(1)}`,
    type: 'Contrast Pair',
    summary: pair.summary,
    whyThisMatters,
    evidence,
  };
}

/**
 * Union type for all possible insight sources
 */
export type InsightSource = AlwaysOnSummaryCard | TopicDriftBucket | ContrastPair;

/**
 * Normalize any insight source to the common format
 */
export function normalizeInsight(source: InsightSource, index?: number): NormalizedInsight {
  if ('kind' in source && source.kind === 'always_on_summary') {
    return normalizeAlwaysOnSummary(source);
  }
  if ('trend' in source && 'topic' in source) {
    return normalizeTopicDrift(source as TopicDriftBucket);
  }
  if ('topicA' in source && 'topicB' in source) {
    return normalizeContrastPair(source as ContrastPair, index ?? 0);
  }
  throw new Error('Unknown insight source type');
}

/**
 * Reflection Preview Panel Component
 * Shows full reflection text in a lightweight preview panel
 */
function ReflectionPreviewPanel({
  entry,
  isOpen,
  onClose,
}: {
  entry: ReflectionEntry | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!entry) return null;

  const date = new Date(entry.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-[220ms] ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Mobile panel: slide from bottom */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto z-[70] shadow-2xl transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Reflection</h3>
              <p className="text-xs text-white/60 mt-1">
                {formattedDate} at {formattedTime}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Full reflection text */}
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{entry.plaintext}</p>
          </div>
        </div>
      </div>

      {/* Desktop panel: side panel */}
      <div
        className={`hidden sm:flex fixed inset-y-0 right-0 w-[480px] bg-black border-l border-white/10 z-[70] flex-col shadow-2xl transform transition-transform duration-[220ms] ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Reflection</h3>
            <p className="text-xs text-white/60 mt-1">
              {formattedDate} at {formattedTime}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
            aria-label="Close preview"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{entry.plaintext}</p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Skeleton loading component for insight cards
 */
function InsightSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div className="h-7 bg-white/10 rounded w-3/4" />
      
      {/* Badges skeleton */}
      <div className="flex gap-2">
        <div className="h-6 bg-white/10 rounded-full w-20" />
        <div className="h-6 bg-white/10 rounded-full w-24" />
      </div>
      
      {/* Summary skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-5/6" />
        <div className="h-4 bg-white/10 rounded w-4/6" />
      </div>
      
      {/* Why this matters skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-white/10 rounded w-32" />
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-full" />
        <div className="h-4 bg-white/10 rounded w-3/4" />
      </div>
      
      {/* Evidence skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-white/10 rounded w-24" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-4 bg-white/10 rounded w-20" />
              <div className="h-4 bg-white/10 rounded flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Shimmer placeholder for evidence rows
 * Matches the layout of actual evidence rows with timestamp and preview
 */
function EvidenceShimmerPlaceholder() {
  return (
    <div className="flex items-start gap-3 text-sm">
      {/* Timestamp placeholder */}
      <div className="min-w-[80px] h-10 bg-white/5 rounded shimmer-placeholder" />
      {/* Preview text placeholder */}
      <div className="flex-1 h-10 bg-white/5 rounded shimmer-placeholder" />
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ onNewReflection }: { onNewReflection: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 px-6">
      <svg
        className="w-12 h-12 text-white/40"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
        />
      </svg>
      <div className="space-y-2">
        <p className="text-sm font-medium text-white/90">
          No insights yet
        </p>
        <p className="text-sm text-white/60 max-w-sm">
          Add a few reflections and I will start connecting the dots.
        </p>
      </div>
      <button
        onClick={onNewReflection}
        className="mt-4 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
      >
        New reflection
      </button>
    </div>
  );
}

/**
 * Insight Detail Drawer Component
 */
export function InsightDrawer({
  insight,
  isOpen,
  onClose,
  originalCard,
  isHighlighted,
  toggleHighlight,
  reflectionEntries = [],
  sources = [],
  isLoading = false,
  isEmpty = false,
  onNewReflection,
}: {
  insight: NormalizedInsight | null;
  isOpen: boolean;
  onClose: () => void;
  originalCard?: InsightCard;
  isHighlighted?: (card: InsightCard) => boolean;
  toggleHighlight?: (card: InsightCard) => void;
  reflectionEntries?: ReflectionEntry[];
  sources?: SourceEntryLite[];
  isLoading?: boolean;
  isEmpty?: boolean;
  onNewReflection?: () => void;
}) {
  const [selectedReflection, setSelectedReflection] = useState<ReflectionEntry | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [evidenceRevealed, setEvidenceRevealed] = useState(false);
  const saveFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const evidenceRevealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close preview when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setPreviewOpen(false);
      setSelectedReflection(null);
      setSaveFeedback(false);
      setEvidenceRevealed(false);
      if (saveFeedbackTimeoutRef.current) {
        clearTimeout(saveFeedbackTimeoutRef.current);
        saveFeedbackTimeoutRef.current = null;
      }
      if (evidenceRevealTimeoutRef.current) {
        clearTimeout(evidenceRevealTimeoutRef.current);
        evidenceRevealTimeoutRef.current = null;
      }
    } else {
      // When drawer opens, reset evidence revealed state and trigger reveal after a short delay
      setEvidenceRevealed(false);
      if (insight && insight.evidence.length > 0) {
        // Small delay to show shimmer briefly, then reveal evidence
        evidenceRevealTimeoutRef.current = setTimeout(() => {
          setEvidenceRevealed(true);
        }, 300);
      } else {
        // If no evidence, mark as revealed immediately
        setEvidenceRevealed(true);
      }
    }
  }, [isOpen, insight]);

  // Handle save feedback
  const handleToggleHighlight = (card: InsightCard) => {
    if (toggleHighlight) {
      toggleHighlight(card);
      setSaveFeedback(true);
      if (saveFeedbackTimeoutRef.current) {
        clearTimeout(saveFeedbackTimeoutRef.current);
      }
      saveFeedbackTimeoutRef.current = setTimeout(() => {
        setSaveFeedback(false);
        saveFeedbackTimeoutRef.current = null;
      }, 2000);
    }
  };

  // Create a map of sourceId -> source title for quick lookups
  const sourceTitleById = new Map<string, string>();
  sources.forEach((s) => {
    if (s.sourceId && s.title) {
      sourceTitleById.set(s.sourceId, s.title);
    }
  });

  // Helper to find reflection by entryId
  function getReflectionByEntryId(entryId: string): ReflectionEntry | null {
    return reflectionEntries.find(entry => entry.id === entryId) || null;
  }

  // Helper to get source name for an evidence item
  function getSourceNameForEvidence(entryId: string): string | null {
    const reflection = getReflectionByEntryId(entryId);
    if (reflection?.sourceId) {
      return sourceTitleById.get(reflection.sourceId) || null;
    }
    return null;
  }

  // Helper to get preview text for evidence
  function getEvidencePreview(ev: InsightEvidence): string {
    // If preview already exists, use it
    if (ev.preview) return ev.preview;
    
    // Try to find reflection and generate snippet
    const reflection = getReflectionByEntryId(ev.entryId);
    if (reflection) {
      return generateReflectionSnippet(reflection);
    }
    
    return '(no preview)';
  }

  // Handle evidence click
  function handleEvidenceClick(ev: InsightEvidence) {
    const reflection = getReflectionByEntryId(ev.entryId);
    if (reflection) {
      setSelectedReflection(reflection);
      setPreviewOpen(true);
    }
  }

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewOpen) {
          setPreviewOpen(false);
          setSelectedReflection(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, previewOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      // Store original overflow value
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        // Restore original overflow value
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (saveFeedbackTimeoutRef.current) {
        clearTimeout(saveFeedbackTimeoutRef.current);
      }
      if (evidenceRevealTimeoutRef.current) {
        clearTimeout(evidenceRevealTimeoutRef.current);
      }
    };
  }, []);

  // Don't render if drawer is closed and no insight/loading/empty state
  if (!isOpen && !insight && !isLoading && !isEmpty) return null;

  // Determine if this insight can be highlighted and its current state
  const canHighlight = originalCard && isHighlighted && toggleHighlight;
  const highlighted = canHighlight && originalCard ? isHighlighted(originalCard) : false;

  // Format date for evidence items
  function formatEvidenceDate(timestamp: string): string {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }

  // Format time for evidence items
  function formatEvidenceTime(timestamp: string): string {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  }

  // Type badge colors
  const typeColors: Record<NormalizedInsight['type'], string> = {
    Trend: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    Consistency: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    Spike: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    Pattern: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'Topic Drift': 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'Contrast Pair': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  };

  // Strength badge colors for Topic Drift - High drift is more vivid, Low/Medium are calmer
  function getStrengthBadgeClass(strength: string): string {
    const lower = strength.toLowerCase();
    if (lower.includes('high')) {
      // High drift: brighter, more vivid
      return 'bg-rose-500/25 text-rose-300 border-rose-500/40';
    } else if (lower.includes('medium')) {
      // Medium drift: moderate
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    } else {
      // Low drift or Stable: calmer, softer
      return 'bg-white/10 text-white/60 border-white/20';
    }
  }

  // Format strength label to be short and neutral
  function formatStrengthLabel(strength: string): string {
    const lower = strength.toLowerCase();
    if (lower.includes('high')) return 'High drift';
    if (lower.includes('medium')) return 'Medium drift';
    if (lower.includes('low')) return 'Low drift';
    if (lower.includes('stable')) return 'Stable';
    return strength;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Mobile drawer: slide from bottom */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 rounded-t-2xl max-h-[85vh] overflow-y-auto z-50 shadow-2xl transform transition-all duration-300 ease-out insight-drawer-mobile ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div className="p-6 space-y-6 min-h-[200px]">
          {/* Loading state */}
          {isLoading && !insight && <InsightSkeleton />}
          
          {/* Empty state */}
          {!isLoading && !insight && isEmpty && onNewReflection && (
            <EmptyState onNewReflection={onNewReflection} />
          )}
          
          {/* Content state */}
          {!isLoading && insight && (
            <div className="insight-drawer-content">
            <>
              {/* Mobile header */}
              <div className="flex items-start justify-between mb-4 gap-2">
                <h2 className="text-xl font-semibold flex-1">{insight.title}</h2>
                <div className="flex items-center gap-2">
                  {canHighlight && originalCard && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleHighlight(originalCard);
                        }}
                        className="p-2 rounded-full transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                        title={highlighted ? 'Remove from highlights' : 'Add to highlights'}
                        aria-label={highlighted ? 'Remove from highlights' : 'Add to highlights'}
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
                      {saveFeedback && (
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-yellow-400 bg-black/80 px-2 py-1 rounded animate-fade-in">
                          {highlighted ? 'Saved to Highlights' : 'Removed from Highlights'}
                        </span>
                      )}
                    </div>
                  )}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                    aria-label="Close drawer"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Type badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full border ${typeColors[insight.type]}`}>
                  {insight.type}
                </span>
                {insight.strength && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStrengthBadgeClass(insight.strength)}`}>
                    {formatStrengthLabel(insight.strength)}
                  </span>
                )}
              </div>

              {/* Summary */}
              <div>
                <p className="text-sm text-white/80 leading-relaxed">{insight.summary}</p>
              </div>

              {/* Why this matters */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-white/90">Why this matters</h3>
                <p className="text-sm text-white/70 leading-relaxed">{insight.whyThisMatters}</p>
              </div>

              {/* Evidence */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-white/90">Evidence</h3>
                {insight.evidence.length > 0 ? (
                  <ul className="space-y-2">
                    {!evidenceRevealed ? (
                      // Show shimmer placeholders while loading
                      Array.from({ length: Math.min(insight.evidence.length, 5) }).map((_, idx) => (
                        <li key={`shimmer-${idx}`} className="insight-evidence-placeholder">
                          <EvidenceShimmerPlaceholder />
                        </li>
                      ))
                    ) : (
                      // Show real evidence with staggered animation
                      insight.evidence.map((ev, idx) => {
                        const hasTimestamp = ev.timestamp && formatEvidenceDate(ev.timestamp);
                        const preview = getEvidencePreview(ev);
                        const reflection = getReflectionByEntryId(ev.entryId);
                        const isClickable = !!reflection;
                        const sourceName = getSourceNameForEvidence(ev.entryId);
                        const delayMs = 75; // Stagger delay in milliseconds (60-80ms range)
                        
                        return (
                          <li
                            key={ev.entryId || idx}
                            className={`insight-evidence-pill insight-evidence-row ${
                              isClickable
                                ? 'cursor-pointer'
                                : ''
                            }`}
                            onClick={isClickable ? () => handleEvidenceClick(ev) : undefined}
                            style={{
                              animationDelay: `${idx * delayMs}ms`,
                            }}
                          >
                            {hasTimestamp ? (
                              <span className="insight-evidence-date text-white/40 text-xs">
                                {formatEvidenceDate(ev.timestamp)}
                                <span className="block text-white/30">{formatEvidenceTime(ev.timestamp)}</span>
                              </span>
                            ) : (
                              <span className="insight-evidence-date text-white/40 text-xs">•</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="insight-evidence-text text-white/70 text-sm block">{preview}</span>
                              {sourceName && (
                                <span className="inline-flex items-center gap-1 text-xs text-white/40 mt-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                  </svg>
                                  From Source: {sourceName}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                ) : (
                  <p className="text-sm text-white/50 italic">No specific entries highlighted yet.</p>
                )}
              </div>

              {/* Confidence */}
              {insight.confidence !== undefined && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Confidence</span>
                    <span className="text-white/80">
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </>
            </div>
          )}
        </div>
      </div>

      {/* Desktop drawer: slide from right */}
      <div
        className={`hidden sm:flex fixed inset-y-0 right-0 w-[480px] bg-black border-l border-white/10 z-50 flex-col shadow-2xl transform transition-all duration-300 ease-out insight-drawer-desktop ${
          isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between gap-2 z-10">
          {isLoading || isEmpty ? (
            <h2 className="text-xl font-semibold pr-4 flex-1">Insights</h2>
          ) : (
            <h2 className="text-xl font-semibold pr-4 flex-1">{insight?.title || ''}</h2>
          )}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isLoading && !isEmpty && canHighlight && originalCard && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleHighlight(originalCard);
                  }}
                  className="p-2 rounded-full transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
                  title={highlighted ? 'Remove from highlights' : 'Add to highlights'}
                  aria-label={highlighted ? 'Remove from highlights' : 'Add to highlights'}
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
                {saveFeedback && (
                  <span className="absolute -bottom-6 right-0 whitespace-nowrap text-xs text-yellow-400 bg-black/80 px-2 py-1 rounded animate-fade-in">
                    {highlighted ? 'Saved to Highlights' : 'Removed from Highlights'}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-black"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Loading state */}
          {isLoading && !insight && <InsightSkeleton />}
          
          {/* Empty state */}
          {!isLoading && !insight && isEmpty && onNewReflection && (
            <EmptyState onNewReflection={onNewReflection} />
          )}
          
          {/* Content state */}
          {!isLoading && insight && (
            <div className="insight-drawer-content">
            <>
              {/* Type badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full border ${typeColors[insight.type]}`}>
                  {insight.type}
                </span>
                {insight.strength && (
                  <span className={`text-xs px-2 py-1 rounded-full border ${getStrengthBadgeClass(insight.strength)}`}>
                    {formatStrengthLabel(insight.strength)}
                  </span>
                )}
              </div>

          {/* Summary */}
          <div>
            <p className="text-sm text-white/80 leading-relaxed">{insight.summary}</p>
          </div>

          {/* Why this matters */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white/90">Why this matters</h3>
            <p className="text-sm text-white/70 leading-relaxed">{insight.whyThisMatters}</p>
          </div>

          {/* Evidence */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white/90">Evidence</h3>
            {insight.evidence.length > 0 ? (
              <ul className="space-y-2">
                {!evidenceRevealed ? (
                  // Show shimmer placeholders while loading
                  Array.from({ length: Math.min(insight.evidence.length, 5) }).map((_, idx) => (
                    <li key={`shimmer-${idx}`} className="insight-evidence-placeholder">
                      <EvidenceShimmerPlaceholder />
                    </li>
                  ))
                ) : (
                  // Show real evidence with staggered animation
                  insight.evidence.map((ev, idx) => {
                    const hasTimestamp = ev.timestamp && formatEvidenceDate(ev.timestamp);
                    const preview = getEvidencePreview(ev);
                    const reflection = getReflectionByEntryId(ev.entryId);
                    const isClickable = !!reflection;
                    const sourceName = getSourceNameForEvidence(ev.entryId);
                    const delayMs = 75; // Stagger delay in milliseconds (60-80ms range)
                    
                    return (
                      <li
                        key={ev.entryId || idx}
                        className={`insight-evidence-pill insight-evidence-row ${
                          isClickable
                            ? 'cursor-pointer'
                            : ''
                        }`}
                        onClick={isClickable ? () => handleEvidenceClick(ev) : undefined}
                        style={{
                          animationDelay: `${idx * delayMs}ms`,
                        }}
                      >
                        {hasTimestamp ? (
                          <span className="insight-evidence-date text-white/40 text-xs">
                            {formatEvidenceDate(ev.timestamp)}
                            <span className="block text-white/30">{formatEvidenceTime(ev.timestamp)}</span>
                          </span>
                        ) : (
                          <span className="insight-evidence-date text-white/40 text-xs">•</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="insight-evidence-text text-white/70 text-sm block">{preview}</span>
                          {sourceName && (
                            <span className="inline-flex items-center gap-1 text-xs text-white/40 mt-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                              </svg>
                              From Source: {sourceName}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            ) : (
              <p className="text-sm text-white/50 italic">No specific entries highlighted yet.</p>
            )}
          </div>

              {/* Confidence */}
              {insight.confidence !== undefined && (
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/60">Confidence</span>
                    <span className="text-white/80">
                      {Math.round(insight.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </>
            </div>
          )}
        </div>
      </div>

      {/* Reflection Preview Panel */}
      <ReflectionPreviewPanel
        entry={selectedReflection}
        isOpen={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setSelectedReflection(null);
        }}
      />
    </>
  );
}



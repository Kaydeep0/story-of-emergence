'use client';

import { useEffect } from 'react';
import type { AlwaysOnSummaryCard, InsightEvidence, InsightCard } from '../../lib/insights/types';
import type { TopicDriftBucket } from '../../lib/insights/topicDrift';
import type { ContrastPair } from '../../lib/insights/contrastPairs';

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
 * Insight Detail Drawer Component
 */
export function InsightDrawer({
  insight,
  isOpen,
  onClose,
  originalCard,
  isHighlighted,
  toggleHighlight,
}: {
  insight: NormalizedInsight | null;
  isOpen: boolean;
  onClose: () => void;
  originalCard?: InsightCard;
  isHighlighted?: (card: InsightCard) => boolean;
  toggleHighlight?: (card: InsightCard) => void;
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

  if (!isOpen || !insight) return null;

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile drawer: slide from bottom */}
      <div
        className={`sm:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 rounded-t-2xl max-h-[80vh] overflow-y-auto z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-6 space-y-6">
          {/* Mobile header */}
          <div className="flex items-start justify-between mb-4 gap-2">
            <h2 className="text-xl font-semibold flex-1">{insight.title}</h2>
            <div className="flex items-center gap-2">
              {canHighlight && originalCard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHighlight(originalCard);
                  }}
                  className="p-2 rounded-full transition-colors hover:bg-white/10"
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
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
              <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                {insight.strength}
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
          {insight.evidence.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/90">Evidence</h3>
              <ul className="space-y-2">
                {insight.evidence.map((ev, idx) => {
                  const hasTimestamp = ev.timestamp && formatEvidenceDate(ev.timestamp);
                  return (
                    <li key={ev.entryId || idx} className="flex items-start gap-3 text-sm">
                      {hasTimestamp ? (
                        <span className="text-white/40 min-w-[80px] text-xs">
                          {formatEvidenceDate(ev.timestamp)}
                          <span className="block text-white/30">{formatEvidenceTime(ev.timestamp)}</span>
                        </span>
                      ) : (
                        <span className="text-white/40 min-w-[80px] text-xs">•</span>
                      )}
                      <span className="text-white/70 flex-1">{ev.preview || '(no preview)'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Confidence/Strength indicator */}
          {insight.confidence !== undefined && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Confidence</span>
                <span className="text-white/80">{Math.round(insight.confidence * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop drawer: slide from right */}
      <div
        className={`hidden sm:flex fixed inset-y-0 right-0 w-[480px] bg-black border-l border-white/10 z-50 flex-col shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur border-b border-white/10 p-6 flex items-start justify-between gap-2">
          <h2 className="text-xl font-semibold pr-4 flex-1">{insight.title}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canHighlight && originalCard && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleHighlight(originalCard);
                }}
                className="p-2 rounded-full transition-colors hover:bg-white/10"
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
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
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
          {/* Type badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full border ${typeColors[insight.type]}`}>
              {insight.type}
            </span>
            {insight.strength && (
              <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                {insight.strength}
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
          {insight.evidence.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/90">Evidence</h3>
              <ul className="space-y-2">
                {insight.evidence.map((ev, idx) => {
                  const hasTimestamp = ev.timestamp && formatEvidenceDate(ev.timestamp);
                  return (
                    <li key={ev.entryId || idx} className="flex items-start gap-3 text-sm">
                      {hasTimestamp ? (
                        <span className="text-white/40 min-w-[80px] text-xs">
                          {formatEvidenceDate(ev.timestamp)}
                          <span className="block text-white/30">{formatEvidenceTime(ev.timestamp)}</span>
                        </span>
                      ) : (
                        <span className="text-white/40 min-w-[80px] text-xs">•</span>
                      )}
                      <span className="text-white/70 flex-1">{ev.preview || '(no preview)'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Confidence/Strength indicator */}
          {insight.confidence !== undefined && (
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/60">Confidence</span>
                <span className="text-white/80">{Math.round(insight.confidence * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


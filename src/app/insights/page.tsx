'use client';

/**
 * PHASE ONE VERIFICATION CHECKLIST
 * 
 * This page is considered healthy when:
 * 
 * 1. DATA FLOW INTEGRITY:
 *    ✓ Sources load from external_entries table
 *    ✓ Reflections load and decrypt successfully
 *    ✓ Reflection links (reflection_links table) connect sources to reflections
 *    ✓ Internal events load for timeline view
 *    ✓ Insights compute correctly from reflections (including source-linked ones)
 * 
 * 2. INSIGHT GENERATION:
 *    ✓ Timeline spikes detect days with ≥3 entries AND ≥2× median activity
 *    ✓ Source-linked reflections show "From source" badge on spikes
 *    ✓ Always-on summary insights compute from last 7 days
 *    ✓ Topic drift analyzes theme changes over time
 *    ✓ Link clusters group related reflections
 * 
 * 3. UI STATE MANAGEMENT:
 *    ✓ Loading states show skeletons (not blank screens)
 *    ✓ Error states display user-friendly messages
 *    ✓ Empty states explain what's needed (not just "No data")
 *    ✓ Source insights panel shows "Not enough data" when reflections.length === 0
 *    ✓ Source insights panel never silently empty when reflections exist
 * 
 * 4. PERFORMANCE:
 *    ✓ All insight computation is client-side (no blocking network calls)
 *    ✓ Supabase client uses singleton pattern (no multiple GoTrueClient instances)
 *    ✓ Reflections are cached and reused across insight computations
 * 
 * 5. DATA QUALITY:
 *    ✓ Reflections with sourceId are correctly linked via reflection_links
 *    ✓ Source titles resolve correctly for "From source" badges
 *    ✓ Timeline events filter correctly (all/mind/sources)
 * 
 * If any of these fail, check:
 * - Console for errors (dev mode only)
 * - Network tab for failed Supabase queries
 * - Reflection links are properly set when importing sources
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { rpcListInternalEvents } from '../lib/internalEvents';
import { computeWeeklyInsights, computeInsightsForWindow, WeeklyInsight } from '../lib/weeklyInsights';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { useLogEvent } from '../lib/useLogEvent';
import { rpcFetchEntries } from '../lib/entries';
import { computeTimelineSpikes, itemToReflectionEntry, attachDemoSourceLinks } from '../lib/insights/timelineSpikes';
import { computeAlwaysOnSummary } from '../lib/insights/alwaysOnSummary';
import { computeLinkClusters } from '../lib/insights/linkClusters';
import { computeStreakCoach } from '../lib/insights/streakCoach';
import { computeTopicDrift } from '../lib/insights/topicDrift';
import { computeContrastPairs } from '../lib/insights/contrastPairs';
import { computeUnifiedSourceInsights, type UnifiedSourceInsights, type SourceEntryLite } from '../lib/insights/fromSources';
import type { ContrastPair } from '../lib/insights/contrastPairs';
import { useHighlights } from '../lib/insights/useHighlights';
import { useFeedback, sortByRecipeScore } from '../lib/insights/feedbackStore';
import type { TimelineSpikeCard, AlwaysOnSummaryCard, LinkClusterCard, StreakCoachCard, InsightCard } from '../lib/insights/types';
import type { TopicDriftBucket } from '../lib/insights/topicDrift';
import type { ReflectionEntry } from '../lib/insights/types';
import { InsightDrawer, normalizeInsight, type NormalizedInsight } from './components/InsightDrawer';
import { SummaryStatsSkeleton, InsightCardSkeleton, TimelineSectionSkeleton, SummaryStatsGridSkeleton } from './components/InsightsSkeleton';
import DebugInsightStrip from '../components/DebugInsightStrip';
import { listExternalEntries } from '../lib/useSources';
import { InsightsSourceCard } from '../components/InsightsSourceCard';
import { useReflectionLinks } from '../lib/reflectionLinks';
import { lifetimeWindow } from '../lib/insights/timeWindows';
import { buildDistributionFromReflections } from '../lib/distributions/buildSeries';
import { classifyDistribution } from '../lib/distributions/classify';
import { generateDistributionInsight } from '../lib/distributions/insights';
import { generateNarrative } from '../lib/distributions/narratives';
import { inspectDistribution } from '../lib/distributions/inspect';
import { fromNarrative } from '../lib/insights/viewModels';
import { InsightPanel } from './components/InsightPanel';
import { InsightTimeline } from './components/InsightTimeline';


/**
 * Compute trend summary counts from topic drift buckets
 * Pure function - no side effects
 */
function computeTrendSummary(buckets: TopicDriftBucket[]): {
  risingCount: number;
  stableCount: number;
  fadingCount: number;
  label: string;
} {
  const risingCount = buckets.filter(b => b.trend === 'rising').length;
  const stableCount = buckets.filter(b => b.trend === 'stable').length;
  const fadingCount = buckets.filter(b => b.trend === 'fading').length;
  
  const parts: string[] = [];
  parts.push(`${risingCount} topic${risingCount === 1 ? '' : 's'} rising`);
  parts.push(`${stableCount} stable`);
  parts.push(`${fadingCount} fading`);
  
  return {
    risingCount,
    stableCount,
    fadingCount,
    label: parts.join(' · '),
  };
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
    case 'source_event':
      // Book/document icon for source events
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
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

/**
 * Get the calendar date key (YYYY-MM-DD) for a given date in local timezone
 */
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compute stats from reflection entries for the last 30 days
 * Returns total entries, active days, and longest streak
 */
function computeStatsForLast30Days(entries: ReflectionEntry[]): {
  totalEntries: number;
  activeDays: number;
  longestStreak: number;
} {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0); // Start of day 30 days ago

  // Filter entries from last 30 days (non-deleted only)
  const recentEntries = entries.filter((entry) => {
    if (entry.deletedAt) return false;
    const entryDate = new Date(entry.createdAt);
    return entryDate >= thirtyDaysAgo && entryDate <= now;
  });

  // Group entries by date (YYYY-MM-DD)
  const entriesByDate = new Map<string, number>();
  recentEntries.forEach((entry) => {
    const entryDate = new Date(entry.createdAt);
    const dateKey = getDateKey(entryDate);
    entriesByDate.set(dateKey, (entriesByDate.get(dateKey) || 0) + 1);
  });

  const totalEntries = recentEntries.length;
  const activeDays = entriesByDate.size;

  // Calculate longest streak of consecutive days with at least one entry
  // We need to check all 30 days to find the longest consecutive streak
  let longestStreak = 0;
  let currentStreak = 0;

  // Create a set of all dates with entries
  const datesWithEntries = new Set(entriesByDate.keys());

  // Iterate through all last 30 days to find longest consecutive streak
  // Start from 30 days ago and go forward to today
  for (let i = 29; i >= 0; i--) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() - i);
    checkDate.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(checkDate);

    if (datesWithEntries.has(dateKey)) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      // Reset streak when we hit a day with no entries
      currentStreak = 0;
    }
  }

  return {
    totalEntries,
    activeDays,
    longestStreak,
  };
}

/**
 * Sparkline component - renders a 28-day mini chart with animations and hover tooltips
 */
function Sparkline({ 
  dailyCounts, 
  dates,
  isLoading = false 
}: { 
  dailyCounts: number[]; 
  dates?: Date[];
  isLoading?: boolean;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);

  if (isLoading) {
    // Show shimmer placeholder
    return (
      <div className="flex-shrink-0 w-full h-7 bg-white/5 rounded shimmer-placeholder" />
    );
  }

  if (!dailyCounts || dailyCounts.length === 0) {
    return null;
  }

  // Find max value for scaling (min is always 0)
  const maxValue = Math.max(...dailyCounts, 1); // Ensure at least 1 to avoid division by zero
  
  const width = 100; // SVG viewBox width
  const height = 28; // SVG viewBox height
  const padding = 2; // Small padding to prevent clipping
  
  // Build path data for the line and points for hover
  const points: string[] = [];
  const pointData: Array<{ x: number; y: number; value: number; date?: Date }> = [];
  const count = dailyCounts.length;
  
  for (let i = 0; i < count; i++) {
    const x = count > 1 
      ? padding + (i / (count - 1)) * (width - 2 * padding)
      : width / 2; // Center if only one point
    const normalizedValue = maxValue > 0 ? dailyCounts[i] / maxValue : 0;
    // Flip Y coordinate (SVG y=0 is at top, but we want 0 at bottom)
    const y = height - padding - normalizedValue * (height - 2 * padding);
    points.push(`${x},${y}`);
    pointData.push({
      x,
      y,
      value: dailyCounts[i],
      date: dates?.[i],
    });
  }
  
  // Only render path if we have at least one point
  if (points.length === 0) {
    return null;
  }
  
  const pathData = count > 1 ? `M ${points.join(' L ')}` : `M ${points[0]} L ${points[0]}`;
  
  // Calculate average for hint text
  const avgValue = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const hoveredPoint = hoveredIndex !== null ? pointData[hoveredIndex] : null;
  
  // Determine hint text based on value vs average
  function getHintText(value: number): string {
    if (value === 0) return 'no activity';
    if (value > avgValue * 1.5) return 'heavier writing';
    if (value < avgValue * 0.5) return 'quieter day';
    return 'normal activity';
  }

  return (
    <div className="relative flex-shrink-0 w-full h-7">
      <svg
        className="w-full h-full sparkline-svg"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        onMouseLeave={() => {
          setHoveredIndex(null);
          setHoverPosition(null);
        }}
      >
        <path
          d={pathData}
          fill="none"
          stroke="rgb(113 113 122 / 0.4)" // zinc-500/40
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="sparkline-path"
        />
        {/* Invisible hover areas for each point */}
        {pointData.map((point, idx) => {
          const segmentWidth = count > 1 ? (width - 2 * padding) / (count - 1) : width;
          const hoverWidth = Math.max(segmentWidth * 0.3, 4);
          
          return (
            <rect
              key={idx}
              x={point.x - hoverWidth / 2}
              y={0}
              width={hoverWidth}
              height={height}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredIndex(idx);
                setHoverPosition({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                });
              }}
            />
          );
        })}
        {/* Highlighted segment on hover */}
        {hoveredIndex !== null && hoveredIndex < pointData.length - 1 && (
          <path
            d={`M ${pointData[hoveredIndex].x},${pointData[hoveredIndex].y} L ${pointData[hoveredIndex + 1].x},${pointData[hoveredIndex + 1].y}`}
            fill="none"
            stroke="rgb(113 113 122 / 0.7)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="sparkline-hover-segment"
          />
        )}
      </svg>
      
      {/* Tooltip */}
      {hoveredPoint && hoverPosition && (
        <div
          className="fixed z-50 sparkline-tooltip"
          style={{
            left: `${hoverPosition.x}px`,
            top: `${hoverPosition.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-xs space-y-1 min-w-[120px] shadow-lg">
            {hoveredPoint.date ? (
              <div className="text-white/90 font-medium">
                {hoveredPoint.date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            ) : null}
            <div className="text-white/70">
              {hoveredPoint.value} reflection{hoveredPoint.value === 1 ? '' : 's'}
            </div>
            <div className="text-white/50 italic">
              {getHintText(hoveredPoint.value)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Feedback buttons component for insight cards
function FeedbackButtons({
  insightId,
  recipeId,
  getFeedback,
  toggleFeedback,
}: {
  insightId: string;
  recipeId: string;
  getFeedback: (id: string) => 'positive' | 'negative' | null;
  toggleFeedback: (id: string, recipe: string, direction: 'up' | 'down') => void;
}) {
  const current = getFeedback(insightId);
  
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => toggleFeedback(insightId, recipeId, 'up')}
        className={`p-1.5 rounded-full transition-colors ${
          current === 'positive'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'text-white/40 hover:text-emerald-400 hover:bg-white/5'
        }`}
        title="Helpful insight"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V2.75a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => toggleFeedback(insightId, recipeId, 'down')}
        className={`p-1.5 rounded-full transition-colors ${
          current === 'negative'
            ? 'bg-rose-500/20 text-rose-400'
            : 'text-white/40 hover:text-rose-400 hover:bg-white/5'
        }`}
        title="Not helpful"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 0 1-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 0 1 1.423.23l3.114 1.04a4.5 4.5 0 0 0 1.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 0 0 7.5 19.75 2.25 2.25 0 0 0 9.75 22a.75.75 0 0 0 .75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 0 0 2.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384m-10.253 1.5H9.7m8.075-9.75c.01.05.027.1.05.148.593 1.2.925 2.55.925 3.977 0 1.487-.36 2.89-.999 4.125m.999-8.25c-.023-.417-.07-.83-.14-1.238a12.13 12.13 0 0 0-.26-1.137" />
        </svg>
      </button>
    </div>
  );
}

type InsightsMode = 'weekly' | 'timeline' | 'summary' | 'yearly' | 'lifetime';

type SimpleEvent = {
  id: string;
  eventAt: string;
  eventType: string;
  plaintext?: unknown;
};

const MODE_OPTIONS: { value: InsightsMode | 'distributions'; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'summary', label: 'Summary' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'distributions', label: 'Distributions' },
  { value: 'lifetime', label: 'Lifetime' },
];

const TOPIC_KEYWORDS = {
  focus: ['focus', 'concentrate', 'attention', 'distracted', 'productive', 'flow'],
  work: ['work', 'job', 'career', 'office', 'meeting', 'project', 'deadline', 'colleague'],
  money: ['money', 'finance', 'budget', 'savings', 'investment', 'expense', 'income', 'salary'],
  health: ['health', 'exercise', 'sleep', 'tired', 'energy', 'workout', 'meditation', 'stress'],
  relationships: ['relationship', 'friend', 'family', 'partner', 'love', 'connection', 'social'],
};

function extractTopicsFromText(text: string): string[] {
  const topics: string[] = [];
  const lower = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      topics.push(topic);
    }
  }
  return topics;
}

export default function InsightsPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [mode, setMode] = useState<InsightsMode>('weekly');

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<SimpleEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'mind' | 'sources'>('all');

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
  const [summaryReflectionEntries, setSummaryReflectionEntries] = useState<ReflectionEntry[]>([]);
  const [sources, setSources] = useState<SourceEntryLite[]>([]);
  const [sourceInsights, setSourceInsights] = useState<UnifiedSourceInsights | null>(null);

  // Timeline spikes state (computed from decrypted reflections)
  const [spikeInsights, setSpikeInsights] = useState<TimelineSpikeCard[]>([]);
  const [reflectionsLoading, setReflectionsLoading] = useState(false);
  const [reflectionsError, setReflectionsError] = useState<string | null>(null);
  const [timelineReflectionEntries, setTimelineReflectionEntries] = useState<ReflectionEntry[]>([]);

  // Link clusters state (computed from decrypted reflections)
  const [clusterInsights, setClusterInsights] = useState<LinkClusterCard[]>([]);

  // Streak coach state (computed from decrypted reflections)
  const [coachInsights, setCoachInsights] = useState<StreakCoachCard[]>([]);

  // Topic drift state (computed from decrypted reflections)
  const [topicDrift, setTopicDrift] = useState<TopicDriftBucket[]>([]);

  // Contrast pairs state (computed from decrypted reflections)
  const [contrastPairs, setContrastPairs] = useState<ContrastPair[]>([]);

  // Lifetime view state
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const [lifetimeError, setLifetimeError] = useState<string | null>(null);
  const [lifetimeStats, setLifetimeStats] = useState<{
    windowLabel: string;
    totalEntries: number;
    totalEvents: number;
    dominantTopics: string[];
    distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed';
    skew: number;
    concentrationShareTop10PercentDays: number;
  } | null>(null);

  // Expansion state for spike cards (tracks which dates are expanded)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Highlights state (backed by localStorage)
  const { highlights, isHighlighted, toggleHighlight } = useHighlights();

  // Feedback state (backed by localStorage)
  const { getFeedback, toggleFeedback, recipeScores, insightScores, hydrateFromStorage } = useFeedback();

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<NormalizedInsight | null>(null);
  const [selectedOriginalCard, setSelectedOriginalCard] = useState<InsightCard | null>(null);

  // Distribution insights view toggle
  const [insightView, setInsightView] = useState<'panel' | 'timeline'>('panel');

  // Hydrate feedback scores from localStorage on mount to ensure stable ordering
  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

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
  }, []);

  // Log navigation event when page loads
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_insights');
  }, [mounted, connected, logEvent]);

  // Load external sources client-side
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    let cancelled = false;

    async function loadSources() {
      if (!address) return;
      try {
        const data = await listExternalEntries(address);
        if (cancelled) return;
        setSources(
          (data as any[]).map((s) => ({
            id: s.id,
            sourceId: s.sourceId ?? s.source_id ?? null,
            title: s.title ?? null,
            kind: s.kind ?? null,
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

  async function loadInsights() {
    if (!connected || !address) return;
    if (!encryptionReady || !sessionKey) {
      if (encryptionError) {
        setError(encryptionError);
        toast.error(encryptionError);
      }
      return;
    }

    setLoading(true);
    setError(null);

    if (!address) return;

    try {
      const { items } = await rpcListInternalEvents(address, sessionKey, {
        limit: 500,
        offset: 0,
      });

      const weekly = computeWeeklyInsights(items);
      setInsights(weekly);
    } catch (e: any) {
      console.error('Failed to load insights', e);
      const msg = e?.message ?? 'Could not load insights';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  // Load insights on mount when connected and encryption ready
  useEffect(() => {
    if (!mounted) return;
    if (!connected) return;
    if (!encryptionReady) return;
    loadInsights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, connected, address, encryptionReady]);

  // Load timeline events when Timeline mode is active
  useEffect(() => {
    if (mode !== 'timeline') return;
    if (!connected || !address) return;
    if (!encryptionReady || !sessionKey) return;

    let cancelled = false;

    async function loadTimeline() {
      if (!address || !sessionKey) return;
      try {
        setTimelineLoading(true);
        setTimelineError(null);

        // Load decrypted events using rpcListInternalEvents
        const result = await rpcListInternalEvents(address, sessionKey, {
          limit: 500,
          offset: 0,
        });

        if (!cancelled) {
          // Convert to SimpleEvent format
          const events: SimpleEvent[] = result.items.map((ev) => {
            let eventType = 'unknown';
            
            // Extract event type from plaintext
            if (ev.plaintext && typeof ev.plaintext === 'object' && ev.plaintext !== null) {
              const payload = ev.plaintext as Record<string, unknown>;
              if ('type' in payload && typeof payload.type === 'string') {
                eventType = payload.type;
              }
            }
            
            return {
              id: ev.id,
              eventAt: ev.eventAt.toISOString(),
              eventType,
              plaintext: ev.plaintext, // Keep plaintext for filtering
            };
          });
          
          setTimelineEvents(events as SimpleEvent[]);
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
  }, [mode, connected, address, encryptionReady, sessionKey]);

  // Load summary data when connected (for health strip and Summary tab)
  useEffect(() => {
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
  }, [connected, address]);

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

        // Check encryption ready
        if (!encryptionReady || !sessionKey) {
          if (encryptionError) {
            setSummaryReflectionsError(encryptionError);
          }
          return;
        }

        // Fetch all reflections (up to 500 for analysis)
        const { items } = await rpcFetchEntries(address!, sessionKey, {
          includeDeleted: false,
          limit: 500,
          offset: 0,
        });

        if (cancelled) return;

        // Convert to ReflectionEntry format
        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        // Compute always-on summary insights (pure function, no network calls)
        const insights = computeAlwaysOnSummary(reflectionEntries);

        // Compute topic drift for "Top topics this month" section
        const drift = computeTopicDrift(reflectionEntries);

        if (!cancelled) {
          setSummaryInsights(insights);
          setTopicDrift(drift);
          setSummaryReflectionEntries(reflectionEntries);
        }
      } catch (err: any) {
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
  }, [mode, connected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Load reflections and compute lifetime view
  useEffect(() => {
    if (mode !== 'lifetime') return;
    if (!connected || !address) return;

    let cancelled = false;

    async function loadLifetime() {
      try {
        setLifetimeLoading(true);
        setLifetimeError(null);

        if (!encryptionReady || !sessionKey) {
          if (encryptionError) {
            setLifetimeError(encryptionError);
          }
          return;
        }

        const { items } = await rpcFetchEntries(address!, sessionKey, {
          includeDeleted: false,
          limit: 1000,
          offset: 0,
        });

        if (cancelled) return;

        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        const window = lifetimeWindow(reflectionEntries);

        // Convert reflections to pseudo events for the window engine
        const pseudoEvents = reflectionEntries.map((r) => ({
          eventAt: new Date(r.createdAt),
          sourceKind: 'journal',
          eventKind: 'written',
          topics: extractTopicsFromText(r.plaintext || ''),
          details: r.plaintext,
        }));

        const stats = computeInsightsForWindow(pseudoEvents as any, window);

        if (!cancelled) {
          setLifetimeStats({
            windowLabel: window.label,
            totalEntries: stats.totalEntries,
            totalEvents: stats.totalEvents,
            dominantTopics: stats.dominantTopics,
            distributionLabel: stats.distributionLabel,
            skew: stats.skew,
            concentrationShareTop10PercentDays: stats.concentrationShareTop10PercentDays,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load lifetime insights', err);
          setLifetimeError(err.message ?? 'Failed to load lifetime insights');
        }
      } finally {
        if (!cancelled) {
          setLifetimeLoading(false);
        }
      }
    }

    loadLifetime();

    return () => {
      cancelled = true;
    };
  }, [mode, connected, address, encryptionReady, sessionKey, encryptionError, getSourceIdFor]);

  // Recompute source-driven insights when sources or summary reflections change
  useEffect(() => {
    setSourceInsights(computeUnifiedSourceInsights(sources, summaryReflectionEntries));
  }, [sources, summaryReflectionEntries]);

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

        // Check encryption ready
        if (!encryptionReady || !sessionKey) {
          if (encryptionError) {
            setReflectionsError(encryptionError);
          }
          return;
        }

        // Fetch all reflections (up to 500 for analysis)
        const { items } = await rpcFetchEntries(address!, sessionKey, {
          includeDeleted: false,
          limit: 500,
          offset: 0,
        });

        if (cancelled) return;

        // Convert to ReflectionEntry format
        const reflectionEntries = attachDemoSourceLinks(
          items.map((item) => itemToReflectionEntry(item, getSourceIdFor))
        );

        // Compute all insights (pure functions, no network calls)
        const spikes = computeTimelineSpikes(reflectionEntries);
        const clusters = computeLinkClusters(reflectionEntries);
        const coach = computeStreakCoach(reflectionEntries);
        const drift = computeTopicDrift(reflectionEntries);
        const contrasts = computeContrastPairs(drift);

        if (!cancelled) {
          setSpikeInsights(spikes);
          setClusterInsights(clusters);
          setCoachInsights(coach);
          setTopicDrift(drift);
          setContrastPairs(contrasts);
          setTimelineReflectionEntries(reflectionEntries);
        }
      } catch (err: any) {
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
  }, [mode, connected, address, encryptionReady, sessionKey, getSourceIdFor]);

  // Compute daily counts for timeline overview (last 28 days)
  // This hook MUST be called before any early returns to maintain hook order
  const timelineDailyData = useMemo(() => {
    const hasTimelineData = timelineReflectionEntries && timelineReflectionEntries.length > 0;
    if (!hasTimelineData) {
      return { dailyCounts: [], dates: [], hasData: false };
    }

    const now = new Date();
    const days: Date[] = [];
    const counts: number[] = [];
    
    // Generate last 28 days
    for (let i = 27; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
      
      const dateKey = getDateKey(date);
      const count = timelineReflectionEntries.filter(entry => {
        if (entry.deletedAt) return false;
        const entryDate = new Date(entry.createdAt);
        return getDateKey(entryDate) === dateKey;
      }).length;
      counts.push(count);
    }
    
    const hasData = counts.some(count => count > 0);
    return { dailyCounts: counts, dates: days, hasData };
  }, [timelineReflectionEntries]);

  // Group summary reflections by source for source insights
  const sourceReflectionsById = useMemo(() => {
    const map = new Map<string, ReflectionEntry[]>();
    summaryReflectionEntries.forEach((r) => {
      if (!r.sourceId) return;
      if (!map.has(r.sourceId)) map.set(r.sourceId, []);
      map.get(r.sourceId)!.push(r);
    });
    return map;
  }, [summaryReflectionEntries]);

  // Generate distribution narratives for week, month, year scopes
  const distributionInsightCards = useMemo(() => {
    if (summaryReflectionEntries.length === 0) {
      return [];
    }

    const scopes: Array<'week' | 'month' | 'year'> = ['week', 'month', 'year'];
    const buckets: Array<'day' | 'week' | 'month'> = ['day', 'week', 'month'];
    const insightCards: ReturnType<typeof fromNarrative>[] = [];

    for (let i = 0; i < scopes.length; i++) {
      const scope = scopes[i];
      const bucket = buckets[i];

      // Build distribution series with placeholder shape (will be classified)
      const series = buildDistributionFromReflections(
        summaryReflectionEntries,
        bucket,
        'normal' // Placeholder shape, will be classified
      );

      // Classify the shape
      const shape = classifyDistribution(series);

      // Skip if insufficient data
      if (shape === 'insufficient_data') {
        continue;
      }

      // Update series with classified shape
      const classifiedSeries = { ...series, shape };

      // Generate insight
      const insight = generateDistributionInsight(classifiedSeries, shape);
      if (!insight) {
        continue;
      }

      // Get stats for confidence adjustment
      const stats = inspectDistribution(classifiedSeries);

      // Generate narrative
      const narrative = generateNarrative(scope, insight, stats.totalEvents);

      // Convert to InsightCard via adapter
      const card = fromNarrative(narrative);
      insightCards.push(card);
    }

    return insightCards;
  }, [summaryReflectionEntries]);

  // Create a map of sourceId -> source title for quick lookups
  const sourceTitleById = useMemo(() => {
    const map = new Map<string, string>();
    sources.forEach((s) => {
      if (s.sourceId && s.title) {
        map.set(s.sourceId, s.title);
      }
    });
    return map;
  }, [sources]);

  // Create a map of sourceId -> source kind for quick lookups
  const sourceKindById = useMemo(() => {
    const map = new Map<string, string>();
    sources.forEach((s) => {
      if (s.sourceId && s.kind) {
        map.set(s.sourceId, s.kind);
      }
    });
    return map;
  }, [sources]);

  // Helper to check if an insight card has evidence from sources
  function hasSourceEvidence(card: InsightCard, reflectionEntries: ReflectionEntry[]): boolean {
    const entryMap = new Map(reflectionEntries.map(e => [e.id, e]));
    return card.evidence.some(ev => {
      const entry = entryMap.get(ev.entryId);
      return entry?.sourceId !== undefined;
    });
  }

  // Helper to get source name for an insight card (returns first source found)
  function getSourceNameForInsight(card: InsightCard, reflectionEntries: ReflectionEntry[]): string | null {
    const entryMap = new Map(reflectionEntries.map(e => [e.id, e]));
    for (const ev of card.evidence) {
      const entry = entryMap.get(ev.entryId);
      if (entry?.sourceId) {
        return sourceTitleById.get(entry.sourceId) || null;
      }
    }
    return null;
  }

  // Helper to get source kind for an insight card (returns first source found)
  function getSourceKindForInsight(card: InsightCard, reflectionEntries: ReflectionEntry[]): string | null {
    const entryMap = new Map(reflectionEntries.map(e => [e.id, e]));
    for (const ev of card.evidence) {
      const entry = entryMap.get(ev.entryId);
      if (entry?.sourceId) {
        return sourceKindById.get(entry.sourceId) || null;
      }
    }
    return null;
  }

  if (!mounted) return null;

  // Derive latest insight if available
  const latest = insights.length > 0 ? insights[0] : null;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Insights</h1>
        <p className="text-center text-sm text-white/60 mb-6">
          Different ways to view your encrypted activity.
        </p>

        {/* Health strip - shows summary data when loaded and connected */}
        {connected && !summaryLoading && summaryData && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 mb-6">
            <div className="flex items-center justify-center gap-6 text-xs text-white/60">
              <span>
                <span className="font-medium text-white/80">{summaryData.entries}</span> reflections
              </span>
              <span className="text-white/20">•</span>
              <span>
                <span className="font-medium text-white/80">{summaryData.totalEvents}</span> events
              </span>
              <span className="text-white/20">•</span>
              <span>
                Last active{' '}
                <span className="font-medium text-white/80">
                  {summaryData.lastActiveAt
                    ? new Date(summaryData.lastActiveAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'never'}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Mode switcher */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-xl border border-white/10 p-1 bg-white/5">
            {MODE_OPTIONS.map((opt) => {
              if (opt.value === 'yearly') {
                // Yearly navigates to separate route
                return (
                  <Link
                    key={opt.value}
                    href="/insights/yearly"
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      pathname === '/insights/yearly'
                        ? 'bg-white text-black font-medium'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              }
              if (opt.value === 'distributions') {
                // Distributions navigates to separate route
                return (
                  <Link
                    key={opt.value}
                    href="/insights/distributions"
                    className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                      pathname === '/insights/distributions'
                        ? 'bg-white text-black font-medium'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {opt.label}
                  </Link>
                );
              }
              // After filtering out 'yearly' and 'distributions', value is InsightsMode
              return (
                <button
                  key={opt.value}
                  onClick={() => setMode(opt.value as InsightsMode)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    mode === opt.value
                      ? 'bg-white text-black font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Timeline view */}
        {mode === 'timeline' && (
          <div className="mt-8 space-y-8">
            {/* Timeline Overview with Sparkline */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Timeline Overview
                </h2>

                {reflectionsLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <Sparkline dailyCounts={[]} isLoading={true} />
                  </div>
                ) : !timelineDailyData.hasData ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                    <svg
                      className="w-12 h-12 text-white/40 mx-auto mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <h3 className="text-sm font-medium text-white/90 mb-2">
                      No activity yet in this window
                    </h3>
                    <p className="text-sm text-white/60">
                      New entries here will start drawing your timeline
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                    <Sparkline 
                      dailyCounts={timelineDailyData.dailyCounts} 
                      dates={timelineDailyData.dates}
                      isLoading={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Timeline Spikes Section */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                  Timeline Spikes
                </h2>

                {reflectionsLoading && (
                  <TimelineSectionSkeleton />
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
                    {sortByRecipeScore(spikeInsights, recipeScores, insightScores).map((spike) => {
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
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-amber-200">{spike.title}</h3>
                              {hasSourceEvidence(spike, timelineReflectionEntries) && (
                                <div className="mt-1.5">
                                  <span 
                                    className="inline-flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10"
                                    title="Derived from imported source material"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                    </svg>
                                    {(() => {
                                      const sourceName = getSourceNameForInsight(spike, timelineReflectionEntries);
                                      const sourceKind = getSourceKindForInsight(spike, timelineReflectionEntries);
                                      if (sourceName && sourceKind) {
                                        return `From ${sourceKind}: ${sourceName}`;
                                      } else if (sourceName) {
                                        return `From Source: ${sourceName}`;
                                      } else if (sourceKind) {
                                        return `From ${sourceKind}`;
                                      }
                                      return 'From source';
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <FeedbackButtons
                                insightId={spike.id}
                                recipeId={spike.kind}
                                getFeedback={getFeedback}
                                toggleFeedback={toggleFeedback}
                              />
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

            {/* Streak Coach Section */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                  </svg>
                  Streak Coach
                </h2>

                {reflectionsLoading && (
                  <TimelineSectionSkeleton />
                )}

                {!reflectionsLoading && coachInsights.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="text-sm text-white/60">
                      Keep writing to build up enough data for personalized streak coaching. We need at least 5 reflections to detect your best writing time.
                    </p>
                  </div>
                )}

                {!reflectionsLoading && coachInsights.length > 0 && (
                  <div className="space-y-4">
                    {sortByRecipeScore(coachInsights, recipeScores, insightScores).map((coach) => {
                      const highlighted = isHighlighted(coach);
                      return (
                        <div
                          key={coach.id}
                          className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-3"
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sky-200">{coach.title}</h3>
                              {hasSourceEvidence(coach, timelineReflectionEntries) && (
                                <div className="mt-1.5">
                                  <span className="inline-flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                    </svg>
                                    {(() => {
                                      const sourceName = getSourceNameForInsight(coach, timelineReflectionEntries);
                                      const sourceKind = getSourceKindForInsight(coach, timelineReflectionEntries);
                                      if (sourceName && sourceKind) {
                                        return `From ${sourceKind}: ${sourceName}`;
                                      } else if (sourceName) {
                                        return `From Source: ${sourceName}`;
                                      } else if (sourceKind) {
                                        return `From ${sourceKind}`;
                                      }
                                      return 'From source';
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <FeedbackButtons
                                insightId={coach.id}
                                recipeId={coach.kind}
                                getFeedback={getFeedback}
                                toggleFeedback={toggleFeedback}
                              />
                              <button
                                type="button"
                                onClick={() => toggleHighlight(coach)}
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
                            </div>
                          </div>

                          {/* Explanation */}
                          <p className="text-sm text-white/70">{coach.explanation}</p>

                          {/* Stats row */}
                          <div className="flex flex-wrap gap-3">
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                              {coach.data.currentStreak > 0 ? `${coach.data.currentStreak}-day streak` : 'No active streak'}
                            </span>
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                              Best: {coach.data.longestStreak} days
                            </span>
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                              {coach.data.percentageAtBestHour}% at {coach.data.bestHourLabel}
                            </span>
                          </div>

                          {/* Evidence */}
                          {coach.evidence.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-white/50 uppercase tracking-wide">
                                Entries at {coach.data.bestHourLabel}
                              </p>
                              <ul className="space-y-1.5">
                                {coach.evidence.slice(0, 3).map((ev) => (
                                  <li
                                    key={ev.entryId}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="text-white/40 min-w-[80px]">
                                      {new Date(ev.timestamp).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                    <span className="text-white/60 truncate">
                                      {ev.preview || '(no preview)'}
                                    </span>
                                  </li>
                                ))}
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

            {/* Link Clusters Section */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                  </svg>
                  Link Clusters
                </h2>

                {reflectionsLoading && (
                  <TimelineSectionSkeleton />
                )}

                {!reflectionsLoading && clusterInsights.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="text-sm text-white/60">
                      No clusters detected yet. When you have reflections with similar themes, they&apos;ll be grouped here automatically.
                    </p>
                  </div>
                )}

                {!reflectionsLoading && clusterInsights.length > 0 && (
                  <div className="space-y-4">
                    {sortByRecipeScore(clusterInsights, recipeScores, insightScores).map((cluster) => {
                      const highlighted = isHighlighted(cluster);
                      return (
                        <div
                          key={cluster.id}
                          className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-3"
                        >
                          {/* Card header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-violet-200">{cluster.title}</h3>
                              {hasSourceEvidence(cluster, timelineReflectionEntries) && (
                                <div className="mt-1.5">
                                  <span className="inline-flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                    </svg>
                                    {(() => {
                                      const sourceName = getSourceNameForInsight(cluster, timelineReflectionEntries);
                                      const sourceKind = getSourceKindForInsight(cluster, timelineReflectionEntries);
                                      if (sourceName && sourceKind) {
                                        return `From ${sourceKind}: ${sourceName}`;
                                      } else if (sourceName) {
                                        return `From Source: ${sourceName}`;
                                      } else if (sourceKind) {
                                        return `From ${sourceKind}`;
                                      }
                                      return 'From source';
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <FeedbackButtons
                                insightId={cluster.id}
                                recipeId={cluster.kind}
                                getFeedback={getFeedback}
                                toggleFeedback={toggleFeedback}
                              />
                              <button
                                type="button"
                                onClick={() => toggleHighlight(cluster)}
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
                                {cluster.data.clusterSize} entries
                              </span>
                            </div>
                          </div>

                          {/* Explanation / Summary */}
                          <p className="text-sm text-white/70">{cluster.explanation}</p>

                          {/* Top tokens as tags */}
                          {cluster.data.topTokens.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {cluster.data.topTokens.map((token) => (
                                <span
                                  key={token}
                                  className="text-xs text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full"
                                >
                                  {token}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Evidence list */}
                          {cluster.evidence.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-white/50 uppercase tracking-wide">
                                Related entries
                              </p>
                              <ul className="space-y-1.5">
                                {cluster.evidence.slice(0, 4).map((ev) => (
                                  <li
                                    key={ev.entryId}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <span className="text-white/40 min-w-[80px]">
                                      {new Date(ev.timestamp).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                    <span className="text-white/60 truncate">
                                      {ev.preview || '(no preview)'}
                                    </span>
                                  </li>
                                ))}
                                {cluster.evidence.length > 4 && (
                                  <li className="text-xs text-white/40 pl-[88px]">
                                    +{cluster.evidence.length - 4} more
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

            {/* Trend Summary Strip */}
            {connected && !reflectionsLoading && topicDrift.length > 0 && (() => {
              const trendSummary = computeTrendSummary(topicDrift);
              return (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-white/40 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                    </svg>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white/60">Trend summary</span>
                      <span className="text-white/20">·</span>
                      <span className="text-xs text-white/50">{trendSummary.label}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Topic Drift Section */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                  </svg>
                  Topic Drift
                </h2>

                {reflectionsLoading && (
                  <TimelineSectionSkeleton />
                )}

                {!reflectionsLoading && topicDrift.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <p className="text-sm text-white/60">
                      Write a few more reflections and we&apos;ll start showing how your topics move over time.
                    </p>
                  </div>
                )}

                {!reflectionsLoading && topicDrift.length > 0 && (
                  <div className="space-y-4">
                    {topicDrift.map((bucket) => {
                      // Trend badge styling
                      const trendStyles = {
                        rising: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                        stable: 'bg-white/10 text-white/60 border-white/20',
                        fading: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      };
                      const trendLabels = {
                        rising: 'Rising',
                        stable: 'Stable',
                        fading: 'Fading',
                      };
                      
                      // Strength badge styling
                      const strengthStyles = {
                        high: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
                        medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                        low: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
                      };
                      const strengthLabels = {
                        high: 'High Drift',
                        medium: 'Medium Drift',
                        low: 'Low Drift',
                      };

                      return (
                        <div
                          key={bucket.topic}
                          className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5 space-y-3 cursor-pointer hover:bg-teal-500/10 transition-colors"
                          onClick={(e) => {
                            // Don't open drawer if clicking on buttons
                            if ((e.target as HTMLElement).closest('button')) return;
                            const normalized = normalizeInsight(bucket);
                            setSelectedInsight(normalized);
                            setSelectedOriginalCard(null); // Topic drift can't be highlighted
                            setDrawerOpen(true);
                          }}
                        >
                          {/* Topic header */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-1 min-w-0 sm:flex-nowrap">
                                <h3 className="font-medium text-teal-200 capitalize flex-shrink-0">{bucket.topic}</h3>
                                <div className="flex-1 min-w-0 max-w-[100px] sm:max-w-[180px] h-7">
                                  <Sparkline dailyCounts={bucket.dailyCounts} isLoading={false} />
                                </div>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${trendStyles[bucket.trend]}`}
                              >
                                {trendLabels[bucket.trend]}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${strengthStyles[bucket.strengthLabel]}`}
                              >
                                {strengthLabels[bucket.strengthLabel]}
                              </span>
                            </div>
                            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full flex-shrink-0">
                              {bucket.count} reflection{bucket.count === 1 ? '' : 's'}
                            </span>
                          </div>

                          {/* Sample titles */}
                          {bucket.sampleTitles.length > 0 && (
                            <ul className="space-y-1.5">
                              {bucket.sampleTitles.map((title, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-center gap-2 text-xs"
                                >
                                  <span className="text-teal-400/60">•</span>
                                  <span className="text-white/60 truncate">{title}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Contrast Pairs Section */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                  </svg>
                  Contrast Pairs
                </h2>

                {reflectionsLoading && (
                  <TimelineSectionSkeleton />
                )}

                {!reflectionsLoading && contrastPairs.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/60">
                    Not enough data yet. Keep writing and we will show where your themes pull in opposite directions.
                  </div>
                )}

                {!reflectionsLoading && contrastPairs.length > 0 && (
                  <div className="space-y-4">
                    {contrastPairs.slice(0, 2).map((pair, index) => {
                      const insightId = `contrastPairs-${pair.topicA}-${pair.topicB}-${index}`;
                      
                      // Trend badge styling
                      const trendStyles = {
                        rising: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
                        stable: 'bg-white/10 text-white/60 border-white/20',
                        fading: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
                      };
                      
                      return (
                        <div
                          key={insightId}
                          className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-4 cursor-pointer hover:bg-orange-500/10 transition-colors"
                          onClick={(e) => {
                            // Don't open drawer if clicking on buttons
                            if ((e.target as HTMLElement).closest('button')) return;
                            const normalized = normalizeInsight(pair, index);
                            setSelectedInsight(normalized);
                            setSelectedOriginalCard(null); // Contrast pairs can't be highlighted
                            setDrawerOpen(true);
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-orange-200 capitalize">{pair.topicA}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${trendStyles[pair.trendA]}`}>
                                  Rising
                                </span>
                                <span className="text-white/30">vs</span>
                                <span className="font-medium text-orange-200 capitalize">{pair.topicB}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${trendStyles[pair.trendB]}`}>
                                  Fading
                                </span>
                              </div>
                            </div>

                            <div onClick={(e) => e.stopPropagation()}>
                              <FeedbackButtons
                                insightId={insightId}
                                recipeId="contrastPairs"
                                getFeedback={getFeedback}
                                toggleFeedback={toggleFeedback}
                              />
                            </div>
                          </div>

                          <p className="text-sm text-white/70">
                            {pair.summary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Activity Timeline Section */}
            {connected && encryptionReady && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    Activity Timeline
                  </h2>
                  <select
                    value={timelineFilter}
                    onChange={(e) => setTimelineFilter(e.target.value as 'all' | 'mind' | 'sources')}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="all">All</option>
                    <option value="mind">My mind</option>
                    <option value="sources">Sources</option>
                  </select>
                </div>

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
                // Filter events based on selected filter
                const filteredEvents = timelineEvents.filter((ev) => {
                  if (timelineFilter === 'all') return true;
                  
                  // Check if event has source_id in plaintext
                  const hasSourceId = ev.plaintext && 
                    typeof ev.plaintext === 'object' && 
                    ev.plaintext !== null &&
                    'source_id' in ev.plaintext &&
                    typeof (ev.plaintext as Record<string, unknown>).source_id === 'string';
                  
                  if (timelineFilter === 'sources') {
                    return hasSourceId;
                  }
                  
                  // 'mind' filter - events without source_id
                  if (timelineFilter === 'mind') {
                    return !hasSourceId;
                  }
                  
                  return true;
                });
                
                if (filteredEvents.length === 0) {
                  return (
                    <p className="text-sm text-white/60">
                      No events match the selected filter.
                    </p>
                  );
                }
                
                // Group events by calendar day
                const groupedByDay = filteredEvents.reduce((acc, ev) => {
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
                }, {} as Record<string, typeof filteredEvents>);

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
                            
                            // Extract title for source events
                            let eventTitle: string | null = null;
                            if (ev.eventType === 'source_event' && ev.plaintext && typeof ev.plaintext === 'object' && ev.plaintext !== null) {
                              const payload = ev.plaintext as Record<string, unknown>;
                              if ('title' in payload && typeof payload.title === 'string') {
                                eventTitle = payload.title;
                              }
                            }

                            // Badge color based on event type
                            const badgeClass = isUnknown
                              ? 'bg-zinc-700/50 text-zinc-400'
                              : ev.eventType === 'source_event'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
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
                                
                                {/* Title for source events */}
                                {eventTitle && (
                                  <span className="text-sm text-white/70 flex-1 truncate">
                                    {eventTitle}
                                  </span>
                                )}
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

            {/* Loading state */}
            {connected && encryptionReady && summaryLoading && (
              <div className="rounded-2xl border border-white/10 p-6 space-y-4">
                <div className="h-6 bg-white/10 animate-pulse rounded w-48 mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-white/5 animate-pulse rounded-xl" />
                  <div className="h-24 bg-white/5 animate-pulse rounded-xl" />
                </div>
              </div>
            )}

            {/* Error state */}
            {connected && encryptionReady && !summaryLoading && summaryError && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
                <p className="text-sm text-rose-400">{summaryError}</p>
              </div>
            )}

            {/* Summary data */}
            {connected && encryptionReady && !summaryLoading && !summaryError && summaryData && (
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

                {/* Top topics this month */}
                <section className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs font-semibold text-white">
                    Top topics this month
                  </p>
                  {summaryReflectionsLoading ? (
                    <div className="mt-3 flex gap-2">
                      <div className="h-6 w-20 bg-white/10 rounded-full animate-pulse" />
                      <div className="h-6 w-16 bg-white/10 rounded-full animate-pulse" />
                      <div className="h-6 w-24 bg-white/10 rounded-full animate-pulse" />
                    </div>
                  ) : topicDrift.length === 0 ? (
                    <p className="mt-2 text-xs text-white/60">
                      Keep writing. When we see clear themes, your top topics will appear here.
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topicDrift.slice(0, 3).map((bucket) => (
                        <span
                          key={bucket.topic}
                          className="rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs text-white/80"
                        >
                          {bucket.topic} · {bucket.count} entries
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                {/* Source-driven topics */}
                <section className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-white">Top topics this month</p>
                    <span className="text-[11px] text-white/50">External sources</span>
                  </div>
                  {sources.length === 0 ? (
                    <p className="text-sm text-white/60">Connect a source to get topic insights.</p>
                  ) : sourceReflectionsById.size === 0 ? (
                    <p className="text-sm text-white/60">No source-driven insights yet.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {sources
                        .filter((s) => s.sourceId && sourceReflectionsById.has(s.sourceId))
                        .map((source) => {
                          const highlight =
                            sourceInsights?.highlights.find((h) => h.sourceId === source.sourceId)?.items?.[0];
                          const reflectionsForSource = sourceReflectionsById.get(source.sourceId!) ?? [];
                          return (
                            <InsightsSourceCard
                              key={source.sourceId ?? source.id}
                              source={source}
                              reflections={reflectionsForSource}
                              highlight={highlight}
                            />
                          );
                        })}
                    </div>
                  )}
                </section>

                {/* Quick Stats Strip */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
                  {summaryReflectionsLoading ? (
                    <SummaryStatsGridSkeleton />
                  ) : (() => {
                    const stats = computeStatsForLast30Days(summaryReflectionEntries);
                    const hasData = stats.totalEntries > 0;

                    if (!hasData) {
                      return (
                        <div className="text-center py-2">
                          <p className="text-sm text-white/60">
                            Start writing to see your stats here
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        {/* Total entries */}
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Total entries</div>
                          <div className="text-2xl font-semibold text-white">{stats.totalEntries}</div>
                        </div>
                        {/* Active days */}
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Active days</div>
                          <div className="text-2xl font-semibold text-white">{stats.activeDays}</div>
                        </div>
                        {/* Longest streak */}
                        <div className="text-center">
                          <div className="text-xs text-white/60 mb-1">Longest streak</div>
                          <div className="text-2xl font-semibold text-white">{stats.longestStreak}</div>
                        </div>
                      </div>
                    );
                  })()}
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
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <InsightCardSkeleton key={i} />
                      ))}
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
                      {sortByRecipeScore(summaryInsights, recipeScores, insightScores).map((insight) => {
                        const highlighted = isHighlighted(insight);
                        return (
                          <div
                            key={insight.id}
                            className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                            onClick={(e) => {
                              // Don't open drawer if clicking on buttons
                              if ((e.target as HTMLElement).closest('button')) return;
                              const normalized = normalizeInsight(insight);
                              setSelectedInsight(normalized);
                              setSelectedOriginalCard(insight);
                              setDrawerOpen(true);
                            }}
                          >
                            {/* Card header */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-emerald-200">{insight.title}</h3>
                                {hasSourceEvidence(insight, summaryReflectionEntries) && (
                                  <div className="mt-1.5">
                                    <span className="inline-flex items-center gap-1 text-xs text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                      </svg>
                                      {(() => {
                                        const sourceName = getSourceNameForInsight(insight, summaryReflectionEntries);
                                        const sourceKind = getSourceKindForInsight(insight, summaryReflectionEntries);
                                        if (sourceName && sourceKind) {
                                          return `From ${sourceKind}: ${sourceName}`;
                                        } else if (sourceName) {
                                          return `From Source: ${sourceName}`;
                                        } else if (sourceKind) {
                                          return `From ${sourceKind}`;
                                        }
                                        return 'From source';
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <FeedbackButtons
                                  insightId={insight.id}
                                  recipeId={insight.kind}
                                  getFeedback={getFeedback}
                                  toggleFeedback={toggleFeedback}
                                />
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
                                  {insight.data.summaryType === 'writing_change'
                                    ? 'Trend'
                                    : insight.data.summaryType === 'consistency'
                                    ? 'Consistency'
                                    : insight.data.summaryType === 'weekly_pattern'
                                    ? 'Pattern'
                                    : 'Spike'}
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

                {/* Distribution Insights Panel */}
                {!summaryReflectionsLoading && !summaryReflectionsError && distributionInsightCards.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-50">
                        Distribution Insights
                      </h2>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setInsightView('panel')}
                          className={`text-xs px-3 py-1 rounded border transition-colors ${
                            insightView === 'panel'
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                          }`}
                        >
                          Panel
                        </button>
                        <button
                          type="button"
                          onClick={() => setInsightView('timeline')}
                          className={`text-xs px-3 py-1 rounded border transition-colors ${
                            insightView === 'timeline'
                              ? 'bg-white/10 border-white/20 text-white'
                              : 'bg-white/5 border-white/10 text-white/60 hover:text-white/80'
                          }`}
                        >
                          Timeline
                        </button>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                      {insightView === 'panel' ? (
                        <InsightPanel insights={distributionInsightCards} />
                      ) : (
                        <InsightTimeline insights={distributionInsightCards} />
                      )}
                    </div>
                  </div>
                )}

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

        {/* Lifetime view */}
        {mode === 'lifetime' && (
          <div className="mt-8 space-y-6">
            {lifetimeLoading && (
              <div className="rounded-2xl border border-white/10 p-6 text-center">
                <p className="text-white/70">Loading lifetime insights…</p>
              </div>
            )}

            {lifetimeError && !lifetimeLoading && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center">
                <p className="text-sm text-rose-400">{lifetimeError}</p>
              </div>
            )}

            {!lifetimeLoading && !lifetimeError && lifetimeStats && (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Lifetime</h2>
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80">
                      Pattern: {lifetimeStats.distributionLabel}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 mt-1">{lifetimeStats.windowLabel}</p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-2xl font-semibold">{lifetimeStats.totalEntries}</div>
                      <div className="text-xs text-white/50 mt-1">Total entries</div>
                    </div>
                    <div className="rounded-xl bg-white/5 p-4 text-center">
                      <div className="text-2xl font-semibold">{lifetimeStats.totalEvents}</div>
                      <div className="text-xs text-white/50 mt-1">Total events</div>
                    </div>
                  </div>
                </div>

                {lifetimeStats.dominantTopics.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    <h2 className="text-lg font-semibold mb-3">Dominant Topics</h2>
                    <div className="flex flex-wrap gap-2">
                      {lifetimeStats.dominantTopics.map((topic) => (
                        <span
                          key={topic}
                          className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white/90"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Weekly view (existing content) */}
        {mode === 'weekly' && (
          <>

            {/* Loading state */}
            {connected && encryptionReady && loading && (
              <div className="rounded-2xl border border-white/10 p-6 mb-8 space-y-4">
                <div className="h-6 bg-white/10 animate-pulse rounded w-48" />
                <SummaryStatsSkeleton />
                <div className="space-y-2 mt-4">
                  <div className="h-3 bg-white/5 animate-pulse rounded w-16 mb-2" />
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 bg-white/5 animate-pulse rounded-full w-20" />
                    <div className="h-6 bg-white/5 animate-pulse rounded-full w-16" />
                    <div className="h-6 bg-white/5 animate-pulse rounded-full w-24" />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="h-3 bg-white/5 animate-pulse rounded w-20 mb-2" />
                  <div className="h-4 bg-white/5 animate-pulse rounded w-full" />
                  <div className="h-4 bg-white/5 animate-pulse rounded w-3/4" />
                </div>
              </div>
            )}

            {/* Empty state */}
            {connected && encryptionReady && !loading && insights.length === 0 && (
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
            {connected && encryptionReady && !loading && latest && (
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
                      {latest.distributionLabel && (
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
                          <span className="font-medium text-white/80">Pattern</span>
                          <span>{latest.distributionLabel}</span>
                        </div>
                      )}
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

      {/* Insight Detail Drawer */}
      <InsightDrawer
        insight={selectedInsight}
        isOpen={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedInsight(null);
          setSelectedOriginalCard(null);
        }}
        originalCard={selectedOriginalCard ?? undefined}
        isHighlighted={selectedOriginalCard ? isHighlighted : undefined}
        toggleHighlight={selectedOriginalCard ? toggleHighlight : undefined}
        reflectionEntries={
          mode === 'timeline'
            ? timelineReflectionEntries
            : mode === 'summary'
            ? summaryReflectionEntries
            : []
        }
        sources={sources}
        isLoading={
          mode === 'timeline'
            ? reflectionsLoading
            : mode === 'summary'
            ? summaryReflectionsLoading
            : false
        }
        isEmpty={
          mode === 'timeline'
            ? !reflectionsLoading && !reflectionsError && spikeInsights.length === 0 && clusterInsights.length === 0 && coachInsights.length === 0 && topicDrift.length === 0 && contrastPairs.length === 0
            : mode === 'summary'
            ? !summaryReflectionsLoading && !summaryReflectionsError && summaryInsights.length === 0
            : false
        }
        onNewReflection={() => {
          router.push('/');
          // Small delay to ensure page has loaded before focusing
          setTimeout(() => {
            const textarea = document.querySelector('textarea[ref]') as HTMLTextAreaElement;
            if (textarea) {
              textarea.focus();
              textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }}
      />

      <DebugInsightStrip />
    </main>
  );
}

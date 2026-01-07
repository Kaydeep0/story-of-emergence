// src/app/lib/insights/computeInsightsForWindow.ts
// Canonical insight engine entry point
// Phase 4.2: Single source of truth for insight computation

/**
 * Insight Engine Contract
 * This system reveals patterns and trajectories.
 * It does not recommend actions or optimize behavior.
 * Interpretability over instruction.
 */

import type { InsightArtifact, InsightHorizon, InsightArtifactDebug } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { computeWeeklyArtifact } from './computeWeeklyArtifact';
import { computeSummaryArtifact } from './computeSummaryArtifact';
import { computeTimelineArtifact } from './computeTimelineArtifact';
import { computeYearlyArtifact } from './computeYearlyArtifact';
import { computeLifetimeArtifact } from './computeLifetimeArtifact';
import { computeYoYArtifact } from './computeYoYArtifact';
import { computeDistributionsArtifact } from './computeDistributionsArtifact';
import { extractPatternsFromArtifact } from './patterns/extractPatterns';
import { snapshotPatterns } from '../patternMemory/patternSnapshot';
import { analyzePatternDeltas } from '../patternMemory/patternDelta';
import { generatePatternNarratives } from '../patternMemory/patternNarratives';
import { selectNarratives } from '../patternMemory/selectNarratives';
import { attachNarrativesToArtifact } from '../patternMemory/attachNarratives';

/**
 * Canonical engine entry point for computing insights
 * 
 * This is the SINGLE SOURCE OF TRUTH for insight computation.
 * All insight computation should route through this function.
 * 
 * @param args - Configuration for insight computation
 * @returns InsightArtifact with cards ordered as expected for the horizon
 */
export function computeInsightsForWindow(args: {
  horizon: InsightHorizon;
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
  previousSnapshots?: Array<import('../patternMemory/patternSnapshot').PatternSnapshot>;
  fromYear?: number;
  toYear?: number;
  /** Dev-only: Reflection intake counters for debugging */
  reflectionsLoaded?: number;
  eventsGenerated?: number;
}): InsightArtifact {
  const { horizon, events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, previousSnapshots = [], reflectionsLoaded, eventsGenerated } = args;
  
  let artifact: InsightArtifact;
  
  if (horizon === 'weekly') {
    artifact = computeWeeklyArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
    });
  } else if (horizon === 'summary') {
    artifact = computeSummaryArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
    });
  } else if (horizon === 'timeline') {
    artifact = computeTimelineArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
    });
  } else if (horizon === 'yearly') {
    // Extract reflections from args if available (for fallback)
    const reflections = (args as any).reflections as Array<{ id: string; createdAt: string; plaintext: string }> | undefined;
    artifact = computeYearlyArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
      reflections,
    });
  } else if (horizon === 'lifetime') {
    // Extract reflections from args if available (for fallback)
    const reflections = (args as any).reflections as Array<{ id: string; createdAt: string; plaintext: string }> | undefined;
    artifact = computeLifetimeArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
      reflections,
    });
  } else if (horizon === 'yoy') {
    // Extract reflections from args if available (for fallback)
    const reflections = (args as any).reflections as Array<{ id: string; createdAt: string; plaintext: string }> | undefined;
    artifact = computeYoYArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
      fromYear: args.fromYear,
      toYear: args.toYear,
      reflections,
    });
  } else if (horizon === 'distributions') {
    // Extract reflections from args if available (for fallback)
    const reflections = (args as any).reflections as Array<{ id: string; createdAt: string; plaintext: string }> | undefined;
    artifact = computeDistributionsArtifact({
      events,
      windowStart,
      windowEnd,
      timezone,
      wallet,
      entriesCount,
      eventsCount,
      reflections,
    });
  } else {
    throw new Error(`Horizon ${horizon} not yet implemented in engine. Use dedicated page routes instead.`);
  }
  
  // Merge debug information (artifact may already have debug from computeWeeklyArtifact)
  // Only add/overwrite if artifact doesn't already have comprehensive debug
  if (!artifact.debug || !artifact.debug.reflectionsInWindow) {
    const eventDates = events
      .map(e => {
        // Extract timestamp using same logic as reflectionAdapters
      const isUnified = 'sourceKind' in e;
      let ts: Date | null = null;
      
      if (isUnified) {
        const unified = e as UnifiedInternalEvent & { occurredAt?: string | Date; createdAt?: string | Date; timestamp?: string | Date };
        ts = unified.occurredAt ? (typeof unified.occurredAt === 'string' ? new Date(unified.occurredAt) : unified.occurredAt) :
             unified.createdAt ? (typeof unified.createdAt === 'string' ? new Date(unified.createdAt) : unified.createdAt) :
             unified.eventAt ? new Date(unified.eventAt) :
             unified.timestamp ? (typeof unified.timestamp === 'string' ? new Date(unified.timestamp) : unified.timestamp) :
             null;
      } else {
        const internal = e as InternalEvent & { occurredAt?: string | Date; timestamp?: string | Date };
        ts = internal.occurredAt ? (typeof internal.occurredAt === 'string' ? new Date(internal.occurredAt) : internal.occurredAt) :
             internal.createdAt ? (internal.createdAt instanceof Date ? internal.createdAt : new Date(internal.createdAt)) :
             internal.eventAt ? (internal.eventAt instanceof Date ? internal.eventAt : new Date(internal.eventAt)) :
             internal.timestamp ? (typeof internal.timestamp === 'string' ? new Date(internal.timestamp) : internal.timestamp) :
             null;
      }
      
      return ts ? ts.toISOString() : null;
    })
    .filter((d): d is string => d !== null && d !== undefined)
    .sort();
  
    const debug: InsightArtifactDebug = {
      eventCount: events.length,
      windowStartIso: windowStart.toISOString(),
      windowEndIso: windowEnd.toISOString(),
      minEventIso: eventDates.length > 0 ? eventDates[0] : null,
      maxEventIso: eventDates.length > 0 ? eventDates[eventDates.length - 1] : null,
      sampleEventIds: events.slice(0, 3).map(e => e.id ?? 'unknown'),
      sampleEventDates: events.slice(0, 3).map(e => {
        const isUnified = 'sourceKind' in e;
        let ts: Date | null = null;
        if (isUnified) {
          const unified = e as UnifiedInternalEvent & { occurredAt?: string | Date; createdAt?: string | Date; timestamp?: string | Date };
          ts = unified.occurredAt ? (typeof unified.occurredAt === 'string' ? new Date(unified.occurredAt) : unified.occurredAt) :
               unified.createdAt ? (typeof unified.createdAt === 'string' ? new Date(unified.createdAt) : unified.createdAt) :
               unified.eventAt ? new Date(unified.eventAt) :
               unified.timestamp ? (typeof unified.timestamp === 'string' ? new Date(unified.timestamp) : unified.timestamp) :
               null;
        } else {
          const internal = e as InternalEvent & { occurredAt?: string | Date; timestamp?: string | Date };
          ts = internal.occurredAt ? (typeof internal.occurredAt === 'string' ? new Date(internal.occurredAt) : internal.occurredAt) :
               internal.createdAt ? (internal.createdAt instanceof Date ? internal.createdAt : new Date(internal.createdAt)) :
               internal.eventAt ? (internal.eventAt instanceof Date ? internal.eventAt : new Date(internal.eventAt)) :
               internal.timestamp ? (typeof internal.timestamp === 'string' ? new Date(internal.timestamp) : internal.timestamp) :
               null;
        }
        return ts ? ts.toISOString() : 'invalid';
      }),
      // Dev-only reflection intake counters
      reflectionsLoaded: args.reflectionsLoaded,
      eventsGenerated: args.eventsGenerated,
    };
    
    // Merge with existing debug if present (preserve validation telemetry from computeWeeklyArtifact)
    artifact.debug = {
      ...debug,
      ...artifact.debug, // Preserve validation telemetry
    };
  }
  
  // Dev-only validation checks
  if (process.env.NODE_ENV === 'development' && artifact.debug) {
    if (events.length > 0) {
      const minDate = artifact.debug.minEventIso ? new Date(artifact.debug.minEventIso) : null;
      const maxDate = artifact.debug.maxEventIso ? new Date(artifact.debug.maxEventIso) : null;
      
      // Check if minEventIso is after windowEndIso
      if (minDate && minDate > windowEnd) {
        console.error(`[computeInsightsForWindow] minEventIso (${artifact.debug.minEventIso}) is after windowEndIso (${artifact.debug.windowEndIso})`, {
          horizon,
          eventCount: events.length,
          windowStart: artifact.debug.windowStartIso,
          windowEnd: artifact.debug.windowEndIso,
          minEvent: artifact.debug.minEventIso,
          maxEvent: artifact.debug.maxEventIso,
        });
      }
      
      // Check if maxEventIso is before windowStartIso
      if (maxDate && maxDate < windowStart) {
        console.error(`[computeInsightsForWindow] maxEventIso (${artifact.debug.maxEventIso}) is before windowStartIso (${artifact.debug.windowStartIso})`, {
          horizon,
          eventCount: events.length,
          windowStart: debug.windowStartIso,
          windowEnd: debug.windowEndIso,
          minEvent: debug.minEventIso,
          maxEvent: debug.maxEventIso,
        });
      }
      
      // Check for invalid dates
      for (const event of events) {
        const isUnified = 'sourceKind' in event;
        let ts: Date | null = null;
        
        if (isUnified) {
          const unified = event as UnifiedInternalEvent & { occurredAt?: string | Date; createdAt?: string | Date; timestamp?: string | Date };
          ts = unified.occurredAt ? (typeof unified.occurredAt === 'string' ? new Date(unified.occurredAt) : unified.occurredAt) :
               unified.createdAt ? (typeof unified.createdAt === 'string' ? new Date(unified.createdAt) : unified.createdAt) :
               unified.eventAt ? new Date(unified.eventAt) :
               unified.timestamp ? (typeof unified.timestamp === 'string' ? new Date(unified.timestamp) : unified.timestamp) :
               null;
        } else {
          const internal = event as InternalEvent & { occurredAt?: string | Date; timestamp?: string | Date };
          ts = internal.occurredAt ? (typeof internal.occurredAt === 'string' ? new Date(internal.occurredAt) : internal.occurredAt) :
               internal.createdAt ? (internal.createdAt instanceof Date ? internal.createdAt : new Date(internal.createdAt)) :
               internal.eventAt ? (internal.eventAt instanceof Date ? internal.eventAt : new Date(internal.eventAt)) :
               internal.timestamp ? (typeof internal.timestamp === 'string' ? new Date(internal.timestamp) : internal.timestamp) :
               null;
        }
        
        if (ts && isNaN(ts.getTime())) {
          console.error(`[computeInsightsForWindow] Invalid date parsed for event ${event.id}`, {
            eventId: event.id,
            horizon,
            eventKeys: Object.keys(event),
          });
          throw new Error(`Event ${event.id} has invalid timestamp`);
        }
      }
    }
  }
  
  artifact.debug = debug;
  
  // Phase 5.4-5.5: Attach narratives to artifact (single integration point)
  // Extract patterns, generate snapshots, analyze deltas, generate narratives, select, attach
  // Task F: Expand Pattern Narratives beyond Weekly
  try {
    const currentPatterns = extractPatternsFromArtifact(artifact);
    
    // Determine window kind based on horizon
    let windowKind: 'week' | 'month' | 'year' = 'week';
    if (horizon === 'summary') {
      windowKind = 'week'; // Summary uses weekly windows
    } else if (horizon === 'timeline') {
      windowKind = 'month'; // Timeline uses monthly windows
    }
    
    const currentSnapshots = snapshotPatterns(previousSnapshots, currentPatterns.patterns, windowKind);
    const deltas = analyzePatternDeltas(previousSnapshots, currentSnapshots);
    const narratives = generatePatternNarratives(deltas);
    
    // Phase 5.5: Select most important narratives before attaching
    // For summary and timeline, use simplified selection (fewer narratives)
    const maxNarratives = horizon === 'weekly' ? 3 : 2;
    const selectedNarratives = selectNarratives(narratives, { maxNarratives });
    artifact = attachNarrativesToArtifact(artifact, selectedNarratives);
  } catch {
    // If narrative generation fails, silently skip attach (guardrail)
    // Artifact is returned unchanged
  }
  
  return artifact;
}


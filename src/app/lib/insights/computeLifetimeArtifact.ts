// src/app/lib/insights/computeLifetimeArtifact.ts
// Compute Lifetime InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { buildLifetimeSignalInventory, type LifetimeSignalInventory, type ReflectionMeta, type DeterministicCandidate } from '../../../lib/lifetimeSignalInventory';
import { assembleYearNarrative } from '../../../lib/narrative/assembleYearNarrativeDeterministic';

/**
 * Convert InternalEvent or UnifiedInternalEvent to ReflectionEntry format
 * Only includes journal events (sourceKind === "journal" && eventKind === "written")
 */
function eventsToReflectionEntries(
  events: (InternalEvent | UnifiedInternalEvent)[]
): ReflectionEntry[] {
  const entries: ReflectionEntry[] = [];
  
  for (const ev of events) {
    const eventAt = typeof ev.eventAt === 'string' ? new Date(ev.eventAt) : ev.eventAt;
    
    // Determine if this is a UnifiedInternalEvent or legacy InternalEvent
    const isUnified = 'sourceKind' in ev;
    
    let sourceKind: string | undefined;
    let eventKind: string | undefined;
    let plaintext: string | undefined;
    
    if (isUnified) {
      const unified = ev as UnifiedInternalEvent;
      sourceKind = unified.sourceKind;
      eventKind = unified.eventKind;
      plaintext = unified.details;
    } else {
      const internal = ev as InternalEvent;
      const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
      sourceKind = payload.source_kind as string | undefined;
      eventKind = payload.event_kind as string | undefined;
      
      if (typeof payload?.content === 'string') {
        plaintext = payload.content;
      } else if (typeof payload?.raw_metadata === 'object' && payload.raw_metadata !== null) {
        const rawMeta = payload.raw_metadata as Record<string, unknown>;
        if (typeof rawMeta.content === 'string') {
          plaintext = rawMeta.content;
        }
      }
    }
    
    // Only include journal events
    if (sourceKind === 'journal' && eventKind === 'written' && plaintext) {
      entries.push({
        id: `lifetime-entry-${entries.length}`,
        createdAt: eventAt.toISOString(),
        plaintext,
      });
    }
  }
  
  return entries;
}

/**
 * Safe date parsing - returns null for invalid dates
 */
function safeDate(value: unknown): Date | null {
  const d = new Date(String(value ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Create lifetime inventory card from inventory
 */
function createLifetimeInventoryCard(
  inventory: LifetimeSignalInventory
): InsightCard & { _lifetimeInventory?: LifetimeSignalInventory } {
  return {
    id: `lifetime-inventory-${Date.now()}`,
    kind: 'distribution', // Using distribution as closest match
    title: 'Lifetime Signal Inventory',
    explanation: `Found ${inventory.signals.length} structural signals across ${inventory.totalReflections} reflections.`,
    evidence: [],
    computedAt: new Date().toISOString(),
    _lifetimeInventory: inventory, // Store original data for reconstruction
  };
}

/**
 * Compute Lifetime InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - assembleYearNarrative for per-year candidate generation
 * - buildLifetimeSignalInventory for inventory construction
 * 
 * Returns InsightArtifact with inventory card and metadata
 */
export function computeLifetimeArtifact(args: {
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount } = args;
  
  // Convert events to ReflectionEntry format (only journal events)
  const allReflectionEntries = eventsToReflectionEntries(events);
  
  // Filter entries to window (lifetime uses all available data, but we respect the window)
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= windowStart && createdAt <= windowEnd;
  });
  
  // Convert to ReflectionMeta format
  const reflectionMetas: ReflectionMeta[] = windowEntries
    .map((entry) => {
      const date = safeDate(entry.createdAt);
      if (!date) return null;
      return {
        id: entry.id,
        createdAt: date.toISOString(),
      };
    })
    .filter((x): x is ReflectionMeta => x !== null);
  
  // Group by year for narrative assembly
  const byYear = new Map<number, Array<{ id: string; created_at: string; text: string }>>();
  for (const entry of windowEntries) {
    const date = safeDate(entry.createdAt);
    if (!date) continue;
    const year = date.getFullYear();
    if (!byYear.has(year)) {
      byYear.set(year, []);
    }
    byYear.get(year)!.push({
      id: entry.id,
      created_at: entry.createdAt,
      text: entry.plaintext || '',
    });
  }
  
  // Assemble narrative for each year and collect candidates
  const allCandidates: DeterministicCandidate[] = [];
  for (const [year, yearReflections] of byYear.entries()) {
    const narrativeDraft = assembleYearNarrative(year, yearReflections);
    
    // Convert NarrativeCandidate to DeterministicCandidate
    for (const candidate of narrativeDraft.candidates) {
      // Map section names: 'themes' -> 'theme', 'transitions' -> 'transition', 'anchors' -> 'anchor'
      const categoryMap: Record<string, 'theme' | 'transition' | 'anchor'> = {
        themes: 'theme',
        transitions: 'transition',
        anchors: 'anchor',
      };
      
      allCandidates.push({
        id: `${year}-${candidate.section}-${candidate.text.slice(0, 20)}`,
        label: candidate.text,
        category: categoryMap[candidate.section] || 'theme',
        reflectionIds: candidate.sourceReflectionIds,
        confidence: candidate.confidence,
      });
    }
  }
  
  // Build inventory
  const inventory = buildLifetimeSignalInventory({
    reflections: reflectionMetas,
    candidates: allCandidates,
  });
  
  // Create card from inventory
  const cards: InsightCard[] = [];
  if (inventory.totalReflections > 0) {
    cards.push(createLifetimeInventoryCard(inventory));
  }
  
  const artifact: InsightArtifact = {
    horizon: 'lifetime',
    window: {
      kind: 'custom',
      start: windowStart.toISOString(),
      end: windowEnd.toISOString(),
      timezone,
    },
    createdAt: new Date().toISOString(),
    cards,
  };
  
  return artifact;
}


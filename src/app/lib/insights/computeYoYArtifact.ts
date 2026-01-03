// src/app/lib/insights/computeYoYArtifact.ts
// Compute Year-over-Year InsightArtifact using existing pure compute functions
// Part of Canonical Insight Engine Consolidation

import type { ReflectionEntry, InsightCard, YearOverYearCard } from './types';
import type { InsightArtifact } from './artifactTypes';
import type { InternalEvent } from '../types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';
import { eventsToReflectionEntries } from './reflectionAdapters';
import { computeYearOverYearCard } from './computeYearOverYear';


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

/**
 * Compute Year-over-Year InsightArtifact from events and window
 * 
 * Uses existing pure compute functions:
 * - computeYearOverYearCard for year comparison
 * 
 * Returns InsightArtifact with YoY card and metadata
 */
export function computeYoYArtifact(args: {
  events: (InternalEvent | UnifiedInternalEvent)[];
  windowStart: Date;
  windowEnd: Date;
  timezone?: string;
  wallet?: string;
  entriesCount?: number;
  eventsCount?: number;
  fromYear?: number;
  toYear?: number;
}): InsightArtifact {
  const { events, windowStart, windowEnd, timezone, wallet, entriesCount, eventsCount, fromYear, toYear } = args;
  
  // Convert events to ReflectionEntry format (only journal events)
  const allReflectionEntries = eventsToReflectionEntries(events);
  
  // Filter entries to window
  const windowEntries = allReflectionEntries.filter((entry) => {
    const createdAt = new Date(entry.createdAt);
    return createdAt >= windowStart && createdAt <= windowEnd;
  });
  
  // Group by year to determine available years
  const groupedByYear = groupByYear(windowEntries);
  const availableYears = Array.from(groupedByYear.keys()).sort((a, b) => b - a);
  
  // Determine years to compare
  let year1: number | null = null;
  let year2: number | null = null;
  
  if (fromYear !== undefined && toYear !== undefined) {
    // Use provided years if both are specified
    year1 = fromYear;
    year2 = toYear;
  } else if (availableYears.length >= 2) {
    // Default to most recent two years
    year1 = availableYears[0];
    year2 = availableYears[1];
  }
  
  // Compute YoY card if we have two years to compare
  const cards: InsightCard[] = [];
  
  if (year1 !== null && year2 !== null) {
    try {
      // Filter reflections for the two years
      const year1Reflections = windowEntries.filter(r => {
        const year = new Date(r.createdAt).getFullYear();
        return year === year1;
      });
      const year2Reflections = windowEntries.filter(r => {
        const year = new Date(r.createdAt).getFullYear();
        return year === year2;
      });
      
      // Only compute if both years have entries
      if (year1Reflections.length > 0 && year2Reflections.length > 0) {
        const yoyCard = computeYearOverYearCard(windowEntries, { fromYear: year1, toYear: year2 });
        
        // Store original YearOverYearCard as metadata for reconstruction
        const cardWithMetadata = {
          ...yoyCard,
          _yoyCard: yoyCard as YearOverYearCard, // Store original card
          _fromYear: year1,
          _toYear: year2,
        };
        
        cards.push(cardWithMetadata);
      }
    } catch (err) {
      // If computation fails, return empty cards
      console.error('Failed to compute YoY card:', err);
    }
  }
  
  const artifact: InsightArtifact = {
    horizon: 'yoy',
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


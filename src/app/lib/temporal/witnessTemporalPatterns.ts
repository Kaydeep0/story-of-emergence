/**
 * Temporal Witness & Non-Narrative Memory
 * 
 * Tracks when reflections occur, spacing, density, recurrence.
 * No timelines, no narrative, no causality, no progression.
 * 
 * Temporal logic consumes inference outputs.
 * Temporal logic cannot influence inference.
 */

import type { ReflectionEntry } from '../insights/types';

export type TemporalDensityBand = {
  periodStart: string; // ISO date string
  periodEnd: string; // ISO date string
  density: number; // 0-1, normalized density
  reflectionCount: number;
};

export type TemporalSpacing = {
  averageDaysBetween: number;
  medianDaysBetween: number;
  minDaysBetween: number;
  maxDaysBetween: number;
};

export type TemporalRecurrence = {
  period: string; // e.g., "2024-01"
  reflectionCount: number;
  density: number; // 0-1, normalized
};

export type TemporalWitness = {
  densityBands: TemporalDensityBand[];
  spacing: TemporalSpacing;
  recurrence: TemporalRecurrence[];
  totalReflections: number;
  dateRange: {
    earliest: string; // ISO date string
    latest: string; // ISO date string
  };
};

/**
 * Compute temporal witness from reflection entries
 * 
 * Pure function - no side effects, deterministic output.
 * Same data → same temporal rendering.
 * 
 * Tracks:
 * - When reflections occur (density bands)
 * - Spacing between reflections
 * - Recurrence patterns (by month)
 * 
 * Does NOT:
 * - Create timelines
 * - Infer causality
 * - Show progression
 * - Emphasize start or end
 */
export function witnessTemporalPatterns(
  entries: ReflectionEntry[],
  periodType: 'month' | 'week' = 'month'
): TemporalWitness {
  // Filter out deleted entries
  const activeEntries = entries.filter(e => !e.deletedAt);
  
  if (activeEntries.length === 0) {
    return {
      densityBands: [],
      spacing: {
        averageDaysBetween: 0,
        medianDaysBetween: 0,
        minDaysBetween: 0,
        maxDaysBetween: 0,
      },
      recurrence: [],
      totalReflections: 0,
      dateRange: {
        earliest: '',
        latest: '',
      },
    };
  }

  // Sort by creation date (deterministic)
  const sortedEntries = [...activeEntries].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const dates = sortedEntries.map(e => new Date(e.createdAt));
  const earliest = dates[0];
  const latest = dates[dates.length - 1];

  // Compute density bands
  const densityBands = computeDensityBands(sortedEntries, periodType);

  // Compute spacing
  const spacing = computeSpacing(dates);

  // Compute recurrence (by month)
  const recurrence = computeRecurrence(sortedEntries);

  return {
    densityBands,
    spacing,
    recurrence,
    totalReflections: activeEntries.length,
    dateRange: {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
    },
  };
}

/**
 * Compute density bands for a given period type
 * Density is normalized 0-1 within the observed range
 */
function computeDensityBands(
  entries: ReflectionEntry[],
  periodType: 'month' | 'week'
): TemporalDensityBand[] {
  if (entries.length === 0) {
    return [];
  }

  // Group entries by period
  const periodMap = new Map<string, ReflectionEntry[]>();
  
  entries.forEach(entry => {
    const date = new Date(entry.createdAt);
    let periodKey: string;
    
    if (periodType === 'month') {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      periodKey = `${year}-${month}`;
    } else {
      // Week: use ISO week
      const year = date.getFullYear();
      const week = getISOWeek(date);
      periodKey = `${year}-W${String(week).padStart(2, '0')}`;
    }
    
    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, []);
    }
    periodMap.get(periodKey)!.push(entry);
  });

  // Find max count for normalization
  const counts = Array.from(periodMap.values()).map(periodEntries => periodEntries.length);
  const maxCount = Math.max(...counts, 1);

  // Build density bands
  const bands: TemporalDensityBand[] = [];
  
  for (const [periodKey, periodEntries] of periodMap.entries()) {
    const periodDates = periodEntries.map(e => new Date(e.createdAt));
    const periodStart = new Date(Math.min(...periodDates.map(d => d.getTime())));
    const periodEnd = new Date(Math.max(...periodDates.map(d => d.getTime())));
    
    bands.push({
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      density: periodEntries.length / maxCount, // Normalized 0-1
      reflectionCount: periodEntries.length,
    });
  }

  // Sort by period start (deterministic)
  return bands.sort((a, b) => 
    new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
  );
}

/**
 * Compute spacing statistics between reflections
 */
function computeSpacing(dates: Date[]): TemporalSpacing {
  if (dates.length < 2) {
    return {
      averageDaysBetween: 0,
      medianDaysBetween: 0,
      minDaysBetween: 0,
      maxDaysBetween: 0,
    };
  }

  const spacings: number[] = [];
  
  for (let i = 1; i < dates.length; i++) {
    const daysBetween = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    spacings.push(daysBetween);
  }

  spacings.sort((a, b) => a - b);
  
  const average = spacings.reduce((sum, val) => sum + val, 0) / spacings.length;
  const median = spacings.length % 2 === 0
    ? (spacings[spacings.length / 2 - 1] + spacings[spacings.length / 2]) / 2
    : spacings[Math.floor(spacings.length / 2)];

  return {
    averageDaysBetween: average,
    medianDaysBetween: median,
    minDaysBetween: spacings[0],
    maxDaysBetween: spacings[spacings.length - 1],
  };
}

/**
 * Compute recurrence patterns by month
 */
function computeRecurrence(entries: ReflectionEntry[]): TemporalRecurrence[] {
  if (entries.length === 0) {
    return [];
  }

  // Group by month
  const monthMap = new Map<string, ReflectionEntry[]>();
  
  entries.forEach(entry => {
    const date = new Date(entry.createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const periodKey = `${year}-${month}`;
    
    if (!monthMap.has(periodKey)) {
      monthMap.set(periodKey, []);
    }
    monthMap.get(periodKey)!.push(entry);
  });

  // Find max count for normalization
  const counts = Array.from(monthMap.values()).map(monthEntries => monthEntries.length);
  const maxCount = Math.max(...counts, 1);

  // Build recurrence array
  const recurrence: TemporalRecurrence[] = [];
  
  for (const [periodKey, monthEntries] of monthMap.entries()) {
    recurrence.push({
      period: periodKey,
      reflectionCount: monthEntries.length,
      density: monthEntries.length / maxCount, // Normalized 0-1
    });
  }

  // Sort by period (deterministic)
  return recurrence.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Get ISO week number for a date
 */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}


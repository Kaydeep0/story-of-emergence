// src/app/lib/insights/alwaysOnSummary.ts
// Pure function to compute always-on summary insights from decrypted reflections
// Runs entirely client-side - no network calls, no side effects

import type {
  ReflectionEntry,
  InsightEvidence,
  AlwaysOnSummaryCard,
  AlwaysOnSummaryData,
} from './types';
import { validateInsight } from './validateInsight';

/**
 * Get the start of day (midnight) for a given date in local timezone
 */
function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get a date key (YYYY-MM-DD) for a given date in local timezone
 */
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the day name (Monday, Tuesday, etc.) for a date
 */
function getDayName(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Generate a unique ID for an insight
 */
function generateInsightId(kind: string, subType: string): string {
  return `${kind}-${subType}-${Date.now()}`;
}

/**
 * Filter entries to those within a date range (inclusive of start, exclusive of end)
 */
function getEntriesInRange(
  entries: ReflectionEntry[],
  startDate: Date,
  endDate: Date
): ReflectionEntry[] {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  return entries.filter((entry) => {
    if (entry.deletedAt) return false;
    const entryTime = new Date(entry.createdAt).getTime();
    return entryTime >= startTime && entryTime < endTime;
  });
}

/**
 * Count unique days with at least one entry
 */
function countActiveDays(entries: ReflectionEntry[]): number {
  const uniqueDays = new Set<string>();
  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    uniqueDays.add(getDateKey(date));
  }
  return uniqueDays.size;
}

/**
 * Get the names of days that had activity
 */
function getActiveDayNames(entries: ReflectionEntry[]): string[] {
  const dayMap = new Map<string, Date>();

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    const dateKey = getDateKey(date);
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, date);
    }
  }

  // Sort by date and get day names
  const sortedDates = Array.from(dayMap.values()).sort(
    (a, b) => a.getTime() - b.getTime()
  );

  return sortedDates.map(getDayName);
}

/**
 * Get one representative entry per active day for evidence
 */
function getEvidencePerDay(entries: ReflectionEntry[], maxDays = 7): InsightEvidence[] {
  const dayMap = new Map<string, ReflectionEntry>();

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    const date = new Date(entry.createdAt);
    const dateKey = getDateKey(date);
    // Keep the first entry per day
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, entry);
    }
  }

  // Sort by date (most recent first) and take up to maxDays
  const sorted = Array.from(dayMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, maxDays);

  return sorted.map((entry) => ({
    entryId: entry.id,
    timestamp: entry.createdAt,
  }));
}

/**
 * Compute always-on summary insights from decrypted entries
 *
 * This is a PURE FUNCTION - it has no side effects and makes no network calls.
 * All data must already be decrypted and in memory.
 *
 * Algorithm:
 * 1. Filter entries to the last 14 days
 * 2. Split into current week (0-7 days ago) and previous week (7-14 days ago)
 * 3. Compute writing change percentage between weeks
 * 4. Compute consistency (days with at least one entry in current week)
 * 5. Generate insight cards for each metric
 *
 * @param entries - Array of decrypted reflection entries
 * @param now - Reference date for "today" (useful for testing)
 * @returns Array of AlwaysOnSummaryCards
 */
export function computeAlwaysOnSummary(
  entries: ReflectionEntry[],
  now: Date = new Date()
): AlwaysOnSummaryCard[] {
  // Filter out deleted entries
  const activeEntries = entries.filter((e) => !e.deletedAt);

  if (activeEntries.length === 0) {
    return [];
  }

  // Calculate date boundaries
  const today = getStartOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Include today, so -6 for 7 days total

  const fourteenDaysAgo = new Date(today);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13); // 14 days total

  // Get entries for each period
  const currentWeekEntries = getEntriesInRange(activeEntries, sevenDaysAgo, tomorrow);
  const previousWeekEntries = getEntriesInRange(
    activeEntries,
    fourteenDaysAgo,
    sevenDaysAgo
  );

  // Count metrics
  const currentCount = currentWeekEntries.length;
  const previousCount = previousWeekEntries.length;
  const currentActiveDays = countActiveDays(currentWeekEntries);

  // Need at least some data to generate insights
  if (currentCount === 0 && previousCount === 0) {
    return [];
  }

  const cards: AlwaysOnSummaryCard[] = [];
  const computedAt = new Date().toISOString();

  // Card 1: Writing Change (New Insight Contract)
  // Only generate if we have enough data to make a falsifiable claim
  if (previousCount > 0 && currentCount > 0) {
    const percentChange =
      previousCount > 0
        ? Math.round(((currentCount - previousCount) / previousCount) * 100)
        : 0;

    // Detect clustering pattern: entries concentrated in fewer days vs spread evenly
    const currentActiveDaysCount = countActiveDays(currentWeekEntries);
    const previousActiveDaysCount = countActiveDays(previousWeekEntries);
    
    // Calculate clustering ratio: entries per active day
    const currentClusteringRatio = currentActiveDaysCount > 0 ? currentCount / currentActiveDaysCount : 0;
    const previousClusteringRatio = previousActiveDaysCount > 0 ? previousCount / previousActiveDaysCount : 0;
    
    // Detect if user clusters (writes multiple entries on fewer days) vs spreads evenly
    const isClustered = currentClusteringRatio >= 2.0; // 2+ entries per active day indicates clustering
    const clusteringChanged = Math.abs(currentClusteringRatio - previousClusteringRatio) >= 0.5;
    
    // Only generate insight if we can make a falsifiable claim about clustering behavior
    if (isClustered || clusteringChanged) {
      // CLAIM: User processes in bursts rather than gradually
      const claim = isClustered 
        ? "You don't process things gradually. You wait, then commit fully."
        : "Your writing pattern shifted this week.";
      
      // EVIDENCE: Concrete metrics
      const evidenceItems: string[] = [
        `${currentCount} entries across ${currentActiveDaysCount} active days (${currentClusteringRatio.toFixed(1)} entries/day)`,
        `Previous week: ${previousCount} entries across ${previousActiveDaysCount} active days (${previousClusteringRatio.toFixed(1)} entries/day)`,
      ];
      
      if (currentActiveDaysCount < 7) {
        const gapDays = 7 - currentActiveDaysCount;
        evidenceItems.push(`${gapDays} day${gapDays === 1 ? '' : 's'} with no entries`);
      }
      
      // CONTRAST: What didn't happen
      const contrast = currentActiveDaysCount < 4 
        ? "A steady daily cadence was not observed."
        : "No sustained low-level activity pattern detected.";
      
      // CONFIDENCE: Why we're confident
      const confidence = "Pattern observed across two consecutive weeks with measurable clustering ratio.";
      
      const title = claim;
      const explanation = `${claim}\n\nEvidence:\n${evidenceItems.map(e => `• ${e}`).join('\n')}\n\nContrast: ${contrast}\n\nConfidence: ${confidence}`;

      // Build evidence from both weeks
      const currentEvidence = getEvidencePerDay(currentWeekEntries, 3);
      const previousEvidence = getEvidencePerDay(previousWeekEntries, 2);
      const evidence = [...currentEvidence, ...previousEvidence];

      const data: AlwaysOnSummaryData = {
        summaryType: 'writing_change',
        currentWeekEntries: currentCount,
        previousWeekEntries: previousCount,
        currentWeekActiveDays: currentActiveDaysCount,
        percentChange,
      };

      const card: AlwaysOnSummaryCard = {
        id: generateInsightId('always_on_summary', 'writing_change'),
        kind: 'always_on_summary',
        title,
        explanation,
        evidence,
        computedAt,
        data,
      };

      // Insight Contract Gatekeeper: Only render contract-compliant insights
      if (validateInsight(card)) {
        cards.push(card);
      }
    }
  }

  // Card 2: Consistency (New Insight Contract)
  // Only generate if we can make a falsifiable claim about daily cadence patterns
  if (currentCount > 0) {
    const activeDayNames = getActiveDayNames(currentWeekEntries);
    const previousActiveDays = previousCount > 0 ? countActiveDays(previousWeekEntries) : null;
    
    // Detect pattern: daily cadence vs sporadic
    const isDailyCadence = currentActiveDays === 7;
    const isSporadic = currentActiveDays <= 3;
    const cadenceChanged = previousActiveDays !== null && Math.abs(currentActiveDays - previousActiveDays) >= 3;
    
    // Only generate if we can make a falsifiable claim
    if (isDailyCadence || isSporadic || cadenceChanged) {
      // CLAIM: User maintains daily cadence OR writes sporadically OR pattern shifted
      let claim: string;
      if (isDailyCadence) {
        claim = "You maintain a daily writing cadence. Every day this week had at least one entry.";
      } else if (isSporadic) {
        claim = "Your writing is concentrated on specific days, not spread evenly.";
      } else {
        claim = `Your writing cadence shifted from ${previousActiveDays} active days to ${currentActiveDays} active days.`;
      }
      
      // EVIDENCE: Concrete metrics
      const evidenceItems: string[] = [
        `${currentActiveDays} active days out of 7 this week`,
        `${currentCount} total entries this week`,
      ];
      
      // Add previous week comparison if available
      if (previousActiveDays !== null) {
        evidenceItems.push(`Previous week: ${previousActiveDays} active days with ${previousCount} entries`);
      }
      
      // Add gap information if sporadic
      if (isSporadic) {
        const gapDays = 7 - currentActiveDays;
        evidenceItems.push(`${gapDays} day${gapDays === 1 ? '' : 's'} with no entries`);
      }
      
      // CONTRAST: What didn't happen
      const contrast = isDailyCadence
        ? "No days were skipped. A sporadic pattern was not observed."
        : isSporadic
        ? "A steady daily cadence was not observed. Most days had zero entries."
        : "A consistent cadence pattern was not maintained across consecutive weeks.";
      
      // CONFIDENCE: Why we're confident
      const confidence = previousActiveDays !== null
        ? `Pattern observed across two consecutive weeks with measurable active day counts (${previousActiveDays} → ${currentActiveDays}).`
        : `Pattern observed across 7 consecutive days with ${currentActiveDays} active days.`;
      
      const title = claim;
      const explanation = `${claim}\n\nEvidence:\n${evidenceItems.map(e => `• ${e}`).join('\n')}\n\nContrast: ${contrast}\n\nConfidence: ${confidence}`;

      const evidence = getEvidencePerDay(currentWeekEntries, 7);

      const data: AlwaysOnSummaryData = {
        summaryType: 'consistency',
        currentWeekEntries: currentCount,
        previousWeekEntries: previousCount,
        currentWeekActiveDays: currentActiveDays,
        activeDayNames,
      };

      const card: AlwaysOnSummaryCard = {
        id: generateInsightId('always_on_summary', 'consistency'),
        kind: 'always_on_summary',
        title,
        explanation,
        evidence,
        computedAt,
        data,
      };

      // Insight Contract Gatekeeper: Only render contract-compliant insights
      if (validateInsight(card)) {
        cards.push(card);
      }
    }
  }

  // Card 3: Weekly Pattern Insight
  // Detect if user consistently writes on certain days by analyzing last 4-6 weeks
  if (activeEntries.length >= 10) {
    // Look at last 42 days (6 weeks) to detect patterns
    const fortyTwoDaysAgo = new Date(today);
    fortyTwoDaysAgo.setDate(fortyTwoDaysAgo.getDate() - 41); // 42 days total

    const historicalEntries = getEntriesInRange(activeEntries, fortyTwoDaysAgo, tomorrow);

    if (historicalEntries.length >= 10) {
      // Count entries by day of week (0 = Sunday, 6 = Saturday)
      const dayOfWeekCounts = new Map<number, number>();
      const dayOfWeekEntries = new Map<number, ReflectionEntry[]>();

      for (const entry of historicalEntries) {
        const date = new Date(entry.createdAt);
        const dayOfWeek = date.getDay();
        dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
        
        if (!dayOfWeekEntries.has(dayOfWeek)) {
          dayOfWeekEntries.set(dayOfWeek, []);
        }
        dayOfWeekEntries.get(dayOfWeek)!.push(entry);
      }

      // Find days that appear in at least 50% of weeks and have at least 2 entries per week on average
      const totalWeeks = 6;
      const minWeeksWithActivity = Math.ceil(totalWeeks * 0.5); // At least 50% of weeks
      const minAvgEntriesPerWeek = 2;

      const patternDays: string[] = [];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const count = dayOfWeekCounts.get(dayOfWeek) || 0;
        const avgPerWeek = count / totalWeeks;
        
        // Check if this day appears frequently enough
        // We'll consider it a pattern if:
        // 1. Average entries per week >= 2
        // 2. Total count suggests it appears in at least 50% of weeks
        if (avgPerWeek >= minAvgEntriesPerWeek && count >= minWeeksWithActivity) {
          patternDays.push(dayNames[dayOfWeek]);
        }
      }

      // Only show if we found at least 1 pattern day and not all 7 days
      if (patternDays.length > 0 && patternDays.length < 7) {
        const patternDaysFormatted =
          patternDays.length === 1
            ? patternDays[0]
            : patternDays.length === 2
            ? `${patternDays[0]} and ${patternDays[1]}`
            : patternDays.slice(0, -1).join(', ') + ', and ' + patternDays[patternDays.length - 1];

        const title = `You tend to write most on ${patternDaysFormatted}.`;

        // Get evidence from pattern days
        const evidence: InsightEvidence[] = [];
        for (const dayName of patternDays) {
          const dayIndex = dayNames.indexOf(dayName);
          const entries = dayOfWeekEntries.get(dayIndex) || [];
          // Take up to 2 entries per pattern day
          const sampleEntries = entries
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 2);
          evidence.push(...sampleEntries.map((entry) => ({
            entryId: entry.id,
            timestamp: entry.createdAt,
          })));
        }
        // Limit to 6 evidence items total
        const limitedEvidence = evidence.slice(0, 6);

        const data: AlwaysOnSummaryData = {
          summaryType: 'weekly_pattern',
          currentWeekEntries: currentCount,
          previousWeekEntries: previousCount,
          currentWeekActiveDays: currentActiveDays,
          patternDays,
        };

        // CLAIM: User tends to write on specific days of the week
        const claim = title;
        
        // EVIDENCE: Already in evidence array (entries from pattern days)
        // Add summary metrics to explanation
        const evidenceItems: string[] = [
          `Pattern observed across ${totalWeeks} weeks`,
          `${patternDays.length} day${patternDays.length === 1 ? '' : 's'} of the week show consistent activity`,
          `Average ${(historicalEntries.length / totalWeeks / 7).toFixed(1)} entries per day on pattern days`,
        ];
        
        // CONTRAST: What didn't happen
        const contrast = `A uniform distribution across all 7 days was not observed. Activity is concentrated on specific days.`;
        
        // CONFIDENCE: Why we're confident
        const confidence = `Pattern detected across ${totalWeeks} consecutive weeks with activity on ${patternDays.length} day${patternDays.length === 1 ? '' : 's'}, meeting threshold of ${minAvgEntriesPerWeek} entries per week average.`;
        
        const explanation = `${claim}\n\nEvidence:\n${evidenceItems.map(e => `• ${e}`).join('\n')}\n\nContrast: ${contrast}\n\nConfidence: ${confidence}`;

        const card: AlwaysOnSummaryCard = {
          id: generateInsightId('always_on_summary', 'weekly_pattern'),
          kind: 'always_on_summary',
          title,
          explanation,
          evidence: limitedEvidence,
          computedAt,
          data,
        };

        // Insight Contract Gatekeeper: Only render contract-compliant insights
        if (validateInsight(card)) {
          cards.push(card);
        }
      }
    }
  }

  // Card 4: Activity Spike Insight
  // Detect if the last 7 days include a day where activity is 2× above baseline
  if (currentCount > 0 && activeEntries.length >= 7) {
    // Calculate baseline: average entries per calendar day over last 14 days
    const baselineEntries = getEntriesInRange(activeEntries, fourteenDaysAgo, tomorrow);
    const baselineCalendarDays = 14; // Last 14 calendar days
    const baselineAvgPerDay = baselineEntries.length / baselineCalendarDays;

    // Check each day in the last 7 days for spikes
    let spikeFound = false;
    let spikeDate: string | undefined;
    let spikeDayName: string | undefined;
    let spikeCount = 0;
    let spikeEntries: ReflectionEntry[] = [];

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const checkDateKey = getDateKey(checkDate);
      const checkDateEnd = new Date(checkDate);
      checkDateEnd.setDate(checkDateEnd.getDate() + 1);

      const dayEntries = getEntriesInRange(activeEntries, checkDate, checkDateEnd);
      const dayCount = dayEntries.length;

      // A spike is when a day has at least 2× the baseline average AND at least 2 entries
      // baselineAvgPerDay is entries per calendar day, so we compare dayCount (entries on that day) to 2× baseline
      if (dayCount >= 2 && baselineAvgPerDay > 0 && dayCount >= baselineAvgPerDay * 2) {
        spikeFound = true;
        spikeDate = checkDateKey;
        spikeDayName = getDayName(checkDate);
        spikeCount = dayCount;
        spikeEntries = dayEntries;
        break; // Take the most recent spike
      }
    }

    if (spikeFound && spikeDate && spikeDayName) {
      // CLAIM: User had a spike in writing activity
      const claim = `You had a spike in writing activity on ${spikeDayName}.`;
      
      // EVIDENCE: Concrete metrics
      const evidenceItems: string[] = [
        `${spikeCount} entries on ${spikeDayName}`,
        `Baseline average: ${baselineAvgPerDay.toFixed(1)} entries per day over last 14 days`,
        `Spike is ${(spikeCount / baselineAvgPerDay).toFixed(1)}× above baseline`,
      ];
      
      // CONTRAST: What didn't happen
      const contrast = `A steady, uniform writing pattern was not observed. This day exceeded the baseline by at least 2×.`;
      
      // CONFIDENCE: Why we're confident
      const confidence = `Spike detected using 14-day baseline (${baselineEntries.length} entries) with threshold of 2× baseline average (${baselineAvgPerDay.toFixed(1)} entries/day). Spike day had ${spikeCount} entries.`;
      
      const title = claim;
      const explanation = `${claim}\n\nEvidence:\n${evidenceItems.map(e => `• ${e}`).join('\n')}\n\nContrast: ${contrast}\n\nConfidence: ${confidence}`;

      const evidence = spikeEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((entry) => ({
          entryId: entry.id,
          timestamp: entry.createdAt,
        }));

      const data: AlwaysOnSummaryData = {
        summaryType: 'activity_spike',
        currentWeekEntries: currentCount,
        previousWeekEntries: previousCount,
        currentWeekActiveDays: currentActiveDays,
        spikeDate,
        spikeDayName,
        spikeCount,
        baselineCount: Math.round(baselineAvgPerDay * 10) / 10, // Round to 1 decimal
      };

      const card: AlwaysOnSummaryCard = {
        id: generateInsightId('always_on_summary', 'activity_spike'),
        kind: 'always_on_summary',
        title,
        explanation,
        evidence,
        computedAt,
        data,
      };

      // Insight Contract Gatekeeper: Only render contract-compliant insights
      if (validateInsight(card)) {
        cards.push(card);
      }
    }
  }

  return cards;
}


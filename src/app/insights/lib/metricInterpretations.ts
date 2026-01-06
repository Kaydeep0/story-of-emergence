// src/app/insights/lib/metricInterpretations.ts
// Helper functions to add interpretive suffixes to metrics

/**
 * Generate interpretive suffix for spike ratio
 */
export function interpretSpikeRatio(ratio: number): string {
  const rounded = Math.round(ratio * 10) / 10;
  if (rounded >= 5) {
    return `— your most active days carry ${rounded}× the cognitive weight`;
  } else if (rounded >= 3) {
    return `— peak days are ${rounded}× more intense than average`;
  } else {
    return `— activity varies ${rounded}× between peak and average days`;
  }
}

/**
 * Generate interpretive suffix for top 10% share
 */
export function interpretTop10Share(sharePercent: number): string {
  if (sharePercent >= 50) {
    return `— more than half your thinking happens on a few days`;
  } else if (sharePercent >= 40) {
    return `— nearly half your thinking happens on a few days`;
  } else if (sharePercent >= 30) {
    return `— about a third of your thinking concentrates on a few days`;
  } else {
    return `— a small number of days carry disproportionate weight`;
  }
}

/**
 * Generate interpretive suffix for active days
 */
export function interpretActiveDays(activeDays: number, totalDays: number): string {
  const percentage = (activeDays / totalDays) * 100;
  if (percentage >= 80) {
    return `— you write consistently across most days`;
  } else if (percentage >= 50) {
    return `— you write on about half the days`;
  } else if (percentage >= 30) {
    return `— you write on about a third of the days`;
  } else {
    return `— activity clusters into specific days`;
  }
}

/**
 * Generate interpretive suffix for entry count
 */
export function interpretEntryCount(count: number, scope: 'week' | 'month' | 'year'): string {
  if (scope === 'week') {
    if (count >= 20) {
      return `— high engagement this week`;
    } else if (count >= 10) {
      return `— steady engagement this week`;
    } else {
      return `— building momentum`;
    }
  } else if (scope === 'month') {
    if (count >= 50) {
      return `— substantial activity this month`;
    } else if (count >= 20) {
      return `— consistent activity this month`;
    } else {
      return `— selective engagement`;
    }
  } else {
    if (count >= 200) {
      return `— substantial reflection over the year`;
    } else if (count >= 100) {
      return `— consistent reflection over the year`;
    } else {
      return `— selective reflection over the year`;
    }
  }
}

/**
 * Generate interpretive suffix for peak day
 */
export function interpretPeakDay(peakCount: number, avgCount: number): string {
  const multiplier = avgCount > 0 ? (peakCount / avgCount).toFixed(1) : '0';
  if (peakCount >= 10) {
    return `— an intense day with ${peakCount} reflections`;
  } else if (peakCount >= 5) {
    return `— a focused day with ${peakCount} reflections`;
  } else {
    return `— a notable day with ${peakCount} reflections`;
  }
}


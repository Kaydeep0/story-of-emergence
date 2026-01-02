import type { DistributionInsight } from './insights';

export type TimeScope = 'week' | 'month' | 'year';

export type DistributionNarrative = {
  scope: TimeScope;
  headline: string;
  summary: string;
  confidence: 'low' | 'medium' | 'high';
};

/**
 * Generate a time-scoped narrative from a distribution insight
 * Pure function, deterministic
 * Adds time framing to existing insight language without introducing new statistics
 * @param scope Time scope for the narrative (week, month, year)
 * @param insight Distribution insight to frame
 * @param totalEvents Optional total events count for confidence capping
 * @returns Time-scoped narrative with headline, summary, and adjusted confidence
 */
export function generateNarrative(
  scope: TimeScope,
  insight: DistributionInsight,
  totalEvents?: number
): DistributionNarrative {
  // Adjust confidence based on scope rules
  let confidence = insight.confidence;

  // Yearly scope caps confidence at medium unless totalEvents > 100
  if (scope === 'year') {
    if (totalEvents !== undefined && totalEvents > 100) {
      // Keep original confidence if high, otherwise allow medium
      confidence = insight.confidence === 'high' ? 'high' : 'medium';
    } else {
      // Cap at medium for yearly unless > 100 events
      confidence = 'medium';
    }
  }

  // Weekly scope cannot exceed medium confidence
  if (scope === 'week') {
    confidence = insight.confidence === 'high' ? 'medium' : insight.confidence;
  }

  // Generate narrative based on scope and shape
  const { headline, summary } = generateNarrativeText(scope, insight);

  return {
    scope,
    headline,
    summary,
    confidence,
  };
}

/**
 * Generate narrative text based on scope and insight shape
 * Pure function, deterministic templates
 * Always returns an object with headline and summary, even for unknown cases
 */
function generateNarrativeText(
  scope: TimeScope,
  insight: DistributionInsight
): { headline: string; summary: string } {
  // Guard: if insight is missing or invalid, return safe default
  if (!insight || !insight.shape) {
    return {
      headline: 'Distribution insight',
      summary: 'Not enough data yet to generate a narrative for this view.',
    };
  }

  switch (scope) {
    case 'week': {
      switch (insight.shape) {
        case 'normal':
          return {
            headline: 'This week showed steady, consistent activity',
            summary: 'Your recent reflections were spread evenly across the week, suggesting a balanced pace of engagement without major peaks or valleys.',
          };
        case 'log_normal':
          return {
            headline: 'This week showed focused bursts of activity',
            summary: 'Your recent reflections clustered into short, intense windows. This suggests a period of concentrated attention rather than steady pacing.',
          };
        case 'power_law':
          return {
            headline: 'This week concentrated into intense moments',
            summary: 'Most of your week\'s reflections occurred during a few powerful periods, highlighting how meaning can accumulate in brief, significant windows.',
          };
        default:
          return {
            headline: 'This week showed steady, consistent activity',
            summary: 'Your recent reflections were spread evenly across the week, suggesting a balanced pace of engagement without major peaks or valleys.',
          };
      }
    }

    case 'month': {
      switch (insight.shape) {
        case 'normal':
          return {
            headline: 'This month maintained consistent patterns',
            summary: 'Across the month, your activity was distributed evenly, indicating steady engagement without major concentration or gaps.',
          };
        case 'log_normal':
          return {
            headline: 'This month formed recognizable patterns of focus',
            summary: 'Across the month, your activity alternated between concentrated periods and quieter gaps, indicating cycles of engagement and rest.',
          };
        case 'power_law':
          return {
            headline: 'This month highlighted key moments of intensity',
            summary: 'The month\'s reflections were dominated by a few significant periods, showing how certain times carried disproportionate meaning and attention.',
          };
        default:
          return {
            headline: 'This month maintained consistent patterns',
            summary: 'Across the month, your activity was distributed evenly, indicating steady engagement without major concentration or gaps.',
          };
      }
    }

    case 'year': {
      switch (insight.shape) {
        case 'normal':
          return {
            headline: 'This year showed steady rhythms of reflection',
            summary: 'Over the year, your reflections were distributed consistently, revealing a pattern of regular engagement that shaped your thinking.',
          };
        case 'log_normal':
          return {
            headline: 'This year revealed cycles of focus and reflection',
            summary: 'Over the year, your reflections reveal how attention and significance were distributed, highlighting the rhythms that shaped your thinking.',
          };
        case 'power_law':
          return {
            headline: 'This year reflects how meaning accumulated over time',
            summary: 'Over the year, your reflections reveal how attention and significance were distributed, highlighting the rhythms that shaped your thinking.',
          };
        default:
          return {
            headline: 'This year showed steady rhythms of reflection',
            summary: 'Over the year, your reflections were distributed consistently, revealing a pattern of regular engagement that shaped your thinking.',
          };
      }
    }

    default:
      // Fallback for any unrecognized scope
      return {
        headline: 'Distribution insight',
        summary: 'Not enough data yet to generate a narrative for this view.',
      };
  }
}


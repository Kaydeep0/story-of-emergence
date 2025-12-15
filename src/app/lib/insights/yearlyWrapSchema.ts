// src/app/lib/insights/yearlyWrapSchema.ts
// Yearly Wrap Schema - Type definitions only, no logic

/**
 * Yearly Wrap aggregates insights and activity for a full year.
 * Similar to WeeklyInsight but at the yearly level.
 */
export type YearlyWrap = {
  /**
   * Year identifier (e.g., "2025")
   */
  yearId: string;

  /**
   * Start date of the year (January 1st)
   */
  startDate: Date;

  /**
   * End date of the year (December 31st)
   */
  endDate: Date;

  /**
   * Total number of events recorded during the year
   */
  totalEvents: number;

  /**
   * Number of journal/reflection events written
   */
  journalEvents: number;

  /**
   * Average length of journal entries in characters
   */
  avgJournalLength: number;

  /**
   * Top topics/themes that appeared most frequently
   */
  topGuessedTopics: string[];

  /**
   * Human-readable summary text for the year
   */
  summaryText: string;

  /**
   * Total number of sources imported during the year
   */
  totalSources?: number;

  /**
   * Breakdown by source kind
   */
  sourcesByKind?: {
    youtube?: number;
    article?: number;
    book?: number;
    podcast?: number;
    social?: number;
    manual?: number;
  };

  /**
   * Most active month (0-11, where 0 = January)
   */
  mostActiveMonth?: number;

  /**
   * Total word count across all reflections
   */
  totalWordCount?: number;
};


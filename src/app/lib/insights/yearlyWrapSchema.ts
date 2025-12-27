export interface YearlyWrap {
  year: number;
  walletAddress: string;

  engagement: {
    totalReflections: number;
    activeDays: number;
    longestStreak: number;
    averageReflectionLength: number;
    reflectionDensityByMonth: Record<string, number>;
  };

  attention: {
    dominantSources: string[];
    attentionShareBySource: Record<string, number>;
    attentionShiftByQuarter: Record<string, number>;
  };

  themes: {
    topThemes: string[];
    fastestRisingTheme?: string;
    mostPersistentTheme?: string;
    themesFadedThisYear: string[];
  };

  cognition: {
    majorTimelineSpikes: string[];
    reflectionAccelerationPeriods: string[];
    quietPeriods: string[];
  };

  unresolvedSignals: {
    unresolvedClusters: string[];
    recurringQuestions: string[];
    topicsWithoutClosure: string[];
  };

  narrativeHooks: {
    definingMonth?: string;
    definingSource?: string;
    definingQuestion?: string;
  };
}

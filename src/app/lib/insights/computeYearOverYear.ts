// src/app/lib/insights/computeYearOverYear.ts
// Compute Year over Year insights and return as InsightCard
// Integrates with existing insight engine

import type { ReflectionEntry, InsightEvidence, YearOverYearCard } from './types';
import { computeYearOverYearInsights, type YearOverYearInput, type YearInsightOutputs } from './yearOverYear';
import { computeTopicDrift } from './topicDrift';
import { computeLinkClusters } from './linkClusters';

// Re-export YearOverYearCard for convenience
export type { YearOverYearCard } from './types';

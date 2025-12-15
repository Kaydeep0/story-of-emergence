// Heuristics for classifying temporal distributions

import { groupByDay } from './timeWindows';

type EventLike = { eventAt?: Date | string; createdAt?: Date | string };

export type DistributionResult = {
  distributionLabel: 'normal' | 'lognormal' | 'powerlaw' | 'mixed';
  skew: number;
  concentrationShareTop10PercentDays: number;
  dailyCounts: number[];
};

function getDate(ev: EventLike): Date | null {
  const val = ev.eventAt ?? ev.createdAt;
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export function computeDailyCounts(events: EventLike[]): number[] {
  const byDay = groupByDay(events);
  return Array.from(byDay.values()).map((arr) => arr.length);
}

function computeSkew(counts: number[]): number {
  if (counts.length === 0) return 0;
  const n = counts.length;
  const mean = counts.reduce((s, c) => s + c, 0) / n;
  const variance =
    counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / (n || 1);
  const std = Math.sqrt(variance || 0);
  if (std === 0) return 0;
  const skew =
    (counts.reduce((s, c) => s + Math.pow(c - mean, 3), 0) / n) /
    Math.pow(std, 3);
  return skew;
}

function computeConcentration(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0 || counts.length === 0) return 0;
  const sorted = [...counts].sort((a, b) => b - a);
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.1));
  const topSum = sorted.slice(0, topCount).reduce((s, c) => s + c, 0);
  return topSum / total;
}

export function fitHeuristics(events: EventLike[]): DistributionResult {
  const dailyCounts = computeDailyCounts(events);
  if (dailyCounts.length === 0) {
    return {
      distributionLabel: 'mixed',
      skew: 0,
      concentrationShareTop10PercentDays: 0,
      dailyCounts,
    };
  }

  const skew = computeSkew(dailyCounts);
  const concentrationShareTop10PercentDays = computeConcentration(dailyCounts);

  let distributionLabel: DistributionResult['distributionLabel'] = 'mixed';

  // Heuristic rules:
  // - Power law: very high concentration or extreme skew
  // - Log normal: noticeable right skew and moderate concentration
  // - Normal: low skew and low concentration
  if (concentrationShareTop10PercentDays >= 0.6 || skew >= 2) {
    distributionLabel = 'powerlaw';
  } else if (skew >= 0.8 || concentrationShareTop10PercentDays >= 0.4) {
    distributionLabel = 'lognormal';
  } else if (Math.abs(skew) <= 0.4 && concentrationShareTop10PercentDays <= 0.3) {
    distributionLabel = 'normal';
  }

  return {
    distributionLabel,
    skew,
    concentrationShareTop10PercentDays,
    dailyCounts,
  };
}



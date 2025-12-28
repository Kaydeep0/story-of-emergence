import { describe, it, expect } from 'vitest';
import { generateNarrative } from './narratives';
import type { DistributionInsight } from './insights';

describe('generateNarrative', () => {
  const baseInsight: DistributionInsight = {
    headline: 'Your activity is evenly distributed over time',
    description: 'Your reflections are spread consistently, with no single period dominating your attention. This suggests steady engagement rather than bursts or gaps.',
    shape: 'normal',
    confidence: 'medium',
  };

  const logNormalInsight: DistributionInsight = {
    headline: 'Your activity clusters into focused periods',
    description: 'Most of your reflections occur during a few concentrated windows, while the rest are spread lightly. This indicates cycles of focus followed by quieter periods.',
    shape: 'log_normal',
    confidence: 'high',
  };

  const powerLawInsight: DistributionInsight = {
    headline: 'Your activity concentrates in intense bursts',
    description: 'A small number of time periods account for most of your reflections. This pattern suggests episodic intensity, where meaning accumulates during rare but powerful moments.',
    shape: 'power_law',
    confidence: 'high',
  };

  it('weekly narrative generation', () => {
    const result = generateNarrative('week', logNormalInsight);

    expect(result.scope).toBe('week');
    expect(result.headline).toBe('This week showed focused bursts of activity');
    expect(result.summary).toContain('clustered into short, intense windows');
    expect(result.confidence).toBe('medium'); // Weekly caps at medium
  });

  it('monthly narrative generation', () => {
    const result = generateNarrative('month', logNormalInsight);

    expect(result.scope).toBe('month');
    expect(result.headline).toBe('This month formed recognizable patterns of focus');
    expect(result.summary).toContain('alternated between concentrated periods');
    expect(result.confidence).toBe('high'); // Inherits from insight
  });

  it('yearly narrative generation', () => {
    const result = generateNarrative('year', powerLawInsight);

    expect(result.scope).toBe('year');
    expect(result.headline).toBe('This year reflects how meaning accumulated over time');
    expect(result.summary).toContain('how attention and significance were distributed');
  });

  it('confidence capping rules', () => {
    // Weekly caps high confidence to medium
    const weeklyHigh = generateNarrative('week', logNormalInsight);
    expect(weeklyHigh.confidence).toBe('medium');

    // Weekly keeps medium confidence
    const weeklyMedium = generateNarrative('week', baseInsight);
    expect(weeklyMedium.confidence).toBe('medium');

    // Weekly keeps low confidence
    const lowInsight: DistributionInsight = { ...baseInsight, confidence: 'low' };
    const weeklyLow = generateNarrative('week', lowInsight);
    expect(weeklyLow.confidence).toBe('low');

    // Yearly caps at medium unless > 100 events
    const yearlyHigh = generateNarrative('year', logNormalInsight);
    expect(yearlyHigh.confidence).toBe('medium'); // Capped without totalEvents

    // Yearly with > 100 events keeps high confidence
    const yearlyHighWithEvents = generateNarrative('year', logNormalInsight, 150);
    expect(yearlyHighWithEvents.confidence).toBe('high');

    // Yearly with <= 100 events caps at medium
    const yearlyHighWithLowEvents = generateNarrative('year', logNormalInsight, 50);
    expect(yearlyHighWithLowEvents.confidence).toBe('medium');

    // Monthly inherits confidence
    const monthlyHigh = generateNarrative('month', logNormalInsight);
    expect(monthlyHigh.confidence).toBe('high');
  });

  it('deterministic output (same input → same text)', () => {
    const result1 = generateNarrative('week', baseInsight);
    const result2 = generateNarrative('week', baseInsight);
    const result3 = generateNarrative('week', baseInsight);

    expect(result1.headline).toBe(result2.headline);
    expect(result2.headline).toBe(result3.headline);
    expect(result1.summary).toBe(result2.summary);
    expect(result2.summary).toBe(result3.summary);
    expect(result1.confidence).toBe(result2.confidence);
    expect(result2.confidence).toBe(result3.confidence);
  });

  it('generates correct narratives for all shapes and scopes', () => {
    // Test normal shape across all scopes
    const weekNormal = generateNarrative('week', baseInsight);
    expect(weekNormal.headline).toContain('week');
    expect(weekNormal.summary).toContain('week');

    const monthNormal = generateNarrative('month', baseInsight);
    expect(monthNormal.headline).toContain('month');
    expect(monthNormal.summary).toContain('month');

    const yearNormal = generateNarrative('year', baseInsight);
    expect(yearNormal.headline).toContain('year');
    expect(yearNormal.summary).toContain('year');

    // Test log_normal shape
    const weekLogNormal = generateNarrative('week', logNormalInsight);
    expect(weekLogNormal.headline).toBe('This week showed focused bursts of activity');

    // Test power_law shape
    const weekPowerLaw = generateNarrative('week', powerLawInsight);
    expect(weekPowerLaw.headline).toBe('This week concentrated into intense moments');
  });
});


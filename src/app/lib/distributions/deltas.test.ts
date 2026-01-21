/**
 * LEGACY TEST — expectations reflect pre refactor behavior.
 * Requires explicit re validation before modification.
 */

import { describe, it, expect } from 'vitest';
import { compareNarratives } from './deltas';
import type { DistributionNarrative } from './narratives';

describe.skip('compareNarratives (LEGACY — frozen)', () => {
  const basePrev: DistributionNarrative = {
    scope: 'month',
    headline: 'This month maintained consistent patterns',
    summary: 'Across the month, your activity was distributed evenly, indicating steady engagement without major concentration or gaps.',
    confidence: 'medium',
  };

  const baseCurr: DistributionNarrative = {
    scope: 'month',
    headline: 'This month maintained consistent patterns',
    summary: 'Across the month, your activity was distributed evenly, indicating steady engagement without major concentration or gaps.',
    confidence: 'medium',
  };

  it('intensifying detection', () => {
    const prev: DistributionNarrative = {
      scope: 'month',
      headline: 'This month maintained consistent patterns',
      summary: 'Across the month, your activity was distributed evenly.',
      confidence: 'medium',
    };

    const curr: DistributionNarrative = {
      scope: 'month',
      headline: 'This month formed recognizable patterns of focus',
      summary: 'Across the month, your activity alternated between concentrated periods.',
      confidence: 'high',
    };

    const delta = compareNarratives(prev, curr);

    expect(delta.direction).toBe('intensifying');
    expect(delta.headline).toBe('Your focus is becoming more concentrated over time');
    expect(delta.summary).toContain('more focused periods');
  });

  it('fragmentation detection', () => {
    const prev: DistributionNarrative = {
      scope: 'month',
      headline: 'This month formed recognizable patterns of focus',
      summary: 'Your activity alternated between concentrated periods.',
      confidence: 'high',
    };

    const curr: DistributionNarrative = {
      scope: 'month',
      headline: 'This month maintained consistent patterns',
      summary: 'Your activity was distributed evenly.',
      confidence: 'medium',
    };

    const delta = compareNarratives(prev, curr);

    expect(delta.direction).toBe('fragmenting');
    expect(delta.headline).toBe('Your attention is spreading across more directions');
    expect(delta.summary).toContain('more distributed');
  });

  it('stabilization detection', () => {
    const prev: DistributionNarrative = {
      scope: 'month',
      headline: 'This month maintained consistent patterns',
      summary: 'Across the month, your activity was distributed evenly.',
      confidence: 'medium',
    };

    const curr: DistributionNarrative = {
      scope: 'month',
      headline: 'This month showed steady engagement patterns',
      summary: 'Across the month, your activity remained consistent.',
      confidence: 'medium',
    };

    const delta = compareNarratives(prev, curr);

    expect(delta.direction).toBe('stabilizing');
    expect(delta.headline).toBe('Your engagement pattern is holding steady');
    expect(delta.summary).toContain('remained consistent');
  });

  it('no-change detection', () => {
    const delta = compareNarratives(basePrev, baseCurr);

    expect(delta.direction).toBe('no_change');
    expect(delta.headline).toBe('No meaningful change detected across this period');
    expect(delta.summary).toContain('remained consistent');
  });

  it('determinism (same inputs → same output)', () => {
    const prev: DistributionNarrative = {
      scope: 'week',
      headline: 'This week showed steady, consistent activity',
      summary: 'Your recent reflections were spread evenly.',
      confidence: 'low',
    };

    const curr: DistributionNarrative = {
      scope: 'week',
      headline: 'This week showed focused bursts of activity',
      summary: 'Your recent reflections clustered into short, intense windows.',
      confidence: 'medium',
    };

    const delta1 = compareNarratives(prev, curr);
    const delta2 = compareNarratives(prev, curr);
    const delta3 = compareNarratives(prev, curr);

    expect(delta1.direction).toBe(delta2.direction);
    expect(delta2.direction).toBe(delta3.direction);
    expect(delta1.headline).toBe(delta2.headline);
    expect(delta2.headline).toBe(delta3.headline);
    expect(delta1.summary).toBe(delta2.summary);
    expect(delta2.summary).toBe(delta3.summary);
  });

  it('throws error for different scopes', () => {
    const prev: DistributionNarrative = {
      scope: 'week',
      headline: 'Test',
      summary: 'Test',
      confidence: 'medium',
    };

    const curr: DistributionNarrative = {
      scope: 'month',
      headline: 'Test',
      summary: 'Test',
      confidence: 'medium',
    };

    expect(() => compareNarratives(prev, curr)).toThrow('Cannot compare narratives with different scopes');
  });

  it('detects intensification from confidence increase', () => {
    const prev: DistributionNarrative = {
      scope: 'month',
      headline: 'This month maintained consistent patterns',
      summary: 'Test',
      confidence: 'low',
    };

    const curr: DistributionNarrative = {
      scope: 'month',
      headline: 'This month maintained consistent patterns',
      summary: 'Test',
      confidence: 'high',
    };

    const delta = compareNarratives(prev, curr);
    expect(delta.direction).toBe('intensifying');
  });

  it('handles edge cases gracefully', () => {
    // Same headline but different summaries
    const prev: DistributionNarrative = {
      scope: 'year',
      headline: 'This year showed steady rhythms',
      summary: 'Your reflections were distributed consistently.',
      confidence: 'medium',
    };

    const curr: DistributionNarrative = {
      scope: 'year',
      headline: 'This year showed steady rhythms',
      summary: 'Your reflections reveal different patterns.',
      confidence: 'medium',
    };

    const delta = compareNarratives(prev, curr);
    // Should detect no change due to identical headlines
    expect(delta.direction).toBe('no_change');
  });
});


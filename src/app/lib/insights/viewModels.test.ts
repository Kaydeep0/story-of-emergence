import { describe, it, expect } from 'vitest';
import { fromNarrative, fromDelta } from './viewModels';
import type { DistributionNarrative } from '@/app/lib/distributions/narratives';
import type { NarrativeDelta } from '@/app/lib/distributions/deltas';

describe('viewModels adapters', () => {
  describe('fromNarrative', () => {
    const baseNarrative: DistributionNarrative = {
      scope: 'month',
      headline: 'This month maintained consistent patterns',
      summary: 'Across the month, your activity was distributed evenly.',
      confidence: 'medium',
    };

    it('same narrative → same InsightCard', () => {
      const card1 = fromNarrative(baseNarrative);
      const card2 = fromNarrative(baseNarrative);
      const card3 = fromNarrative(baseNarrative);

      expect(card1).toEqual(card2);
      expect(card2).toEqual(card3);
      expect(card1.id).toBe(card2.id);
      expect(card2.id).toBe(card3.id);
    });

    it('no undefined fields', () => {
      const card = fromNarrative(baseNarrative);

      expect(card.id).toBeDefined();
      expect(card.scope).toBeDefined();
      expect(card.headline).toBeDefined();
      expect(card.summary).toBeDefined();
      expect(card.confidence).toBeDefined();

      expect(card.id).not.toBe('');
      expect(card.scope).not.toBe('');
      expect(card.headline).not.toBe('');
      expect(card.summary).not.toBe('');
    });

    it('stable IDs (hash scope + headline)', () => {
      const narrative1: DistributionNarrative = {
        scope: 'week',
        headline: 'This week showed steady activity',
        summary: 'Test summary',
        confidence: 'low',
      };

      const narrative2: DistributionNarrative = {
        scope: 'week',
        headline: 'This week showed steady activity',
        summary: 'Different summary', // Different summary shouldn't affect ID
        confidence: 'high', // Different confidence shouldn't affect ID
      };

      const card1 = fromNarrative(narrative1);
      const card2 = fromNarrative(narrative2);

      // Same scope + headline should produce same ID
      expect(card1.id).toBe(card2.id);
    });

    it('different headlines produce different IDs', () => {
      const narrative1: DistributionNarrative = {
        scope: 'month',
        headline: 'This month maintained consistent patterns',
        summary: 'Test',
        confidence: 'medium',
      };

      const narrative2: DistributionNarrative = {
        scope: 'month',
        headline: 'This month formed recognizable patterns',
        summary: 'Test',
        confidence: 'medium',
      };

      const card1 = fromNarrative(narrative1);
      const card2 = fromNarrative(narrative2);

      expect(card1.id).not.toBe(card2.id);
    });

    it('maps all fields correctly', () => {
      const narrative: DistributionNarrative = {
        scope: 'year',
        headline: 'This year showed steady rhythms',
        summary: 'Over the year, your reflections were distributed consistently.',
        confidence: 'high',
      };

      const card = fromNarrative(narrative);

      expect(card.scope).toBe('year');
      expect(card.headline).toBe('This year showed steady rhythms');
      expect(card.summary).toBe('Over the year, your reflections were distributed consistently.');
      expect(card.confidence).toBe('high');
    });
  });

  describe('fromDelta', () => {
    const baseDelta: NarrativeDelta = {
      scope: 'month',
      direction: 'intensifying',
      headline: 'Your focus is becoming more concentrated over time',
      summary: 'Your activity is clustering into more focused periods.',
    };

    it('same delta → same InsightDeltaCard', () => {
      const card1 = fromDelta(baseDelta);
      const card2 = fromDelta(baseDelta);
      const card3 = fromDelta(baseDelta);

      expect(card1).toEqual(card2);
      expect(card2).toEqual(card3);
      expect(card1.id).toBe(card2.id);
      expect(card2.id).toBe(card3.id);
    });

    it('no undefined fields', () => {
      const card = fromDelta(baseDelta);

      expect(card.id).toBeDefined();
      expect(card.scope).toBeDefined();
      expect(card.direction).toBeDefined();
      expect(card.headline).toBeDefined();
      expect(card.summary).toBeDefined();

      expect(card.id).not.toBe('');
      expect(card.scope).not.toBe('');
      expect(card.direction).not.toBe('');
      expect(card.headline).not.toBe('');
      expect(card.summary).not.toBe('');
    });

    it('stable IDs (hash scope + headline)', () => {
      const delta1: NarrativeDelta = {
        scope: 'week',
        direction: 'stabilizing',
        headline: 'Your engagement pattern is holding steady',
        summary: 'Test summary',
      };

      const delta2: NarrativeDelta = {
        scope: 'week',
        direction: 'stabilizing',
        headline: 'Your engagement pattern is holding steady',
        summary: 'Different summary', // Different summary shouldn't affect ID
      };

      const card1 = fromDelta(delta1);
      const card2 = fromDelta(delta2);

      // Same scope + headline should produce same ID
      expect(card1.id).toBe(card2.id);
    });

    it('maps all fields correctly', () => {
      const delta: NarrativeDelta = {
        scope: 'year',
        direction: 'fragmenting',
        headline: 'Your attention is spreading across more directions',
        summary: 'Your activity is becoming more distributed.',
      };

      const card = fromDelta(delta);

      expect(card.scope).toBe('year');
      expect(card.direction).toBe('fragmenting');
      expect(card.headline).toBe('Your attention is spreading across more directions');
      expect(card.summary).toBe('Your activity is becoming more distributed.');
    });

    it('handles all direction types', () => {
      const directions: Array<NarrativeDelta['direction']> = [
        'intensifying',
        'stabilizing',
        'fragmenting',
        'no_change',
      ];

      for (const direction of directions) {
        const delta: NarrativeDelta = {
          scope: 'month',
          direction,
          headline: `Test headline for ${direction}`,
          summary: 'Test summary',
        };

        const card = fromDelta(delta);
        expect(card.direction).toBe(direction);
      }
    });
  });
});


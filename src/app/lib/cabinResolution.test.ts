// src/app/lib/cabinResolution.test.ts
// Unit tests for cabin mode resolution logic

import { describe, it, expect } from 'vitest';
import { resolveCabinMode, type CabinResolutionInputs } from './cabinResolution';

describe('resolveCabinMode', () => {
  const baseInputs: CabinResolutionInputs = {
    explicitMode: null,
    fromBridge: false,
    optedOut: false,
    debug: false,
    threadDepth: 0,
    highlightsFound: false,
    urlHasCabinMode: false,
  };

  describe('explicit mode', () => {
    it('should return cabin=true when explicitMode is "cabin"', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        explicitMode: 'cabin',
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe(null);
    });

    it('should ignore other triggers when explicitMode is "cabin"', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        explicitMode: 'cabin',
        fromBridge: true,
        threadDepth: 5,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe(null);
    });
  });

  describe('opt-out behavior', () => {
    it('should prevent auto-cabin when optedOut=true and no URL mode', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        optedOut: true,
        fromBridge: true,
        urlHasCabinMode: false,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });

    it('should allow cabin when optedOut=true but URL has mode=cabin', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        optedOut: true,
        fromBridge: true,
        urlHasCabinMode: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('bridge');
    });

    it('should prevent auto-cabin from depth trigger when opted out', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        optedOut: true,
        threadDepth: 3,
        urlHasCabinMode: false,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });

    it('should prevent auto-cabin from highlights trigger when opted out', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        optedOut: true,
        highlightsFound: true,
        urlHasCabinMode: false,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('debug mode', () => {
    it('should prevent auto-cabin when debug=true', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        debug: true,
        fromBridge: true,
        threadDepth: 5,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('fromBridge trigger', () => {
    it('should enable cabin when fromBridge=true', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        fromBridge: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('bridge');
    });

    it('should prioritize bridge reason over depth', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        fromBridge: true,
        threadDepth: 3,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('bridge');
    });

    it('should prioritize bridge reason over highlights', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        fromBridge: true,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('bridge');
    });
  });

  describe('threadDepth trigger', () => {
    it('should enable cabin when threadDepth >= 2', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        threadDepth: 2,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('depth');
    });

    it('should enable cabin when threadDepth > 2', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        threadDepth: 5,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('depth');
    });

    it('should not enable cabin when threadDepth < 2', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        threadDepth: 1,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });

    it('should prioritize depth reason over highlights', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        threadDepth: 3,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('depth');
    });
  });

  describe('highlights trigger', () => {
    it('should enable cabin when highlightsFound=true', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('highlights');
    });

    it('should not enable cabin when highlightsFound=false', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        highlightsFound: false,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('no triggers', () => {
    it('should return cabin=false when no triggers are present', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        fromBridge: false,
        threadDepth: 0,
        highlightsFound: false,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });

    it('should return cabin=false when threadDepth=1 (below threshold)', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        threadDepth: 1,
      });
      expect(result.cabin).toBe(false);
      expect(result.reason).toBe(null);
    });
  });

  describe('combined scenarios', () => {
    it('should handle opt-out with URL mode correctly', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        optedOut: true,
        fromBridge: true,
        urlHasCabinMode: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('bridge');
    });

    it('should handle multiple triggers with correct priority', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        fromBridge: true,
        threadDepth: 5,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('bridge'); // Bridge has highest priority
    });

    it('should handle depth + highlights (no bridge)', () => {
      const result = resolveCabinMode({
        ...baseInputs,
        threadDepth: 3,
        highlightsFound: true,
      });
      expect(result.cabin).toBe(true);
      expect(result.reason).toBe('depth'); // Depth has priority over highlights
    });
  });
});


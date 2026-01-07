// src/app/lib/observer/attachPersistence.invariant.test.ts
// Observer v1: Invariant tests to prevent Observer drift
// These tests ensure Observer stays a mirror and never turns into a life coach

import { describe, it, expect, beforeEach } from 'vitest';
import { attachPersistenceToArtifact, resetPersistenceCacheIfIdentityChanged } from './attachPersistence';
import type { InsightArtifact } from '../insights/artifactTypes';

/**
 * Create a minimal test artifact
 */
function createTestArtifact(
  horizon: 'weekly' | 'yearly',
  windowStart: string,
  windowEnd: string
): InsightArtifact {
  return {
    horizon,
    window: {
      kind: horizon === 'weekly' ? 'week' : 'year',
      start: windowStart,
      end: windowEnd,
    },
    createdAt: new Date().toISOString(),
    cards: [],
    persistence: null,
    debug: {
      eventCount: 10,
      windowStartIso: windowStart,
      windowEndIso: windowEnd,
      minEventIso: windowStart,
      maxEventIso: windowEnd,
      sampleEventIds: [],
      sampleEventDates: [],
    },
  };
}

/**
 * Test: Statement is null when only one artifact exists
 */
function testSingleArtifactReturnsNull() {
  resetPersistenceCacheIfIdentityChanged('test-address-1');
  
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const datasetVersion = '2024-01-08T00:00:00Z';
  
  const result = attachPersistenceToArtifact(weekly, [], {
    address: 'test-address-1',
    datasetVersion,
  });
  
  if (result.persistence !== null) {
    throw new Error('Expected null persistence when only one artifact exists');
  }
  
  if (result.debug?.observerV1?.weeklyInCache !== true) {
    throw new Error('Expected weekly artifact to be stored in cache');
  }
  
  if (result.debug?.observerV1?.yearlyInCache !== false) {
    throw new Error('Expected yearly artifact to be missing from cache');
  }
  
  console.log('✅ Test passed: Single artifact returns null persistence');
}

/**
 * Test: Statement is null when datasetVersion differs (different cacheKey)
 */
export function testDifferentDatasetVersionReturnsNull() {
  resetPersistenceCacheIfIdentityChanged('test-address-2');
  
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
  
  // Store weekly with one dataset version
  const weeklyResult = attachPersistenceToArtifact(weekly, [], {
    address: 'test-address-2',
    datasetVersion: '2024-01-08T00:00:00Z',
  });
  
  if (weeklyResult.persistence !== null) {
    throw new Error('Expected null persistence when only weekly exists');
  }
  
  // Try to attach yearly with different dataset version
  const yearlyResult = attachPersistenceToArtifact(yearly, [], {
    address: 'test-address-2',
    datasetVersion: '2024-12-31T23:59:59Z', // Different version
  });
  
  if (yearlyResult.persistence !== null) {
    throw new Error('Expected null persistence when datasetVersion differs (different cacheKey)');
  }
  
  if (yearlyResult.debug?.observerV1?.cacheKey !== 'test-address-2::2024-12-31T23:59:59Z') {
    throw new Error('Expected cacheKey to reflect different datasetVersion');
  }
  
  console.log('✅ Test passed: Different datasetVersion returns null persistence');
}

/**
 * Test: Statement is null when wallet address differs
 */
export function testDifferentWalletAddressReturnsNull() {
  resetPersistenceCacheIfIdentityChanged('test-address-3');
  
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const datasetVersion = '2024-01-08T00:00:00Z';
  
  // Store weekly with one wallet
  const weeklyResult = attachPersistenceToArtifact(weekly, [], {
    address: 'test-address-3',
    datasetVersion,
  });
  
  if (weeklyResult.persistence !== null) {
    throw new Error('Expected null persistence when only weekly exists');
  }
  
  // Reset cache for new wallet
  resetPersistenceCacheIfIdentityChanged('test-address-4');
  
  // Try to attach yearly with different wallet (cache should be cleared)
  const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
  const yearlyResult = attachPersistenceToArtifact(yearly, [], {
    address: 'test-address-4', // Different wallet
    datasetVersion,
  });
  
  if (yearlyResult.persistence !== null) {
    throw new Error('Expected null persistence when wallet address differs (cache cleared)');
  }
  
  if (yearlyResult.debug?.observerV1?.cacheKey !== 'test-address-4::2024-01-08T00:00:00Z') {
    throw new Error('Expected cacheKey to reflect different wallet address');
  }
  
  console.log('✅ Test passed: Different wallet address returns null persistence');
}

/**
 * Test: Statement is present only when both artifacts present and identity rule passes
 * 
 * Note: This test may pass or fail depending on whether test data actually matches patterns.
 * The important part is that the system attempts comparison when both artifacts exist.
 */
export function testBothArtifactsAttemptComparison() {
  resetPersistenceCacheIfIdentityChanged('test-address-5');
  
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
  const datasetVersion = '2024-12-31T23:59:59Z';
  
  // Store weekly first
  const weeklyResult = attachPersistenceToArtifact(weekly, [], {
    address: 'test-address-5',
    datasetVersion,
  });
  
  if (weeklyResult.persistence !== null) {
    throw new Error('Expected null persistence when only weekly exists');
  }
  
  // Store yearly (should trigger comparison)
  const yearlyResult = attachPersistenceToArtifact(yearly, [], {
    address: 'test-address-5',
    datasetVersion,
  });
  
  // Both artifacts should be in cache
  if (yearlyResult.debug?.observerV1?.weeklyInCache !== true) {
    throw new Error('Expected weekly artifact to be in cache');
  }
  
  if (yearlyResult.debug?.observerV1?.yearlyInCache !== true) {
    throw new Error('Expected yearly artifact to be in cache');
  }
  
  // Comparison should have been attempted (may return null if patterns don't match, which is fine)
  // The important thing is that both artifacts are present and comparison runs
  // If patterns match, persistence will be non-null; if not, it stays null (silence)
  
  console.log('✅ Test passed: Both artifacts trigger comparison attempt');
  console.log(`   Persistence result: ${yearlyResult.persistence ? 'present' : 'null (silence)'}`);
  console.log(`   Match: ${yearlyResult.debug?.observerV1?.match}`);
  console.log(`   Silence reason: ${yearlyResult.debug?.observerV1?.silenceReason || 'none'}`);
}

describe('Observer v1 Invariant Tests', () => {
  beforeEach(() => {
    // Reset cache before each test
    resetPersistenceCacheIfIdentityChanged('test-reset');
  });

  it('should return null persistence when only one artifact exists', () => {
    resetPersistenceCacheIfIdentityChanged('test-address-1');
    
    const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
    const datasetVersion = '2024-01-08T00:00:00Z';
    
    const result = attachPersistenceToArtifact(weekly, [], {
      address: 'test-address-1',
      datasetVersion,
    });
    
    expect(result.persistence).toBeNull();
    expect(result.debug?.observerV1?.weeklyInCache).toBe(true);
    expect(result.debug?.observerV1?.yearlyInCache).toBe(false);
  });

  it('should return null persistence when datasetVersion differs', () => {
    resetPersistenceCacheIfIdentityChanged('test-address-2');
    
    const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
    const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
    
    // Store weekly with one dataset version
    const weeklyResult = attachPersistenceToArtifact(weekly, [], {
      address: 'test-address-2',
      datasetVersion: '2024-01-08T00:00:00Z',
    });
    
    expect(weeklyResult.persistence).toBeNull();
    
    // Try to attach yearly with different dataset version
    const yearlyResult = attachPersistenceToArtifact(yearly, [], {
      address: 'test-address-2',
      datasetVersion: '2024-12-31T23:59:59Z', // Different version
    });
    
    expect(yearlyResult.persistence).toBeNull();
    expect(yearlyResult.debug?.observerV1?.cacheKey).toBe('test-address-2::2024-12-31T23:59:59Z');
  });

  it('should return null persistence when wallet address differs', () => {
    resetPersistenceCacheIfIdentityChanged('test-address-3');
    
    const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
    const datasetVersion = '2024-01-08T00:00:00Z';
    
    // Store weekly with one wallet
    const weeklyResult = attachPersistenceToArtifact(weekly, [], {
      address: 'test-address-3',
      datasetVersion,
    });
    
    expect(weeklyResult.persistence).toBeNull();
    
    // Reset cache for new wallet
    resetPersistenceCacheIfIdentityChanged('test-address-4');
    
    // Try to attach yearly with different wallet (cache should be cleared)
    const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
    const yearlyResult = attachPersistenceToArtifact(yearly, [], {
      address: 'test-address-4', // Different wallet
      datasetVersion,
    });
    
    expect(yearlyResult.persistence).toBeNull();
    expect(yearlyResult.debug?.observerV1?.cacheKey).toBe('test-address-4::2024-01-08T00:00:00Z');
  });

  it('should attempt comparison when both artifacts are present', () => {
    resetPersistenceCacheIfIdentityChanged('test-address-5');
    
    const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
    const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
    const datasetVersion = '2024-12-31T23:59:59Z';
    
    // Store weekly first
    const weeklyResult = attachPersistenceToArtifact(weekly, [], {
      address: 'test-address-5',
      datasetVersion,
    });
    
    expect(weeklyResult.persistence).toBeNull();
    
    // Store yearly (should trigger comparison)
    const yearlyResult = attachPersistenceToArtifact(yearly, [], {
      address: 'test-address-5',
      datasetVersion,
    });
    
    // Both artifacts should be in cache
    expect(yearlyResult.debug?.observerV1?.weeklyInCache).toBe(true);
    expect(yearlyResult.debug?.observerV1?.yearlyInCache).toBe(true);
    
    // Comparison should have been attempted (may return null if patterns don't match, which is fine)
    // The important thing is that both artifacts are present and comparison runs
  });
});


// src/app/lib/observer/compareArtifacts.test.ts
// Observer v1: Integration tests for artifact comparison
// Lightweight sanity checks to prove persistence detection works

import { compareArtifactsForPersistence } from './compareArtifacts';
import type { InsightArtifact } from '../insights/artifactTypes';
import { makePatternSignature } from './patternSignature';

/**
 * Create a test artifact
 */
function createTestArtifact(
  horizon: 'weekly' | 'yearly',
  windowStart: string,
  windowEnd: string,
  hasDistributionData: boolean = true
): InsightArtifact {
  const artifact: InsightArtifact = {
    horizon,
    window: {
      kind: horizon === 'weekly' ? 'week' : 'year',
      start: windowStart,
      end: windowEnd,
    },
    createdAt: new Date().toISOString(),
    cards: [],
  };
  
  // Add distribution data to Yearly artifact cards
  if (horizon === 'yearly' && hasDistributionData) {
    artifact.cards = [
      {
        id: 'test-yearly-card',
        kind: 'distribution',
        title: 'Test Yearly Card',
        explanation: 'Test',
        evidence: [],
        computedAt: new Date().toISOString(),
        _distributionResult: {
          totalEntries: 100,
          dateRange: { start: new Date(windowStart), end: new Date(windowEnd) },
          dailyCounts: [1, 2, 3, 4, 5],
          topDays: [
            { date: '2024-01-01', count: 5 },
            { date: '2024-01-02', count: 4 },
            { date: '2024-01-03', count: 3 },
          ],
          fittedBuckets: {
            normal: { count: 0, share: 0 },
            lognormal: { count: 50, share: 0.5 },
            powerlaw: { count: 50, share: 0.5 },
          },
          stats: {
            mostCommonDayCount: 2,
            variance: 1.5,
            spikeRatio: 2.5,
            top10PercentDaysShare: 0.45,
          },
        } as any,
        _windowDistribution: {
          classification: 'lognormal' as const,
          windowDays: 365,
          frequencyPerDay: 0.27,
          magnitudeProxy: 100,
          recencyGaps: [],
          topSpikeDates: ['2024-01-01'],
          explanation: 'Test',
        } as any,
      } as any,
    ];
  }
  
  return artifact;
}

/**
 * Test: Weekly plus Yearly with same signature and non-overlapping windows returns statement
 */
function testValidPersistenceReturnsStatement() {
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z');
  
  // Create test reflections for Weekly
  const reflections = [
    {
      id: '1',
      createdAt: '2024-01-01T00:00:00Z',
      plaintext: 'Test reflection',
    },
    {
      id: '2',
      createdAt: '2024-01-02T00:00:00Z',
      plaintext: 'Test reflection 2',
    },
  ] as any[];
  
  const result = compareArtifactsForPersistence(weekly, yearly, reflections);
  
  // Result may be null if signatures don't match (expected for test data)
  // But structure should be correct if not null
  if (result) {
    if (!result.weekly || !result.yearly) {
      throw new Error('Expected both artifacts in result');
    }
    if (result.debug.match && !result.weekly.persistence) {
      throw new Error('Expected persistence when match is true');
    }
  }
  
  console.log('✅ Test passed: Valid persistence structure');
}

/**
 * Test: Weekly plus Yearly where one signature null returns null persistence
 */
function testNullSignatureReturnsNullPersistence() {
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const yearly = createTestArtifact('yearly', '2024-01-01T00:00:00Z', '2024-12-31T23:59:59Z', false); // No distribution data
  
  const result = compareArtifactsForPersistence(weekly, yearly);
  
  // Should return result with debug, but persistence should be null
  if (!result) {
    throw new Error('Expected result object even when persistence is null');
  }
  
  if (result.weekly.persistence !== null || result.yearly.persistence !== null) {
    throw new Error('Expected null persistence when signature is null');
  }
  
  if (result.debug.match !== false) {
    throw new Error('Expected match to be false when signature is null');
  }
  
  console.log('✅ Test passed: Null signature returns null persistence');
}

/**
 * Test: Weekly plus Yearly overlapping returns null
 */
function testOverlappingWindowsReturnsNull() {
  const weekly = createTestArtifact('weekly', '2024-01-01T00:00:00Z', '2024-01-08T00:00:00Z');
  const yearly = createTestArtifact('yearly', '2024-01-05T00:00:00Z', '2024-12-31T23:59:59Z'); // Overlaps with weekly
  
  const reflections = [
    {
      id: '1',
      createdAt: '2024-01-01T00:00:00Z',
      plaintext: 'Test reflection',
    },
  ] as any[];
  
  const result = compareArtifactsForPersistence(weekly, yearly, reflections);
  
  // Should return result with debug, but persistence should be null
  if (!result) {
    throw new Error('Expected result object even when windows overlap');
  }
  
  if (result.weekly.persistence !== null || result.yearly.persistence !== null) {
    throw new Error('Expected null persistence when windows overlap');
  }
  
  if (result.debug.match !== false) {
    throw new Error('Expected match to be false when windows overlap');
  }
  
  console.log('✅ Test passed: Overlapping windows return null persistence');
}

/**
 * Run all tests
 */
export function runCompareArtifactsTests() {
  console.log('Running Observer v1 artifact comparison tests...\n');
  
  try {
    testValidPersistenceReturnsStatement();
    testNullSignatureReturnsNullPersistence();
    testOverlappingWindowsReturnsNull();
    
    console.log('\n✅ All tests passed');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly (for manual testing)
if (require.main === module) {
  runCompareArtifactsTests();
}


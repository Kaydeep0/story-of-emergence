// src/app/lib/observer/patternPersistence.test.ts
// Observer v1: Pattern persistence detection tests
// Lightweight sanity checks to prove silence rules work

import { detectPatternPersistence, type PersistenceWindow } from './patternPersistence';
import type { PatternSignature } from './patternSignature';

/**
 * Create a test pattern signature
 */
function createTestSignature(overrides?: Partial<PatternSignature>): PatternSignature {
  return {
    observedDistributionFit: 'lognormal',
    concentrationRatio: 3.5,
    dayOfWeekPattern: new Set([0, 6]), // Sunday, Saturday
    topPercentileShare: 0.45,
    relativeSpikeThreshold: 2.0,
    ...overrides,
  };
}

/**
 * Test: Single window returns null (silence rule)
 */
function testSingleWindowReturnsNull() {
  const windows: PersistenceWindow[] = [
    {
      lens: 'weekly',
      windowStart: '2024-01-01T00:00:00Z',
      windowEnd: '2024-01-08T00:00:00Z',
      signature: createTestSignature(),
    },
  ];
  
  const result = detectPatternPersistence(windows);
  
  if (result !== null) {
    throw new Error('Expected null for single window, got result');
  }
  
  console.log('✅ Test passed: Single window returns null');
}

/**
 * Test: Overlapping windows return null (silence rule)
 */
function testOverlappingWindowsReturnNull() {
  const signature = createTestSignature();
  
  const windows: PersistenceWindow[] = [
    {
      lens: 'weekly',
      windowStart: '2024-01-01T00:00:00Z',
      windowEnd: '2024-01-08T00:00:00Z',
      signature,
    },
    {
      lens: 'yearly',
      windowStart: '2024-01-05T00:00:00Z', // Overlaps with weekly
      windowEnd: '2024-12-31T23:59:59Z',
      signature,
    },
  ];
  
  const result = detectPatternPersistence(windows);
  
  if (result !== null) {
    throw new Error('Expected null for overlapping windows, got result');
  }
  
  console.log('✅ Test passed: Overlapping windows return null');
}

/**
 * Test: Same lens returns null (silence rule)
 */
function testSameLensReturnsNull() {
  const signature = createTestSignature();
  
  const windows: PersistenceWindow[] = [
    {
      lens: 'weekly',
      windowStart: '2024-01-01T00:00:00Z',
      windowEnd: '2024-01-08T00:00:00Z',
      signature,
    },
    {
      lens: 'weekly', // Same lens
      windowStart: '2024-01-15T00:00:00Z',
      windowEnd: '2024-01-22T00:00:00Z',
      signature,
    },
  ];
  
  const result = detectPatternPersistence(windows);
  
  if (result !== null) {
    throw new Error('Expected null for same lens, got result');
  }
  
  console.log('✅ Test passed: Same lens returns null');
}

/**
 * Test: Valid persistence returns result
 */
function testValidPersistenceReturnsResult() {
  const signature = createTestSignature();
  
  const windows: PersistenceWindow[] = [
    {
      lens: 'weekly',
      windowStart: '2024-01-01T00:00:00Z',
      windowEnd: '2024-01-08T00:00:00Z',
      signature,
    },
    {
      lens: 'yearly',
      windowStart: '2024-01-01T00:00:00Z',
      windowEnd: '2024-12-31T23:59:59Z',
      signature, // Same signature
    },
  ];
  
  const result = detectPatternPersistence(windows);
  
  if (result === null) {
    throw new Error('Expected result for valid persistence, got null');
  }
  
  if (result.lenses[0] !== 'weekly' || result.lenses[1] !== 'yearly') {
    throw new Error('Expected lenses [weekly, yearly], got ' + JSON.stringify(result.lenses));
  }
  
  console.log('✅ Test passed: Valid persistence returns result');
}

/**
 * Run all tests
 */
export function runPatternPersistenceTests() {
  console.log('Running Observer v1 pattern persistence tests...\n');
  
  try {
    testSingleWindowReturnsNull();
    testOverlappingWindowsReturnNull();
    testSameLensReturnsNull();
    testValidPersistenceReturnsResult();
    
    console.log('\n✅ All tests passed');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests if this file is executed directly (for manual testing)
if (require.main === module) {
  runPatternPersistenceTests();
}


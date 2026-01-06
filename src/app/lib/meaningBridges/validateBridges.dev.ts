/**
 * DEV-ONLY: Narrative Bridges Validation Harness
 * 
 * This file is for development validation only and should not be imported in production builds.
 * 
 * Usage:
 *   npm run validate-bridges
 * 
 * This will:
 *   1. Run bridge generation across curated reflection pairs
 *   2. Score each bridge using a decomposed rubric (causality, specificity, sequence, scale, overreach)
 *   3. Print a summary with per-category scores and total
 *   4. Save JSON snapshots to .dev-snapshots/ directory
 * 
 * Adding new test cases:
 *   Add entries to VALIDATION_CASES array below. Each case should have:
 *   - name: unique identifier
 *   - description: what this case tests
 *   - reflections: array of reflection pairs (id, createdAt ISO string, text)
 *   - expectedMinBridges/expectedMaxBridges: expected bridge count range
 *   - expectedReasons: optional array of expected reason combinations
 * 
 * Tuning:
 *   After running the harness, review per-category scores to see what moved.
 *   Adjust weights in buildNarrativeBridge.ts DEFAULT_BRIDGE_WEIGHTS.
 *   Re-run harness to validate changes.
 */

import { buildNarrativeBridges, type NarrativeBridge } from './buildNarrativeBridge';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

type ReflectionPair = {
  id: string;
  createdAt: string;
  text: string;
  sources?: { kind?: string; title?: string }[];
};

type ValidationCase = {
  name: string;
  description: string;
  reflections: ReflectionPair[];
  expectedMinBridges?: number;
  expectedMaxBridges?: number;
  expectedReasons?: NarrativeBridge['reasons'][];
};

type RubricScore = {
  caseName: string;
  bridgesGenerated: number;
  expectedRange: { min: number; max: number };
  passed: boolean;
  bridgeDetails: Array<{
    from: string;
    to: string;
    weight: number;
    reasons: string[];
    explanation: string;
    scores: DecomposedScore;
  }>;
  averageScore: DecomposedScore;
  notes: string[];
};

// Curated test cases - add real reflection pairs here
const VALIDATION_CASES: ValidationCase[] = [
  {
    name: 'scale_carry_sequence',
    description: 'Two reflections 3 days apart, second carries scale signal forward',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-01-01T10:00:00Z',
        text: 'Thinking about Farzi counterfeit scale. Billions and crores involved. This is massive.',
      },
      {
        id: 'r2',
        createdAt: '2024-01-04T14:00:00Z',
        text: 'The scale breaks intuition. At that scale, systems behave differently. Policy transmission gets distorted.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'scale']],
  },
  {
    name: 'systemic_lift',
    description: 'Reflection B lifts A into system-level thinking',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-01-10T09:00:00Z',
        text: 'Watched a documentary about currency policy. Interesting how central banks work.',
      },
      {
        id: 'r2',
        createdAt: '2024-01-12T11:00:00Z',
        text: 'The real issue is trust and coordination. Institutions need legitimacy. This is about systemic architecture.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'systemic']],
  },
  {
    name: 'media_anchor',
    description: 'Media moment becomes insight anchor',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-01-15T20:00:00Z',
        text: 'Watching this show made me think about how narratives form.',
      },
      {
        id: 'r2',
        createdAt: '2024-01-17T10:00:00Z',
        text: 'The show was just a trigger. The real insight is about how meaning emerges from sequence.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'media']],
  },
  {
    name: 'contrast_zoom',
    description: 'Micro to macro zoom shift',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-01-20T08:00:00Z',
        text: 'Zoomed in on a specific problem. Very concrete and local.',
      },
      {
        id: 'r2',
        createdAt: '2024-01-22T15:00:00Z',
        text: 'Zoomed out to see the systemic pattern. This is structural, not local.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'contrast']],
  },
  {
    name: 'no_bridge_expected',
    description: 'Two reflections too far apart (15 days) - should not bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-01-01T10:00:00Z',
        text: 'Some initial thought.',
      },
      {
        id: 'r2',
        createdAt: '2024-01-16T10:00:00Z',
        text: 'Completely unrelated thought much later.',
      },
    ],
    expectedMinBridges: 0,
    expectedMaxBridges: 0,
  },
  {
    name: 'multi_reflection_chain',
    description: 'Three reflections in sequence - should generate multiple bridges',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-02-01T10:00:00Z',
        text: 'Initial observation about scale. Millions involved.',
      },
      {
        id: 'r2',
        createdAt: '2024-02-03T14:00:00Z',
        text: 'Scale breaks intuition. System-level effects emerge.',
      },
      {
        id: 'r3',
        createdAt: '2024-02-05T16:00:00Z',
        text: 'Policy and trust become central. Institutions matter at this scale.',
      },
    ],
    expectedMinBridges: 2,
    expectedMaxBridges: 4, // Could be r1->r2, r1->r3, r2->r3, etc.
  },
  // Bucket 1: False friends (should NOT bridge)
  {
    name: 'false_friend_same_keywords_different_claim',
    description: 'Same keywords but different claim - should NOT bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-03-01T10:00:00Z',
        text: 'The system of checks and balances in government prevents abuse of power. Institutions matter.',
      },
      {
        id: 'r2',
        createdAt: '2024-03-03T14:00:00Z',
        text: 'The system of checks and balances in my code prevents bugs. Architecture matters.',
      },
    ],
    expectedMinBridges: 0,
    expectedMaxBridges: 0,
  },
  {
    name: 'false_friend_systems_language_no_causal_chain',
    description: 'Same "systems" language, different topic, no causal chain - should NOT bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-03-05T09:00:00Z',
        text: 'Feedback loops in economic policy create unintended consequences. Trust erodes when signals get distorted.',
      },
      {
        id: 'r2',
        createdAt: '2024-03-07T11:00:00Z',
        text: 'Feedback loops in my workout routine create positive momentum. Trust builds when signals align.',
      },
    ],
    expectedMinBridges: 0,
    expectedMaxBridges: 0,
  },
  {
    name: 'false_friend_similar_emotion_unrelated_content',
    description: 'Similar emotion but unrelated content - should NOT bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-03-10T08:00:00Z',
        text: 'Frustrated with the bureaucracy. Everything takes forever. The system is broken.',
      },
      {
        id: 'r2',
        createdAt: '2024-03-12T15:00:00Z',
        text: 'Frustrated with my internet connection. Everything buffers. The network is slow.',
      },
    ],
    expectedMinBridges: 0,
    expectedMaxBridges: 0,
  },
  // Bucket 2: True bridges with low lexical overlap (should bridge)
  {
    name: 'true_bridge_trigger_to_policy_different_vocab',
    description: 'Trigger event to policy framework with different vocabulary - should bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-04-01T10:00:00Z',
        text: 'Saw a news story about counterfeit currency. Billions in circulation. This is massive.',
      },
      {
        id: 'r2',
        createdAt: '2024-04-03T14:00:00Z',
        text: 'The real question is how monetary authorities maintain legitimacy when trust mechanisms fail. This requires institutional architecture that preserves signal integrity.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'systemic']],
  },
  {
    name: 'true_bridge_question_to_answer',
    description: 'Later reflection answers a question posed earlier - should bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-04-05T09:00:00Z',
        text: 'Why do large organizations seem to lose touch with reality? What breaks the feedback loop?',
      },
      {
        id: 'r2',
        createdAt: '2024-04-07T11:00:00Z',
        text: 'The answer is scale. At billion-dollar scale, measurement itself becomes distorted. Policy transmission breaks down because the signals are too large to process correctly.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'scale']],
  },
  {
    name: 'true_bridge_media_to_insight_different_words',
    description: 'Media moment leads to insight with different vocabulary - should bridge',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-04-10T20:00:00Z',
        text: 'Watching this documentary about financial markets. Interesting how prices move.',
      },
      {
        id: 'r2',
        createdAt: '2024-04-12T10:00:00Z',
        text: 'The deeper pattern is coordination failure. When trust degrades, the mechanisms that align incentives stop working. This is about legitimacy, not just numbers.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'media', 'systemic']],
  },
  // Bucket 3: Contrast and reversal (should bridge but as contrast)
  {
    name: 'contrast_belief_reversal',
    description: '"I believed X" then "I now believe not-X" - should bridge as contrast',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-05-01T10:00:00Z',
        text: 'I believed that markets are efficient. Prices reflect all available information. The system works.',
      },
      {
        id: 'r2',
        createdAt: '2024-05-03T14:00:00Z',
        text: 'I now believe markets are not efficient. Prices can be distorted by scale. The system breaks at the edges where oversight fails.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'contrast', 'systemic']],
  },
  {
    name: 'contrast_micro_to_macro_reversal',
    description: 'Zoom in then zoom out with opposite framing - should bridge as contrast',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-05-05T08:00:00Z',
        text: 'This specific problem is local. It affects only this one case. Very concrete.',
      },
      {
        id: 'r2',
        createdAt: '2024-05-07T15:00:00Z',
        text: 'Actually, this is not local at all. It is structural. The pattern repeats everywhere. This is systemic, not specific.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'contrast']],
  },
  {
    name: 'contrast_optimism_to_realism',
    description: 'Optimistic framing to realistic/systemic framing - should bridge as contrast',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-05-10T09:00:00Z',
        text: 'Technology will solve this. Innovation always finds a way. Progress is inevitable.',
      },
      {
        id: 'r2',
        createdAt: '2024-05-12T11:00:00Z',
        text: 'Technology cannot solve coordination problems. Innovation does not fix trust. Progress requires institutions that preserve legitimacy.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'contrast', 'systemic']],
  },
  {
    name: 'contrast_inside_to_outside_system',
    description: 'Inside the system view to outside the system view - should bridge as contrast',
    reflections: [
      {
        id: 'r1',
        createdAt: '2024-05-15T10:00:00Z',
        text: 'Inside the system, everything makes sense. The rules are clear. The incentives align.',
      },
      {
        id: 'r2',
        createdAt: '2024-05-17T14:00:00Z',
        text: 'Outside the system, the rules break down. The incentives stop aligning. This is where trust fails and legitimacy erodes.',
      },
    ],
    expectedMinBridges: 1,
    expectedMaxBridges: 1,
    expectedReasons: [['sequence', 'contrast']],
  },
];

type DecomposedScore = {
  causality: number;      // Does explanation show cause-effect? (0-25)
  specificity: number;    // Is explanation specific vs generic? (0-20)
  sequence: number;        // Is sequence properly weighted? (0-20)
  scale: number;          // Are scale signals detected? (0-15)
  overreach: number;      // Penalty for false positives (0-20, lower is better)
  total: number;
  notes: string[];
};

function scoreBridge(bridge: NarrativeBridge, expectedReasons?: NarrativeBridge['reasons'][]): DecomposedScore {
  const notes: string[] = [];
  let causality = 0;
  let specificity = 0;
  let sequence = 0;
  let scale = 0;
  let overreach = 0;

  // Causality: Does explanation show cause-effect reasoning?
  const hasCausalLanguage = /\b(because|leads to|results in|causes|triggers|follows|emerges|transforms)\b/i.test(bridge.explanation);
  if (hasCausalLanguage) {
    causality += 15;
  }
  if (bridge.explanation.length > 50) {
    causality += 10; // Longer explanations tend to show more reasoning
  } else if (bridge.explanation.length < 20) {
    notes.push('Explanation too short to show causality');
    causality -= 5;
  }

  // Specificity: Is explanation specific vs generic?
  if (bridge.explanation.includes('This later reflection') || bridge.explanation.includes('This earlier reflection')) {
    specificity -= 5; // Too generic
    notes.push('Explanation uses generic "this reflection" language');
  }
  if (bridge.signals.scaleHits.length > 0 || bridge.signals.systemicHits.length > 0) {
    specificity += 10; // Mentions specific signals
  }
  if (bridge.explanation.length > 80) {
    specificity += 10; // Detailed explanations are more specific
  }

  // Sequence: Is sequence properly weighted and detected?
  if (bridge.reasons.includes('sequence')) {
    sequence += 15;
  } else {
    notes.push('Sequence reason missing');
    sequence -= 10;
  }
  if (bridge.signals.daysApart <= 7) {
    sequence += 5; // Close temporal proximity strengthens sequence
  }

  // Scale: Are scale signals detected when present?
  if (bridge.signals.scaleHits.length > 0) {
    scale += 10;
  }
  if (bridge.reasons.includes('scale')) {
    scale += 5;
  } else if (bridge.signals.scaleHits.length > 0) {
    notes.push('Scale signals detected but not marked as reason');
    scale -= 5;
  }

  // Overreach: Penalty for false positives
  if (bridge.weight < 0.45) {
    overreach += 10; // Below threshold suggests overreach
    notes.push(`Weight ${bridge.weight.toFixed(2)} below threshold 0.45`);
  }
  if (bridge.reasons.length === 0) {
    overreach += 15;
    notes.push('No reasons detected');
  }
  // Check if expected reasons match
  if (expectedReasons && expectedReasons.length > 0) {
    const matches = expectedReasons.some(expReasons =>
      expReasons.every(r => bridge.reasons.includes(r))
    );
    if (!matches) {
      overreach += 10;
      notes.push(`Reasons ${bridge.reasons.join(', ')} don't match expected patterns`);
    }
  }

  const total = Math.max(0, Math.min(100, causality + specificity + sequence + scale + (20 - overreach)));

  return {
    causality: Math.max(0, Math.min(25, causality)),
    specificity: Math.max(0, Math.min(20, specificity)),
    sequence: Math.max(0, Math.min(20, sequence)),
    scale: Math.max(0, Math.min(15, scale)),
    overreach: Math.max(0, Math.min(20, overreach)),
    total,
    notes,
  };
}

function runValidation(): {
  scores: RubricScore[];
  summary: {
    totalCases: number;
    passedCases: number;
    averageScore: number;
    totalBridges: number;
    categoryAverages: {
      causality: number;
      specificity: number;
      sequence: number;
      scale: number;
      overreach: number;
    };
  };
} {
  const scores: RubricScore[] = [];

  for (const testCase of VALIDATION_CASES) {
    const bridges = buildNarrativeBridges(testCase.reflections, {
      maxDays: 14,
      topK: 4,
    });

    const bridgeCount = bridges.length;
    const expectedMin = testCase.expectedMinBridges ?? 0;
    const expectedMax = testCase.expectedMaxBridges ?? bridgeCount + 5; // Allow some flexibility

    const passed = bridgeCount >= expectedMin && bridgeCount <= expectedMax;

    // Score each bridge with decomposed scoring
    const bridgeScores = bridges.map(b => scoreBridge(b, testCase.expectedReasons));
    const bridgeDetails = bridges.map((b, idx) => ({
      from: b.from,
      to: b.to,
      weight: b.weight,
      reasons: b.reasons,
      explanation: b.explanation,
      scores: bridgeScores[idx],
    }));

    const notes: string[] = [];

    if (!passed) {
      notes.push(`Bridge count ${bridgeCount} outside expected range [${expectedMin}, ${expectedMax}]`);
    }

    // Aggregate decomposed scores across all bridges
    const avgScore: DecomposedScore = bridgeScores.length > 0
      ? {
          causality: bridgeScores.reduce((sum, s) => sum + s.causality, 0) / bridgeScores.length,
          specificity: bridgeScores.reduce((sum, s) => sum + s.specificity, 0) / bridgeScores.length,
          sequence: bridgeScores.reduce((sum, s) => sum + s.sequence, 0) / bridgeScores.length,
          scale: bridgeScores.reduce((sum, s) => sum + s.scale, 0) / bridgeScores.length,
          overreach: bridgeScores.reduce((sum, s) => sum + s.overreach, 0) / bridgeScores.length,
          total: bridgeScores.reduce((sum, s) => sum + s.total, 0) / bridgeScores.length,
          notes: [],
        }
      : {
          causality: 0,
          specificity: 0,
          sequence: 0,
          scale: 0,
          overreach: 20, // Max penalty if no bridges when expected
          total: 0,
          notes: expectedMin > 0 ? ['No bridges generated but expected at least one'] : [],
        };

    // Collect all notes
    bridgeScores.forEach((s, idx) => {
      if (s.notes.length > 0) {
        notes.push(`Bridge ${idx + 1}: ${s.notes.join('; ')}`);
      }
    });
    notes.push(...avgScore.notes);

    scores.push({
      caseName: testCase.name,
      bridgesGenerated: bridgeCount,
      expectedRange: { min: expectedMin, max: expectedMax },
      passed,
      bridgeDetails,
      averageScore: avgScore,
      notes,
    });
  }

  const passedCases = scores.filter(s => s.passed).length;
  const avgTotalScore = scores.reduce((sum, s) => sum + s.averageScore.total, 0) / scores.length;
  const totalBridges = scores.reduce((sum, s) => sum + s.bridgesGenerated, 0);

  // Aggregate category averages
  const avgCausality = scores.reduce((sum, s) => sum + s.averageScore.causality, 0) / scores.length;
  const avgSpecificity = scores.reduce((sum, s) => sum + s.averageScore.specificity, 0) / scores.length;
  const avgSequence = scores.reduce((sum, s) => sum + s.averageScore.sequence, 0) / scores.length;
  const avgScale = scores.reduce((sum, s) => sum + s.averageScore.scale, 0) / scores.length;
  const avgOverreach = scores.reduce((sum, s) => sum + s.averageScore.overreach, 0) / scores.length;

  return {
    scores,
    summary: {
      totalCases: VALIDATION_CASES.length,
      passedCases,
      averageScore: Math.round(avgTotalScore * 100) / 100,
      totalBridges,
      categoryAverages: {
        causality: Math.round(avgCausality * 100) / 100,
        specificity: Math.round(avgSpecificity * 100) / 100,
        sequence: Math.round(avgSequence * 100) / 100,
        scale: Math.round(avgScale * 100) / 100,
        overreach: Math.round(avgOverreach * 100) / 100,
      },
    },
  };
}

function printRubricSummary(results: ReturnType<typeof runValidation>): void {
  console.log('\n=== Narrative Bridges Validation Rubric Summary ===\n');

  console.log(`Total Cases: ${results.summary.totalCases}`);
  console.log(`Passed Cases: ${results.summary.passedCases}`);
  console.log(`Total Bridges Generated: ${results.summary.totalBridges}\n`);

  console.log('--- Category Averages ---');
  console.log(`Causality:    ${results.summary.categoryAverages.causality.toFixed(1)}/25`);
  console.log(`Specificity:  ${results.summary.categoryAverages.specificity.toFixed(1)}/20`);
  console.log(`Sequence:     ${results.summary.categoryAverages.sequence.toFixed(1)}/20`);
  console.log(`Scale:        ${results.summary.categoryAverages.scale.toFixed(1)}/15`);
  console.log(`Overreach:    ${results.summary.categoryAverages.overreach.toFixed(1)}/20 (lower is better)`);
  console.log(`Total:        ${results.summary.averageScore.toFixed(1)}/100\n`);

  console.log('--- Individual Case Results ---\n');

  for (const score of results.scores) {
    const status = score.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${score.caseName}`);
    console.log(`  Bridges: ${score.bridgesGenerated} (expected: ${score.expectedRange.min}-${score.expectedRange.max})`);
    console.log(`  Scores:`);
    console.log(`    Causality:   ${score.averageScore.causality.toFixed(1)}/25`);
    console.log(`    Specificity: ${score.averageScore.specificity.toFixed(1)}/20`);
    console.log(`    Sequence:    ${score.averageScore.sequence.toFixed(1)}/20`);
    console.log(`    Scale:       ${score.averageScore.scale.toFixed(1)}/15`);
    console.log(`    Overreach:   ${score.averageScore.overreach.toFixed(1)}/20`);
    console.log(`    Total:       ${score.averageScore.total.toFixed(1)}/100`);

    if (score.bridgeDetails.length > 0) {
      console.log(`  Bridge Details:`);
      score.bridgeDetails.forEach((b, idx) => {
        console.log(`    ${idx + 1}. ${b.from} → ${b.to} (weight: ${b.weight.toFixed(3)}, reasons: ${b.reasons.join(', ')})`);
        console.log(`       Explanation: ${b.explanation.substring(0, 80)}...`);
        console.log(`       Scores: C${b.scores.causality.toFixed(0)} S${b.scores.specificity.toFixed(0)} Q${b.scores.sequence.toFixed(0)} Sc${b.scores.scale.toFixed(0)} O${b.scores.overreach.toFixed(0)} = ${b.scores.total.toFixed(0)}`);
      });
    }

    if (score.notes.length > 0) {
      console.log(`  Notes: ${score.notes.join('; ')}`);
    }
    console.log('');
  }
}

export function validateNarrativeBridges(): void {
  const results = runValidation();
  printRubricSummary(results);

  // Save JSON snapshot
  const snapshotDir = join(process.cwd(), '.dev-snapshots');
  try {
    mkdirSync(snapshotDir, { recursive: true });
  } catch (err) {
    // Directory might already exist
  }

  const snapshotPath = join(snapshotDir, `bridge-validation-${Date.now()}.json`);
  const snapshot = {
    timestamp: new Date().toISOString(),
    results,
  };

  writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
  console.log(`\n✅ Snapshot saved to: ${snapshotPath}\n`);
}

// Allow running directly via Node.js in dev mode
if (require.main === module && process.env.NODE_ENV !== 'production') {
  validateNarrativeBridges();
}


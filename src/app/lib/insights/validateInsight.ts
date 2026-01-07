// src/app/lib/insights/validateInsight.ts
// Insight Contract Gatekeeper
// This is a stance safeguard, not a UX feature.
// Only contract-compliant insights are allowed to render.

import type { InsightCard } from './types';

/**
 * Validate that an insight satisfies the Insight Contract
 * 
 * Contract requires:
 * 1. Claim: Falsifiable, time-bounded, behavioral (not a raw metric)
 * 2. Evidence: 2-4 concrete metrics or observations
 * 3. Contrast: Explicit statement of what did NOT happen
 * 4. Confidence: Reference to scope of evidence (time windows, sample size, pattern repetition)
 * 
 * Returns true if the insight passes all checks, false otherwise.
 * Failed insights must fail silently (return null, not render).
 */
export function validateInsight(insight: InsightCard | null): boolean {
  if (!insight) {
    return false;
  }

  const { title, explanation, evidence } = insight;

  // Check 1: Claim must be falsifiable and behavioral, not a raw metric
  // Reject if title is just a count or metric description
  const metricPatterns = [
    /^you wrote \d+/i,
    /^you had \d+/i,
    /^\d+ entries?/i,
    /^\d+ reflections?/i,
    /^writing activity (up|down|steady)/i,
    /^you wrote on \d+ of/i,
  ];
  
  const isMetricTitle = metricPatterns.some(pattern => pattern.test(title));
  if (isMetricTitle) {
    return false; // Title is a metric, not a claim
  }

  // Check 2: Evidence must be present
  // Must have at least 2 evidence items in the array, OR
  // Must have evidence section in explanation with 2-4 concrete metrics
  const hasEvidenceArray = evidence && evidence.length >= 2;
  
  // Check for evidence section in explanation (flexible format)
  const explanationHasEvidence = /Evidence:?\s*[\n•-]/i.test(explanation);
  
  // Count evidence items in explanation (bullet points or numbered items after "Evidence:")
  let evidenceItemCount = 0;
  if (explanationHasEvidence) {
    const evidenceMatch = explanation.match(/Evidence:?\s*\n([\s\S]*?)(?:\n\n(?:Contrast|Confidence):|$)/i);
    if (evidenceMatch) {
      const evidenceSection = evidenceMatch[1];
      // Count bullet points (• or -) or numbered items
      evidenceItemCount = (evidenceSection.match(/[•-]|\d+\./g) || []).length;
    }
  }

  // Require either evidence array OR evidence section with 2-4 items
  const hasSufficientEvidence = hasEvidenceArray || (evidenceItemCount >= 2 && evidenceItemCount <= 4);
  if (!hasSufficientEvidence) {
    return false;
  }

  // Check 3: Contrast must be explicitly stated
  // Must contain "Contrast:" with a statement of what didn't happen
  // Look for patterns like "not observed", "was not", "did not", "no [pattern]"
  const hasContrast = /Contrast:\s*[^\n]+/i.test(explanation);
  if (!hasContrast) {
    return false;
  }

  // Check 4: Confidence signal must be present
  // Must contain "Confidence:" with reference to scope (time windows, sample size, pattern repetition)
  // Look for references to time windows, sample size, or pattern repetition
  const hasConfidence = /Confidence:\s*[^\n]+/i.test(explanation);
  if (!hasConfidence) {
    return false;
  }
  
  // Additional validation: Confidence should reference scope
  // Check for time references (days, weeks, months, years) or sample size (entries, reflections, etc.)
  const confidenceMatch = explanation.match(/Confidence:\s*([^\n]+)/i);
  if (confidenceMatch) {
    const confidenceText = confidenceMatch[1];
    const hasScopeReference = /\d+\s*(days?|weeks?|months?|years?|entries?|reflections?|active\s+days?)/i.test(confidenceText) ||
                              /pattern.*(repeat|observed|across)/i.test(confidenceText) ||
                              /sample\s+size|window/i.test(confidenceText);
    if (!hasScopeReference) {
      return false; // Confidence exists but doesn't reference scope
    }
  }

  // Additional check: Reject prescriptive language
  // Violates "mirror, not steer" posture
  const prescriptivePatterns = [
    /\btry\b/i,
    /\bshould\b/i,
    /\bmust\b/i,
    /\bneed to\b/i,
    /\bkeep it up\b/i,
    /\bbuild a habit\b/i,
  ];
  
  const hasPrescription = prescriptivePatterns.some(pattern => 
    pattern.test(title) || pattern.test(explanation)
  );
  if (hasPrescription) {
    return false;
  }

  // All checks passed
  return true;
}

/**
 * Detailed validation result with reasons for rejection
 */
export type ValidationResult = {
  ok: boolean;
  reasons: string[];
};

/**
 * Validate insight with detailed reasons for failure
 * Returns structured result with ok flag and list of rejection reasons
 */
export function validateInsightDetailed(insight: InsightCard | null): ValidationResult {
  if (!insight) {
    return { ok: false, reasons: ['Insight is null'] };
  }

  const { title, explanation, evidence } = insight;
  const reasons: string[] = [];

  // Check 1: Claim must be falsifiable and behavioral, not a raw metric
  const metricPatterns = [
    /^you wrote \d+/i,
    /^you had \d+/i,
    /^\d+ entries?/i,
    /^\d+ reflections?/i,
    /^writing activity (up|down|steady)/i,
    /^you wrote on \d+ of/i,
  ];
  
  const isMetricTitle = metricPatterns.some(pattern => pattern.test(title));
  if (isMetricTitle) {
    reasons.push('Title is a metric, not a behavioral claim');
  }

  // Check 2: Evidence must be present
  const hasEvidenceArray = evidence && evidence.length >= 2;
  const explanationHasEvidence = /Evidence:?\s*[\n•-]/i.test(explanation);
  
  let evidenceItemCount = 0;
  if (explanationHasEvidence) {
    const evidenceMatch = explanation.match(/Evidence:?\s*\n([\s\S]*?)(?:\n\n(?:Contrast|Confidence):|$)/i);
    if (evidenceMatch) {
      const evidenceSection = evidenceMatch[1];
      evidenceItemCount = (evidenceSection.match(/[•-]|\d+\./g) || []).length;
    }
  }

  const hasSufficientEvidence = hasEvidenceArray || (evidenceItemCount >= 2 && evidenceItemCount <= 4);
  if (!hasSufficientEvidence) {
    reasons.push(`Insufficient evidence: array has ${evidence?.length || 0} items, explanation has ${evidenceItemCount} items (need 2-4)`);
  }

  // Check 3: Contrast must be explicitly stated
  const hasContrast = /Contrast:\s*[^\n]+/i.test(explanation);
  if (!hasContrast) {
    reasons.push('Missing contrast: no explicit statement of what did not happen');
  }

  // Check 4: Confidence signal must be present
  const hasConfidence = /Confidence:\s*[^\n]+/i.test(explanation);
  if (!hasConfidence) {
    reasons.push('Missing confidence signal');
  } else {
    // Additional validation: Confidence should reference scope
    const confidenceMatch = explanation.match(/Confidence:\s*([^\n]+)/i);
    if (confidenceMatch) {
      const confidenceText = confidenceMatch[1];
      const hasScopeReference = /\d+\s*(days?|weeks?|months?|years?|entries?|reflections?|active\s+days?)/i.test(confidenceText) ||
                                /pattern.*(repeat|observed|across)/i.test(confidenceText) ||
                                /sample\s+size|window/i.test(confidenceText);
      if (!hasScopeReference) {
        reasons.push('Confidence exists but does not reference scope (time windows, sample size, pattern repetition)');
      }
    }
  }

  // Additional check: Reject prescriptive language
  const prescriptivePatterns = [
    /\btry\b/i,
    /\bshould\b/i,
    /\bmust\b/i,
    /\bneed to\b/i,
    /\bkeep it up\b/i,
    /\bbuild a habit\b/i,
  ];
  
  const hasPrescription = prescriptivePatterns.some(pattern => 
    pattern.test(title) || pattern.test(explanation)
  );
  if (hasPrescription) {
    reasons.push('Contains prescriptive language (violates "mirror, not steer" posture)');
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

/**
 * Filter array of insights to only contract-compliant ones
 * Non-compliant insights are silently dropped (no warnings, no placeholders)
 */
export function filterValidInsights(insights: (InsightCard | null)[]): InsightCard[] {
  return insights.filter((insight): insight is InsightCard => validateInsight(insight));
}


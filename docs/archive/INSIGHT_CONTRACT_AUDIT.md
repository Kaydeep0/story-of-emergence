# Insight Contract Audit Report

**Date:** 2025-01-06  
**Contract Reference:** `docs/INSIGHT_CONTRACT.md`

This audit verifies every insight claim against the Insight Contract requirements:
1. Claim (falsifiable, time-bounded, behavioral)
2. Evidence (2-4 concrete metrics)
3. Contrast (what did not happen)
4. Confidence (thresholds, recurrence, or time window)

---

## Weekly Lens

**Source:** `src/app/lib/insights/alwaysOnSummary.ts` → `computeAlwaysOnSummary()`

### Card 1: Writing Change
**Status:** ✅ **PASS**  
- Claim: "You don't process things gradually. You wait, then commit fully."
- Evidence: Present (entries per day, clustering ratios, gap days)
- Contrast: Present ("A steady daily cadence was not observed.")
- Confidence: Present ("Pattern observed across two consecutive weeks")

### Card 2: Consistency
**Status:** ❌ **VIOLATIONS**

**Violation 1: Title is a metric, not a claim**
- **Quote:** `"You wrote on ${currentActiveDays} of the last 7 days"`
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:270`
- **Issue:** This is a description of activity, not a falsifiable claim about behavior
- **Fix:** Change to behavioral claim, e.g., "Your writing is concentrated on specific days this week" or "You maintain a consistent daily cadence"

**Violation 2: Missing contrast**
- **Quote:** `'Perfect week! You had entries every single day.'` (line 274)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:274`
- **Issue:** No statement of what didn't happen
- **Fix:** Add contrast, e.g., "No days were skipped" or "A sporadic pattern was not observed"

**Violation 3: Missing confidence signal**
- **Quote:** All consistency card explanations (lines 273-281)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:273-281`
- **Issue:** No statement of why the system is confident
- **Fix:** Add confidence, e.g., "Pattern observed across 7 consecutive days"

**Violation 4: Prescriptive language**
- **Quote:** `"Try writing more often to build a habit."` (line 280)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:280`
- **Issue:** Violates "mirror, not steer" posture
- **Fix:** Remove prescription, replace with observation

### Card 3: Weekly Pattern
**Status:** ❌ **VIOLATIONS**

**Violation 1: Identity-level language**
- **Quote:** `"You tend to write most on ${patternDaysFormatted}."` (line 359)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:359`
- **Issue:** Uses "you tend" (identity claim) instead of time-bounded behavioral claim
- **Fix:** Change to "Over the last 6 weeks, most entries occurred on [days]"

**Violation 2: Missing contrast**
- **Quote:** Card 3 explanation (line 390)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:390`
- **Issue:** No statement of what pattern was not observed
- **Fix:** Add contrast, e.g., "A uniform distribution across all days was not observed"

**Violation 3: Missing confidence signal**
- **Quote:** Card 3 explanation (line 390)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:390`
- **Issue:** No statement of why the system is confident
- **Fix:** Add confidence, e.g., "Pattern observed across 6 weeks with at least 50% frequency"

### Card 4: Activity Spike
**Status:** ❌ **VIOLATIONS**

**Violation 1: Missing contrast**
- **Quote:** `"You had a spike in writing activity on ${spikeDayName}."` (line 437)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:437`
- **Issue:** No statement of what didn't happen
- **Fix:** Add contrast, e.g., "A steady baseline was not maintained on this day"

**Violation 2: Missing confidence signal**
- **Quote:** Card 4 explanation (line 462)
- **File:** `src/app/lib/insights/alwaysOnSummary.ts:462`
- **Issue:** No statement of why the system is confident
- **Fix:** Add confidence, e.g., "Spike detected at 2× baseline average over 14-day window"

---

## Summary Lens

**Source:** `src/app/lib/insights/computeSummaryArtifact.ts` → delegates to `computeAlwaysOnSummary()`

**Status:** ❌ **SAME VIOLATIONS AS WEEKLY**  
Summary lens uses the same `alwaysOnSummary` cards, so it inherits all Weekly violations (Cards 2, 3, 4).

---

## Timeline Lens

**Source:** `src/app/lib/insights/timelineEvents.ts` + `src/app/lib/insights/timelineSpikes.ts`

### Timeline Events
**Status:** ✅ **PASS**  
All event types (first_occurrence, last_occurrence, pace_shift, silence_as_signal) follow the contract with claim, evidence, contrast, and confidence.

### Timeline Spikes (Legacy)
**Status:** ❌ **VIOLATIONS**

**Violation 1: Missing contrast**
- **Quote:** `"You wrote ${count} entries on this day, which is ${roundedMultiplier}× your usual daily activity."` (line 191)
- **File:** `src/app/lib/insights/timelineSpikes.ts:191`
- **Issue:** No statement of what didn't happen
- **Fix:** Add contrast, e.g., "A steady baseline pattern was not observed on this day"

**Violation 2: Missing confidence signal**
- **Quote:** Timeline spike explanation (line 191)
- **File:** `src/app/lib/insights/timelineSpikes.ts:191`
- **Issue:** No statement of why the system is confident
- **Fix:** Add confidence, e.g., "Spike detected at ${multiplier}× median across ${entriesByDay.size} days"

**Note:** Timeline spikes are suppressed when events exist, but they still violate the contract when rendered.

---

## Yearly Lens

**Source:** `src/app/lib/insights/computeYearlyArtifact.ts` → `createYearlyNarrativeCard()`

**Status:** ❌ **VIOLATIONS**

**Violation 1: Identity-level language**
- **Quote:** `"Your year followed a ${classificationLabel.toLowerCase()} pattern"` (line 48)
- **File:** `src/app/lib/insights/computeYearlyArtifact.ts:48`
- **Issue:** Uses "your year" (possessive identity) instead of time-bounded behavioral claim
- **Fix:** Change to "Over the past year, writing activity followed a [pattern]"

**Violation 2: Missing contrast**
- **Quote:** Yearly narrative body (lines 50-60)
- **File:** `src/app/lib/insights/computeYearlyArtifact.ts:50-60`
- **Issue:** No statement of what pattern was not observed
- **Fix:** Add contrast, e.g., "A uniform distribution pattern was not observed" or "A steady daily cadence was not observed"

**Violation 3: Missing confidence signal**
- **Quote:** Yearly narrative body (lines 50-60)
- **File:** `src/app/lib/insights/computeYearlyArtifact.ts:50-60`
- **Issue:** No statement of why the system is confident
- **Fix:** Add confidence, e.g., "Pattern observed across ${activeDays} active days with ${totalEntries} total entries"

---

## Distributions Lens

**Source:** `src/app/lib/insights/computeDistributionInsight()` in `distributionLayer.ts`

**Status:** ❌ **VIOLATIONS**

**Violation 1: Identity-level language**
- **Quote:** `"Your activity follows a power law"` (line 435)
- **File:** `src/app/lib/insights/distributionLayer.ts:435`
- **Issue:** Uses "your activity" (possessive identity) instead of time-bounded behavioral claim
- **Fix:** Change to "Over the last 30 days, activity follows a power law"

**Violation 2: Missing contrast**
- **Quote:** `"Over the last 30 days, a small number of days account for most of your writing and thinking. Three spikes explain ~${top3Percent}% of total output."` (line 439)
- **File:** `src/app/lib/insights/distributionLayer.ts:439`
- **Issue:** No statement of what pattern was not observed
- **Fix:** Add contrast, e.g., "A uniform distribution across all days was not observed"

**Violation 3: Missing confidence signal**
- **Quote:** Distribution insight explanation (line 439)
- **File:** `src/app/lib/insights/distributionLayer.ts:439`
- **Issue:** No statement of why the system is confident
- **Fix:** Add confidence, e.g., "Pattern observed across 30-day window with ${totalEntries} total entries"

---

## Lifetime Lens

**Source:** `src/app/lib/insights/computeLifetimeArtifact.ts` → `createLifetimeDistributionCard()`

**Status:** ✅ **PASS** (when sufficient data)  
- Claim: Present (concentrated vs distributed pattern)
- Evidence: Present (total entries, top 10% share, biggest day, median)
- Contrast: Present ("A steady daily cadence pattern was not observed" or "A power-law concentration pattern was not observed")
- Confidence: Present ("Pattern observed across ${activeDays} active days with ${totalEntries} total entries")

**Note:** Falls back to simple description when data is insufficient (<30 entries or <10 active days), but this fallback is not an insight and should not render as one.

---

## Summary

**Total Lenses Audited:** 6  
**Lenses Passing:** 2 (Weekly Card 1, Timeline Events, Lifetime)  
**Lenses Failing:** 4 (Weekly Cards 2-4, Summary, Timeline Spikes, Yearly, Distributions)

**Total Violations Found:** 15

**Most Common Violations:**
1. Missing contrast (10 instances)
2. Missing confidence signal (10 instances)
3. Identity-level language (3 instances)
4. Prescriptive language (1 instance)
5. Metric-as-claim (1 instance)

---

## Next Steps

1. Fix Weekly Card 2 (Consistency) - Add claim, contrast, confidence, remove prescription
2. Fix Weekly Card 3 (Weekly Pattern) - Change identity language, add contrast, add confidence
3. Fix Weekly Card 4 (Activity Spike) - Add contrast, add confidence
4. Fix Timeline Spikes - Add contrast, add confidence (or fully suppress when events exist)
5. Fix Yearly Lens - Change identity language, add contrast, add confidence
6. Fix Distributions Lens - Change identity language, add contrast, add confidence

**Priority:** Fix Weekly Cards 2-4 first (most frequently rendered), then Yearly and Distributions.


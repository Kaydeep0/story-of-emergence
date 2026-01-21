# Phase 16.0 — Mirror Comparison Rules (Non-Evaluative Differencing)

**Status:** Comparison Design Document  
**Date:** 2024  
**No Code Changes:** This phase governs comparison without evaluation.

## Goal

Define how multiple structures may be viewed side by side without implying preference, ranking, progress, optimization, similarity, or judgment.

This phase governs comparison without evaluation.

---

## Core Principle

**Difference is observable. Value is not inferred.**

The system may expose differences in structure, metrics, or configuration without assigning meaning to those differences.

---

## 1. Allowed Comparisons

**Explicitly allow:**

### Side-by-Side Structural Views

1. **Side-by-side structural views**
   - Multiple structures displayed simultaneously
   - No ordering that implies preference
   - No emphasis on one structure over another
   - Equal visual treatment for all structures

2. **Parallel structural displays**
   - Structures shown in parallel layouts
   - No "primary" or "secondary" positioning
   - No visual hierarchy between structures
   - User controls all layout

### Raw Metric Juxtaposition

3. **Raw metric juxtaposition**
   - Metrics displayed side by side
   - Absolute values only (no normalization or ranking)
   - No highlighting of "higher" or "lower" values
   - Equal presentation of all metrics

4. **Metric comparison tables**
   - Tables showing multiple metrics
   - No sorting by "importance" or "value"
   - No color coding that implies preference
   - User controls all sorting and filtering

### Presence or Absence

5. **Presence or absence of elements**
   - Show which elements exist in which structures
   - No "missing" or "extra" language
   - No implication that presence is "good" or absence is "bad"
   - Factual presence/absence only

6. **Element comparison lists**
   - Lists showing element presence across structures
   - No "unique" or "shared" emphasis
   - No highlighting of differences
   - Equal treatment for all elements

### Equality or Inequality Checks

7. **Equality or inequality checks**
   - Boolean comparisons (equal/not equal)
   - No "matches" or "differs" language that implies value
   - No "consistent" or "inconsistent" framing
   - Factual equality/inequality only

8. **Structural equivalence checks**
   - Check if structures are equivalent
   - No "same" or "different" language that implies meaning
   - No "similar" or "dissimilar" framing
   - Factual equivalence only

### Structural Deltas

9. **Structural deltas expressed numerically**
   - Numerical differences (e.g., "5", "-3", "0.7")
   - No "increase" or "decrease" language
   - No "more" or "less" framing
   - Absolute numerical differences only

10. **Structural deltas expressed symbolically**
    - Symbolic representations of difference (e.g., "+", "-", "=")
    - No "positive" or "negative" connotations
    - No "better" or "worse" implications
    - Neutral symbols only

### Comparison Display Principles

- **No interpretation layer**: Comparisons show differences, not meaning
- **Absolute values only**: No normalization, ranking, or relative framing
- **Factual presentation**: Differences are observable, not evaluative
- **Equal treatment**: All structures and metrics treated equally

---

## 2. Prohibited Comparative Semantics

**Explicitly forbid:**

### Value Judgments

1. **Better or worse framing**
   - No "better," "worse," "superior," "inferior"
   - No "improved," "degraded," "enhanced," "diminished"
   - No value judgments about differences
   - No comparative value language

2. **Improvement or decline language**
   - No "improved," "declined," "progressed," "regressed"
   - No "getting better" or "getting worse"
   - No directional language about change
   - No improvement/decline framing

### Optimization and Ranking

3. **Optimization cues**
   - No "optimal," "suboptimal," "efficient," "inefficient"
   - No "best," "worst," "ideal," "poor"
   - No optimization suggestions
   - No efficiency framing

4. **Ranking or sorting by importance**
   - No "most important," "least important"
   - No "top," "bottom," "best," "worst"
   - No ranking that implies value
   - No importance-based sorting

5. **Highlighting winners or losers**
   - No "winner," "loser," "champion," "underperformer"
   - No competitive framing
   - No highlighting of "better" structures
   - No winner/loser language

### Goal-Oriented Language

6. **"Closer to" or "farther from" goals**
   - No "closer to ideal," "farther from target"
   - No goal-oriented comparisons
   - No "achieving" or "failing" language
   - No goal framing

7. **Target or benchmark comparisons**
   - No "meets target," "exceeds benchmark"
   - No comparison to ideals or standards
   - No "on track" or "off track" language
   - No target/benchmark framing

### Similarity and Difference Language

8. **Similarity language that implies value**
   - No "similar," "dissimilar," "alike," "different" with value connotations
   - No "matches" or "differs" language that implies preference
   - No similarity judgments
   - Factual similarity only

9. **Consistency language**
   - No "consistent," "inconsistent," "aligned," "misaligned"
   - No consistency judgments
   - No alignment framing
   - Factual consistency only

### Comparative Framing

10. **"More" or "less" with value implications**
    - No "more important," "less significant"
    - No "more valuable," "less useful"
    - No comparative value language
    - Factual "more" or "less" only (e.g., "5 more elements")

11. **Relative comparisons**
    - No "compared to X, Y is..."
    - No relative value judgments
    - No comparative evaluations
    - Absolute differences only

### Prohibited Principles

- **No comparative semantics may imply value**: Differences are observable, not evaluative
- **No comparative semantics may imply preference**: System never suggests which is "better"
- **No comparative semantics may imply optimization**: No "best" or "optimal" framing
- **No comparative semantics may imply ranking**: No importance or value-based ordering

---

## 3. Neutral Differencing Constraints

**Constraints that ensure comparisons remain neutral:**

### Ordering Constraints

1. **No default ordering**
   - No "most important first" ordering
   - No "best to worst" sorting
   - No default that implies preference
   - User controls all ordering

2. **No ordering that implies priority**
   - No sorting by "importance" or "value"
   - No "top" or "bottom" lists
   - No ranking or prioritization
   - Ordering is mechanical, not meaningful

### Visual Constraints

3. **No color emphasis that implies valence**
   - No green for "good" or red for "bad"
   - No color coding that suggests value
   - No color gradients implying preference
   - Color distinguishes only, never evaluates

4. **No visual highlighting of differences**
   - No emphasis on "significant" differences
   - No highlighting of "important" changes
   - No visual emphasis of any kind
   - Equal visual treatment for all differences

### Language Constraints

5. **No summary statements about difference**
   - No "structures differ significantly"
   - No "major differences" or "minor differences"
   - No interpretation of difference magnitude
   - Raw differences only, no summaries

6. **No thresholds that imply significance**
   - No "significant difference" thresholds
   - No "meaningful change" cutoffs
   - No thresholds that assign meaning
   - All differences shown equally

### Clustering Constraints

7. **No clustering based on desirability**
   - No grouping by "better" or "worse"
   - No clustering that implies value
   - No grouping by preference
   - Clustering is structural only, not evaluative

8. **No grouping by similarity with value implications**
   - No "similar (good)" or "different (bad)" grouping
   - No similarity-based clustering that implies preference
   - No value-based grouping
   - Grouping is mechanical, not meaningful

### Presentation Constraints

9. **No default comparison set**
   - No "recommended" structures to compare
   - No "interesting" comparison suggestions
   - No default that implies importance
   - User selects all comparisons

10. **No comparison recommendations**
    - No "you might want to compare X and Y"
    - No suggested comparisons
    - No guidance on what to compare
    - No comparison suggestions

### Neutrality Principles

- **Differences are shown, not interpreted**: System presents differences, never evaluates them
- **All differences are equal**: No weighting, emphasis, or prioritization
- **Comparison is mechanical, not meaningful**: Differences are observable, not evaluative
- **User controls all comparison interaction**: System never guides comparison attention

---

## 4. Observer Responsibility Statement

**The system reveals differences without judgment.**

The system presents structural differences, metric differences, and configuration differences as they exist: absolute values, numerical deltas, presence/absence, equality/inequality. The system does not interpret what those differences mean, which differences are important, or what those differences suggest.

**Meaning, preference, and evaluation are assigned by the observer.**

The human observer is responsible for:
- **Interpreting differences**: What do these differences mean?
- **Assigning preference**: Which structure do I prefer?
- **Evaluating differences**: Which differences are important to me?
- **Making judgments**: What do I think about these differences?

The system is responsible for:
- **Presenting differences**: Showing differences as they exist
- **Enabling comparison**: Providing mechanical tools to compare structures
- **Maintaining neutrality**: Never interpreting, evaluating, or assigning meaning to differences

**The system does not recommend, prioritize, or optimize.**

The system never:
- **Recommends**: "You should prefer structure A over structure B"
- **Prioritizes**: "This difference is more important than that difference"
- **Optimizes**: "Structure A is better optimized than structure B"

**Boundary Principle:**

> The system presents differences as observable facts.  
> The human interprets meaning, assigns preference, and evaluates differences.  
> The system never crosses this boundary.

---

## Comparison Design Summary

**Allowed comparisons:** Side-by-side structural views, raw metric juxtaposition, presence/absence of elements, equality/inequality checks, structural deltas expressed numerically or symbolically — all neutral and factual.

**Prohibited comparative semantics:** Better/worse framing, improvement/decline language, optimization cues, ranking/sorting by importance, highlighting winners/losers, "closer to"/"farther from" goals, similarity language with value implications, consistency language, "more"/"less" with value implications, relative comparisons — all imply value, preference, optimization, or ranking.

**Neutral differencing constraints:** No default ordering, no ordering implying priority, no color emphasis implying valence, no visual highlighting of differences, no summary statements about difference, no thresholds implying significance, no clustering based on desirability, no grouping by similarity with value implications, no default comparison set, no comparison recommendations.

**Observer responsibility:** The system reveals differences without judgment. Meaning, preference, and evaluation are assigned by the observer. The system does not recommend, prioritize, or optimize.

---

## Forward Constraint

All future comparison design must conform to these comparison rules.

**Violation of these rules indicates a breach of the Mirror role declared in Phase 12.1, the presentation constraints defined in Phase 13.0, the interaction rules defined in Phase 14.0, and the temporal presentation rules defined in Phase 15.0.**


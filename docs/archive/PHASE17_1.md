# Phase 17.1 — Aggregation Surface Disclosure (Declaration Only)

**Status:** Surface Presentation Declaration  
**Date:** 2024  
**No Code Changes:** This phase governs presentation constraints, not computation.

## Goal

Explicitly declare how aggregated data may be surfaced to a human without implying hierarchy, importance, relevance, or meaning.

This phase governs presentation constraints, not computation.

---

## Core Principle

**Aggregation may be shown. Aggregation may not be framed.**

The system may expose collections, but it may not visually or linguistically privilege any element, group, or count.

---

## 1. Permitted Surface Forms

**Explicitly allow only:**

### Plain Lists

1. **Plain lists**
   - Simple lists of elements (e.g., "Reflection 1, Reflection 2, Reflection 3")
   - No ordering that implies importance
   - No indentation or nesting that implies hierarchy
   - No visual emphasis of any elements
   - Equal visual treatment for all list items

2. **Unordered collections**
   - Collections without implied ordering
   - No "first" or "last" emphasis
   - No sequential numbering that implies priority
   - No ordering semantics

### Tables

3. **Tables with neutral headers**
   - Tables with factual column headers (e.g., "Density," "Period," "Count")
   - No headers that imply importance (e.g., "Key Metrics," "Important Values")
   - No sorting by default that implies preference
   - User controls all sorting and ordering

### Raw Counts

4. **Raw counts**
   - Simple numerical counts (e.g., "5 reflections," "3 clusters")
   - No "total" language that implies completeness or significance
   - No "count" language that implies importance
   - Factual counts only

5. **Count displays**
   - Counts displayed as plain numbers
   - No highlighting of "high" or "low" counts
   - No emphasis on certain counts
   - Equal visual treatment for all counts

### Group Labels

6. **Explicit group labels derived from keys**
   - Labels that identify groups by their structural keys (e.g., "Density: 5," "Period: 2024")
   - No abstract or semantic labels (e.g., "Important," "Significant," "Core")
   - No labels that imply meaning or value
   - Factual identifiers only

7. **Group headers**
   - Headers that identify groups factually
   - No headers that interpret or summarize
   - No headers that imply importance
   - Factual group identification only

### Visual Treatment

8. **Identical visual treatment for all groups**
   - Same size, color, spacing, and position for all groups
   - No visual distinction between groups
   - No emphasis or de-emphasis
   - Equal visual weight for all

### Surface Form Principles

- **No gradients**: No color gradients, size gradients, or visual gradients of any kind
- **No emphasis**: No visual emphasis, highlighting, or attention-drawing features
- **No ranking**: No visual or linguistic ranking, ordering, or prioritization
- **Factual presentation only**: All surface forms show data as it exists, without interpretation

---

## 2. Prohibited Surface Cues

**Explicitly forbid:**

### Sorting and Ordering

1. **Sorting by magnitude unless user initiated**
   - No default sorting by count, size, or magnitude
   - No automatic sorting that implies importance
   - No sorting by "largest" or "smallest" unless user explicitly requests it
   - User controls all sorting

2. **Ordering that implies priority**
   - No "most important first" ordering
   - No "top to bottom" ranking
   - No ordering that suggests value or importance
   - Ordering is mechanical, not meaningful

### Highlighting and Emphasis

3. **Highlighting "largest," "smallest," or "most frequent"**
   - No highlighting of maximum or minimum values
   - No emphasis on "most" or "least" frequent
   - No visual emphasis of any magnitude
   - All values shown equally

4. **Visual emphasis of any kind**
   - No highlighting, bolding, or emphasis
   - No attention-drawing visual features
   - No visual distinction between elements
   - Equal visual treatment for all

### Visual Hierarchy

5. **Visual hierarchy through size**
   - No larger elements for "more important" groups
   - No size scaling based on count or value
   - No visual hierarchy through size
   - Equal size for all elements

6. **Visual hierarchy through color**
   - No color coding that implies importance or value
   - No color gradients that suggest ranking
   - No color emphasis of any kind
   - Color distinguishes only, never evaluates

7. **Visual hierarchy through spacing**
   - No spacing that implies importance or grouping
   - No visual separation that suggests hierarchy
   - No spacing emphasis
   - Equal spacing for all elements

8. **Visual hierarchy through position**
   - No center placement for "important" elements
   - No top/bottom positioning that implies priority
   - No position-based hierarchy
   - Equal positioning for all elements

### Language Cues

9. **Language implying relevance or importance**
   - No "key," "important," "significant," "relevant" language
   - No "most," "least," "top," "bottom" language
   - No language that assigns value or importance
   - Factual language only

10. **Language implying meaning**
    - No "this shows..." or "this means..." language
    - No interpretation or explanation language
    - No meaning attribution
    - Factual identifiers only

### Visual Elements

11. **Badges, callouts, summaries, or captions**
    - No badges or indicators
    - No callouts or annotations
    - No summaries or synopses
    - No captions that interpret or explain
    - Plain data display only

12. **Visual indicators of magnitude**
    - No progress bars or meters
    - No charts or graphs that imply value
    - No visual representations that suggest importance
    - Raw data display only

### Prohibited Principles

- **No surface cues may imply hierarchy**: All elements treated equally
- **No surface cues may imply importance**: No emphasis or prioritization
- **No surface cues may imply relevance**: No filtering or selection that suggests value
- **No surface cues may imply meaning**: No interpretation or explanation

---

## 3. Observer Responsibility Statement

**The system displays aggregated data as collected.**

The system presents collections, counts, groups, and partitions as they exist: plain lists, tables, raw counts, explicit group labels. The system does not interpret what those aggregations mean, which aggregations are important, or what those aggregations suggest.

**Interpretation, prioritization, and relevance are assigned by the observer.**

The human observer is responsible for:
- **Interpreting aggregations**: What do these collections mean?
- **Prioritizing elements**: Which elements are important to me?
- **Assigning relevance**: Which aggregations are relevant to me?
- **Making judgments**: What do I think about these aggregations?

The system is responsible for:
- **Displaying aggregated data**: Showing collections as they exist
- **Maintaining visual neutrality**: Never emphasizing, highlighting, or prioritizing
- **Preserving factual presentation**: Never interpreting or framing

**The system does not guide attention.**

The system never:
- **Guides attention**: "Look at this aggregation"
- **Emphasizes elements**: Highlights or draws attention to specific items
- **Prioritizes groups**: Suggests which groups are important
- **Frames collections**: Interprets what collections mean

**Boundary Principle:**

> The system displays aggregated data as collected.  
> The human interprets meaning, prioritizes elements, and assigns relevance.  
> The system never crosses this boundary.

---

## 4. Forward Constraint

**All future aggregation UI must conform to these surface disclosure rules.**

Any aggregation UI that:
- Implies hierarchy, importance, relevance, or meaning
- Uses prohibited surface cues (sorting by magnitude, highlighting, visual hierarchy, language implying relevance, badges/callouts/summaries)
- Fails to use permitted surface forms (plain lists, tables with neutral headers, raw counts, explicit group labels, unordered collections, identical visual treatment)

**Constitutes a breach of the Mirror role declared in Phase 12.1, the aggregation rules defined in Phase 17.0, and the presentation constraints defined in Phase 13.0.**

**Violation of these rules indicates that the system has crossed from Mirror (reflects structure) to Lens (selectively reveals structure), which violates the core principle established in Phase 12.1.**

---

## Surface Disclosure Summary

**Permitted surface forms:** Plain lists, tables with neutral headers, raw counts, explicit group labels derived from keys, unordered collections, identical visual treatment for all groups — no gradients, no emphasis, no ranking.

**Prohibited surface cues:** Sorting by magnitude unless user initiated, highlighting "largest"/"smallest"/"most frequent," visual hierarchy through size/color/spacing/position, language implying relevance or importance, badges/callouts/summaries/captions — all imply hierarchy, importance, relevance, or meaning.

**Observer responsibility:** The system displays aggregated data as collected. Interpretation, prioritization, and relevance are assigned by the observer. The system does not guide attention.

**Forward constraint:** All future aggregation UI must conform. Any violation constitutes a breach of the Mirror role.

---

## Declaration Status

**This declaration is final and binding for all future aggregation UI design.**

**Violation of this declaration indicates a breach of the Mirror role and requires explicit acknowledgment and correction before proceeding with any aggregation UI implementation.**


# Phase 15.0 — Mirror Temporal Presentation Rules (Non-Narrative Time)

**Status:** Temporal Design Document  
**Date:** 2024  
**No Code Changes:** This phase governs temporal exposure, not analytics and not interpretation.

## Goal

Define how time may be presented in the Mirror without implying progress, regression, causality, arcs, or story.

This phase governs temporal exposure, not analytics and not interpretation.

---

## Core Principle

**Time is a dimension, not a story.**

The system may expose time slices, ordering, and duration only as factual structure, never as meaning.

---

## 1. Allowed Temporal Representations

**Explicitly allow only neutral forms:**

### Absolute Time References

1. **Absolute timestamps**
   - ISO 8601 timestamps (e.g., "2024-01-15T10:30:00Z")
   - Calendar dates (e.g., "January 15, 2024")
   - Clock times (e.g., "10:30 AM")
   - No relative framing ("recently," "long ago")

2. **Absolute time ranges**
   - Start and end timestamps (e.g., "2024-01-01 to 2024-12-31")
   - Duration values (e.g., "365 days," "12 months")
   - No relative framing ("last year," "this month")

### Ordered Sequences

3. **Ordered sequences**
   - Chronological ordering (earliest to latest, or latest to earliest)
   - No implied causality or progression
   - No "first," "then," "finally" language
   - Ordering is mechanical, not meaningful

4. **Time-sorted lists**
   - Lists sorted by timestamp
   - No "most recent" or "oldest" emphasis
   - No default sorting that implies importance
   - User controls all sorting

### Duration Values

5. **Duration values**
   - Absolute durations (e.g., "5 days," "3 months," "2 years")
   - No relative durations ("recently," "a while ago")
   - No comparative durations ("longer than before")
   - Duration is factual, not interpretive

6. **Time intervals**
   - Fixed intervals (e.g., "daily," "weekly," "monthly")
   - No adaptive intervals based on activity
   - No "optimal" interval suggestions
   - Intervals are mechanical, not meaningful

### Time Window Selection

7. **Time window selection**
   - User-selected start and end times
   - No "recommended" time windows
   - No "interesting period" suggestions
   - User controls all window selection

8. **Time range filters**
   - Filter by absolute time range
   - No "recent" or "relevant" filters
   - No pre-defined meaningful ranges
   - User defines all filters

### Static Time Slicing

9. **Static time slicing**
   - Fixed time slices (e.g., "2024-01," "2024-02")
   - No adaptive slicing based on activity
   - No "important period" emphasis
   - Slicing is mechanical, not meaningful

10. **Time slice navigation**
    - Navigate between time slices
    - No auto-advancing or auto-playing
    - No "current" or "latest" emphasis
    - User controls all navigation

### Temporal Display Principles

- **No aggregation that implies trend**: No averaging, smoothing, or aggregation that suggests direction
- **Absolute values only**: No relative or comparative temporal framing
- **Factual presentation**: Time is a dimension, not a story
- **User-controlled**: User determines all temporal navigation and selection

---

## 2. Prohibited Temporal Semantics

**Explicitly forbid:**

### Progress and Direction Semantics

1. **Progress indicators**
   - No "progress bars" or completion meters
   - No "X% complete" or similar metrics
   - No indicators of advancement or development
   - No progress framing of any kind

2. **Growth or decline language**
   - No "increasing," "decreasing," "growing," "shrinking"
   - No "more," "less," "better," "worse" over time
   - No directional language about change
   - No value judgments about temporal change

3. **Milestones**
   - No "first reflection," "100th reflection"
   - No achievement markers
   - No celebration or recognition of temporal events
   - No milestones of any kind

### Narrative Semantics

4. **Phases, chapters, eras**
   - No "Phase 1," "Chapter 2," "Era 3"
   - No temporal segmentation that implies narrative
   - No "beginning," "middle," "end" framing
   - No story-like temporal structure

5. **"Before vs after" framing**
   - No "before this," "after that" language
   - No comparative temporal framing
   - No "then vs now" comparisons
   - No temporal contrast that implies meaning

6. **Emergence narratives**
   - No "emergence began," "emergence ended"
   - No temporal framing of emergence
   - No "when emergence occurred" language
   - No causal or narrative connection to time

### Emphasis and Highlighting

7. **Temporal highlighting or emphasis**
   - No highlighting of "important" periods
   - No emphasis on "significant" moments
   - No visual emphasis of temporal events
   - No attention-drawing temporal features

8. **"Recent" bias**
   - No emphasis on recent time periods
   - No "latest" or "newest" highlighting
   - No default view of recent periods
   - No temporal recency bias

### Comparative Semantics

9. **Temporal comparisons**
   - No "compared to last month"
   - No "versus previous period"
   - No comparative temporal analysis
   - No "better" or "worse" over time

10. **Trend language**
    - No "trending upward," "trending downward"
    - No trend indicators or analysis
    - No directional language about patterns
    - No trend framing of any kind

### Causal Semantics

11. **Causal temporal language**
    - No "led to," "resulted in," "caused"
    - No temporal causality implications
    - No "because of this, then that" framing
    - No causal connections through time

12. **Temporal flow language**
    - No "flowing," "moving," "evolving"
    - No motion or direction through time
    - No "journey" or "path" through time
    - No flow semantics

### Prohibited Principles

- **No temporal semantics may imply meaning**: Time is a dimension, not a story
- **No temporal semantics may imply direction**: No progress, regression, or change framing
- **No temporal semantics may imply causality**: No "because of time" or "over time" language
- **No temporal semantics may imply value**: No "better" or "worse" over time

---

## 3. Temporal Neutrality Constraints

**Constraints that ensure temporal presentation remains neutral:**

### Default State Constraints

1. **No default time range**
   - No "recent 30 days" or similar defaults
   - No preferred initial time range
   - No default that implies importance
   - User determines initial time range

2. **No "recent" bias**
   - No emphasis on recent time periods
   - No default view of latest periods
   - No recency weighting
   - No temporal bias of any kind

3. **No decay weighting**
   - No weighting of recent vs. old data
   - No temporal decay functions
   - No "freshness" or "relevance" weighting
   - All time periods treated equally

### Presentation Constraints

4. **No temporal smoothing**
   - No averaging or smoothing over time
   - No trend lines or fitted curves
   - No aggregation that implies direction
   - Raw temporal data only

5. **No timeline animations that imply motion or direction**
   - No animations that suggest flow or progress
   - No transitions that imply causality
   - No motion that draws attention to temporal change
   - Animations are instant or mechanically neutral only

6. **No temporal aggregation**
   - No averaging over time periods
   - No summing or aggregating that implies trend
   - No statistical operations that suggest direction
   - Raw temporal snapshots only

### Navigation Constraints

7. **No auto-advancing through time**
   - No automatic temporal progression
   - No auto-play of time slices
   - No system-initiated temporal movement
   - User controls all temporal navigation

8. **No temporal recommendations**
   - No "you might want to look at this period"
   - No suggested time ranges
   - No "interesting period" suggestions
   - No temporal guidance

### Visual Constraints

9. **No temporal visual emphasis**
   - No highlighting of specific time periods
   - No emphasis on "important" moments
   - No visual distinction between time periods
   - Equal visual treatment for all time

10. **No temporal ordering that implies importance**
    - No sorting by "most recent" or "oldest"
    - No default ordering that suggests value
    - No temporal hierarchy
    - User controls all ordering

### Neutrality Principles

- **Time may be navigated, not interpreted**: Navigation through time is mechanical, not meaningful
- **All time periods are equal**: No weighting, bias, or emphasis
- **Time is a dimension, not a story**: No narrative, progress, or causality framing
- **User controls all temporal interaction**: System never guides temporal attention

---

## 4. Observer Responsibility Statement

**Time reveals sequence, not significance.**

The system presents temporal structure as it exists: absolute timestamps, ordered sequences, duration values, and time slices. The system does not interpret what temporal patterns mean, why certain periods might be important, or what temporal changes suggest.

**The system does not interpret temporal change.**

The system may show how structure changes across time slices, but it never interprets those changes as progress, regression, improvement, decline, or any other meaning. Temporal change is presented as factual difference, not as significance.

**Meaning assigned to time is the responsibility of the observer.**

The human observer is responsible for:
- **Interpreting temporal meaning**: What does this temporal pattern mean?
- **Deciding temporal relevance**: Which time periods are important to me?
- **Understanding temporal relationships**: How do I understand these temporal connections?
- **Assigning significance to time**: What does this temporal change mean to me?

The system is responsible for:
- **Presenting temporal structure**: Showing time as a dimension
- **Enabling temporal navigation**: Providing mechanical tools to explore time
- **Maintaining temporal neutrality**: Never interpreting, framing, or assigning meaning to time

**Boundary Principle:**

> The system presents time as a dimension.  
> The human interprets temporal meaning and assigns significance.  
> The system never crosses this boundary.

---

## Temporal Presentation Summary

**Allowed temporal representations:** Absolute timestamps, ordered sequences, duration values, time window selection, static time slicing — all neutral and factual.

**Prohibited temporal semantics:** Progress indicators, growth/decline language, milestones, phases/chapters/eras, "before vs after" framing, emergence narratives, temporal highlighting, "recent" bias, temporal comparisons, trend language, causal temporal language, temporal flow language — all imply meaning, direction, causality, or value.

**Temporal neutrality constraints:** No default time range, no "recent" bias, no decay weighting, no temporal smoothing, no timeline animations implying motion/direction, no temporal aggregation, no auto-advancing, no temporal recommendations, no temporal visual emphasis, no temporal ordering implying importance.

**Observer responsibility:** Time reveals sequence, not significance. The system does not interpret temporal change. Meaning assigned to time is the responsibility of the observer.

---

## Forward Constraint

All future temporal presentation design must conform to these temporal rules.

**Violation of these rules indicates a breach of the Mirror role declared in Phase 12.1, the presentation constraints defined in Phase 13.0, and the interaction rules defined in Phase 14.0.**


# Phase 13.0 — Mirror Surface Design (Non-Interpretive)

**Status:** Design Document  
**Date:** 2024  
**No Code Changes:** This phase defines presentation constraints, not features.

## Goal

Design how reflected structure may be surfaced to a human without interpretation, guidance, or narrative framing.

This phase is about presentation constraints, not features.

**No scoring. No labels. No recommendations.**

---

## Scope Rules

### This phase may:

- **Display structure**: Show structural properties as they exist
- **Display relationships**: Show how structural elements relate to one another
- **Display change over time**: Show how structure changes across temporal periods

### This phase may NOT:

- **Explain meaning**: No interpretation of what structure "means"
- **Highlight importance**: No emphasis on certain elements over others
- **Suggest action**: No recommendations or guidance
- **Frame progress, decline, success, or insight**: No narrative framing of any kind

---

## 1. What Can Be Shown

**Exactly what structural elements are allowed to be visible:**

### Structural Properties

1. **Graph topology**
   - Node positions (without labels implying importance)
   - Edge connections (without thickness implying strength)
   - Neighborhood relationships (without clustering implying groups)

2. **Density fields**
   - Density values as absolute counts (not normalized, not ranked)
   - Density distribution (without highlighting "high" or "low" regions)
   - Density changes over time (without framing as "increasing" or "decreasing")

3. **Neighborhood overlaps**
   - Which reflections share neighborhoods (without implying "similarity" or "relatedness")
   - Overlap counts (absolute numbers only)
   - Overlap patterns (without clustering or grouping labels)

4. **Temporal snapshots**
   - Structure at time T1, T2, T3... (without connecting them as a "journey")
   - Side-by-side comparison (without "before/after" framing)
   - Temporal sequences (without "evolution" or "development" language)

5. **Distance metrics**
   - Structural distances between reflections (without "close" or "far" labels)
   - Distance matrices (without heatmaps implying intensity)
   - Distance distributions (without highlighting outliers)

6. **Curvature indices**
   - Curvature values (without "flat" or "warped" labels)
   - Curvature distribution (without highlighting regions)
   - Curvature patterns (without interpretation)

7. **Gradient magnitudes**
   - Gradient values (without "steep" or "gentle" labels)
   - Gradient distribution (without highlighting transitions)
   - Gradient patterns (without "flow" or "direction" semantics)

8. **Emergence presence**
   - Binary state (present/not present) (without "active" or "inactive" labels)
   - No temporal framing ("has been emergent")
   - No causal implications ("because emergence occurred")

### Display Principles

- **Absolute values only**: No normalization, ranking, or relative framing
- **Factual presentation**: "This is what exists" not "This is what it means"
- **Complete information**: Show all structural elements equally, no filtering
- **Neutral presentation**: No emphasis, no de-emphasis, no focal points

---

## 2. What Can Never Be Shown

**Prohibited visual affordances:**

### Visual Emphasis

1. **Heatmaps implying intensity**
   - No color gradients suggesting "more" or "less"
   - No intensity scales or legends
   - No highlighting of "high" or "low" regions

2. **Labels implying value**
   - No "core," "important," "active," "significant"
   - No "peripheral," "minor," "inactive," "insignificant"
   - No labels that assign meaning or importance

3. **Alerts, badges, highlights**
   - No notifications or alerts
   - No badges or indicators
   - No highlighting or emphasis of any kind
   - No "new" or "updated" markers

4. **Animations that draw attention**
   - No motion that emphasizes certain elements
   - No transitions that create focal points
   - No animations that suggest importance or change
   - No pulsing, glowing, or attention-drawing effects

5. **Ordering implying priority**
   - No sorting by "importance" or "significance"
   - No "top" or "bottom" lists
   - No ranking or prioritization
   - No "most" or "least" framing

6. **Color implying value**
   - No color schemes that suggest "good" or "bad"
   - No color gradients implying intensity or importance
   - No color coding that assigns meaning
   - No warm/cool color associations

7. **Size implying importance**
   - No larger nodes for "more important" elements
   - No size scaling based on value or significance
   - No visual hierarchy through size

8. **Thickness implying strength**
   - No thicker edges for "stronger" relationships
   - No line weight based on connection strength
   - No visual emphasis through thickness

9. **Position implying centrality**
   - No center placement for "important" elements
   - No focal points or visual centers
   - No positioning that suggests hierarchy

10. **Summaries written in language**
    - No text that interprets structure
    - No descriptions that assign meaning
    - No explanations or narratives
    - No "This shows..." or "This means..." language

11. **Progress indicators**
    - No progress bars or completion meters
    - No "X% complete" or similar metrics
    - No indicators of advancement or development

12. **Comparison framing**
    - No "better" or "worse" comparisons
    - No "improved" or "declined" language
    - No "more" or "less" relative framing

---

## 3. Presentation Constraints

**Strict UI constraints:**

### Visual Constraints

1. **No color implying value**
   - Use neutral colors only (grayscale, or minimal color for distinction)
   - No color gradients or scales
   - No color associations with meaning or value
   - Color may distinguish elements but not rank them

2. **No ordering implying priority**
   - Display elements in deterministic order (e.g., chronological, alphabetical)
   - No sorting by computed "importance" or "significance"
   - No "top N" or "most important" lists
   - All elements shown equally

3. **No default focal point**
   - No single element emphasized by default
   - No center or highlight on load
   - No "most important" element pre-selected
   - Equal visual weight for all elements

4. **No summaries written in language**
   - No text that interprets or explains
   - No "This pattern shows..." or "You have..."
   - No narrative descriptions
   - Labels may identify (e.g., "Reflection 1", "Period 2024") but not interpret

5. **No visual hierarchy**
   - Equal size for all elements (unless size represents absolute structural property)
   - Equal opacity for all elements
   - Equal spacing and positioning
   - No emphasis or de-emphasis

6. **No temporal framing**
   - No "over time" language
   - No "journey" or "evolution" framing
   - No "progress" or "development" indicators
   - Temporal sequences shown as snapshots only

7. **No causal implications**
   - No arrows suggesting direction or flow
   - No "leads to" or "causes" visual language
   - No temporal ordering that implies causality
   - Relationships shown as connections only

8. **No value judgments**
   - No "good" or "bad" visual indicators
   - No "success" or "failure" framing
   - No "rich" or "sparse" labels
   - No "complex" or "simple" descriptions

9. **No attention mechanisms**
   - No notifications or alerts
   - No "new" or "updated" markers
   - No highlighting or emphasis
   - No drawing attention to specific elements

10. **No interactive guidance**
    - No tooltips that explain meaning
    - No hover states that emphasize importance
    - No click affordances that suggest action
    - Interaction may reveal data but not interpret it

### Data Presentation Constraints

1. **Absolute values only**
   - No normalization or scaling
   - No percentiles or rankings
   - No relative comparisons
   - Raw structural data only

2. **Complete information**
   - Show all structural elements
   - No filtering or selection
   - No "most important" subsets
   - Equal visibility for all

3. **Factual labels only**
   - Identifiers: "Reflection 1", "Period 2024"
   - Values: "Density: 5", "Distance: 0.3"
   - No interpretive labels: "Important", "Core", "Active"

4. **Neutral presentation**
   - No emphasis or de-emphasis
   - No focal points
   - No visual hierarchy
   - Equal treatment for all elements

---

## 4. Human Responsibility Boundary

**Interpretation occurs entirely outside the system.**

The system presents structural observations as they exist, without interpretation, guidance, or narrative framing. The human observer is responsible for all meaning-making, interpretation, and action decisions.

**The system does not assist, correct, or respond.**

The system:
- **Does not assist** in interpretation (no frameworks, no guidance, no suggestions)
- **Does not correct** understanding (no "actually, this means..." or "you might be thinking...")
- **Does not respond** to observer actions (no feedback, no encouragement, no discouragement)

The system is a mirror: it reflects what is, without telling you what it means or what to do with it.

**Boundary Principle:**

> The system observes and presents structure.  
> The human interprets meaning and decides action.  
> The system never crosses this boundary.

---

## Design Summary

**What can be shown:** Structural properties, relationships, and temporal snapshots as absolute, factual data.

**What can never be shown:** Visual emphasis, value labels, alerts, animations, ordering, color coding, summaries, progress indicators, or any interpretive framing.

**Presentation constraints:** Neutral, equal, factual presentation with no hierarchy, emphasis, or interpretation.

**Human responsibility:** All interpretation, meaning-making, and action decisions occur outside the system. The system does not assist, correct, or respond.

---

## Forward Constraint

All future UI/UX design must conform to these presentation constraints.

**Violation of these constraints indicates a breach of the Mirror role declared in Phase 12.1.**


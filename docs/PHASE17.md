# Phase 17.0 — Mirror Aggregation Rules (Non-Synthetic Summarization)

**Status:** Aggregation Design Document  
**Date:** 2024  
**No Code Changes:** This phase governs aggregation without synthesis.

## Goal

Define how multiple observations may be aggregated or grouped without producing synthesis, abstraction, compression, or emergent meaning.

This phase governs aggregation without synthesis.

---

## Core Principle

**Aggregation may collect. Aggregation may not conclude.**

The system may group elements together, but it may not produce summaries, themes, insights, takeaways, or synthesized representations.

---

## 1. Allowed Aggregation Operations

**Explicitly allow:**

### Counting Operations

1. **Counting**
   - Count of elements in a set (e.g., "5 reflections")
   - Count of elements matching a condition (e.g., "3 with density > 5")
   - No interpretation of what counts mean
   - Factual counts only

2. **Raw totals**
   - Sum of numerical values (e.g., "total density: 25")
   - No "average" or "mean" that implies typicality
   - No "total" that implies completeness or significance
   - Factual totals only

### Listing Operations

3. **Listing**
   - Lists of elements (e.g., "Reflection 1, Reflection 2, Reflection 3")
   - No ordering that implies importance
   - No filtering that implies relevance
   - Complete, factual lists only

4. **Enumerations**
   - Enumeration of all elements in a set
   - No "key" or "important" elements highlighted
   - No representative examples
   - All elements shown equally

### Grouping Operations

5. **Grouping by explicit keys**
   - Group elements by explicit structural properties (e.g., "group by density value")
   - No grouping by inferred meaning or significance
   - No grouping that implies similarity or relatedness
   - Grouping is mechanical, not meaningful

6. **Partitioning by explicit attributes**
   - Partition sets by explicit attributes (e.g., "partition by time period")
   - No partitioning that implies importance or value
   - No partitions that suggest categories or themes
   - Partitioning is structural, not semantic

### Set Operations

7. **Set unions and intersections**
   - Union of sets (e.g., "all elements in A or B")
   - Intersection of sets (e.g., "all elements in both A and B")
   - No interpretation of what unions or intersections mean
   - Factual set operations only

8. **Set differences**
   - Difference between sets (e.g., "elements in A but not in B")
   - No "unique" or "shared" language that implies value
   - No interpretation of differences
   - Factual set differences only

### Structural Collections

9. **Structural adjacency collections**
   - Collections of structurally adjacent elements
   - No "clusters" or "groups" language that implies meaning
   - No clustering that suggests similarity or relatedness
   - Adjacency is structural, not semantic

10. **Neighborhood collections**
    - Collections of elements in the same neighborhood
    - No "similar" or "related" language
    - No interpretation of neighborhood membership
    - Factual neighborhood collections only

### Aggregation Display Principles

- **All outputs must remain factual and decomposable**: Aggregations show what exists, not what it means
- **No synthesis**: Aggregation collects, does not conclude
- **No abstraction**: Aggregation preserves all elements, does not reduce
- **No compression**: Aggregation shows all data, does not summarize

---

## 2. Prohibited Synthetic Behavior

**Explicitly forbid:**

### Summarization

1. **Summaries**
   - No "summary of reflections"
   - No "overview" or "synopsis"
   - No condensed representations
   - No summarization of any kind

2. **Insights**
   - No "insights" or "key insights"
   - No "findings" or "discoveries"
   - No interpretation of patterns
   - No insight generation

3. **Themes**
   - No "themes" or "patterns"
   - No "common themes" or "recurring patterns"
   - No thematic grouping or identification
   - No theme extraction

4. **Takeaways**
   - No "takeaways" or "key points"
   - No "what to remember"
   - No distilled information
   - No takeaway generation

5. **Key points**
   - No "key points" or "main points"
   - No "important points" or "significant points"
   - No point extraction or highlighting
   - No key point identification

### Abstraction

6. **Abstract labels**
   - No labels that abstract meaning (e.g., "work-related," "personal")
   - No categorical labels that imply interpretation
   - No semantic labels of any kind
   - Factual identifiers only

7. **Compression into fewer representations**
   - No reducing many elements into fewer
   - No "representative" elements
   - No compression or reduction
   - All elements must remain visible

8. **"What this means" language**
   - No "this means..." or "this suggests..."
   - No interpretation language
   - No meaning attribution
   - No explanatory language

### Transformation

9. **Any transformation that reduces interpretive effort**
   - No simplification that makes interpretation easier
   - No abstraction that reduces complexity
   - No compression that reduces information
   - No transformation that aids understanding

10. **Representative examples**
    - No "for example" or "such as" selections
    - No "typical" or "representative" elements
    - No example selection that implies meaning
    - All elements shown, no examples

### Prohibited Principles

- **No synthetic behavior may produce meaning**: Aggregation collects, does not interpret
- **No synthetic behavior may reduce information**: Aggregation preserves all elements
- **No synthetic behavior may aid interpretation**: Aggregation does not make meaning easier
- **No synthetic behavior may conclude**: Aggregation shows what exists, not what it means

---

## 3. Anti-Abstraction Constraints

**Constraints that prevent abstraction and synthesis:**

### Language Constraints

1. **No natural language synthesis**
   - No generated text that summarizes or interprets
   - No natural language descriptions of collections
   - No text that explains what collections mean
   - Factual labels only, no synthesis

2. **No representative examples**
   - No "for example" selections
   - No "typical" or "representative" elements
   - No example selection that implies meaning
   - All elements shown, no examples

3. **No "most common" framing**
   - No "most common" or "most frequent" language
   - No frequency-based emphasis
   - No typicality framing
   - All frequencies shown equally

### Visual Constraints

4. **No highlighting patterns as meaningful**
   - No visual emphasis of patterns
   - No highlighting of "significant" patterns
   - No pattern identification that implies meaning
   - Patterns shown, not interpreted

5. **No collapsing many into one**
   - No reduction of multiple elements into single representation
   - No "grouped" views that hide individual elements
   - No compression that reduces visibility
   - All elements remain individually visible

### Structural Constraints

6. **Aggregation must preserve multiplicity**
   - All elements in aggregation remain visible
   - No reduction to single representation
   - No collapsing or compression
   - Multiplicity preserved, not reduced

7. **No hierarchical abstraction**
   - No "parent" or "child" relationships that abstract
   - No levels of abstraction
   - No hierarchical grouping that implies meaning
   - Flat, factual grouping only

8. **No categorical abstraction**
   - No categories that abstract meaning
   - No grouping into abstract categories
   - No categorical labels that interpret
   - Factual grouping only, no categories

### Presentation Constraints

9. **No default aggregation views**
   - No "summary" or "overview" views
   - No default that implies importance
   - No recommended aggregation methods
   - User controls all aggregation

10. **No aggregation recommendations**
    - No "you might want to see..." suggestions
    - No recommended ways to aggregate
    - No guidance on aggregation
    - No aggregation suggestions

### Anti-Abstraction Principles

- **Aggregation preserves multiplicity**: All elements remain visible, not reduced
- **Aggregation is mechanical, not semantic**: Grouping is structural, not meaningful
- **Aggregation shows all, not some**: No filtering or selection that implies importance
- **Aggregation collects, does not conclude**: Shows what exists, not what it means

---

## 4. Observer Responsibility Statement

**The system aggregates without interpreting.**

The system may group elements together, count them, list them, partition them, or perform set operations on them. The system does not interpret what those aggregations mean, which aggregations are important, or what those aggregations suggest.

**Meaning, synthesis, and abstraction are performed by the observer.**

The human observer is responsible for:
- **Interpreting aggregations**: What do these collections mean?
- **Synthesizing information**: How do I understand these groups together?
- **Abstracting patterns**: What patterns do I see in these collections?
- **Drawing conclusions**: What do I conclude from these aggregations?

The system is responsible for:
- **Presenting aggregations**: Showing collections as they exist
- **Enabling aggregation**: Providing mechanical tools to group and collect
- **Maintaining neutrality**: Never interpreting, synthesizing, or abstracting

**The system does not explain what collections imply.**

The system never:
- **Explains**: "This collection means..."
- **Synthesizes**: "These elements together suggest..."
- **Abstracts**: "This group represents..."
- **Concludes**: "This aggregation shows..."

**Boundary Principle:**

> The system aggregates elements into collections.  
> The human interprets meaning, synthesizes information, and abstracts patterns.  
> The system never crosses this boundary.

---

## Aggregation Design Summary

**Allowed aggregation operations:** Counting, listing, grouping by explicit keys, partitioning by explicit attributes, raw totals, set unions and intersections, structural adjacency collections, neighborhood collections — all factual and decomposable.

**Prohibited synthetic behavior:** Summaries, insights, themes, takeaways, key points, abstract labels, compression into fewer representations, "what this means" language, any transformation that reduces interpretive effort, representative examples — all produce synthesis, abstraction, compression, or emergent meaning.

**Anti-abstraction constraints:** No natural language synthesis, no representative examples, no "most common" framing, no highlighting patterns as meaningful, no collapsing many into one, aggregation must preserve multiplicity, no hierarchical abstraction, no categorical abstraction, no default aggregation views, no aggregation recommendations.

**Observer responsibility:** The system aggregates without interpreting. Meaning, synthesis, and abstraction are performed by the observer. The system does not explain what collections imply.

---

## Forward Constraint

All future aggregation design must conform to these aggregation rules.

**Violation of these rules indicates a breach of the Mirror role declared in Phase 12.1, the presentation constraints defined in Phase 13.0, the interaction rules defined in Phase 14.0, the temporal presentation rules defined in Phase 15.0, and the comparison rules defined in Phase 16.0.**


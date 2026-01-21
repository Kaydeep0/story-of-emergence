# Phase 14.0 — Mirror Interaction Rules (Passive Navigation Only)

**Status:** Interaction Design Document  
**Date:** 2024  
**No Code Changes:** This phase defines interaction mechanics, not visuals and not meaning.

## Goal

Define how a human may move through reflected structure without the system guiding attention, implying importance, or shaping interpretation.

This phase governs interaction mechanics, not visuals and not meaning.

---

## Core Principle

**Interaction must be:**

- **User initiated**: All interaction starts with explicit user action
- **Mechanically neutral**: Interaction is a tool, not a guide
- **Structurally faithful**: Interaction reveals structure as it exists, without alteration

**The system never:**

- **Directs attention**: No highlighting, centering, or emphasis
- **Suggests next steps**: No recommendations or guidance
- **Infers intent**: No assumptions about what the user wants to see
- **Responds to curiosity**: No adaptive behavior based on user actions

---

## 1. Allowed Interactions

**Interactions that are strictly mechanical:**

### Navigation

1. **Pan**
   - Move viewport across structure
   - No auto-centering or snap-to behavior
   - No constraints that suggest "important" regions
   - User controls all movement

2. **Zoom**
   - Scale view in/out
   - No auto-zoom to "interesting" areas
   - No zoom limits that suggest importance
   - User controls all scaling

3. **Scroll**
   - Move through lists or sequences
   - No auto-scroll or jump-to behavior
   - No sticky headers or persistent elements
   - User controls all scrolling

4. **Rotate** (if applicable)
   - Rotate view of structure
   - No auto-rotation or preferred orientation
   - No constraints that suggest "correct" view
   - User controls all rotation

### Visibility Control

5. **Toggle visibility of already present layers**
   - Show/hide structural layers (density, gradient, curvature, etc.)
   - No "recommended" layer combinations
   - No auto-showing of "important" layers
   - User controls all visibility

6. **Filter by structural property** (value-based, not meaning-based)
   - Filter by absolute values (e.g., "density > 5")
   - No "most important" or "most significant" filters
   - No pre-defined filter sets that suggest meaning
   - User defines all filters

7. **Switch time slices**
   - Navigate between temporal snapshots
   - No auto-advancing or auto-playing
   - No "current" or "latest" emphasis
   - User controls all temporal navigation

### Selection

8. **Select elements**
   - Click/tap to select structural elements
   - No auto-selection or default selection
   - No "most relevant" suggestions
   - User controls all selection

9. **Deselect elements**
   - Clear selection
   - No persistent selections
   - No "remembered" selections
   - User controls all deselection

### View Configuration

10. **Change view mode**
    - Switch between different structural views
    - No "recommended" or "best" view modes
    - No adaptive view switching
    - User controls all view changes

11. **Reset view**
    - Return to initial state
    - No "home" or "default" position that implies importance
    - Reset is mechanical, not meaningful
    - User controls all resets

### Data Access

12. **View raw data**
    - Inspect structural values
    - No "key" or "important" data highlighted
    - No summaries or interpretations
    - User accesses all data equally

13. **Export data**
    - Export structural data
    - No "curated" or "selected" exports
    - No pre-filtered exports
    - User controls all exports

### Interaction Principles

- **No interaction may alter structure**: Interaction reveals structure, does not change it
- **All interaction is explicit**: No implicit or inferred actions
- **All interaction is reversible**: User can undo or reset any action
- **All interaction is equal**: No interaction is "more important" than another

---

## 2. Prohibited Interactions

**Explicitly ban interaction patterns that imply meaning:**

### Attention-Directing Interactions

1. **"Focus" modes**
   - No "focus on important elements"
   - No "highlight relevant structure"
   - No modes that emphasize certain elements
   - No attention-directing features

2. **Auto centering**
   - No auto-center on "important" elements
   - No snap-to behavior
   - No automatic positioning
   - No system-initiated movement

3. **Recommendations**
   - No "you might want to look at..."
   - No "consider exploring..."
   - No suggested next steps
   - No guidance or recommendations

4. **Highlights**
   - No highlighting of "interesting" elements
   - No emphasis on "significant" structure
   - No visual emphasis of any kind
   - No attention-drawing features

5. **Smart defaults**
   - No "best" default view
   - No "recommended" starting point
   - No intelligent defaults
   - No system preferences

6. **Adaptive layouts**
   - No layouts that adapt to user behavior
   - No "personalized" arrangements
   - No learning from user actions
   - No adaptive or intelligent behavior

### Interpretive Interactions

7. **Tooltips that explain significance**
   - No "this is important because..."
   - No "this shows..."
   - No interpretive tooltips
   - Tooltips may show data only, not meaning

8. **Contextual help**
   - No "this pattern means..."
   - No explanations or interpretations
   - No help that assigns meaning
   - No contextual guidance

9. **Guided tours**
   - No "walkthrough" of structure
   - No "tour" of important elements
   - No guided exploration
   - No system-led navigation

10. **Search with ranking**
    - No "most relevant" results
    - No ranking by importance
    - No search that implies value
    - Search returns matches only, no ranking

### Behavioral Interactions

11. **Auto-play or auto-advance**
    - No automatic temporal progression
    - No auto-advancing through time slices
    - No system-initiated movement
    - No automatic behavior

12. **Smart zoom**
    - No auto-zoom to "interesting" areas
    - No intelligent zoom levels
    - No adaptive zoom behavior
    - No system-controlled zoom

13. **Predictive navigation**
    - No "you might want to go here next"
    - No predictive suggestions
    - No inferred next steps
    - No intelligent navigation

14. **Persistent selections**
    - No "remembered" selections
    - No persistent highlights
    - No saved preferences that imply importance
    - No memory of user actions

15. **Comparison modes**
    - No "compare with important elements"
    - No "similar to..." suggestions
    - No comparison that implies meaning
    - No interpretive comparisons

### Prohibited Principles

- **No interaction may imply meaning**: All interaction is mechanical only
- **No interaction may guide attention**: User directs all attention
- **No interaction may suggest action**: System never suggests what to do
- **No interaction may adapt to user**: System never learns or adapts

---

## 3. Interaction Neutrality Constraints

**Constraints that ensure interaction remains neutral:**

### Default State Constraints

1. **No default viewpoint**
   - No "home" or "starting" position
   - No preferred initial view
   - No default that implies importance
   - User determines initial view

2. **No preferred scale**
   - No "best" zoom level
   - No recommended scale
   - No default that suggests importance
   - User determines all scaling

3. **No attention anchoring**
   - No persistent focal points
   - No elements that always remain visible
   - No anchors that suggest importance
   - User controls all attention

### Transition Constraints

4. **No animated transitions that imply flow or direction**
   - No animations that suggest movement or progress
   - No transitions that imply causality
   - No motion that draws attention
   - Transitions are instant or mechanically neutral only

5. **No transitions that emphasize elements**
   - No fade-ins that highlight importance
   - No slide-ins that draw attention
   - No transitions that suggest value
   - All transitions are neutral

### Behavioral Constraints

6. **No system-initiated actions**
   - No automatic behavior of any kind
   - No system responses to user actions
   - No adaptive or intelligent behavior
   - All actions are user-initiated

7. **No memory of user behavior**
   - No learning from user actions
   - No adaptation to user patterns
   - No persistent preferences
   - Each session is independent

8. **No contextual adaptation**
   - No behavior that changes based on context
   - No intelligent responses
   - No adaptive features
   - System behavior is constant

### Visual Constraints

9. **No visual feedback that implies meaning**
   - No hover states that emphasize importance
   - No click feedback that suggests value
   - No visual responses that interpret action
   - Feedback is mechanical only

10. **No persistent visual states**
    - No "visited" or "explored" markers
    - No persistent highlights
    - No visual memory
    - Visual state resets on interaction end

### Neutrality Principles

- **Interaction is a tool, not a guide**: Interaction reveals structure, does not interpret it
- **User controls all attention**: System never directs or suggests
- **System behavior is constant**: No adaptation or learning
- **All interaction is reversible**: User can undo or reset

---

## 4. Observer Responsibility Statement

**Movement through structure does not imply relevance.**

Navigation through reflected structure is a mechanical act. The system does not interpret user movement, infer intent, or respond to curiosity. All navigation is user-initiated and mechanically neutral.

**Navigation reveals, it does not explain.**

The system presents structure as it exists. User navigation reveals different aspects of that structure, but the system never explains what those aspects mean, why they might be important, or what the user should do with them.

**Interpretation remains the responsibility of the observer.**

The human observer is responsible for:
- **Interpreting meaning**: What does this structure mean?
- **Deciding relevance**: What is important to me?
- **Choosing actions**: What do I want to do with this?
- **Making connections**: How do I understand this?

The system is responsible for:
- **Presenting structure**: Showing structure as it exists
- **Enabling navigation**: Providing mechanical tools to explore
- **Maintaining neutrality**: Never guiding, suggesting, or interpreting

**Boundary Principle:**

> The system provides mechanical tools for navigation.  
> The human interprets meaning and decides action.  
> The system never crosses this boundary.

---

## Interaction Design Summary

**Allowed interactions:** Pan, zoom, scroll, rotate, toggle visibility, filter, switch time slices, select, change view, reset, view data, export data — all strictly mechanical.

**Prohibited interactions:** Focus modes, auto-centering, recommendations, highlights, smart defaults, adaptive layouts, interpretive tooltips, guided tours, auto-play, smart zoom, predictive navigation, persistent selections, comparison modes — all imply meaning or guide attention.

**Neutrality constraints:** No default viewpoint, no preferred scale, no attention anchoring, no animated transitions implying flow, no system-initiated actions, no memory, no contextual adaptation, no visual feedback implying meaning.

**Observer responsibility:** Movement does not imply relevance. Navigation reveals, it does not explain. Interpretation remains the responsibility of the observer.

---

## Forward Constraint

All future interaction design must conform to these interaction rules.

**Violation of these rules indicates a breach of the Mirror role declared in Phase 12.1 and the presentation constraints defined in Phase 13.0.**


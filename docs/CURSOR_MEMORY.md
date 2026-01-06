# Story of Emergence Cursor Memory

## Operating principle
When work is requested, first identify which layer the request touches.
Do not make changes in a higher layer that violate constraints of a lower layer.

## System layers

**Layer 0 Canonical reality**
Truth constraints that never change.
- Reflections are timestamped cognitive artifacts.
- Primary primitive is attention over time.
- Meaning is derived, never asserted.
- System observes, does not instruct.
- Computation is local and deterministic given the same inputs.

**Layer 1 Signal layer**
Computable metrics only.
- Counts, active days, spike ratio, distributions, gaps, clustering stats.

**Layer 2 Lens layer**
Grouping and framing of signals by a question.
- Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime.

**Layer 3 Narrative layer**
Language that is reversible back to signals.
- No diagnosis, no moralizing, no prescriptive advice.

**Layer 4 Visual encoding**
Visuals encode hierarchy, not decoration.
- Every glow, blur, badge, chart style must map to signal importance, lens boundary, or narrative emphasis.

**Layer 5 Interaction and motion**
Motion reveals structure but never changes meaning.
- Scrolling, sticky headers, transitions must not introduce artifacts that imply false meaning.

## Work rules
- If user asks for futuristic visuals, first verify Layer 0 to 3 are stable.
- If user reports a visual glitch, treat it as Layer 5 first, then Layer 4.
- If a visual effect causes scroll artifacts, reduce blur, reduce filter, avoid fixed background layers, avoid overflow clipping conflicts, and test on Chrome.
- When making changes, explicitly state which layer the change belongs to.
- Prefer small scoped diffs.


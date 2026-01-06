# Cursor Rules for Story of Emergence

**Use `docs/CURSOR_MEMORY.md` as the canonical operating guide for Story of Emergence.**
- Do not violate Layer 0 constraints.
- When responding, explicitly state which layer a change belongs to.
- Prefer small scoped diffs.

You are an execution helper, not an architect.

Before proposing changes:
1. Read docs/SCOPE.md, docs/STATUS.md, docs/NEXT.md
2. Do not change encryption primitives, key derivation, or RLS without explicit instruction
3. Do not add new features unless docs/NEXT.md says to
4. Prefer smallest diff that advances the current objective
5. If unsure, list exactly what file you would change and why

Definition of done for any task:
- Typecheck passes
- Build passes
- No view computes insights outside the canonical engine

---

## Decision Discipline for Insight Work

### Purpose

This section exists to prevent scope fracture, abstraction mixing, and premature metaphor when working on Insights.

When an Insight feels unsatisfying, the problem is often not correctness but *experiential legibility*. This framework defines how to respond.

---

### The Core Observation

When reviewing Insight output, dissatisfaction usually stems from a cognitive gap between:

* what the numbers are mathematically saying
* what the user is able to feel or recognize about themselves

Correct numbers can still be experientially dead.

---

### The Three Insight Layers (Do Not Mix)

Insight improvements fall into **three distinct abstraction layers**. Only **one layer may be worked on in a single task**.

#### Layer 1: Interpretive Language (Default, Lowest Risk)

Definition:

* Keep all existing metrics
* Do not change computation
* Do not add new models
* Add plain-English explanation adjacent to numbers

Goal:

* Make the user recognize themselves in the output

Examples:

* Explain what Spike Ratio implies about behavior
* Explain what Top 10% Share indicates about concentration
* Explain what a Log Normal distribution means in lived terms

This layer:

* Is safe
* Respects all cryptographic and engine boundaries
* Produces immediate product value

This is the **default layer** and should be chosen unless explicitly overridden.

---

#### Layer 2: Distribution Visualization (Heavier, Visual)

Definition:

* Render distribution curves (normal or log-normal)
* Plot days or reflections onto the curve
* Allow users to see where intensity lives

Constraints:

* Requires charting and visual encoding decisions
* Touches more UI surface area
* Raises expectations of interactivity

This layer may only be worked on when explicitly authorized as the sole task.

---

#### Layer 3: Narrative or Neural Metaphors (Conceptual, Highest Risk)

Definition:

* Visualizing nodes, edges, weights, or brain-like structures

Constraint:

* This introduces implicit claims about cognition and identity
* This shifts Insights from observation to interpretation

This layer belongs to future Narrative or Meaning views and is **never part of core Insight v1 work**.

---

### Task Selection Rule (Section C)

Invalid task framing:

> "Improve Lifetime insights"

Valid task framing:

> "Which single layer of understanding are we deepening?"

Rules:

* Exactly one layer per task
* Layer 1 must be exhausted before moving to Layer 2
* Layer 3 requires explicit scope change

---

### Default Decision

Unless explicitly stated otherwise:

* Choose **Layer 1: Interpretive Language**
* Make the numbers speak before adding visuals

Meaning must land before metaphor.


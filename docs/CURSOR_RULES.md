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

---

## Daily Start Protocol

At the beginning of a session, do the following before suggesting tasks:

1. Scan the repository for recent changes since the last merge:
   - git log
   - modified files
   - new migrations
   - new routes or components

2. Summarize the current system state strictly using this layer model:

**Vault layer**
- Encryption
- Entries
- RLS
- Storage
- Migrations

**Lens layer**
- Insights pages
- Yearly / YoY / Lifetime
- Timeline / Distributions
(All computed locally after decrypt)

**Meaning layer**
- Threads
- Bridges
- Pins
- Graph logic

**Distribution layer**
- SharePack
- wallet_shares
- Artifacts
- External sharing paths

### Canonical Alignment Check

- Core memory index reviewed: docs/0_START_HERE.md
- Engine state: ☐ Open ☐ Closed ☐ Closing
- Observer layer: ☐ Not implemented (by design)
- Cockpit/UI work: ☐ Allowed ☐ Not allowed today

Affirmations:
- No new insight types will be added today
- No new data models will be added today
- No new metaphors will be introduced today
- Any work today must articulate existing vision, not expand it

Continuity reminder:
The system remembers patterns, tensions, and shifts — not goals, judgments, or prescriptions.

3. Answer explicitly:
- What layers are strong
- What layers are in progress
- What layers are blocked or incomplete

4. Only after that, propose next tasks.
Do not suggest features that violate the product posture:
"A Mirror that can speak, but cannot steer."

This trains Cursor to orient before acting.

---

## Daily Close Protocol

At the end of a session or before a merge, do the following:

1. Identify what changed today:
   - Files added
   - Files modified
   - Migrations added
   - Routes added or removed

2. Classify each change by layer:
   - Vault
   - Lens
   - Meaning
   - Distribution

3. Produce a short summary suitable for docs/STATUS.md:
   - Layers touched today
   - What shipped
   - What is still pending

4. Flag any mismatch between:
   - WHAT_IS_BUILT.md
   - docs/STATUS.md
   - Actual repo contents

### Stance Integrity Check

- Did any change today introduce prescription, optimization, or judgment? ☐ No ☐ Yes (explain)
- Did any change imply interpretation rather than witnessing? ☐ No ☐ Yes
- Did any work today assume meaning instead of holding pattern? ☐ No ☐ Yes

Continuity impact:
- Did today's changes strengthen continuity of self across time? ☐ Yes ☐ Neutral ☐ Weakened

Drift check:
If I return to this system after a month, would today's changes help it remember me — or confuse it?

Do not invent progress. If something is partially implemented, say so.

This makes Cursor your reflection mirror, not a cheerleader.


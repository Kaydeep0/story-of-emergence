# Observation Boundaries

**Status:** Canonical constraint  
**Purpose:** Unambiguous definition of what the system may observe versus what it must not infer

---

## Purpose

This document codifies the boundary between observation and interpretation in Story of Emergence. The system operates as a mirror that reflects structure without assigning meaning, priority, or direction. This boundary prevents premature meaning collapse and preserves the user's agency as the sole interpreter. All user-facing language, insight descriptions, and system outputs must respect these boundaries.

---

## Definitions

**Observation:** A statement that describes what is detected, measured, or surfaced without assigning value, priority, or meaning. Observations report structure, distribution, timing, or presence without evaluation.

**Interpretation:** A statement that assigns meaning, significance, or causality to observed patterns. Interpretation collapses layered structure into conclusions about what something means or why it matters.

**Evaluation:** A statement that judges quality, success, progress, or desirability. Evaluation implies that some states are better than others or that certain outcomes should be pursued.

**Steering:** Language or behavior that directs the user toward specific actions, focuses, or goals. Steering reduces agency by implying what the user should do or prioritize.

**Measurement collapse:** The loss of structural information that occurs when premature evaluation flattens layered meaning into binary judgments or single conclusions.

**Scale distribution:** The pattern of how activity, events, or content is distributed across time windows, categories, or dimensions without implying that the distribution is good, bad, or should change.

---

## The Boundary

### Allowed observations (system may state)

The system may state:

* What patterns are detected (e.g., "Activity clusters in morning hours")
* How distributions appear (e.g., "Most sessions occurred during three days")
* When events occurred (e.g., "Reflections increased in frequency during this period")
* What structures exist (e.g., "Two distinct clusters appear in this timeline")
* Relative comparisons without judgment (e.g., "This period shows higher activity than the previous one")
* Presence or absence of features (e.g., "No reflections recorded for this date range")
* Structural relationships (e.g., "These events occurred within the same week")

All allowed observations describe measurable, structural properties without implying meaning, importance, or recommended action.

### Forbidden inferences (system must not state)

The system must not state:

* That something is important, significant, meaningful, or noteworthy
* That something deserves attention, reflection, or action
* That progress, growth, improvement, or decline has occurred
* That certain patterns are good, bad, healthy, or unhealthy
* That the user should focus on, prioritize, or change anything
* That certain periods were more valuable or meaningful than others
* That recommendations exist for what to do next
* That evaluation or judgment of any kind is implied

Any statement that collapses observation into interpretation, evaluation, or steering violates this boundary.

---

## Examples

### Acceptable observations

1. "Most of your reflections occurred during three days this week."
2. "Activity clusters appear in morning hours across this month."
3. "This period shows higher reflection frequency than the previous period."
4. "Two distinct clusters are visible in the timeline distribution."

### Forbidden inferences

1. "Your most important reflections occurred during three days this week."
2. "You should focus on morning hours, where your best work happens."
3. "This period shows improvement over the previous period."
4. "These clusters deserve deeper reflection and attention."

---

## Enforcement

This boundary is enforced through multiple mechanisms:

**Observation Language Invariant:** Defined in `docs/ARCHITECTURE_NOW.md`, this invariant requires all user-facing language to remain observational, non-prescriptive, and non-evaluative.

**Automated scanning:** The script `scripts/observation_language_scan.sh` mechanically detects interpretation-leaning tokens (`recommended`, `important`, `significant`, `strongest`, `deserve`) in user-facing copy and fails if violations are found.

**Protocol gates:** The re-entry protocol (`docs/PROTOCOL_REENTRY_AND_PROGRESS.md`), start-of-day protocol (`docs/PROTOCOL_START_OF_DAY.md`), and end-of-day protocol (`docs/PROTOCOL_END_OF_DAY.md`) require running the observation language scan before proceeding with new work.

**Code review:** All changes to user-facing copy must pass the observation language scan and be reviewed for boundary violations.

**Theoretical grounding:** This boundary exists because premature evaluation collapses layered meaning into flat conclusions. The restraint is structural, not moral. See `THEORY.md` for the foundational articulation.

---

*This document codifies boundaries already implied by POSTURE, ARCHITECTURE_NOW, and THEORY. It does not introduce new constraints, only makes existing ones unambiguous and enforceable.*

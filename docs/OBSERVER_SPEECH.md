# Observer Speech Constraint

**Status:** Design contract  
**Purpose:** Define what a persistence statement is allowed to look like

This document constrains how Observer v1 may "speak" when recognizing pattern persistence. It prevents accidental narrativization.

---

## Allowed Tense

Observer v1 persistence statements must use:

- **Past tense** or **present tense** for observed patterns
- **Present tense** for structural recognition (e.g., "This pattern appears in Weekly and Yearly")

Observer v1 may not use:
- Future tense (no predictions)
- Conditional tense (no "if this continues")
- Imperative mood (no commands or suggestions)

---

## Forbidden Verbs

Observer v1 must never use verbs that imply:

- **Interpretation:** means, represents, suggests, indicates, implies
- **Value judgment:** should, must, needs, requires, ought
- **Action:** try, consider, focus, prioritize, improve
- **Prediction:** will, might, could, may (when referring to future)
- **Causation:** causes, leads to, results in, creates
- **Identity:** are, is (when used to assign identity, e.g., "you are a weekend writer")

Observer v1 may use:
- **Observation:** appears, shows, occurs, repeats
- **Recognition:** matches, shares, persists, recurs
- **Structure:** clusters, concentrates, distributes

---

## Maximum Scope

A persistence statement must be:

- **One sentence maximum**
- **One clause maximum** (no compound sentences)
- **One pattern reference maximum** (do not compare patterns)

Example structure: "This pattern appears in Weekly and Yearly."

Not allowed: "This pattern appears in Weekly and Yearly, and it suggests a consistent writing rhythm."

---

## What It May Reference

Observer v1 persistence statements may reference:

- **Windows:** "Weekly," "Yearly," "Monthly"
- **Lenses:** The lens names as structural containers
- **Pattern signatures:** The structural elements (day-of-week, concentration, distribution fit)
- **Recurrence:** The fact of repetition across windows

Observer v1 may not reference:
- **The user:** No "you," "your," "yourself"
- **Identity:** No "you are," "your pattern is"
- **Time direction:** No "increasing," "decreasing," "growing," "declining"
- **Frequency:** No "often," "rarely," "usually" (these imply interpretation)
- **Comparison:** No "more than," "less than," "compared to"

---

## What It May Never Reference

Observer v1 persistence statements must never reference:

- **Self or identity:** No statements about who the user is or what they are
- **Future:** No statements about what will happen or might happen
- **Meaning:** No statements about what the pattern means or represents
- **Value:** No statements about whether the pattern is good, bad, healthy, concerning
- **Causation:** No statements about why the pattern exists or what causes it
- **Recommendation:** No statements about what the user should do
- **Comparison to others:** No statements about how the pattern compares to external standards

---

## Example: Allowed Statement

"This pattern appears in Weekly and Yearly."

This statement:
- Uses present tense for recognition
- References windows (Weekly, Yearly)
- States recurrence without interpretation
- Contains one sentence, one clause
- Avoids all forbidden elements

---

## Example: Forbidden Statement

"You tend to write more on weekends, and this pattern suggests you should maintain this rhythm."

This statement violates:
- References "you" (identity)
- Uses "tends" (interpretation)
- Uses "suggests" (forbidden verb)
- Uses "should" (value judgment)
- Contains multiple clauses
- Implies meaning and recommendation

---

**This constraint is a guardrail. It ensures Observer v1 speaks observationally, not narratively.**

**Observer v1 recognizes persistence. It does not interpret persistence.**


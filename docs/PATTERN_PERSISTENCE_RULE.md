# Pattern Persistence Rule

**Status:** Design contract  
**Purpose:** Define when Observer v1 is allowed to say "this pattern appears again"

This document defines the logic boundary for pattern persistence recognition. It answers when persistence can be claimed, when silence is required, and how conflicts are handled.

---

## Minimum Recurrence Requirement

Observer v1 is allowed to claim pattern persistence only when:

The same pattern signature appears in at least two distinct time windows. The windows must be non-overlapping and from different lenses (e.g., Weekly and Yearly, or Monthly and Yearly). A single window cannot establish persistence, even if it spans a long period. Persistence requires recurrence across windows, not duration within a window.

---

## Silence Rule

Observer v1 must remain silent about pattern persistence when:

- The pattern signature appears in only one window (no recurrence)
- The pattern signature appears in overlapping windows (not distinct)
- The pattern signature appears in windows from the same lens (not cross-lens)
- The pattern signature matches are ambiguous (e.g., two different patterns could match, or the match is within tolerance bands but not clearly the same)
- The data in either window is insufficient to compute a reliable signature (e.g., too few entries, too few active days)

Silence is not absence. Observer v1 chooses not to speak when the evidence is insufficient or ambiguous. This preserves trust.

---

## Conflict Rule

When two or more patterns coexist in the same window, Observer v1 must:

- Recognize each pattern independently
- Not collapse them into a single pattern
- Not rank them by importance or frequency
- Not resolve contradictions between them
- Allow multiple persistence claims if multiple patterns recur across windows

If Pattern A persists across Weekly and Yearly, and Pattern B (contradictory to Pattern A) also persists across Weekly and Yearly, Observer v1 must recognize both persistences. The patterns coexist. Observer v1 does not resolve the contradiction; it witnesses both.

---

## Recognition Boundary

Observer v1 recognizes pattern persistence. It does not:

- Explain why the pattern persists
- Predict whether the pattern will continue
- Suggest what the persistence means
- Rank patterns by persistence strength
- Create narratives about persistence

Recognition is observation. Persistence is a fact about recurrence, not a conclusion about meaning.

---

**This rule is a logic boundary. It prevents overclaiming, ambiguity collapse, and meaning inflation.**

**Pattern persistence is recognized, not interpreted.**


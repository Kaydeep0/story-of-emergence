# Phase Activation Protocol

**Status:** Required before any new build phase

---

## Phase Declaration

**Phase Name:** Invariant Hardening

**Phase Status:** Active

**Activation Date:** 2026-01-20

---

## Why This Phase Exists

After stabilization and consolidation, invariants are documented but not mechanically enforced in the code review workflow. This creates risk of silent regression where core laws are violated without detection.

**Pressure points:**
- Invariants exist in `docs/INVARIANTS.md` but compliance is socially enforced
- No mechanical checks prevent invariant violations from merging
- Deterministic behavior is assumed but not proven by tests
- Reviewers must remember to check invariants manually

**Evidence:**
- `NEXT.md` explicitly lists "Harden invariants in code review flow" as priority #3
- Stabilization work revealed that canonical files reference canonical docs, but this was discovered manually
- No automated regression tests exist for deterministic bridge output

---

## Scope Boundaries

### Explicitly In-Scope

* Code review enforcement mechanisms
* Mechanical checks for existing invariants
* CI or local tooling that verifies invariant compliance
* Tests that prove determinism of existing logic
* Checklists and templates tied to review discipline
* PR templates that require invariant acknowledgment

### Explicitly Out-of-Scope

* ❌ No new invariants
* ❌ No reinterpretation of invariants
* ❌ No feature work
* ❌ No observer behavior changes
* ❌ No UX changes unless required for enforcement visibility
* ❌ No new conceptual frameworks
* ❌ No expansion of invariant definitions

If it doesn't **enforce**, **verify**, or **fail fast**, it doesn't belong.

---

## Authority Model

This phase is governed by:

* `docs/INVARIANTS.md` (always)
* `docs/ARCHITECTURE_NOW.md`
* `docs/SCOPE.md`
* `docs/POSTURE.md`
* `docs/OBSERVATION_BOUNDARIES.md`

No archived documents are reactivated. No new authority is introduced.

---

## Exit Conditions (Binary)

This phase ends when **all** are true:

1. ✅ Every PR must acknowledge invariant compliance explicitly
2. ✅ Deterministic behavior is proven by at least one automated regression test
3. ✅ A reviewer can block a PR **without reading code** if invariants are unchecked

No soft completion allowed. All conditions must be observable and binary.

---

## Forbidden Outcomes

This phase fails if:

* New conceptual framework introduced
* Invariants reinterpreted or expanded
* Scope expansion justified mid-phase
* Enforcement becomes optional or advisory
* Review friction removed instead of made explicit

---

## Phase Activation Gate

**Status:** ✅ ACTIVE

* Intent approved: ✅
* Exit conditions agreed: ✅
* STATUS.md updated: ✅ (pending)

This phase is now authorized. Work may proceed within scope boundaries only.

# Story of Emergence
# Re-Entry and Progress Continuity Protocol

**Invocation:**
Say or paste: "Run the Cold Re-Entry Progress Protocol."

## Purpose

Ensure that at any point in the future, the project can be re-entered, grounded, and resumed without relying on memory, intuition, or previous chat context.

This protocol defines the single source of truth loop for resuming work safely.

---

## When to Run This Protocol

Run this protocol if any of the following are true:
• You have not worked on the repo for more than 7 days
• You feel disoriented or unsure what is real vs assumed
• You are resuming after travel, illness, or burnout
• You are handing the repo to an assistant (Cursor or human)
• You are about to start a new phase or end scope freeze

This protocol always runs before any feature or refactor work.

---

## Step 1: Repository Truth Check (Mechanical)

Execute these commands verbatim:

```bash
git branch --show-current
git status --short
git log --oneline -10
```

Record results in a dated file:

`START_OF_DAY_YYYY-MM-DD.md`

No interpretation. Just facts.

---

## Step 2: Authority Reload (Cognitive)

Re-read only the following files, in this order:

1. `docs/0_START_HERE.md`
2. `docs/INVARIANTS.md`
3. `docs/POSTURE.md`
4. `docs/SANCTUARY_PRINCIPLES.md`
5. `docs/SCOPE.md`
6. `docs/PHASES.md`
7. `PHASE_X_COMPLETE.md` files (if present)
8. `WHAT_IS_BUILT.md`
9. `docs/STATUS.md`

**Rule:**
If any file contradicts your memory, the file wins.

---

## Step 2.5: Observation Language Gate

Before generating the progress report, confirm:

1. `docs/ARCHITECTURE_NOW.md` contains `Observation Language Invariant`
2. Run a quick repo search for these tokens in user-facing copy and record counts:

   * `recommended`
   * `important`
   * `significant`
   * `strongest`
   * `deserve`

3. For each match found, classify as:
   * OK (purely descriptive and non-evaluative)
   * Soft interpretation (risky)
   * Violation (must be fixed before new work)

Record results in START_OF_DAY file or PROGRESS_REPORT.

---

## Step 3: Ground Truth Progress Report (Delegated)

Ask Cursor to generate a Ground Truth Progress Report using the authority order above.

**Rules:**
• Cursor must cite file paths
• Cursor must not speculate
• Cursor must respect phase locks
• Cursor must list unfinished but allowed work

The output must be saved as:

`PROGRESS_REPORT.md`

This file becomes the checkpoint artifact.

---

## Step 4: Human Cockpit Briefing (You)

You must answer three questions in the Start of Day file:

### Allowed Work Today
One of:
• Stabilization
• Verification
• Cleanup
• Articulation
• No Code

### Intent for Today
One sentence maximum.
Example:
"Finish migration 024 and commit Yearly banner fix."

### Exit Condition
A binary condition.
Example:
"Migration applied, banner fix committed, no uncommitted changes."

**If you cannot answer these, do not code.**

---

## Step 5: Phase Lock Enforcement

Before writing code, explicitly confirm:

• Current active phase
• Whether scope freeze is active
• What is forbidden today

If unsure, default to no new features.

---

## Step 6: End of Day Seal

At the end of work, execute:

• Update START_OF_DAY file with outcomes
• Run End of Day Protocol
• Ensure git status is clean or intent is documented

If work is unfinished, write:
"What is safe to resume next time."

---

## Absolute Rules

• Memory is not a dependency
• Authority files outrank intuition
• Progress reports are artifacts, not vibes
• Phase locks are real constraints
• Silence is preferable to accidental drift

---

## Minimal Re-Entry Checklist (TL;DR)

If overwhelmed, do only this:

1. Read `PROGRESS_REPORT.md`
2. Read `docs/STATUS.md`
3. Answer Intent + Exit Condition
4. Touch nothing else

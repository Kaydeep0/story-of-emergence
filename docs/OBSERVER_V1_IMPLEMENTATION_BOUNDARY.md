# Observer v1 Implementation Boundary

**Status:** Implementation contract  
**Purpose:** Define blast radius control for Observer v1

This document defines what files Observer v1 is allowed to touch, what it may read, what it may never write, and where silence is enforced. This is boundary control, not logic specification.

---

## Files Observer v1 Is Allowed to Touch

Observer v1 may create or modify these files:

- **New file:** `src/app/lib/observer/patternSignature.ts`
  - Computes pattern signatures from distribution data
  - Exports `computePatternSignature()` function
  - Exports `PatternSignature` type

- **New file:** `src/app/lib/observer/patternIdentity.ts`
  - Implements pattern identity matching
  - Exports `patternsMatch()` function
  - Uses Pattern Signature Schema rules

- **New file:** `src/app/lib/observer/patternPersistence.ts`
  - Implements persistence recognition
  - Exports `recognizePersistence()` function
  - Enforces silence rule and conflict rule

- **New file:** `src/app/lib/observer/persistenceStatement.ts`
  - Generates persistence statements
  - Exports `generatePersistenceStatement()` function
  - Enforces Observer Speech Constraint

- **Modify:** `src/app/lib/insights/computeInsightsForWindow.ts`
  - Add optional call to `recognizePersistence()` after artifact computation
  - Attach persistence recognition results to artifact (if any)
  - Do not modify existing insight computation logic

- **Modify:** Lens pages (Weekly, Yearly, etc.)
  - Read persistence recognition results from artifact
  - Render persistence statements (if present)
  - Do not modify existing card rendering logic

---

## What Observer v1 May Read

Observer v1 may read:

- **Distribution data:** Results from `computeDistributionLayer()` calls
- **Insight artifacts:** `InsightArtifact` objects from Weekly, Monthly, Yearly lenses
- **Pattern signatures:** Computed signatures from any lens window
- **Window metadata:** Window start/end dates, lens names
- **Distribution classifications:** Observed distribution fits from existing classification logic

Observer v1 may not read:
- **Reflection content:** Plaintext, excerpts, or any reflection body text
- **User metadata:** Wallet addresses, user preferences, settings
- **External data:** Any data from sources outside the insight engine
- **Historical patterns:** Pattern memory, pattern narratives, or any stored pattern data

---

## What Observer v1 May Never Write

Observer v1 must never write:

- **Insight cards:** May not create, modify, or delete insight cards
- **Pattern narratives:** May not create or modify pattern narratives
- **Pattern memory:** May not write to pattern memory or pattern snapshots
- **User data:** May not write to any user data store
- **External storage:** May not write to database, local storage, or any persistent store
- **Debug telemetry:** May not modify existing debug telemetry (may add new fields to artifact.debug)

Observer v1 may only:
- **Attach recognition results:** Add persistence recognition results to existing `InsightArtifact` objects
- **Generate statements:** Create persistence statements (strings) for display
- **Compute signatures:** Create `PatternSignature` objects in memory

---

## Where Silence Is Enforced in Code

Silence is enforced in these locations:

- **`patternPersistence.ts`:** `recognizePersistence()` function
  - Returns `null` or empty array when silence rule conditions are met
  - Does not throw errors or log warnings when choosing silence
  - Silence is a return value, not an exception

- **`persistenceStatement.ts`:** `generatePersistenceStatement()` function
  - Returns `null` if no valid persistence recognition exists
  - Does not generate statements for ambiguous matches
  - Does not generate statements for single-window patterns

- **Lens pages:** Rendering logic
  - Checks for `null` or empty persistence results before rendering
  - Does not render placeholders or "no persistence detected" messages
  - Silence is absence, not a message

- **`computeInsightsForWindow.ts`:** Integration point
  - Calls `recognizePersistence()` but does not require non-null result
  - Attaches persistence results only if they exist
  - Does not modify artifact if persistence recognition returns null

---

## Integration Points

Observer v1 integrates at these specific points:

1. **After artifact computation:** In `computeInsightsForWindow.ts`, after all lens-specific artifacts are computed
2. **Before artifact return:** Before the final `InsightArtifact` is returned to the caller
3. **During rendering:** In lens pages, when reading `artifact.persistence` (if present)

Observer v1 does not integrate:
- During insight card generation
- During pattern narrative generation
- During distribution computation
- During event filtering or windowing

---

## File Dependencies

Observer v1 depends on:

- `src/app/lib/insights/distributionLayer.ts` (reads distribution results)
- `src/app/lib/insights/artifactTypes.ts` (reads `InsightArtifact` type)
- `src/app/lib/insights/computeInsightsForWindow.ts` (integration point)

Observer v1 does not depend on:
- `src/app/lib/insights/computeWeeklyArtifact.ts` (reads artifacts, not implementation)
- `src/app/lib/insights/computeYearlyArtifact.ts` (reads artifacts, not implementation)
- `src/app/lib/patternMemory/` (any pattern memory files)
- `src/app/lib/insights/validateInsight.ts` (separate concern)

---

## Blast Radius Summary

**Observer v1 may:**
- Create 4 new files in `src/app/lib/observer/`
- Modify `computeInsightsForWindow.ts` to attach persistence results
- Modify lens pages to read and render persistence statements
- Read distribution data and insight artifacts
- Compute pattern signatures and recognize persistence

**Observer v1 may not:**
- Modify insight card generation logic
- Modify pattern narrative generation
- Write to pattern memory or persistent storage
- Read reflection content or user metadata
- Create or modify insight cards

**Silence is enforced:**
- In `patternPersistence.ts` (returns null when silence rule applies)
- In `persistenceStatement.ts` (returns null for invalid persistence)
- In lens pages (does not render when persistence is null)

---

**This boundary prevents Observer v1 from affecting existing insight generation, pattern memory, or user data.**

**Observer v1 recognizes persistence. It does not generate insights or store patterns.**


# Story of Emergence — Next Tasks

Last updated: January 2, 2026

## Immediate Next Task

### Task: Verify and Migrate Summary Lens to Canonical Engine

**Goal:** Ensure Summary lens routes through `computeInsightsForWindow` instead of calling `computeSummaryInsights` directly.

**Current State:**
- Summary page (`src/app/insights/summary/page.tsx`) calls `computeSummaryInsights` directly
- Canonical engine (`computeInsightsForWindow`) has a stub for 'summary' horizon that returns empty cards
- Summary needs proper artifact generation similar to Weekly

**Files to Touch:**
1. `src/app/lib/insights/computeInsightsForWindow.ts` - Add `computeSummaryArtifact` function
2. `src/app/lib/insights/computeSummaryArtifact.ts` - Create new file (or add to existing)
3. `src/app/insights/summary/page.tsx` - Replace `computeSummaryInsights` call with `computeInsightsForWindow`

**What You Will NOT Touch:**
- Encryption primitives
- RLS policies
- Database schema
- Other insight pages (Timeline, Yearly, etc.)
- Distribution computation logic (only how it's called)

**Risk Check:**
- Low risk: Summary already works, this is a refactor to use canonical path
- Must preserve all existing Summary cards and behavior
- Must ensure artifact shape matches what Summary expects

**Success Checks:**
- `npm run typecheck` passes
- `npm run build` passes
- Summary page renders same cards as before
- Summary page uses `computeInsightsForWindow` with horizon `'summary'`
- No direct calls to `computeSummaryInsights` from Summary page

**Definition of Done:**
- Summary lens routes through canonical engine
- Summary artifact generated properly
- All Summary cards render correctly
- Typecheck and build pass
- No regression in Summary functionality

---

## Subsequent Tasks (In Order)

### Task 2: Migrate Timeline Lens to Canonical Engine
**Goal:** Timeline uses `computeInsightsForWindow` with horizon `'timeline'`
**Files:** `computeInsightsForWindow.ts`, create `computeTimelineArtifact.ts`, `src/app/insights/timeline/page.tsx`
**Risk:** Medium (Timeline has more complex card types)

### Task 3: Complete Share Preview = Export Contract
**Goal:** Share preview renders exactly what export/download produces
**Files:** Share rendering components, export functions
**Risk:** Low (UI consistency)

### Task 4: Add Platform Presets for Sharing
**Goal:** Pre-configured frame sizes and formats for different platforms
**Files:** Share components, share configuration
**Risk:** Low (new feature, additive)

### Task 5: Migrate Yearly, Lifetime, YoY to Canonical Engine (If Applicable)
**Goal:** Determine if these lenses should route through engine or remain separate
**Files:** Engine entry point, lens pages
**Risk:** High (architectural decision needed)

---

## Notes

- Do not start Task 2 until Task 1 is complete and verified
- Each task should be completed, tested, and committed before moving to next
- If a task reveals architectural issues, stop and document before proceeding


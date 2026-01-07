# Known Gaps

This document tracks intentional gaps in the current implementation. These are not bugs—they are deliberate scope boundaries.

**Rule:** Only document gaps that are acceptable right now. If a gap is blocking or critical, it should be fixed, not documented here.

---

## Summary Lens Evidence Chips Not Rendered

### What Is Missing

The Summary lens generates insight cards with `evidenceChips` attached (via `alwaysOnSummary` cards in `computeWeeklyArtifact.ts`), but the Summary page (`src/app/insights/summary/page.tsx`) does not render them.

**Technical details:**
- `EvidenceChips` component is not imported in Summary page
- No rendering logic for `card.evidenceChips` in Summary JSX
- `reflections` array is not passed to `computeInsightsForWindow`, so even if chips were rendered, the reflection lookup might fail
- Cards have `evidenceChips` data, but UI doesn't display it

**Expected behavior:**
- Summary cards should show 1-3 evidence chips below the explanation
- Clicking a chip should open the source reflection preview
- Same interaction pattern as Weekly lens

### Why It Is Acceptable Right Now

1. **Observer v0 scope was Weekly-first:** The contract explicitly lists Weekly lens as the primary integration point. Summary was listed as secondary, and the implementation prioritized Weekly stability.

2. **Cards still generate correctly:** The insight engine produces cards with `evidenceChips` attached. The gap is purely in the UI rendering layer, not in the data generation.

3. **No user-facing breakage:** Summary lens still functions correctly without evidence chips. Users can still read insights; they just can't click through to source reflections.

4. **Stability over completeness:** Observer v0 was declared complete with Weekly working. Adding Summary rendering would have delayed the v0 release marker.

### When It Should Be Revisited

**Phase:** Observer v0.1 (minor enhancement) or Observer v1 (if bundled with other improvements)

**Trigger conditions:**
- Weekly evidence chips are stable and verified
- No other Observer layer work is in progress
- User feedback indicates Summary chips would be valuable

**Not a blocker for:**
- Engine closure
- Cockpit work
- Other lens development
- Distribution layer work

---

**Last updated:** 2025-01-06  
**Status:** Known gap, intentionally deferred


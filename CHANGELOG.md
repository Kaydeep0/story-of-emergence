# Changelog

## 2026-01-05

Completed Insights suite consistency pass and finalized Threads invariants.
Insights lenses now render real computed output with reflections fallback and standardized Share actions across all pages.
Added `docs/INVARIANTS.md` to lock deterministic behavior, client only privacy boundaries, non prescriptive narrative language, coverage transparency, and the one brain many lenses architecture.

## [Insights v1] — 2026-01-03

### Added
- Completed full Insights suite:
  - Weekly
  - Summary
  - Timeline
  - Yearly
  - Distributions
  - Year over Year
  - Lifetime
- Implemented Lifetime v1 using the distribution layer with real metrics
- Standardized Share actions across all Insights lenses via `ShareActionsBar`

### Fixed
- Resolved Year over Year page hang by adding reflections fallback and proper state machine
- Removed placeholder and blocking render states across all Insights pages
- Fixed non-deterministic "Most Intense Day" selection by enforcing deterministic tie-breaking:
  - Sort by count descending
  - Then by date descending (most recent wins)

### Changed
- All Insights lenses now use the canonical `computeInsightsForWindow` engine
- Distribution-based insights now share a unified computation and rendering pipeline

### Stability
- All Insights pages render real computed output
- Empty states handled gracefully
- Deterministic data handling enforced
- Typecheck passing, no known regressions

This release marks the completion of **Insights v1**.


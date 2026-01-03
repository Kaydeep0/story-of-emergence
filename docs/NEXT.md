# Story of Emergence — Next Tasks

Last updated: January 2, 2026

---

## Priority Order

### 1. Documentation Discipline
- Keep `docs/SCOPE.md`, `docs/STATUS.md`, `docs/NEXT.md` accurate after every session

---

## Next Smallest Build Task

### Objective
Make sure every insight window routes through the canonical insight engine and no page calls recipe compute functions directly.

### Definition of Done
- Weekly, Summary, Yearly, Lifetime, Year over Year all use the engine entry point
- No `page.tsx` imports `computeTimelineSpikes` or `computeAlwaysOnSummary` directly
- `typecheck` passes
- `build` passes

### Files Likely Involved
- `src/app/lib/insightEngine.ts`
- `src/app/lib/insights/computeInsightsForWindow.ts`
- `src/app/insights/*` page components

### Smoke Checks
- Load each insights page without console errors
- Confirm narratives still render on weekly when present
- Confirm summary renders even when narratives are absent

---

## Current State

**Using Canonical Engine:**
- ✅ Weekly (`/insights/weekly`) - Uses `computeInsightsForWindow` with horizon `'weekly'`

**NOT Using Canonical Engine (Direct Compute):**
- ⚠️ Summary (`/insights/summary`) - Uses `computeSummaryInsights` directly
- ⚠️ Timeline (`/insights/timeline`) - Uses `computeTimelineInsights` directly
- ⚠️ Year over Year (`/insights/yoy`) - Uses `computeYearOverYearCard` directly
- ⚠️ Distributions (`/insights/distributions`) - Uses `computeDistributionLayer` directly
- ⚠️ Yearly (`/insights/yearly`) - Uses distribution compute directly
- ⚠️ Lifetime (`/insights/lifetime`) - Uses its own compute path

**Engine Status:**
- Engine exists: `src/app/lib/insights/computeInsightsForWindow.ts`
- Weekly horizon fully supported with pattern narratives
- Summary/Timeline horizons have stubs (empty cards, computed separately)
- Yearly/Lifetime/YoY horizons throw errors if called through engine

---

## Migration Strategy

1. **Start with Summary** - Most similar to Weekly, already has artifact generation
2. **Then Timeline** - More complex card types, but similar structure
3. **Then Yearly/Lifetime/YoY** - Determine if they should route through engine or remain separate

**Note:** Do not start next task until current task is complete and verified.

# Story of Emergence — Project Status

**Status date:** January 2, 2026

---

## Repo State

- **Branch expected:** `main`
- **Working tree expected:** clean
- **Typecheck:** passing
- **Build:** passing

---

## Verified Commands

- `npm run typecheck`
- `npm run build`
- `pnpm dev`

---

## Today Accomplished

### 1. Environment Stabilization
- Node 20 pinned
- Next 16 build stable with Turbopack

### 2. Production Readiness Check
- typecheck passes
- build passes

### 3. React Correctness Fix
- Lifetime page hooks moved to top to satisfy Rules of Hooks

### 4. Runtime Verification
- Dev server runs
- Insights pages respond
- Internal event logging endpoint responds

---

## Current Route Inventory

**Core Routes:**
- `/` - Home/Reflections view
- `/insights` - Redirects to `/insights/summary`
- `/insights/weekly` - Weekly lens (uses canonical engine)
- `/insights/summary` - Summary lens
- `/insights/timeline` - Timeline lens
- `/insights/yearly` - Yearly lens
- `/insights/yearly-wrap` - Yearly wrap view
- `/insights/distributions` - Distribution analysis
- `/insights/yoy` - Year over Year comparison
- `/insights/lifetime` - Lifetime signal inventory
- `/sources` - Sources list page
- `/sources/[sourceId]` - Source detail page
- `/shared` - Shared items landing
- `/shared/open` - Open capsule from URL param
- `/shared/open/[id]` - Open capsule by ID
- `/shared/wallet/[id]` - Wallet share page (stub)
- `/share/[capsuleId]` - Legacy share pack renderer
- `/share/year/[slug]` - Public year share page

**API Routes:**
- `/api/capsules` - Create capsule (POST)
- `/api/capsules/[capsuleId]` - Get capsule (GET)
- `/api/events/log` - Internal events logging (POST)
- `/api/summary` - Summary API endpoint
- `/api/timeline` - Timeline API endpoint

---

## Known Issues

- Port 3000 may already be in use if dev server is running when starting production server
- If `next start` fails with EADDRINUSE, stop dev server or change port

---

## How to Verify Tomorrow Morning

1. `git status` should be clean
2. `npm run typecheck` should pass
3. `npm run build` should pass
4. `pnpm dev` should start and load:
   - `/`
   - `/insights/weekly`
   - `/insights/summary`
   - `/insights/yearly`
   - `/insights/lifetime`
   - `/sources`
   - `/shared`

---

## Current State Summary

**Canonical Engine Status:**
- Engine exists: `src/app/lib/insights/computeInsightsForWindow.ts`
- Only Weekly lens routes through canonical engine ✅
- Summary, Timeline, Yearly, Lifetime, YoY, Distributions use direct compute functions
- Migration needed for all except Weekly

**Phase Status:**
- Phase 0 (Encrypted Ledger): COMPLETE and FROZEN
- Phase 1 + 1.5 (Observer & Insight Engine): COMPLETE
- Phase 2 (Distributions): FUNCTIONAL
- Phase 3 (Sharing Guardrails): PARTIALLY COMPLETE
- Phase 4.0 (Canonical Insight Architecture): PARTIALLY COMPLETE

**Next Task:** See `docs/NEXT.md` for detailed task breakdown.

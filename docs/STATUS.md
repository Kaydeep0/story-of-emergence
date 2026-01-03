# Story of Emergence — Project Status

Last updated: January 2, 2026

## One-sentence definition
Story of Emergence is a private, wallet-bound personal intelligence system that transforms encrypted, owner-controlled life data into time-based signals and narrative lenses, while allowing meaning to travel outward through derived artifacts without exposing the raw vault.

---

## What is DONE (locked and verified)

### Phase 0 — Encrypted Ledger (FOUNDATION)
Status: COMPLETE and FROZEN

- Wallet identity via RainbowKit + Wagmi
- Consent signature establishes encryption authority
- Session key derived deterministically from signature
- Client-side AES-GCM encryption and decryption
- Supabase stores ciphertext only (RLS locked to wallet)
- Reflections CRUD working end-to-end
- Soft delete / restore patterns in place
- Pagination, empty states, loading states, and toasts
- Export possible at all times

Outcome: Plaintext never touches the database. The vault is real.

---

### Phase 1 + 1.5 — Observer & Insight Engine Foundation
Status: COMPLETE

- Canonical InsightArtifact model exists
- Insight engine concept is real (not ad hoc scripts)
- Always-On Summary and early insight recipes exist
- Timeline spikes and evidence drawer logic exists
- Pattern extraction scaffolding exists
- Narrative pipeline exists and is wired

Outcome: Insights are a system, not one-off computations.

---

### Phase 2 — Distributions Layer
Status: FUNCTIONAL

- Distributions are a first-class concept in roadmap and UI
- Distributions tab exists
- Space-and-time framing is wired into navigation

Outcome: The product understands time and shape, not just entries.

---

### Phase 3 — Sharing Guardrails (Trust Layer)
Status: PARTIALLY COMPLETE

Completed:
- Sharing guardrails committed
- Disabled states and explanatory tooltips
- First-share confirmation
- Privacy language consistency
- Sharing treated as a trust event, not a casual button

Remaining:
- Preview = export rendering contract
- Platform frame presets
- Web Share integration with honest fallbacks

---

### Phase 4.0 — Canonical Insight Architecture (ENGINE CONSOLIDATION)
Status: PARTIALLY COMPLETE

**Completed:**
- Canonical orchestration path exists (`computeInsightsForWindow`)
- Insight engine is stable and functional
- Weekly lens routes through canonical engine ✅
- Hooks ordering issues resolved (LifetimePage fixed)
- No rules-of-hooks violations
- TypeScript clean
- `npm run dev`, `build`, and `start` all pass
- Node 20 pinned via `.nvmrc` and `package.json` engines
- Next.js upgraded to 16.1.1
- Lockfile refreshed under Node 20
- Documentation discipline established (SCOPE.md, STATUS.md, NEXT.md, CURSOR_RULES.md)

**Remaining:**
- Summary, Timeline, Yearly, Lifetime, YoY, Distributions still use direct compute functions
- Only Weekly lens fully routes through canonical engine
- Engine has stubs for Summary/Timeline (empty cards, computed separately)
- Yearly/Lifetime/YoY throw errors if called through engine

Outcome: Engine exists and works, but most views still bypass it. Migration needed.

---

## What is IN PROGRESS
- Phase 4 view parity verification (routing all views through engine)
- Phase 3 sharing polish (preview = export)

---

## Today's Accomplishments (January 2, 2026)

**Environment & Build:**
- ✅ Node 20 pinned via `.nvmrc` and `package.json` engines field
- ✅ Next.js upgraded to 16.1.1 with Turbopack
- ✅ Lockfile refreshed under Node 20 (removed pnpm-lock.yaml, using npm)
- ✅ Removed deprecated eslint config from `next.config.ts`
- ✅ `npm run dev` passes
- ✅ `npm run build` passes (verified)
- ✅ `npm run typecheck` passes

**Code Quality:**
- ✅ Fixed React rules-of-hooks violations in LifetimePage (moved all hooks to top)
- ✅ No remaining hook order errors
- ✅ TypeScript clean (no type errors)

**Documentation:**
- ✅ Created `docs/STATUS.md` - Project status snapshot
- ✅ Created `docs/SCOPE.md` - Complete scope inventory
- ✅ Created `docs/NEXT.md` - Prioritized next tasks
- ✅ Created `docs/CURSOR_RULES.md` - Behavior rules for AI assistance

**Verified Working Commands:**
```bash
# Verify Node version
node -v  # Should show v20.x.x

# Verify build
npm run typecheck  # Should pass with 0 errors
npm run build     # Should complete successfully
npm run dev       # Should start dev server

# Verify git state
git status         # Should show clean working tree
git log --oneline -5  # Should show recent commits
```

**Current Git State:**
- Branch: `main`
- Working tree: Clean (all changes committed)
- Recent commits:
  - `c93fc21` - docs: add Cursor behavior rules
  - `fd62f29` - docs: add project status snapshot
  - `5984463` - fix: move all hooks to top of LifetimePage
  - `711393c` - chore: refresh lockfile under node 20
  - `9582001` - chore: pin node 20 via .nvmrc

**How to Verify Tomorrow:**
1. Run `npm run typecheck` - should pass
2. Run `npm run build` - should complete successfully
3. Run `npm run dev` - should start without errors
4. Check `git status` - should be clean
5. Verify routes load: `/insights/weekly`, `/insights/summary`, `/insights/timeline`

---

## What is NEXT (in order)

See `docs/NEXT.md` for detailed task breakdown.

**Immediate Next Task:**
Migrate Summary lens to canonical engine (replace `computeSummaryInsights` direct call with `computeInsightsForWindow`).

**Subsequent Tasks:**
1. Migrate Timeline lens to canonical engine
2. Complete share preview = export contract
3. Add platform presets for sharing
4. Determine if Yearly/Lifetime/YoY should route through engine or remain separate

---

## Non-negotiable system principles (locked)
- Wallet equals identity
- Consent signature equals authority
- All user data encrypted client-side
- Supabase stores ciphertext only
- All insights computed locally
- No server-side inference
- Sharing defaults to derived artifacts only


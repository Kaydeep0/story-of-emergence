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
Status: COMPLETE AND VERIFIED

- Canonical orchestration path exists
- Insight engine is stable
- Views no longer depend on fragile ad-hoc compute paths
- Hooks ordering issues resolved (LifetimePage fixed)
- No rules-of-hooks violations
- TypeScript clean
- `npm run dev`, `build`, and `start` all pass
- Node 20 pinned via `.nvmrc`
- Next.js upgraded to 16.1.1
- Lockfile refreshed under Node 20

Outcome: This is now an engine, not a collection of pages.

---

## What is IN PROGRESS
- Phase 3 sharing polish (preview = export)
- Phase 4 view parity verification (routing all views through engine)

---

## What is NEXT (in order)

1. Verify Summary, Yearly, Lifetime, and YoY views all route through the canonical insight engine
2. Remove any remaining view-level compute duplication
3. Complete share preview = export contract
4. Add platform presets for sharing
5. Polish Yearly Wrap experience

---

## Non-negotiable system principles (locked)
- Wallet equals identity
- Consent signature equals authority
- All user data encrypted client-side
- Supabase stores ciphertext only
- All insights computed locally
- No server-side inference
- Sharing defaults to derived artifacts only


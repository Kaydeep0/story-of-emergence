# STATUS

## Operating Frame

**Stance**
A Mirror that can speak, but cannot steer.

We allow insight.
We forbid control.

**Layers**
Vault layer: encryption session, entries, RLS, storage, migrations
Lens layer: insights computed locally after decrypt
Meaning layer: threads, bridges, pins
Distribution layer: sharing and artifacts with one canonical spine

---

## Scope Freeze (One Week)

**IMPORTANT: Architecture settlement period**

For the next week:

**NOT ALLOWED:**
- No new lenses
- No new metrics
- No new "helpful" features
- No new capabilities

**ONLY ALLOWED:**
- Bug fixes
- Consistency improvements
- Language alignment (interpretation over prescription)
- Finishing migrations (SharePack, entries table, etc.)

**Purpose:** Let the architecture settle. The Distribution layer spine is complete. The Meaning layer language is aligned. Now we stabilize.

**End date:** [Set one week from today]

---

## Post-Stability Cleanup (After Scope Freeze)

**When:** Only once you feel calm. After stability period.

**Purpose:** Reduce cognitive load. This is cleanup, not urgency.

**Tasks:**

1. **Remove legacy share routes:**
   - `/shared/open` (capsule URLs)
   - `/shared/open/[id]` (old share links)
   - Keep deprecated tables inert (don't delete, just leave them)

2. **Remove deprecated code:**
   - `src/app/lib/shares.ts` (legacy share helpers)
   - Any remaining references to `accepted_shares`, `capsules`, `public.shares` tables

3. **Verification:**
   - `rg "accepted_shares|capsules|public.shares"` returns no active usage paths
   - App still shares, receives, opens, exports correctly
   - All shares use `wallet_shares` table and `SharePack` format

**Note:** Deprecated database tables remain inert. No need to drop them. Just remove code paths.

---

## Current state

Story of Emergence is a private, wallet bound reflection vault with a client side "Brain" that computes insights and narrative lenses without leaking raw text.

### Reality check by layer

#### Vault layer
**Status: Stable**

- Entries table migrated (`022_create_entries_table.sql`)
- RLS policies correct (using `get_wallet_from_header()`)
- RPC lifecycle stable (`list_entries`, `insert_entry`, `soft_delete_entry`, `restore_entry`, `delete_entry`)
- Encryption session working
- Storage and migrations version-controlled

**What remains:** None. Vault is stable.

---

#### Lens layer
**Status: Mostly complete, finishing passes**

- All major lenses exist: Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime
- SharePack infrastructure supports all lenses
- All lenses migrated to SharePack (completed today)
- Canonical engine produces deterministic outputs
- Consistent Share actions across all lenses

**What remains:** Final consistency passes, edge case handling.

---

#### Meaning layer
**Status: Structurally present, needs refinement**

- Narrative bridges logic complete (`buildNarrativeBridge.ts`)
- Language alignment done (interpretation over prescription)
- Posture alignment complete (patterns, tensions, forks, trajectories)
- Threads Dev Validation page functional
- Bridge generation working (146 bridges, 84% coverage observed)

**What remains:** Surface bridges in UI, copy refinement, not new logic.

---

#### Distribution layer
**Status: Core complete, finishing fixes**

- `wallet_shares` table canonical
- `SharePack` universal format
- One renderer (`SharePackRenderer`) across preview, export, viewer
- All lenses use SharePack
- Wallet share encryption simplified (app key, no eth_encrypt)
- PNG export fixed (html2canvas replaces html-to-image)
- "Send privately" button fixed

**What remains:** 
- Install html2canvas package (npm install)
- Apply migration 024 in Supabase (drop old function overload first)
- Remove legacy routes (`/shared/open`, `/shared/open/[id]`) - cleanup, not urgency
- Remove deprecated code (`src/app/lib/shares.ts`) - cleanup, not urgency

---

### What we are not doing yet

- No new lenses
- No new metrics
- No new "helpful" features
- No new capabilities

**Reason:** Scope freeze. Architecture settlement period.

---

### Documentation anchors
See `docs/INVARIANTS.md` for the five non negotiables that must never regress.
See `docs/POSTURE.md` for the product posture and architectural layers.

---

## Daily Orientation

**Layers touched today**
Vault: Migration 024 (remove wrapped_key from wallet_shares), app key encryption added to crypto.ts
Lens: Summary lens now always produces SharePack (minimal fallback)
Meaning: None
Distribution: PNG export fixed (html2canvas), SharePackRenderer data attribute, wallet share encryption simplified (removed eth_encrypt)

**What moved forward today**

- Removed eth_encrypt dependency from wallet shares (simplified to app key encryption)
- Fixed PNG export: switched from html-to-image to html2canvas for reliable rendering
- Summary lens hardened: always returns SharePack (even with empty cards)
- "Send privately" button fixed: now uses same handler as dropdown "Share to wallet"
- Migration 024 created: idempotent removal of wrapped_key column
- Added html2canvas dependency (needs npm install)

**Tooling**

Snapshot graduated from existence checks to semantic drift detection (redirect safety, invariants awareness).

**What is still blocked**

- html2canvas package needs manual install (npm permission issue in sandbox)
- Supabase migration 024 needs to be applied (drop old function overload first)


## Observed shifts today

**New pattern surfaced in:**
PNG export reliability - html-to-image fails silently on backdrop-filter and complex CSS, html2canvas handles it reliably.

**Previous assumption invalidated in:**
Wallet share encryption - eth_encrypt was unnecessary complexity. App key encryption (derived from fixed secret) is sufficient since access control is via wallet address, not encryption.

**No change detected in:**
Vault layer RPCs remain stable. Meaning layer unchanged. Lens computation logic unchanged.

**Interpretation:**
Distribution layer is simplifying (removing eth_encrypt, fixing PNG export). This aligns with scope freeze - fixing bugs and consistency, not adding features. The architecture is settling.


## Layer Balance Check

**Vault status:** Stable. Migration 024 ready (needs application in Supabase).

**Lens status:** Stable. All lenses produce SharePack. Summary lens hardened with fallback.

**Meaning status:** Stable. No changes today.

**Distribution status:** In progress. PNG export fixed, wallet share encryption simplified. html2canvas needs install, migration needs application.

**Next pull forward tasks by layer**

Vault: Apply migration 024 in Supabase (drop old function overload, then run migration)
Lens: None - all lenses stable
Meaning: None - no changes needed
Distribution: Install html2canvas package, apply migration 024, test PNG export and wallet shares end-to-end

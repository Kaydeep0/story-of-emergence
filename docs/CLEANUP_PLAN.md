# Legacy Cleanup Plan

**Purpose:** Explicit plan for removing legacy code paths after architecture stabilization.  
**Status:** Frozen intent. Do not renegotiate.  
**Last Updated:** 2026-01-06

---

## What is Considered Legacy

### Routes (Next.js App Router)

1. **`src/app/shared/open/page.tsx`**
   - Legacy capsule opening route
   - Handles old capsule URL format
   - Replaced by: `/shared/wallet/[id]` (canonical wallet_shares route)

2. **`src/app/shared/open/[id]/page.tsx`**
   - Legacy share link opening route
   - Uses deprecated `shares` table via `rpcGetShare`
   - Replaced by: `/shared/wallet/[id]` (canonical wallet_shares route)

### Code Libraries

3. **`src/app/lib/shares.ts`**
   - Legacy share helpers targeting deprecated `shares` table
   - Functions: `rpcInsertShare`, `rpcFetchShares`, `rpcGetShare`, `rpcDeleteShare`
   - Types: `ShareRow`, `ShareCapsule`
   - Replaced by: `src/app/lib/wallet_shares.ts` (canonical wallet-to-wallet sharing)

### Database Tables (Inert, Not Deleted)

4. **`public.shares`** (migration 003)
   - Legacy share storage table
   - Status: Inert, no active writes
   - Action: Leave in database, remove all code references

5. **`public.accepted_shares`** (migration 003)
   - Legacy accepted share storage
   - Status: Inert, no active writes
   - Action: Leave in database, remove all code references

6. **`public.capsules`** (migration 010)
   - Legacy capsule storage
   - Status: Inert, no active writes
   - Action: Leave in database, remove all code references

### Types and Functions (Code References)

7. **`AcceptedShare` type** (if exists in `src/lib/sharing.ts`)
   - Legacy type definition
   - Action: Remove type definition and all references

8. **`buildCapsuleUrl` function** (if exists)
   - Legacy URL builder for capsules
   - Action: Remove function and all call sites

### API Routes (If Any)

9. **`src/app/api/capsules/route.ts`** (if exists)
   - Legacy capsule API endpoint
   - Action: Delete file

10. **`src/app/api/capsules/[capsuleId]/route.ts`** (if exists)
    - Legacy capsule detail API endpoint
    - Action: Delete file

---

## Why It Still Exists

### Migration Safety

- **Backward compatibility:** Old share links and capsule URLs may still be in circulation
- **Zero-downtime migration:** Users with bookmarked links should not hit 404s during transition
- **Data preservation:** Existing shares in legacy tables remain accessible until migration window closes

### Current State

- **Canonical system active:** `wallet_shares` table and `SharePack` format are the only active paths
- **Legacy paths inert:** Old routes exist but are not actively linked or promoted
- **No new usage:** All new sharing uses canonical `wallet_shares` + `SharePack` system

### Risk Assessment

- **Low risk:** Legacy routes are orphaned (not actively referenced in code)
- **User impact:** Minimal - only affects users with very old bookmarked links
- **Data safety:** Legacy tables remain in database, data is preserved

---

## Exact Deletion Order

### Phase 1: Remove Route Files

**Order matters:** Remove routes first to prevent accidental usage.

1. Delete `src/app/shared/open/page.tsx`
   - Verify: No imports of this file exist
   - Verify: No navigation links to `/shared/open` exist

2. Delete `src/app/shared/open/[id]/page.tsx`
   - Verify: No imports of this file exist
   - Verify: No navigation links to `/shared/open/[id]` exist

### Phase 2: Remove Code Libraries

3. Delete `src/app/lib/shares.ts`
   - Verify: No imports of `rpcGetShare`, `rpcInsertShare`, `rpcFetchShares`, `rpcDeleteShare`
   - Verify: No references to `ShareRow` or `ShareCapsule` types

### Phase 3: Clean Up Type Definitions

4. Remove `AcceptedShare` type from `src/lib/sharing.ts` (if exists)
   - Verify: No references to `AcceptedShare` type

5. Remove `buildCapsuleUrl` function from `src/lib/sharing.ts` (if exists)
   - Verify: No call sites for `buildCapsuleUrl`

### Phase 4: Remove API Routes (If Any)

6. Delete `src/app/api/capsules/route.ts` (if exists)
   - Verify: No API calls to `/api/capsules`

7. Delete `src/app/api/capsules/[capsuleId]/route.ts` (if exists)
   - Verify: No API calls to `/api/capsules/[id]`

### Phase 5: Final Verification

8. Run verification checks:
   ```bash
   # Should return no active usage
   rg "accepted_shares|capsules|public.shares" src/
   rg "rpcGetShare|rpcInsertShare|ShareRow|ShareCapsule" src/
   rg "buildCapsuleUrl|AcceptedShare" src/
   ```

9. Verify app functionality:
   - Sharing works via `wallet_shares` table
   - Receiving shares works via `/shared/wallet/[id]`
   - PNG export works
   - All lenses can share via `SharePack`

10. Update documentation:
    - Remove references to legacy routes in any docs
    - Update `docs/SHARING_DEPRECATION.md` to mark cleanup complete

---

## Trigger Condition

### Primary Trigger: Post-Stability Period

**Condition:** Cleanup may begin only after:

1. **Scope freeze period ends** (one week minimum)
2. **Architecture is stable** (no breaking changes for 7+ days)
3. **Canonical system verified** (all sharing uses `wallet_shares` + `SharePack`)
4. **No active issues** (no critical bugs in sharing system)

### Secondary Trigger: External User Milestone

**Alternative condition:** If external users exist:

- Wait 30 days after first external user shares content
- Ensures backward compatibility window for real users
- Then proceed with cleanup

### Decision Rule

**Do not proceed if:**
- Scope freeze is still active
- Recent breaking changes (< 7 days)
- Active bugs in sharing system
- Uncertainty about canonical system stability

**Proceed when:**
- All trigger conditions met
- You feel calm and intentional (not rushed)
- You have time for careful verification

---

## What Stays (Database Tables)

**Important:** These database tables remain in the database:

- `public.shares` (migration 003)
- `public.accepted_shares` (migration 003)
- `public.capsules` (migration 010)

**Why:** Data preservation. No need to drop tables. They are inert (no writes, no reads from active code paths).

**Action:** Leave tables in database. Only remove code references.

---

## Notes

- **This is cleanup, not urgency:** Do this when you feel calm and intentional
- **No renegotiation:** This plan is frozen. Do not add new legacy items without updating this document first
- **Verification is mandatory:** Never skip verification steps
- **One phase at a time:** Complete each phase fully before moving to the next
- **Document as you go:** Update this file when cleanup is complete

---

## Completion Checklist

- [ ] Phase 1: Route files deleted
- [ ] Phase 2: Code libraries deleted
- [ ] Phase 3: Type definitions cleaned
- [ ] Phase 4: API routes deleted (if any)
- [ ] Phase 5: Verification passed
- [ ] Documentation updated
- [ ] This file marked complete

**Completion Date:** _[To be filled when cleanup is done]_


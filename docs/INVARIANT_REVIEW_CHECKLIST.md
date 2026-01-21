# Invariant Review Checklist

**Purpose:** Make invariant compliance explicit and unavoidable in every PR.

**Usage:** Every PR must acknowledge compliance with each invariant below. A reviewer can block a PR without reading code if any invariant is unchecked or marked non-compliant.

---

## How to Use This Checklist

1. **PR Author:** Check each invariant box and provide evidence (file paths, test results, or explicit statement)
2. **Reviewer:** Verify evidence matches the claim. If evidence is missing or insufficient, request clarification or block.

**Blocking Rule:** If any invariant is unchecked or marked non-compliant without justification, the PR must be blocked.

---

## Invariant Compliance Checklist

### ✅ 1. Deterministic Output for Same Input

**Rule:** Bridge generation must produce identical results for identical inputs.

**What must be verified:**
- No `Math.random()` or `Date.now()` used in bridge generation
- No non-deterministic sorting or selection
- All weights are constants, not runtime variables

**Where violation appears:**
- `src/app/lib/meaningBridges/buildNarrativeBridge.ts`
- Any file that generates bridges or insights
- Test files that verify determinism

**Reviewer confirmation:**
- [ ] PR description states "Deterministic behavior verified" OR
- [ ] Test file included that runs same input twice and compares results OR
- [ ] No changes to bridge generation logic OR
- [ ] Explicit statement: "No bridge generation code modified"

**Evidence provided:** _[PR author fills this]_

---

### ✅ 2. No Raw Text Leaves Client

**Rule:** No plaintext reflection content, bridge explanations, or user data may be transmitted to the server or stored server-side.

**What must be verified:**
- All reflection entries encrypted before RPC calls
- No `plaintext` columns added to any table
- No unencrypted data in API endpoints
- No server-side logging of decrypted content

**Where violation appears:**
- `src/app/lib/entries.ts` (RPC calls)
- `src/app/lib/meaningBridges/*` (bridge encryption)
- `supabase/migrations/*` (schema changes)
- `src/app/api/**` (API routes)

**Reviewer confirmation:**
- [ ] PR description states "Client-side encryption verified" OR
- [ ] No changes to encryption/decryption paths OR
- [ ] Migration files reviewed for `plaintext` columns OR
- [ ] Explicit statement: "No plaintext data paths modified"

**Evidence provided:** _[PR author fills this]_

---

### ✅ 3. No Prescriptive Language

**Rule:** Bridge explanations must never contain prescriptive language or deterministic future claims.

**What must be verified:**
- All bridge explanations pass through `sanitizeExplanationLanguage()`
- No "you should", "you must", "you need to" patterns
- No future claims ("will", "leads to") without past tense conversion

**Where violation appears:**
- `src/app/lib/meaningBridges/buildNarrativeBridge.ts`
- Any file that generates user-facing text
- UI copy files

**Reviewer confirmation:**
- [ ] PR description states "Prescriptive language scan passed" OR
- [ ] No changes to bridge explanation generation OR
- [ ] Observation language scan run and passed OR
- [ ] Explicit statement: "No user-facing text modified"

**Evidence provided:** _[PR author fills this]_

---

### ✅ 4. No Silent Data Exclusion

**Rule:** The system must never silently exclude reflections from bridge generation or insight computation without explicit logging and user visibility.

**What must be verified:**
- Coverage checks run after bridge generation
- Orphan reflections logged if coverage < 85%
- Filtering logic logs counts and reasons
- No silent failures

**Where violation appears:**
- `src/app/threads/page.tsx` (bridge generation)
- `src/app/lib/insights/computeInsightsForWindow.ts` (insight computation)
- Any filtering or exclusion logic

**Reviewer confirmation:**
- [ ] PR description states "Coverage logging verified" OR
- [ ] No changes to filtering/exclusion logic OR
- [ ] Logging statements added for any new filtering OR
- [ ] Explicit statement: "No reflection filtering modified"

**Evidence provided:** _[PR author fills this]_

---

### ✅ 5. One Brain, Many Lenses

**Rule:** There is one canonical data store (encrypted reflections), but multiple views and interpretations.

**What must be verified:**
- No computed insights stored in `entries` table
- No modification of source reflection data
- All views derive from `entries` table
- No duplication of reflection content

**Where violation appears:**
- `supabase/migrations/*` (schema changes)
- `src/app/lib/insights/*` (insight computation)
- Any file that writes to database tables

**Reviewer confirmation:**
- [ ] PR description states "Single source of truth maintained" OR
- [ ] No schema changes to `entries` table OR
- [ ] No new tables that duplicate reflection content OR
- [ ] Explicit statement: "No data model changes"

**Evidence provided:** _[PR author fills this]_

---

### ✅ 6. Vault Invariants

**Rule:** The Vault layer (entries storage and RPC surface) must maintain strict invariants for security, consistency, and discoverability.

**What must be verified:**
- Entries RPCs are append-first, wallet-scoped
- No RPC takes raw entry text (only encrypted ciphertext)
- All mutations require wallet header validation
- Historical migrations (001-022) not edited
- New migrations follow 023+ numbering

**Where violation appears:**
- `supabase/migrations/*` (migration files)
- `src/app/lib/entries.ts` (RPC calls)
- Any new RPC function definitions

**Reviewer confirmation:**
- [ ] PR description states "Vault invariants respected" OR
- [ ] No migration files modified (only new ones added) OR
- [ ] New migrations follow 023+ pattern OR
- [ ] Explicit statement: "No Vault layer changes"

**Evidence provided:** _[PR author fills this]_

---

## Summary

**Total Invariants:** 6

**Compliant:** ☐ All ☐ Partial (explain below) ☐ None (PR must be blocked)

**Non-Compliant Invariants (if any):**
- _[List invariant numbers and justification]_

---

## Reviewer Decision

**Reviewer:** _[Name]_

**Decision:** ☐ Approved ☐ Blocked ☐ Needs Clarification

**Notes:** _[Any additional context]_

---

**This checklist must be completed for every PR. Incomplete checklists block merge.**

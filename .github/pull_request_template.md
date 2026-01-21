# Pull Request

## Description

_[Brief description of changes]_

---

## Invariant Compliance Checklist

**⚠️ Unchecked invariants block merge.**

Every PR must acknowledge compliance with each invariant below. A reviewer can block a PR without reading code if any invariant is unchecked or marked non-compliant.

### ✅ 1. Deterministic Output for Same Input

**Rule:** Bridge generation must produce identical results for identical inputs.

- [ ] PR description states "Deterministic behavior verified" OR
- [ ] Test file included that runs same input twice and compares results OR
- [ ] No changes to bridge generation logic OR
- [ ] Explicit statement: "No bridge generation code modified"

**Evidence:** _[PR author fills this]_

---

### ✅ 2. No Raw Text Leaves Client

**Rule:** No plaintext reflection content, bridge explanations, or user data may be transmitted to the server or stored server-side.

- [ ] PR description states "Client-side encryption verified" OR
- [ ] No changes to encryption/decryption paths OR
- [ ] Migration files reviewed for `plaintext` columns OR
- [ ] Explicit statement: "No plaintext data paths modified"

**Evidence:** _[PR author fills this]_

---

### ✅ 3. No Prescriptive Language

**Rule:** Bridge explanations must never contain prescriptive language or deterministic future claims.

- [ ] PR description states "Prescriptive language scan passed" OR
- [ ] No changes to bridge explanation generation OR
- [ ] Observation language scan run and passed OR
- [ ] Explicit statement: "No user-facing text modified"

**Evidence:** _[PR author fills this]_

---

### ✅ 4. No Silent Data Exclusion

**Rule:** The system must never silently exclude reflections from bridge generation or insight computation without explicit logging and user visibility.

- [ ] PR description states "Coverage logging verified" OR
- [ ] No changes to filtering/exclusion logic OR
- [ ] Logging statements added for any new filtering OR
- [ ] Explicit statement: "No reflection filtering modified"

**Evidence:** _[PR author fills this]_

---

### ✅ 5. One Brain, Many Lenses

**Rule:** There is one canonical data store (encrypted reflections), but multiple views and interpretations.

- [ ] PR description states "Single source of truth maintained" OR
- [ ] No schema changes to `entries` table OR
- [ ] No new tables that duplicate reflection content OR
- [ ] Explicit statement: "No data model changes"

**Evidence:** _[PR author fills this]_

---

### ✅ 6. Vault Invariants

**Rule:** The Vault layer (entries storage and RPC surface) must maintain strict invariants for security, consistency, and discoverability.

- [ ] PR description states "Vault invariants respected" OR
- [ ] No migration files modified (only new ones added) OR
- [ ] New migrations follow 023+ pattern OR
- [ ] Explicit statement: "No Vault layer changes"

**Evidence:** _[PR author fills this]_

---

## Summary

**Total Invariants:** 6

**Compliant:** ☐ All ☐ Partial (explain below) ☐ None (PR must be blocked)

**Non-Compliant Invariants (if any):**
- _[List invariant numbers and justification]_

---

## Reviewer Notes

**Reviewer:** _[Name]_

**Decision:** ☐ Approved ☐ Blocked ☐ Needs Clarification

**Notes:** _[Any additional context]_

---

**This checklist must be completed for every PR. Incomplete checklists block merge.**

See `docs/INVARIANT_REVIEW_CHECKLIST.md` for full details.

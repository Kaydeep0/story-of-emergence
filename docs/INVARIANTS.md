# System Invariants

**DO NOT VIOLATE THESE RULES.**

These invariants define what must always be true about Story of Emergence. They are non-negotiable guarantees that ensure trust, privacy, and correctness. Any code change that violates these invariants is a regression and must be rejected.

---

## 1. Deterministic Output for Same Input

**Rule**: Bridge generation must produce identical results for identical inputs.

**Why**: Trust requires reproducibility. If the same reflection history produces different bridges on different runs, users cannot validate or trust the system.

**Enforcement**:
- Bridge generation functions must be pure (no random number generation, no time-based seeds)
- All heuristic weights must be configurable constants, not runtime variables
- Hash-based de-duplication must use deterministic hashing
- Type balance adjustments must be deterministic (use hash-based selection, not random)

**Violation Examples**:
- ❌ Using `Math.random()` in bridge generation
- ❌ Using `Date.now()` as a seed for any calculation
- ❌ Non-deterministic sorting of candidates
- ❌ Random selection of alternate framings

**Correct Patterns**:
- ✅ Use `hashString()` for deterministic selection
- ✅ Sort by weight, then by stable ID
- ✅ Use fixed weights from `DEFAULT_BRIDGE_WEIGHTS`
- ✅ Use deterministic hash-based alternate framing selection

---

## 2. No Raw Text Leaves Client

**Rule**: No plaintext reflection content, bridge explanations, or user data may be transmitted to the server or stored server-side.

**Why**: Privacy is non-negotiable. All sensitive data must be encrypted client-side before leaving the browser.

**Enforcement**:
- All reflection entries must be encrypted via `aesGcmEncryptText()` before calling any RPC function
- All bridge payloads must be encrypted before `upsertNarrativeBridgeEncrypted()`
- All share capsules must be encrypted before `insert_share()`
- Server-side tables store only `ciphertext` columns (never `plaintext`)
- RLS policies must never expose decrypted content

**Violation Examples**:
- ❌ Storing `plaintext` column in any table
- ❌ Sending unencrypted reflection text to any API endpoint
- ❌ Logging decrypted content server-side
- ❌ Exposing plaintext in RPC function return values

**Correct Patterns**:
- ✅ Encrypt with `aesGcmEncryptText()` before any `supabase.rpc()` call
- ✅ Store only `ciphertext` in database columns
- ✅ Decrypt only client-side using `decryptJSON()`
- ✅ Use `wallet_address` and timestamps as plaintext metadata only

**Architecture Reference**: See `docs/ARCHITECTURE.md` sections 2.3 (Crypto Envelope Format) and 2.4 (Storage Layer).

---

## 3. No Prescriptive Language

**Rule**: Bridge explanations must never contain prescriptive language or deterministic future claims.

**Why**: Insights must feel reflective, not instructive. The system observes patterns, it does not prescribe actions.

**Enforcement**:
- All bridge explanations must pass through `sanitizeExplanationLanguage()`
- Prescriptive patterns must be removed: "you should", "you must", "you need to", "you ought to", "you have to"
- Future claims must be converted to past tense: "will" → "did", "leads" → "led"
- Explanations must use observational framing only

**Violation Examples**:
- ❌ "You should consider this differently"
- ❌ "This will lead to better outcomes"
- ❌ "You must understand that..."
- ❌ "This needs to change"

**Correct Patterns**:
- ✅ "You changed your mind about this"
- ✅ "This led to a different perspective"
- ✅ "You saw this differently the second time"
- ✅ "You kept thinking about scale and where it led"

**Implementation**: See `src/app/lib/meaningBridges/buildNarrativeBridge.ts` function `sanitizeExplanationLanguage()`.

---

## 4. No Silent Data Exclusion

**Rule**: The system must never silently exclude reflections from bridge generation or insight computation without explicit logging and user visibility.

**Why**: Users must understand why reflections are not connected. Silent exclusion erodes trust and makes debugging impossible.

**Enforcement**:
- Coverage checks must run after bridge generation
- Orphan reflections (unconnected reflections) must be logged
- Coverage warnings must be surfaced if coverage < 85%
- Filtering logic must log counts: total loaded, eligible, skipped (with reasons)
- Undecryptable entries, highlights, and test entries must be explicitly filtered and logged

**Violation Examples**:
- ❌ Filtering reflections without logging why
- ❌ Generating bridges without coverage check
- ❌ Hiding orphan reflections from logs
- ❌ Silent failures in bridge generation

**Correct Patterns**:
- ✅ Log `[bridge-gen] Filtered reflections: { totalLoaded, totalEligible, skipped: { undecryptable, highlight, systemTest } }`
- ✅ Calculate and log `coveragePercent` after generation
- ✅ Log `orphanReflections` array if coverage < 85%
- ✅ Surface coverage warnings in UI success banner

**Implementation**: See `src/app/threads/page.tsx` `generateBridges()` function for coverage checks and logging.

---

## 5. One Brain, Many Lenses

**Rule**: There is one canonical data store (encrypted reflections), but multiple views and interpretations (Raw View, Observer View, Narrative View, Sharing).

**Why**: Data integrity requires a single source of truth. Different lenses provide different perspectives without duplicating or modifying source data.

**Enforcement**:
- All views derive from the same encrypted `entries` table
- No view modifies source reflection data
- Insights are computed on-demand from decrypted reflections
- Bridges are derived artifacts stored separately, never modifying source reflections
- Each lens (Raw, Observer, Narrative, Sharing) reads from the same source

**Violation Examples**:
- ❌ Storing computed insights in the `entries` table
- ❌ Modifying reflection plaintext based on bridge generation
- ❌ Creating separate tables for each view's data
- ❌ Duplicating reflection content across tables

**Correct Patterns**:
- ✅ Store reflections once in `entries` table (encrypted)
- ✅ Compute insights on-demand via `computeInsightsForWindow()`
- ✅ Store bridges separately in `reflection_link_bridges` table
- ✅ Store derived artifacts (pins) separately in `pins` table
- ✅ All views read from `entries`, compute their own perspective

**Architecture Reference**: See `docs/ARCHITECTURE.md` section 2.6 (Insights Engine Pipeline) and 2.8 (Graph and Links Layer).

---

## How to Use This Document

### For Code Reviews

Before approving any PR, verify:
1. Does this change maintain deterministic output? (Check for randomness, time-based logic)
2. Does this change preserve client-side encryption? (Verify all sensitive data is encrypted before transmission)
3. Does this change avoid prescriptive language? (Check explanation generation)
4. Does this change log exclusions? (Verify coverage checks and orphan logging)
5. Does this change respect the one-brain principle? (Verify no source data modification)

### For New Features

When adding new features:
- **Bridge generation**: Must be deterministic, must sanitize language, must check coverage
- **Data storage**: Must encrypt client-side, must store only ciphertext server-side
- **New views**: Must derive from `entries` table, must not duplicate source data
- **Filtering logic**: Must log what is excluded and why

### For Debugging

If bridges seem wrong:
1. Check deterministic output: Run generation twice, compare results
2. Check prescriptive language: Review explanation text for violations
3. Check coverage: Verify orphan reflections are logged
4. Check encryption: Verify no plaintext in network requests

If performance degrades:
1. Check performance snapshots: Review `[bridge-perf]` logs
2. Check coverage: High orphan count may indicate threshold issues
3. Check de-duplication: Verify duplicate removal is working

---

## Related Documentation

- `docs/ARCHITECTURE.md` - System architecture and data flow
- `docs/SCOPE.md` - Product definition and non-negotiable guarantees
- `docs/STATUS.md` - Current project phase and completion status
- `docs/CURSOR_RULES.md` - Agent rules and decision discipline

---

**Last Updated**: 2024-01-15  
**Maintained By**: Engineering Team  
**Review Frequency**: Before every major release


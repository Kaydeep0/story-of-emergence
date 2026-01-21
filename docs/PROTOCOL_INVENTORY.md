# Development Protocol Inventory

**Generated:** 2026-01-20  
**Purpose:** Extract all explicit and implicit development protocols, rules, and invariants from the repository

---

## 1. Daily Work Protocols

### 1.1 Start of Day Protocol
**File:** `docs/PROTOCOL_START_OF_DAY.md`

**Trigger Condition:**
- Beginning of any work session
- Must run before any code changes

**Required Actions:**
- Run Re-Entry Gate check (if >7 days inactive, uncertain about phase, or handing control to assistant)
- Repository state check (branch, uncommitted changes, build status)
- Canonical alignment check (review `docs/0_START_HERE.md`, confirm engine state)
- Observation Language Check (confirm invariant active, run scan if UI work)
- Define Intent for Today (class of work: Stabilization, Articulation, Verification, Cleanup)
- Define Exit Condition (binary condition for completion)

**Forbidden Actions:**
- Auto-fill intent or exit conditions (must remain human choices)
- Skip Re-Entry Gate if conditions met
- Proceed without confirming Observation Language Invariant

**Gating Rules:**
- If Re-Entry Gate conditions met: STOP, run `docs/PROTOCOL_REENTRY_AND_PROGRESS.md` first
- No code may be written until Re-Entry Protocol complete and `PROGRESS_REPORT.md` exists
- Must run `./scripts/reentry_guard.sh` before executing protocol

---

### 1.2 End of Day Protocol
**File:** `docs/PROTOCOL_END_OF_DAY.md`

**Trigger Condition:**
- End of work session
- Before closing for the day

**Required Actions:**
- Work Summary (facts only, no justification)
- Uncommitted Changes Intent (document why left open or commit/stash/revert)
- Stance Integrity Check (verify no prescription, optimization, or judgment introduced)
- Continuity Impact assessment
- Drift Check (will changes help or confuse future re-entry?)
- Observation Language Seal (run scan if user-facing copy changed)
- Closure state (engine: Open/Closing/Closed)

**Forbidden Actions:**
- Evaluate uncommitted changes (state "Uncommitted changes not evaluated" instead)
- Skip Observation Language Seal if copy changed
- End without updating PROGRESS_REPORT.md (blocks next session)

**Gating Rules:**
- If uncommitted changes exist: must document intent or commit/stash/revert
- If PROGRESS_REPORT.md not updated: Re-Entry Gate will block next session

---

### 1.3 Re-Entry and Progress Protocol
**File:** `docs/PROTOCOL_REENTRY_AND_PROGRESS.md`

**Trigger Condition:**
- >7 days since last activity
- Returning after travel, illness, burnout, or interruption
- Uncertain about current phase, locks, or allowed work
- Handing control to assistant (Cursor or human)
- Feeling disoriented about what is real vs assumed
- Starting new phase or ending scope freeze

**Required Actions:**
- Repository Truth Check (mechanical: git branch, status, log)
- Authority Reload (re-read canonical docs in order)
- Observation Language Gate (confirm invariant, run scan)
- Generate Ground Truth Progress Report (delegated to Cursor)
- Human Cockpit Briefing (answer: Allowed Work Today, Intent, Exit Condition)
- Phase Lock Enforcement (confirm current phase, scope freeze status, forbidden items)

**Forbidden Actions:**
- Speculate (Cursor must cite file paths, not speculate)
- Skip authority reload
- Proceed without answering Intent + Exit Condition
- Auto-fill intent or exit conditions

**Gating Rules:**
- If cannot answer Intent + Exit Condition: do not code
- If unsure about phase: default to no new features
- Protocol always runs before feature or refactor work

---

## 2. Language and Observation Protocols

### 2.1 Observation Language Invariant
**Files:** `docs/ARCHITECTURE_NOW.md` (line 214), `docs/OBSERVATION_BOUNDARIES.md`, `docs/SCOPE.md` (line 24)

**Trigger Condition:**
- Any user-facing copy change
- Any UI work
- Before proceeding with new work (via protocol gates)

**Required Actions:**
- Run `./scripts/observation_language_scan.sh`
- If exits nonzero: classify matches as OK, Soft interpretation, or Violation
- Fix violations before proceeding
- Log results in START_OF_DAY or PROGRESS_REPORT

**Forbidden Language:**
- Instruct user on what to focus on
- Elevate findings as important, meaningful, or significant
- Imply progress, success, strength, or deficiency
- Suggest reflection depth, urgency, or corrective behavior
- Use tokens: `recommended`, `important`, `significant`, `strongest`, `deserve` (in user-facing copy)

**Allowed Language:**
- Describe what is detected, surfaced, or shown
- Report structure, distribution, timing, or presence
- State patterns, relationships, or comparisons without judgment

**Enforcement:**
- Automated scanning script
- Protocol gates (re-entry, start-of-day, end-of-day)
- Code review requirement

---

### 2.2 Observation Boundaries Protocol
**File:** `docs/OBSERVATION_BOUNDARIES.md`

**Trigger Condition:**
- Writing any user-facing language
- Creating insight descriptions
- Designing empty states, tooltips, or share artifacts

**Allowed Observations:**
- What patterns are detected
- How distributions appear
- When events occurred
- What structures exist
- Relative comparisons without judgment
- Presence or absence of features
- Structural relationships

**Forbidden Inferences:**
- That something is important, significant, meaningful, or noteworthy
- That something deserves attention, reflection, or action
- That progress, growth, improvement, or decline has occurred
- That certain patterns are good, bad, healthy, or unhealthy
- That user should focus on, prioritize, or change anything
- That certain periods were more valuable or meaningful
- That recommendations exist for what to do next
- That evaluation or judgment is implied

---

## 3. System Invariants (Non-Negotiable)

### 3.1 Core System Invariants
**File:** `docs/INVARIANTS.md`

**Five Non-Negotiable Rules:**

1. **Deterministic Output for Same Input**
   - Bridge generation must produce identical results for identical inputs
   - No randomness, no time-based seeds
   - Enforcement: Pure functions, configurable constants, deterministic hashing

2. **No Raw Text Leaves Client**
   - No plaintext reflection content may be transmitted to server
   - All data encrypted client-side before RPC calls
   - Server stores only ciphertext columns
   - Enforcement: `aesGcmEncryptText()` before all RPCs, RLS never exposes decrypted content

3. **No Prescriptive Language**
   - Bridge explanations must never contain prescriptive language
   - No "you should", "you must", "you need to"
   - No future claims ("will" → "did")
   - Enforcement: `sanitizeExplanationLanguage()` function

4. **No Silent Data Exclusion**
   - Never silently exclude reflections from bridge generation
   - Must log exclusions with reasons
   - Coverage checks required after generation
   - Enforcement: Logging, coverage warnings, orphan reflection tracking

5. **One Brain, Many Lenses**
   - One canonical data store (encrypted reflections)
   - Multiple views derive from same source
   - No view modifies source data
   - Enforcement: All views read from `entries` table, compute on-demand

6. **Vault Invariants**
   - Entries RPCs are append-first, wallet-scoped
   - No RPC takes raw entry text
   - All mutations require wallet header
   - Historical migrations never edited
   - Canonical RPC surface lives in 023+

**Violation Handling:**
- Any code change violating these is a regression
- Must be rejected in code review
- Review frequency: Before every major release

---

## 4. Phase and Scope Protocols

### 4.1 Scope Freeze Protocol
**File:** `docs/STATUS.md` (line 27)

**Trigger Condition:**
- Architecture settlement period (one week)
- Explicitly declared in STATUS.md

**Forbidden Actions:**
- No new lenses
- No new metrics
- No new "helpful" features
- No new capabilities

**Allowed Actions:**
- Bug fixes
- Consistency improvements
- Language alignment (interpretation over prescription)
- Finishing migrations (SharePack, entries table, etc.)

**Purpose:** Let architecture settle. Distribution layer spine complete. Meaning layer language aligned. Stabilize.

---

### 4.2 Engine Closure Protocol
**Files:** `docs/ENGINE_CLOSURE.md`, `docs/ENGINE_CLOSURE_CRITERIA.md`

**Trigger Condition:**
- When engine is declared closed
- After closure criteria met

**Forbidden After Closure:**
- New insight types
- New computation patterns
- New signal types
- New analysis methods
- New data models (tables, schemas, data structures)
- New metaphors or conceptual frameworks
- Dashboard patterns (feeds, card grids, metrics-first layouts, gamification)
- Productivity patterns (task lists, reminders, notifications, urgency)

**Allowed After Closure:**
- Cockpit work (UI, navigation, presentation)
- Bug fixes
- Performance optimization
- UX improvements

---

## 5. Observer Layer Protocols

### 5.1 Observer v1 Implementation Boundary
**File:** `docs/OBSERVER_V1_IMPLEMENTATION_BOUNDARY.md`

**Allowed Files:**
- `src/app/lib/observer/*` (new)
- `src/app/lib/insights/artifactTypes.ts` (modify)
- `src/app/lib/insights/computeInsightsForWindow.ts` (modify)
- `src/app/insights/weekly/page.tsx` (modify)
- `src/app/insights/yearly/page.tsx` (modify)

**Forbidden Actions:**
- Modify existing insight computation logic
- Modify existing card rendering logic
- Add new insight types
- Create new storage or tables
- Cross-compute artifacts between lenses

**Read Permissions:**
- May read artifact debug fields
- May read distribution data from artifacts

**Write Permissions:**
- May attach `persistence` field to artifacts
- May write to session-scoped cache only

**Silence Enforcement:**
- Must return null if silence rules trigger
- Must not speak unless persistence rule satisfied

---

### 5.2 Observer Speech Constraint
**File:** `docs/OBSERVER_SPEECH.md`

**Allowed Tense:**
- Present tense only ("appears", "shows", "occurs")

**Forbidden Verbs:**
- Suggests, implies, indicates, reveals, demonstrates, proves, means, represents, signals

**Maximum Scope:**
- One sentence
- One clause
- One pattern reference maximum

**Forbidden References:**
- Self, identity, future, meaning, importance, significance, recommendations

---

## 6. Development Workflow Protocols

### 6.1 Cursor Rules Protocol
**File:** `docs/CURSOR_RULES.md`

**Trigger Condition:**
- Before proposing any changes
- When executing protocol commands

**Required Actions:**
- Read `docs/SCOPE.md`, `docs/STATUS.md`, `docs/NEXT.md`
- Explicitly state which layer change belongs to
- Prefer smallest diff that advances objective
- If unsure: list exactly what file would change and why

**Forbidden Actions:**
- Violate Layer 0 constraints
- Change encryption primitives, key derivation, or RLS without explicit instruction
- Add new features unless `docs/NEXT.md` says to
- Invent or omit protocol sections
- Summarize philosophy unless protocol asks

**Definition of Done:**
- Typecheck passes
- Build passes
- No view computes insights outside canonical engine

---

### 6.2 Protocol Execution Rule
**File:** `docs/CURSOR_RULES.md` (line 24)

**Trigger Condition:**
- User says "Run start of day protocol" or "Run end of day protocol"

**Required Actions:**
- Load corresponding protocol file from `docs/`
- Execute verbatim
- Do not invent or omit sections
- Do not summarize philosophy unless protocol asks

---

## 7. Code Review Protocols

### 7.1 Invariant Verification Protocol
**File:** `docs/INVARIANTS.md` (line 196)

**Trigger Condition:**
- Before approving any PR

**Required Checks:**
1. Does this maintain deterministic output? (Check for randomness, time-based logic)
2. Does this preserve client-side encryption? (Verify all sensitive data encrypted before transmission)
3. Does this avoid prescriptive language? (Check explanation generation)
4. Does this log exclusions? (Verify coverage checks and orphan logging)
5. Does this respect one-brain principle? (Verify no source data modification)
6. Does this respect Vault invariants? (Verify RPCs wallet-scoped, encrypted, migrations append-only)

---

## 8. Feature Addition Protocols

### 8.1 New Feature Gate
**File:** `docs/CURSOR_RULES.md` (line 11), `docs/STATUS.md`

**Trigger Condition:**
- Before adding any new feature

**Required Actions:**
- Check `docs/NEXT.md` for explicit permission
- Verify not in scope freeze
- Verify engine not closed (if adding computation/data models)

**Forbidden Actions:**
- Add features not listed in `docs/NEXT.md`
- Add features during scope freeze
- Add insight types, data models, or metaphors after engine closure

---

### 8.2 Development Constraints Protocol
**File:** `docs/ARCHITECTURE_NOW.md` (line 148)

**Trigger Condition:**
- When adding new features

**Required Questions:**
1. Does this reveal structure or assign meaning? (Reveal → allowed, Assign → forbidden)
2. Does this adapt to user behavior? (Static → allowed, Adaptive → forbidden)
3. Does this imply progress or direction? (Neutral → allowed, Directional → forbidden)
4. Does this persist user preferences? (Session-only → allowed, Persistent → forbidden)

---

## 9. Documentation Protocols

### 9.1 Documentation Modification Protocol
**File:** `README.md` (line 236), implicit in protocol files

**Forbidden Actions:**
- Cursor agents must never modify documentation files
- Do not change protocol files without explicit instruction

**Exception:**
- Protocol files may be updated when protocol itself requires it
- Documentation updates must follow Observation Language Invariant

---

## 10. Build and Repository Protocols

### 10.1 Build Hygiene Protocol
**File:** `docs/BUILD_NOTES.md`, `docs/NEXT.md`

**Trigger Condition:**
- Before committing
- When build fails

**Required Actions:**
- Ensure build passes before committing
- Log build blockers in `docs/NEXT.md` if build fails
- Use pnpm only (no package-lock.json or yarn.lock)

**Mac EPERM Quick Fix:**
- Run if EPERM under node_modules or pnpm store:
  ```bash
  xattr -dr com.apple.quarantine node_modules
  xattr -dr com.apple.quarantine "$(pnpm store path)"
  ```

---

## 11. Phase-Specific Protocols

### 11.1 Weekly Lens Freeze Protocol
**File:** `docs/WEEKLY_LENS_FREEZE.md` (implied)

**Trigger Condition:**
- After Weekly lens marked complete

**Forbidden Actions:**
- Modify Weekly lens computation
- Change Weekly lens contract

---

### 11.2 Observer v0 Freeze Protocol
**File:** `docs/OBSERVER_V0.md`, `docs/OBSERVER_V0_RELEASE.md`

**Trigger Condition:**
- Observer v0 marked complete

**Forbidden Actions:**
- Do not extend Observer v0
- Create Observer v1 if improvements needed

---

## 12. Implicit Protocols (Repeated Patterns)

### 12.1 Authority File Hierarchy
**Files:** `docs/0_START_HERE.md`, referenced throughout

**Protocol:**
- Core Laws > Design Contract > System Map > Transition Rules
- If file contradicts memory, file wins
- Authority files outrank intuition

**Trigger Condition:**
- Any uncertainty about system state
- Re-entry scenarios
- Before major decisions

---

### 12.2 Progress Report Requirement
**Files:** `docs/PROTOCOL_REENTRY_AND_PROGRESS.md`, `docs/PROTOCOL_END_OF_DAY.md`

**Protocol:**
- `PROGRESS_REPORT.md` must exist for current date
- If work ended without updating: Re-Entry Gate blocks next session
- Progress reports are artifacts, not vibes

**Trigger Condition:**
- End of work session
- Re-entry scenarios

---

### 12.3 Intent and Exit Condition Protocol
**Files:** `docs/PROTOCOL_START_OF_DAY.md`, `docs/PROTOCOL_REENTRY_AND_PROGRESS.md`

**Protocol:**
- Must define Intent for Today (one sentence, class of work)
- Must define Exit Condition (binary condition)
- If cannot answer: do not code

**Trigger Condition:**
- Start of day
- Re-entry scenarios

---

## 13. Language Constraint Protocols

### 13.1 No Prescriptive Language Protocol
**Files:** `docs/INVARIANTS.md` (line 64), `docs/POSTURE.md`, `docs/OBSERVATION_BOUNDARIES.md`

**Forbidden Patterns:**
- "you should", "you must", "you need to", "you ought to", "you have to"
- Future claims: "will" → must convert to "did"
- Prescriptive explanations

**Enforcement:**
- `sanitizeExplanationLanguage()` function
- Observation language scan script
- Code review requirement

---

### 13.2 No Optimization Language Protocol
**Files:** `docs/POSTURE.md`, `docs/ARCHITECTURE_NOW.md`

**Forbidden Language:**
- "improve", "grow", "better", "progress", "develop"
- Temporal framing implying direction: "increasing", "declining", "trending"
- Optimization, progress, success, strength, deficiency

**Required Language:**
- Neutral observational language only
- Past tense for temporal comparisons

---

## 14. Data and Storage Protocols

### 14.1 Encryption Protocol
**Files:** `docs/INVARIANTS.md` (line 35), `docs/ARCHITECTURE_NOW.md`, `docs/SCOPE.md`

**Required Actions:**
- Encrypt all reflection content client-side before RPC calls
- Use `aesGcmEncryptText()` before any `supabase.rpc()` call
- Store only ciphertext in database columns
- Decrypt only client-side using `decryptJSON()`

**Forbidden Actions:**
- Store plaintext column in any table
- Send unencrypted reflection text to any API endpoint
- Log decrypted content server-side
- Expose plaintext in RPC function return values

---

### 14.2 Migration Protocol
**Files:** `docs/INVARIANTS.md` (line 161), `docs/CLEANUP_PLAN.md`

**Required Actions:**
- All new RPC functions go in new migration files (024+)
- Canonical RPC surface re-declared in 023_entries_rpcs.sql
- Append-only: new migrations never modify old ones

**Forbidden Actions:**
- Edit historical migrations (001-022)
- Modify existing RPC function signatures in old migrations
- Create RPC that accepts plaintext entry content
- Create RPC that doesn't validate wallet ownership

---

## 15. Observer-Specific Protocols

### 15.1 Pattern Persistence Rule
**File:** `docs/PATTERN_PERSISTENCE_RULE.md`

**Trigger Condition:**
- When Observer v1 detects pattern recurrence

**Required Conditions:**
- Minimum recurrence: pattern appears in at least 2 non-overlapping windows
- Different lenses required (e.g., Weekly and Yearly)
- Same pattern signature (per identity rule)

**Silence Rules:**
- Must return null if only one window present
- Must return null if windows overlap
- Must return null if same lens
- Must return null if match ambiguous

**Forbidden Actions:**
- Explain why pattern persists
- Rank patterns by importance
- Suggest action based on persistence

---

### 15.2 Pattern Identity Rule
**File:** `docs/PATTERN_SIGNATURE.md`

**Protocol:**
- Two patterns are same if: same distribution classification, same concentration band, same day-of-week pattern, same top percentile share, same relative spike threshold
- Structural equivalence, not semantic equivalence
- Concentration bands must be coarse and ordinal (low, medium, high), not continuous

**Forbidden Actions:**
- Use semantic labels to determine identity
- Use continuous values for concentration comparison
- Treat patterns as same based on meaning or importance

---

## Summary: Protocol Enforcement Points

**Mechanical Enforcement:**
- `./scripts/reentry_guard.sh` (re-entry gate)
- `./scripts/observation_language_scan.sh` (language check)
- Git status checks (uncommitted changes)
- Build status checks

**Human Enforcement:**
- Protocol files must be executed verbatim
- Intent and Exit Condition must be human-defined
- Progress reports must be generated before re-entry

**Code Review Enforcement:**
- Invariant verification checklist
- Observation language scan
- No prescriptive language check

**Phase Enforcement:**
- Scope freeze blocks new features
- Engine closure blocks new computation/data models
- Phase locks prevent drift

---

**Last Updated:** 2026-01-20  
**Source:** Extracted from committed files only, no inference beyond written rules

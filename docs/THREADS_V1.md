# Threads v1 — Definition and Contract

**Version:** 1.0  
**Locked:** 2026-01-05  
**Status:** FROZEN — No changes without Threads v2

---

## What Threads Is

Threads is a **narrative bridge system** that connects reflections through human-readable explanations. It surfaces how your thoughts relate to each other over time, revealing patterns, shifts, and continuities in your reflection history.

### Core Components

1. **Narrative Bridges**
   - Weighted connections between reflection pairs (0.0 to 1.0)
   - Human-readable explanations that cite evidence from both reflections
   - Five bridge types: `sequence`, `scale`, `systemic`, `contrast`, `media`
   - Two required anchors per bridge (2-6 word phrases from each reflection)

2. **Bridge Generation**
   - Client-side only, deterministic output for same input
   - Heuristic-based scoring using pattern matching and temporal signals
   - Quality guardrails: evidence requirements, edge capping, de-duplication
   - Coverage tracking: target 85% of eligible reflections connected

3. **Display Layer**
   - Top 3 bridges per reflection shown by default (ranked by quality + diversity)
   - Remaining bridges accessible via "Show more" toggle
   - Orphan reflections explicitly handled with respectful messaging
   - Thread view: `/reflections/thread/[id]` shows connected reflections with bridge explanations

4. **Storage**
   - Bridges stored encrypted in `reflection_link_bridges` table
   - Ciphertext only, decrypted client-side
   - Bridge type: `narrative` (distinct from `meaning` bridges)

### Key Features

- **Deterministic**: Same reflections → same bridges (no randomness)
- **Client-side only**: All computation happens in browser
- **Encrypted**: Bridge payloads encrypted before storage
- **Observational**: Explanations use past tense, no prescriptive language
- **Transparent**: Coverage checks, orphan logging, quality metrics
- **Capped**: Max 5 bridges per type per reflection, top 3 displayed

---

## What Threads Is Not

### Not Meaning Bridges
- Meaning bridges (`MeaningBridge`) detect semantic claims and consequences
- Threads bridges (`NarrativeBridge`) detect narrative patterns and temporal connections
- These are separate systems with different purposes

### Not Clusters
- Clusters group reflections by similarity (Jaccard similarity, token overlap)
- Threads connect reflections through narrative patterns (sequence, scale, contrast)
- Clusters are static groupings; Threads are dynamic connections

### Not Pins
- Pins are saved derived artifacts (clusters, threads, bridges)
- Threads are the bridge generation and display system
- Pins can contain Threads bridges, but they're not the same thing

### Not Mind View
- Mind View shows force-directed graph of all relationships
- Threads shows narrative chains with explanations
- Different visualizations of the same underlying data

### Not Automatic
- Bridges must be generated via dev-only trigger (`/threads` page)
- Not auto-generated on reflection creation
- Generation is explicit, not background

### Not Real-time
- Bridges are computed on-demand, not continuously updated
- Changes to reflections don't automatically update bridges
- Regeneration required to see new connections

---

## What Will Not Change Without Threads v2

### Core Data Structure

**Frozen:**
- `NarrativeBridge` type definition (fields: `from`, `to`, `weight`, `reasons`, `explanation`, `anchorA`, `anchorB`, `signals`)
- Five bridge types: `sequence`, `scale`, `systemic`, `contrast`, `media`
- Weight range: 0.0 to 1.0
- Two anchors required per bridge (2-6 words each)

**Cannot change without v2:**
- Adding new bridge types
- Removing required anchors
- Changing weight range
- Modifying `NarrativeBridge` type fields

### Generation Algorithm

**Frozen:**
- Deterministic output requirement (same input → same output)
- Heuristic weights: sequence, scale, systemic, media, contrast
- Pattern matching: SCALE_PATTERNS, SYSTEMIC_PATTERNS, MEDIA_PATTERNS, CONTRAST_PATTERNS
- Evidence requirements: shared keyword, shared entity, shared theme tag, temporal sequence signal
- Quality guardrails: max 3 bridges per pair, semantic delta, edge capping

**Cannot change without v2:**
- Making generation non-deterministic
- Removing evidence requirements
- Changing core heuristic weights significantly
- Removing quality guardrails

### Language and Explanations

**Frozen:**
- No prescriptive language (enforced via `sanitizeExplanationLanguage()`)
- Past tense only (no future claims)
- Observational framing only
- Language normalization layer (reduces repetition)
- Fallback explanation filtering

**Cannot change without v2:**
- Allowing prescriptive language
- Removing language sanitization
- Changing explanation structure significantly

### Display Behavior

**Frozen:**
- Top 3 bridges shown per reflection by default
- Ranking: quality (weight * 0.7) + diversity (unique reasons * 0.3)
- "Show more" toggle for remaining bridges
- Orphan reflection messaging (respectful, informational)

**Cannot change without v2:**
- Changing default visible count (3)
- Removing orphan handling
- Changing ranking algorithm significantly

### Storage and Encryption

**Frozen:**
- Storage in `reflection_link_bridges` table
- Encryption before storage (client-side AES-GCM)
- Bridge type: `narrative` (stored in `bridge_type` column)
- Ciphertext only (no plaintext on server)

**Cannot change without v2:**
- Changing storage table
- Removing encryption requirement
- Storing plaintext server-side

### Coverage and Orphans

**Frozen:**
- Target coverage: 85% of eligible reflections
- Auto-tuning threshold (max 6 attempts, step 0.01, floor 0.40)
- Orphan logging and visibility
- Coverage warnings if < 85%

**Cannot change without v2:**
- Removing coverage tracking
- Removing orphan handling
- Changing target coverage significantly

---

## Threads v1 Boundaries

### In Scope
- ✅ Narrative bridge generation (heuristic-based)
- ✅ Bridge display in Thread UI
- ✅ Orphan reflection handling
- ✅ Display capping (top 3)
- ✅ Language normalization
- ✅ Coverage tracking
- ✅ Dev-only generation trigger

### Out of Scope (Requires v2)
- ❌ Auto-generation on reflection creation
- ❌ Real-time bridge updates
- ❌ New bridge types
- ❌ Machine learning or AI-based generation
- ❌ Server-side bridge computation
- ❌ Cross-user bridge discovery
- ❌ Bridge editing or deletion UI
- ❌ Bridge sharing or export

---

## Implementation Files

**Core Logic:**
- `src/app/lib/meaningBridges/buildNarrativeBridge.ts` - Bridge generation algorithm
- `src/app/lib/meaningBridges/storage.ts` - Bridge storage and retrieval
- `src/app/lib/meaningBridges/stopwords.ts` - Stopword filtering

**UI Components:**
- `src/app/components/ThreadConnections.tsx` - Bridge display component
- `src/app/reflections/thread/[id]/page.tsx` - Thread detail view
- `src/app/threads/page.tsx` - Dev-only generation page

**Database:**
- `supabase/migrations/016_reflection_link_bridges.sql` - Bridge storage schema
- `supabase/migrations/018_list_reflection_bridges.sql` - Bridge retrieval RPC

---

## Testing and Validation

**Validation Harness:**
- `src/app/lib/meaningBridges/validateBridges.dev.ts` - Dev-only test harness
- Run: `npm run validate-bridges`
- Tests: False friends, true bridges, contrast cases

**Acceptance Criteria:**
- Deterministic output (same input → same bridges)
- Coverage ≥ 85% when possible
- Fallback rate < 5%
- No prescriptive language
- All bridges have two anchors
- Orphan reflections handled respectfully

---

## Migration to Threads v2

If Threads v2 is needed, the following must be documented:

1. **Breaking Changes**
   - What changed from v1
   - Migration path for existing bridges
   - Backward compatibility strategy

2. **New Features**
   - What's new in v2
   - Why v1 couldn't support it
   - How v2 maintains v1 guarantees

3. **Deprecation Timeline**
   - When v1 stops receiving updates
   - When v1 bridges are migrated
   - When v1 code is removed

---

## Related Documentation

- `docs/INVARIANTS.md` - System invariants (deterministic, encrypted, observational)
- `docs/ARCHITECTURE.md` - System architecture and data flow
- `docs/SCOPE.md` - Product definition and scope
- `docs/STATUS.md` - Current project status

---

**This document is a contract. Changes to Threads v1 behavior require creating Threads v2 and documenting the migration path.**

**Last Updated:** 2026-01-05  
**Maintained By:** Engineering Team  
**Review Frequency:** Before any Threads v2 planning


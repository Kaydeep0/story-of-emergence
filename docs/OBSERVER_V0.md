# Observer v0 Contract

**Status:** Complete and frozen  
**Date:** 2024  
**Version:** 0 (MVP)

This document defines the Observer v0 contract. It is a guardrail, not a roadmap.

---

## What Observer v0 Does

Observer v0 surfaces evidence excerpts tied to insight claims and enables verification by linking back to source reflections.

### Core Capabilities

1. **Surfaces evidence excerpts tied to claims**
   - Extracts 1-3 short excerpts (90-140 characters) from reflections
   - Links excerpts to specific insight cards
   - Shows actual text from user's reflections, not summaries

2. **Opens reflection previews**
   - Clicking an evidence chip opens the source reflection
   - Preview panel shows full reflection text
   - Enables verification of insight claims

3. **Never advises, ranks, or interprets meaning**
   - Excerpts are raw text snippets
   - No semantic analysis or interpretation
   - No coaching language or recommendations

### Implementation Details

- **Keyword-based matching:** Simple token overlap scoring (no embeddings)
- **Client-side only:** All computation happens locally after decryption
- **Mechanical selection:** Top-scoring reflections by keyword density
- **Context-aware:** Bonuses for spike days and pattern days

---

## What Observer v0 Does Not Do

Observer v0 explicitly does not include:

- ❌ **No embeddings** — No vector embeddings or semantic vectors
- ❌ **No semantic similarity** — No meaning-based matching
- ❌ **No AI inference** — No LLM calls, no model inference
- ❌ **No topic modeling** — No topic extraction or clustering
- ❌ **No steering language** — No "should", "try", "optimize", or advice

**Rationale:** Observer v0 is a witnessing tool. It shows evidence, not interpretation. It points back to exact lines, not summaries or meanings.

---

## Inputs

Observer v0 requires:

1. **Reflections**
   - Decrypted reflection entries (`ReflectionEntry[]`)
   - Must include `id`, `createdAt`, `plaintext` fields
   - Already filtered to relevant time window

2. **Events**
   - Internal events or unified events (`InternalEvent | UnifiedInternalEvent`)
   - Used to identify which reflections are in the window
   - Reflection IDs extracted from event payloads (`plaintext.id`)

3. **Time windows**
   - Window start and end dates
   - Used for context bonuses (spike days, pattern days)

4. **Claim text**
   - The insight card's claim/title
   - Used for keyword extraction and matching

---

## Outputs

Observer v0 produces:

1. **Evidence chips**
   - Array of 1-3 `EvidenceChip` objects
   - Each chip contains:
     - `reflectionId`: ID of source reflection
     - `createdAtIso`: Timestamp of reflection
     - `excerpt`: 90-140 character text snippet
   - Empty array if no good matches found

2. **Reflection preview panel**
   - Opens when chip is clicked
   - Shows full reflection text
   - Enables verification of insight claims

3. **Debug telemetry**
   - `missingReflectionsForEvents`: Count of events without matching reflections
   - Helps detect data integrity issues
   - Used for troubleshooting event-to-reflection mapping

---

## Contract Boundaries

### What Is Observer v0

- Keyword-based excerpt picker (`pickEvidenceChips`)
- Evidence chips UI component (`EvidenceChips`)
- Reflection preview integration
- Event-to-reflection ID mapping

### What Is Not Observer v0

- Semantic search or similarity matching
- Topic extraction or clustering
- Content summarization or interpretation
- Recommendation or ranking systems
- Any form of AI or ML inference

---

## Integration Points

Observer v0 integrates with:

1. **Insight Cards**
   - Cards include optional `evidenceChips` field
   - Chips rendered below card explanation
   - Preserved through normalization (`normalizeCard`)

2. **Weekly Lens**
   - Evidence chips on spike day cards
   - Evidence chips on weekly pattern cards
   - Evidence chips on fallback card

3. **Summary Lens**
   - Evidence chips on always-on summary cards
   - Chips from reflections in the summary window

4. **Debug Panel**
   - Shows `missingReflectionsForEvents` count
   - Helps verify event-to-reflection mapping integrity

---

## Success Criteria

Observer v0 is successful when:

1. ✅ Users can see actual excerpts from their reflections on insight cards
2. ✅ Clicking excerpts opens the source reflection for verification
3. ✅ No interpretation or advice is presented — only evidence
4. ✅ All computation happens client-side (no external services)
5. ✅ Debug telemetry shows accurate event-to-reflection mapping

---

## Future Versions

Observer v0 is frozen. Future improvements (Observer v1, v2, etc.) must:

- Preserve the witnessing stance (no steering)
- Maintain the evidence-only contract
- Not introduce interpretation layers
- Be explicitly versioned and documented

**This contract is a guardrail.** It prevents scope creep and ensures Observer remains a witnessing tool, not a steering mechanism.

---

## Files

Observer v0 implementation:

- `src/app/lib/insights/pickEvidenceChips.ts` — Core excerpt picker logic
- `src/app/lib/insights/reflectionAdapters.ts` — Event-to-reflection ID extraction
- `src/app/insights/components/EvidenceChips.tsx` — UI component
- `src/app/lib/insights/types.ts` — `EvidenceChip` type definition
- `src/app/lib/insights/computeWeeklyArtifact.ts` — Integration with Weekly lens
- `src/app/lib/insights/alwaysOnSummary.ts` — Integration with Summary lens

---

**Contract frozen. No changes without explicit version bump.**


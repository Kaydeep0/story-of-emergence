# Architecture Now

**Status:** Current system mental model after Phase 21 stabilization  
**Date:** 2024  
**Purpose:** Explicit grounding for future development alignment

---

## A. What the system IS

- **Private encrypted reflection vault**
  - All content encrypted client-side before storage
  - Wallet signature required for access
  - Ciphertext stored, plaintext never persisted

- **Client-side decryption only**
  - Decryption happens in browser memory
  - Keys derived from wallet signature
  - No server-side access to plaintext

- **Insights as observable structure, not advice**
  - Reveals patterns, timelines, clusters, distributions
  - Presents facts without interpretation
  - No meaning assigned by the system

- **Human is the only agent**
  - All interpretation belongs to the observer
  - All significance assigned by the observer
  - All action initiated by the observer

---

## B. What the system is NOT

- **No coaching**
  - No writing tips or suggestions
  - No personalized recommendations
  - No "best practices" guidance

- **No streaks**
  - No day counters or continuity tracking
  - No streak-based motivation
  - No streak-based UI elements

- **No nudging**
  - No prompts to write more
  - No reminders or notifications
  - No behavioral prompts

- **No behavioral reinforcement**
  - No rewards for activity
  - No badges or achievements
  - No gamification elements

- **No adaptive feedback loops**
  - System does not learn from user behavior
  - System does not adapt to user patterns
  - System does not personalize based on history

---

## C. Data flow (simple arrows)

```
Wallet → Signature → Key
```

```
Ciphertext → Decrypt → In-memory data
```

```
In-memory data → Derived views
```

```
Derived views → Render only (no persistence unless encrypted)
```

**Key principles:**
- Encryption happens before any storage
- Decryption happens only in browser memory
- Derived views are computed on-demand
- No unencrypted data persists
- No derived views modify future behavior

---

## D. Current insight surfaces

- **Timeline**
  - Events over time
  - Density visualization
  - No temporal narrative or progress framing

- **Clusters**
  - Structural grouping without ranking
  - Co-occurrence patterns
  - No importance assignment

- **Distributions**
  - Shape classification (normal, log-normal, power-law)
  - Statistical patterns only
  - No recommendations based on shape

- **Yearly wrap**
  - Retrospective summary only
  - Past data projection
  - No forward-looking guidance

**Common properties:**
- All surfaces are read-only
- All surfaces are computed from past data
- No surface influences future behavior
- No surface adapts to user interaction

---

## E. Guardrails

- **No insight modifies future behavior**
  - Insights are projections over past data only
  - No insight changes system behavior based on viewing patterns
  - No insight adapts presentation based on user interaction

- **No insight changes ranking over time**
  - Ordering is deterministic and stable
  - No "most relevant" or "for you" algorithms
  - No personalization based on viewing history

- **No UI language implying progress, growth, or improvement**
  - Avoid words like: "improve", "grow", "better", "progress", "develop"
  - Avoid temporal framing that implies direction: "increasing", "declining", "trending"
  - Use neutral observational language only

- **No persistence of user preferences**
  - No localStorage for UI preferences that affect future views
  - No session memory that influences presentation
  - No adaptive ordering or filtering

- **No feedback collection**
  - No "was this helpful?" buttons
  - No user ratings or scores
  - No mechanism for user input to influence system behavior

---

## Development constraints

When adding new features:

1. **Ask:** Does this reveal structure or assign meaning?
   - ✅ Reveal structure → allowed
   - ❌ Assign meaning → forbidden

2. **Ask:** Does this adapt to user behavior?
   - ✅ Static computation → allowed
   - ❌ Adaptive behavior → forbidden

3. **Ask:** Does this imply progress or direction?
   - ✅ Neutral observation → allowed
   - ❌ Directional language → forbidden

4. **Ask:** Does this persist user preferences?
   - ✅ Session-only state → allowed
   - ❌ Persistent preferences → forbidden

---

## Architecture boundaries

**Inference layer:**
- Computes structure from data
- Deterministic, no user adaptation
- No feedback loops

**Presentation layer:**
- Renders computed structure
- Read-only, no interaction persistence
- No adaptive ordering

**Storage layer:**
- Encrypted ciphertext only
- No plaintext persistence
- No derived view persistence

**Interaction layer:**
- View-only navigation
- No preference persistence
- No behavior tracking

---

*This document serves as a checkpoint after Phase 21 stabilization. Future phases must align with these boundaries.*


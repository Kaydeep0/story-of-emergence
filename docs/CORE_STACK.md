# Core Stack — Canonical Layer Architecture

This document defines the **canonical layer stack** that is real and operating today, bottom up.

Each layer builds on the one below it. The stack is locked. No layer can be skipped or reordered.

---

## Layer 1: Identity and Trust Layer

**Status:** ✅ Complete and stable

**Definition:** Wallet identity, consent signature, deterministic key derivation, no plaintext server-side.

This layer establishes who you are and how you prove ownership. It uses wallet addresses as identity, requires explicit consent signatures for encryption keys, and ensures no plaintext data ever touches server storage.

**Key invariants:**
- Wallet address is the identity
- Encryption keys derived deterministically from consent signature
- Server never sees plaintext
- All authentication via wallet signature

---

## Layer 2: Encrypted Memory Layer

**Status:** ✅ Complete and stable

**Definition:** Ledger, AES-GCM encryption, ciphertext-only persistence, deletion semantics.

This layer stores your reflections as encrypted entries. It uses AES-GCM for encryption, stores only ciphertext in the database, and provides clear semantics for soft deletion and hard deletion.

**Key invariants:**
- All entries encrypted client-side before storage
- Database stores ciphertext only
- Deletion is explicit (soft delete via `deleted_at`, hard delete via RPC)
- No server-side decryption capability

---

## Layer 3: Time and Structure Layer

**Status:** ✅ Complete and stable

**Definition:** Weekly, yearly, YoY, lifetime, distributions. Deterministic tie-breaking, fallbacks.

This layer organizes your reflections across time windows. It provides deterministic computation of time-based aggregations, handles edge cases with fallbacks, and ensures consistent results across sessions.

**Key invariants:**
- Time windows are deterministic (weekly = Monday-Sunday, yearly = calendar year)
- Tie-breaking is deterministic (date-based, then ID-based)
- Fallbacks exist for empty states
- Computations are idempotent

---

## Layer 4: Insight Computation Layer

**Status:** ✅ Complete and stable

**Definition:** Signal engine v1, timeline spikes, summaries, evidence-backed outputs. Detects, not interprets intention.

This layer computes insights from your reflections. It identifies patterns, spikes, distributions, and relationships. It presents observations, not prescriptions.

**Key invariants:**
- Insights are evidence-backed (every insight references source entries)
- Detects patterns, does not interpret meaning
- No prescriptive language ("you should", "optimize", "improve")
- Outputs are deterministic given the same inputs

---

## Layer 5: Lens Layer

**Status:** ✅ Mechanically complete, experientially under-articulated

**Definition:** Perspective modulation. Weekly, Summary, Timeline, Yearly, YoY, Distributions, Lifetime.

This layer provides different ways to view your data. Each lens applies a different time window, aggregation, or perspective. The mechanics work, but the experiential articulation is incomplete.

**Key invariants:**
- Lenses are modes, not pages
- Switching lenses changes perspective, not data
- Each lens has a clear purpose
- Lenses are mechanically complete but experientially under-articulated

---

## Layer 6: Sharing and Externalization Layer

**Status:** ✅ Complete, missing ritual

**Definition:** Derived-only sharing, boundary layer, export escape hatch. Missing ritual.

This layer allows you to share insights outside the system. It ensures only derived data is shared (never raw entries), provides export capabilities, and maintains clear boundaries. The mechanics work, but the ritual of sharing is not yet defined.

**Key invariants:**
- Only derived insights are shareable (never raw entries)
- Sharing is opt-in, never automatic
- Export formats are deterministic
- Boundary between private and shared is explicit

---

## Layer 7: Observer Layer

**Status:** ❌ Does not exist yet

**Definition:** Continuity of self, witnessing stance.

This layer would provide continuity of self over time. It would remember what mattered before, notice drift, name recurring tensions, and hold themes without forcing resolution. It is a stance, not a feature.

**What it is not:**
- Not a lens
- Not a page
- Not a dashboard
- Not output
- Not metrics-first

**What it would be:**
- A witnessing stance
- Continuity of self over time
- Accompaniment, not coaching
- Quiet center of gravity
- Discovered, not served

---

## What Feels Off and Why

The system answers **what happened** but not **what it means in the arc of life**.

This gap exists because **continuity of self is missing**.

Without the Observer layer, insights feel disconnected from your ongoing story. Patterns are detected, but their meaning in the context of your life's trajectory is not held. The system can tell you what happened this week, this year, or across your lifetime, but it cannot witness how those moments connect to who you are becoming.

The Observer layer would provide that continuity—not by adding features, but by adopting a witnessing stance that holds your story over time.

---

## Layer Stack Invariants

1. **Order is fixed:** Layers must be built bottom-up. No layer can be skipped.
2. **Dependencies are strict:** Each layer depends on all layers below it.
3. **Completeness is required:** A layer is not "done" until all layers below it are stable.
4. **Observer comes last:** The Observer layer cannot be built until all other layers are mechanically complete and experientially articulated.

---

## Build Order

1. Identity and Trust (Layer 1)
2. Encrypted Memory (Layer 2)
3. Time and Structure (Layer 3)
4. Insight Computation (Layer 4)
5. Lens Layer (Layer 5)
6. Sharing and Externalization (Layer 6)
7. Observer Layer (Layer 7) ← **Not yet built**

The Observer layer is the final layer. It cannot be built until the system below it is stable and the experiential articulation is complete.


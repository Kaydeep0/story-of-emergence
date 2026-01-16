# Story of Emergence

Story of Emergence is a privacy-first, client-side encrypted personal knowledge system built with Next.js.

All reflections, insights, and shared artifacts are encrypted locally using AES-GCM. Only ciphertext is ever stored in Supabase. Decryption, computation, and insight generation occur entirely on the client after explicit user consent.

This repository contains the full web application, including the encrypted journaling engine, insights pipeline, and wallet-based sharing capsule system.

Story of Emergence exists to explore how meaning, memory, and insight emerge from encrypted personal data without collapsing structure through premature measurement or optimization. Interpretation remains external to the machine and agency remains with the human observer.

## Product Posture

A mirror that can speak, but cannot steer.

Story of Emergence is a private, encrypted vault that computes structure locally and reflects it back as a second voice.
There is no coaching. No rewards. No streaks. No optimization loops.

The system allows insight.
It explicitly forbids control.

Story of Emergence does not coach, improve, optimize, or direct behavior. It does not infer goals, assess progress, or suggest interpretations. The system's role ends at rendering structure. Meaning and action remain external to the system.

All insights are derived from past data only. The system never recommends, nudges, or shapes future behavior. Interpretation and action belong solely to the human observer.

All insights are presented as observations only; interpretation and meaning are left to the human observer.

Story of Emergence is grounded in scale-resolved theories of connectivity, not aggregate metrics.

### System Flow (Conceptual)

```
Encrypted Reflections
        ↓
Local Client-Side Computation
        ↓
Observed Structure
        ↓
Human Interpretation
```

## Theoretical Foundation

Story of Emergence is not a productivity tool or a conventional journaling app.

It is a research-driven system built around a single structural claim:

**Connectivity is governed by how correlation is distributed across scales, not by how much correlation exists in total.**

This project is grounded in original research that formalizes this claim in information-theoretic terms and demonstrates it using falsifiable models.

### Research Foundation

**Scale-Resolved Correlation as a Control Variable in Emergent Connectivity**  
Kirandeep Kaur  
Independent Research, January 2026  
https://github.com/Kaydeep0/scale-structure-tests

The paper shows that two systems can exhibit identical total mutual information yet differ radically in operational connectivity. The difference is not geometry, intensity, or volume, but where correlation resides across hierarchical scales.

In operational terms:

• Total activity does not determine what can connect

• Structure across scales determines what can transmit, reconstruct, or reorganize

• Scalar summaries discard precisely the information that governs connectivity

### Story of Emergence Domain

Story of Emergence is concerned with:

• Memory

• Meaning

• Connectivity

• Insight

• Observer position

People can record the same volume of experience, write the same amount, or appear identical under surface metrics, yet differ profoundly in how their internal system reorganizes over time.

The research explains why.

Meaning is layered.
Connectivity depends on scale.
Magnitude alone is insufficient.

This insight constrains Story of Emergence at the architectural level. The system avoids collapsing structure into global scores, sentiment metrics, or engagement proxies.

This restraint is grounded in the system's theory of information, memory, and structure. See [THEORY.md](THEORY.md).

### Architectural Consequence

The theoretical result is encoded as a spine-level invariant in the system architecture:

• No subsystem may infer coherence, progress, or connectivity from totals alone

• Observation mechanisms must respect scale distribution and uncertainty

• Future observer layers are constrained by theory before they are implemented

This invariant is documented in [ARCHITECTURE_NOW.md](docs/ARCHITECTURE_NOW.md) and expanded in [THEORY.md](THEORY.md).

### Status

The theory precedes implementation.

Story of Emergence delays certain observation and interpretation layers as a consequence of the theoretical constraint that structure must not be prematurely compressed.

Future layers will inherit this foundation.

## Start Here

Read [docs/0_START_HERE.md](docs/0_START_HERE.md) before making changes.

Daily work is governed by:

• [docs/PROTOCOL_START_OF_DAY.md](docs/PROTOCOL_START_OF_DAY.md)

• [docs/PROTOCOL_END_OF_DAY.md](docs/PROTOCOL_END_OF_DAY.md)

**Returning after time away?**  
Run the Re-Entry Protocol first: [docs/PROTOCOL_REENTRY_AND_PROGRESS.md](docs/PROTOCOL_REENTRY_AND_PROGRESS.md)

## Core Project Laws

All non-negotiable constraints, invariants, and system posture are defined in [docs/0_START_HERE.md](docs/0_START_HERE.md).

These documents are enforceable constraints, not inspiration.

## Tech Stack

• Next.js 15 (App Router, Turbopack)

• Supabase (database with strict row-level security)

• Client-side AES-GCM encryption

• RainbowKit + Wagmi (wallet auth and signature-based key derivation)

• TypeScript

• React Server Components

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Then open:

```
http://localhost:3000
```

The app auto-reloads as files change.

## Project Structure

```
src/
  app/
    reflections/
    insights/
    shared/
    api/
  lib/
    crypto/
    insights/
    contacts/
    entries/
supabase/
  migrations/
public/
```

**Key directories:**

• `src/app` — UI routes for Reflections, Insights, and Shared Capsules

• `src/lib` — encryption, RPCs, insight engine, contacts

• `supabase/migrations` — SQL migrations and RLS policies

• `public` — static assets

## Core Features

### 1. Client-Side Encryption

All journaling data and shared content is encrypted before leaving the browser.

Keys are derived from:

• Wallet signature

• Session-scoped consent

• AES-GCM with versioned envelopes

### 2. Encrypted Contacts

All contact labels and metadata are encrypted uniquely per user.

### 3. Shared Capsules

Users may share encrypted slices of their data.

Capsules include:

• Wrapped content keys

• Sender wallet metadata

• Optional expiration

• Client-side verification

### 4. Insight Engine (Phase 1)

Local analytics compute:

• Timeline spikes

• Always-on summaries

• Cross-reflection link patterns

All insights are computed on-device and never leave the browser.

## Development Server Rules (Important)

Story of Emergence must always run on port 3000.

If Next.js falls back to another port, a previous instance is still running.

Fix port conflicts carefully and only terminate processes that clearly belong to this project.

Cursor agents must never modify documentation files.

## Final Note

Story of Emergence is a private, wallet-bound reflection vault.
It reveals structure, timelines, clusters, and distributions as observable facts.

It does not assign meaning, goals, or recommendations.

The system reflects.
The human decides.

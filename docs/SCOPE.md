# Story of Emergence — Scope

Last updated: January 2, 2026

## Product Definition

Story of Emergence is a private, wallet-bound personal intelligence system that transforms encrypted, owner-controlled life data into time-based signals and narrative lenses, while allowing meaning to travel outward through derived artifacts without exposing the raw vault.

---

## Core Features

### 1. Encrypted Ledger (Reflections)
**Status:** COMPLETE and FROZEN

- Wallet identity via RainbowKit + Wagmi
- Consent signature establishes encryption authority
- Session key derived deterministically from signature
- Client-side AES-GCM encryption and decryption
- Supabase stores ciphertext only (RLS locked to wallet)
- Reflections CRUD working end-to-end
- Soft delete / restore patterns
- Pagination, empty states, loading states, toasts
- Export possible at all times

**Routes:**
- `/` - Home/Reflections view
- `/reflections` - Reflections list (if separate route exists)

---

### 2. Insights System
**Status:** PARTIALLY COMPLETE

#### Canonical Insight Engine
**Location:** `src/app/lib/insights/computeInsightsForWindow.ts`

**Current State:**
- Engine exists and is the intended single source of truth
- Weekly lens fully routes through engine
- Summary and Timeline have engine stubs (cards empty, computed separately)
- Yearly, Lifetime, YoY throw errors if called through engine

**Pages Using Canonical Engine:**
- ✅ Weekly (`/insights/weekly`) - Uses `computeInsightsForWindow` with horizon `'weekly'`

**Pages NOT Using Canonical Engine (Direct Compute):**
- ⚠️ Summary (`/insights/summary`) - Uses `computeSummaryInsights` directly
- ⚠️ Timeline (`/insights/timeline`) - Uses `computeTimelineInsights` directly
- ⚠️ Year over Year (`/insights/yoy`) - Uses `computeYearOverYearCard` directly
- ⚠️ Distributions (`/insights/distributions`) - Uses `computeDistributionLayer` directly
- ⚠️ Yearly (`/insights/yearly`) - Uses distribution compute directly
- ⚠️ Lifetime (`/insights/lifetime`) - Uses its own compute path

**Insight Routes:**
- `/insights` - Redirects to `/insights/summary`
- `/insights/weekly` - Weekly lens (uses canonical engine)
- `/insights/summary` - Summary lens (direct compute)
- `/insights/timeline` - Timeline lens (direct compute)
- `/insights/yearly` - Yearly lens (direct compute)
- `/insights/yearly-wrap` - Yearly wrap view
- `/insights/distributions` - Distributions analysis
- `/insights/yoy` - Year over Year comparison
- `/insights/lifetime` - Lifetime signal inventory
- `/insights/arc` - Stub (not available)
- `/insights/compare` - Comparison view
- `/insights/year/[year]` - Stub (not available)

**Lens Contract:**
- Defined in `src/app/insights/lib/lensContract.ts`
- Maps lens keys to routes and status
- All lenses marked as 'available' but engine support varies

---

### 3. Sources System
**Status:** FUNCTIONAL

- External sources CRUD (notes, articles, etc.)
- Source metadata stored encrypted
- Reflection-source linking via `reflection_sources` table
- Backlinks from sources to reflections

**Routes:**
- `/sources` - Sources list page
- `/sources/[sourceId]` - Source detail page with linked reflections

**Components:**
- `SourceCard`, `SourceForm`, `SourceLinkMenu`
- `SourceCardWithBacklinks` (sources detail page)
- `LinkedSourcesBacklinks` (reflections view)

---

### 4. Sharing System
**Status:** PARTIALLY COMPLETE

#### Public Sharing
- Public share image rendering (`PublicShareImage` component)
- Public share routes: `/share/year/[slug]`
- Base64url-encoded payload slugs
- Read-only, no wallet context required

#### Private Sharing (Capsules)
- Encrypted capsule system
- Capsule API routes: `/api/capsules`, `/api/capsules/[capsuleId]`
- ShareCapsuleDialog component
- ShareActionsBar component
- Capsule opening routes: `/shared/open`, `/shared/open/[id]`
- Wallet-to-wallet sharing routes: `/shared/wallet/[id]`

**Sharing Routes:**
- `/share/[capsuleId]` - Legacy share pack renderer
- `/share/year/[slug]` - Public year share page
- `/shared` - Shared items landing
- `/shared/open` - Open capsule from URL param
- `/shared/open/[id]` - Open capsule by ID
- `/shared/wallet/[id]` - Wallet share page (stub)

**Remaining Work:**
- Preview = export rendering contract
- Platform frame presets
- Web Share integration with honest fallbacks

---

### 5. API Routes
**Status:** FUNCTIONAL

- `/api/capsules` - Create capsule (POST)
- `/api/capsules/[capsuleId]` - Get capsule (GET)
- `/api/events/log` - Internal events logging (POST)
- `/api/summary` - Summary API endpoint
- `/api/timeline` - Timeline API endpoint

---

## Architecture Components

### Canonical Compute Rule
**Rule:** All insight windows must route through the canonical engine (`computeInsightsForWindow`) and artifact model.

**Current Violations:**
- Summary, Timeline, Yearly, Lifetime, YoY, Distributions all compute directly
- These need to be migrated to use `computeInsightsForWindow` with proper artifact generation

### Data Flow
1. **Reflections** → Loaded via `rpcFetchEntries` → Decrypted client-side
2. **Insights** → Should route through `computeInsightsForWindow` → Returns `InsightArtifact`
3. **Sharing** → Artifacts converted to `ShareArtifact` → Rendered as images/captions
4. **Sources** → External sources stored encrypted → Linked to reflections

### Graph Model Direction
- Reflection-source linking exists (`reflection_sources` table)
- Reflection-reflection linking exists (`reflection_links` table, deprecated)
- Future: Graph traversal for relationship insights

---

## Non-Negotiable System Principles

### Identity and Authority
- Wallet equals identity
- Consent signature equals authority
- Session key derived deterministically from signature
- No cross-user analytics and no cross-wallet data access

### Crypto and Data Handling
- All user content encrypted client-side using AES-GCM
- Supabase stores ciphertext only
- Decryption happens only in browser memory
- Never send plaintext to any server route
- Never add server-side inference or server-side embedding

### Computation
- All insights computed locally in the browser
- Insight computation must run through the canonical insight engine path
- Views must not call recipe compute functions directly

### Sharing
- Default sharing is derived artifacts only
- Raw journal text is never shared by default
- Any raw text inclusion requires explicit opt-in UI and clear labeling
- Sharing must remain honest on web platforms
  - Support download, copy caption, and Web Share API where available
  - Cannot pretend to auto-post to Instagram or TikTok from a desktop web app

---

## Database Schema

### Core Tables
- `entries` - Encrypted reflections (ciphertext only)
- `external_sources` - Encrypted source metadata
- `reflection_sources` - Links reflections to sources (current)
- `reflection_links` - Links reflections to reflections (deprecated, may be removed)
- `shares` / `wallet_shares` - Encrypted capsules for sharing

### RLS Policies
- All tables locked to wallet address via RLS
- No cross-wallet access possible
- RLS policies must not be changed without explicit approval

---

## Out of Scope (Current Phase)

- Lifetime lens full implementation (signal inventory exists, full narrative not yet)
- Private sharing capsules full UI (API exists, UI partial)
- Imports pipeline (sources are manual entry only)
- Graph traversal and relationship insights
- Server-side computation or inference
- Cross-wallet features
- Mobile app (web-only)


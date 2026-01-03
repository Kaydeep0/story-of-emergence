# Story of Emergence — Scope

Last updated: January 2, 2026

## Product Definition

Story of Emergence is a private wallet-bound personal intelligence system that transforms encrypted owner-controlled life data into time-based signals and narrative lenses, and allows meaning to travel outward through derived artifacts without exposing the raw vault.

---

## Non-Negotiable Guarantees

- Wallet equals identity
- Consent signature equals authority
- Deterministic session key derivation
- Client-side AES-GCM encryption
- Supabase stores ciphertext only
- Decryption only in browser memory
- All insights computed locally
- No server-side inference
- No cross-user analytics
- Export is always possible
- Sharing defaults to derived artifacts only

---

## Scope by System View

### Raw View
**Status:** COMPLETE and FROZEN

- Encrypted reflections ledger
- Create, read, update, delete for reflections
- Multi-draft support
- Soft delete, restore, hard delete
- Pagination and search
- Export decrypted JSON client-side

**Routes:**
- `/` - Home/Reflections view
- `/reflections` - Reflections list (if separate route exists)

---

### Observer View
**Status:** FUNCTIONAL

- Insight recipes for time-based observation
- Weekly summaries
- Timeline spikes
- Always-on summary
- Pattern extraction and evidence surfacing
- Internal events logging

**Implementation:**
- Canonical engine: `src/app/lib/insights/computeInsightsForWindow.ts`
- Weekly lens routes through engine ✅
- Summary/Timeline have engine stubs (computed separately)
- Yearly/Lifetime/YoY use direct compute functions

**Routes:**
- `/insights/weekly` - Weekly lens (uses canonical engine)
- `/insights/summary` - Summary lens (direct compute)
- `/insights/timeline` - Timeline lens (direct compute)
- `/insights/distributions` - Distribution analysis

---

### Narrative Views
**Status:** FUNCTIONAL

- Weekly narrative cards with narrative blocks
- Summary narrative surfacing when available
- Yearly narrative lens and yearly wrap
- Lifetime narrative lens
- Year over year lens

**Routes:**
- `/insights/yearly` - Yearly lens
- `/insights/yearly-wrap` - Yearly wrap view
- `/insights/lifetime` - Lifetime signal inventory
- `/insights/yoy` - Year over Year comparison

**Current State:**
- Weekly has full narrative support via canonical engine
- Summary/Timeline narratives computed separately
- Yearly/Lifetime/YoY use dedicated compute paths

---

### Sharing View
**Status:** PARTIALLY COMPLETE

- Derived share artifacts
- Share pack selection and rendering
- Caption helpers
- Share routes and capsule endpoints
- Shared tab and shared open flows
- Guardrails and privacy language

**Routes:**
- `/share/[capsuleId]` - Legacy share pack renderer
- `/share/year/[slug]` - Public year share page
- `/shared` - Shared items landing
- `/shared/open` - Open capsule from URL param
- `/shared/open/[id]` - Open capsule by ID
- `/shared/wallet/[id]` - Wallet share page (stub)

**API Routes:**
- `/api/capsules` - Create capsule (POST)
- `/api/capsules/[capsuleId]` - Get capsule (GET)

**Remaining Work:**
- Preview = export rendering contract
- Platform frame presets
- Web Share integration with honest fallbacks

---

### Sources System
**Status:** FUNCTIONAL

- Sources list and source detail pages
- External sources schema and ingestion placeholders
- Linkage between sources and reflections is a future graph invariant

**Routes:**
- `/sources` - Sources list page
- `/sources/[sourceId]` - Source detail page with linked reflections

**Current Implementation:**
- External sources CRUD (notes, articles, etc.)
- Source metadata stored encrypted
- Reflection-source linking via `reflection_sources` table
- Backlinks from sources to reflections

---

## Graph Model Direction

- Reflections can link many-to-many with sources
- Reflections can link to reflections
- Tags are lightweight nodes
- All relationships computed and stored encrypted client-side

**Current State:**
- Reflection-source linking exists (`reflection_sources` table) ✅
- Reflection-reflection linking exists (`reflection_links` table, deprecated)
- Tags: Not yet implemented
- Graph traversal: Future work

---

## Out of Scope (Current Phase)

- Server-side inference
- Cross-user aggregation
- Auto-posting to social platforms from desktop web
- Mobile app (web-only)
- Imports pipeline (sources are manual entry only)
- Graph traversal and relationship insights (future)

---

## Architecture Notes

### Canonical Compute Rule
**Rule:** All insight windows must route through the canonical engine (`computeInsightsForWindow`) and artifact model.

**Current Violations:**
- Summary, Timeline, Yearly, Lifetime, YoY, Distributions all compute directly
- Only Weekly lens fully routes through canonical engine
- Migration needed for all except Weekly

### Data Flow
1. **Reflections** → Loaded via `rpcFetchEntries` → Decrypted client-side
2. **Insights** → Should route through `computeInsightsForWindow` → Returns `InsightArtifact`
3. **Sharing** → Artifacts converted to `ShareArtifact` → Rendered as images/captions
4. **Sources** → External sources stored encrypted → Linked to reflections

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

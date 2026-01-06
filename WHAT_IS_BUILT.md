# Story of Emergence: "What is Built" Report

**Generated:** 2025-01-XX  
**Scope:** Complete end-to-end inventory of working features, data models, and deployment status

---

## A) Product in One Breath

Story of Emergence is a privacy-first, client-side encrypted personal knowledge system where users connect their Ethereum wallet, sign a consent message to derive an AES-GCM encryption key, and store only ciphertext in Supabase. The system computes insights across multiple time horizons (weekly, yearly, lifetime) entirely on-device, generates narrative bridges between reflections, and allows sharing encrypted capsules with other wallet addresses. All reflection content, insights, and shared artifacts are encrypted before leaving the browser.

### Product Posture

**Core principle:** A Mirror that can speak, but cannot steer.

**What we do:**
- Reveal structure, patterns, tensions, and trajectories from the user's private data
- Compute locally, store ciphertext only, and return interpretations as options

**What we do not do:**
- No streaks
- No coaching
- No behavior shaping loops
- No rewards or punishments
- No engagement traps

**Agency contract:** We present paths and tradeoffs. The user chooses independently. The system does not push a preferred choice.

**Architecture layers:**
- **Vault layer:** Encryption, entries, RLS, storage. Must never break.
- **Lens layer:** Insights computed locally.
- **Meaning layer:** Threads, bridges, pins. Derived structure that connects reflections.
- **Distribution layer:** Sharing and artifacts. Meaning that can travel.

---

## B) Feature Inventory

### ✅ Feature 1: Encrypted Journaling (Phase 0)

**What the user can do:**
- Write reflections in a textarea
- Save reflections (encrypted client-side before storage)
- View list of all reflections (decrypted on load)
- Soft delete (move to trash) and restore
- Hard delete (permanent removal)
- Multi-draft system with localStorage persistence
- Export decrypted reflections as JSON

**Where in UI:**
- Route: `/` (Home page)
- Component: `src/app/HomeClient.tsx`

**Main components and files:**
- `src/app/HomeClient.tsx` - Main journaling interface
- `src/app/lib/entries.ts` - Entry CRUD operations (`rpcFetchEntries`, `rpcInsertEntry`, `rpcSoftDelete`, `rpcHardDelete`, `restoreEntryRpc`)
- `src/app/lib/drafts.ts` - Draft management (localStorage)
- `src/app/lib/useEncryptionSession.ts` - Key derivation and session management
- `src/lib/crypto.ts` - AES-GCM encryption/decryption

**Data flow summary:**
1. User types reflection → stored in React state
2. On save → `rpcInsertEntry` called with wallet + sessionKey
3. Plaintext JSON stringified → encrypted via `aesGcmEncryptText` (v1 format: `v1:<base64(iv||ciphertext+tag)>`)
4. Supabase RPC `insert_entry` called with ciphertext
5. RPC verifies wallet matches header → inserts row
6. On load → `rpcFetchEntries` → decrypts each row client-side

**DB tables or RPCs touched:**
- Table: `public.entries` (assumed to exist, referenced by FK in `entry_sources`)
  - Columns: `id uuid`, `wallet_address text`, `ciphertext text`, `created_at timestamptz`, `deleted_at timestamptz`
- RPC: `list_entries(w text, include_deleted boolean)` - Returns encrypted rows
- RPC: `insert_entry(w text, cipher text)` - Inserts encrypted entry
- RPC: `soft_delete_entry(w text, entry_id uuid)` - Sets `deleted_at`
- RPC: `restore_entry(w text, entry_id uuid)` - Clears `deleted_at`
- RPC: `hard_delete_entry(w text, entry_id uuid)` - Permanent delete

**Status:** ✅ **Working**

**Known risks or bugs:**
- `entries` table creation migration not found in repo (may exist in Supabase but not tracked)
- Legacy decryption fallback for old base64 format (may fail silently on corrupted data)

---

### ✅ Feature 2: Insights Engine (Phase 1 & 2)

**What the user can do:**
- View insights across 7 lenses: Weekly, Summary, Timeline, Yearly, Distributions, Year-over-Year, Lifetime
- See computed cards with explanations and evidence
- Navigate between lenses via tabs
- Share insights as PNG images or encrypted capsules
- View insights for specific years

**Where in UI:**
- Routes:
  - `/insights` - Hub with tab navigation
  - `/insights/weekly` - Weekly lens
  - `/insights/summary` - Summary lens (always-on)
  - `/insights/timeline` - Timeline lens (waveform visualization)
  - `/insights/yearly` - Yearly lens (archetype, identity, moments)
  - `/insights/distributions` - Distribution patterns
  - `/insights/yoy` - Year-over-year comparison
  - `/insights/lifetime` - Lifetime cumulative metrics
  - `/insights/year/[year]` - Specific year view

**Main components and files:**
- `src/app/insights/page.tsx` - Insights hub
- `src/app/lib/insights/computeInsightsForWindow.ts` - Canonical insight computation
- `src/app/lib/insightEngine.ts` - Unified engine (`computeTimelineInsights`, `computeSummaryInsights`)
- `src/app/lib/insights/computeAllInsights.ts` - Routes to canonical engine
- `src/app/lib/insights/distributionLayer.ts` - Distribution analysis
- `src/app/lib/insights/yearlyWrap.ts` - Yearly wrap computation
- `src/app/lib/weeklyInsights.ts` - Weekly insights (legacy, still used)
- `src/app/components/InsightSignalCard.tsx` - Card rendering
- `src/app/components/ShareActionsBar.tsx` - Share UI

**Data flow summary:**
1. User navigates to lens → `rpcFetchEntries` loads all reflections
2. Reflections decrypted client-side → converted to `ReflectionEntry[]`
3. Time window computed based on lens (e.g., last 7 days for Weekly, last 365 days for Yearly)
4. `computeInsightsForWindow` called with entries + window
5. Distribution layer analyzes frequency patterns
6. Cards generated with metrics, explanations, evidence
7. UI renders cards → user can share via `ShareActionsBar`

**DB tables or RPCs touched:**
- Uses `public.entries` via `rpcFetchEntries` (no direct DB access)
- All computation happens client-side (no RPCs for insights)

**Status:** ✅ **Working** (Phase 2 complete per `docs/STATUS.md`)

**Known risks or bugs:**
- Weekly insights still uses legacy `computeWeeklyInsights` (not fully migrated to canonical engine)
- Year-over-year computation not yet in canonical engine (uses `computeYearOverYearCard`)

---

### ✅ Feature 3: Narrative Bridges / Threads (Phase 2.1)

**What the user can do:**
- View "Threads" page showing narrative bridges between reflections
- Generate bridges for existing reflections (dev-only button)
- See bridge explanations ("Why these are connected")
- View bridge reasons as chips (sequence, contrast, systemic, media)
- Open thread view for a specific reflection
- Navigate threads in "Cabin mode" (clean reading view)
- Pin bridges to Pins page

**Where in UI:**
- Routes:
  - `/threads` - Threads list page (dev validation)
  - `/reflections/thread/[id]` - Single thread view
  - `/reflections/pins` - Pinned bridges/clusters/threads

**Main components and files:**
- `src/app/threads/page.tsx` - Threads list with bridge generation
- `src/app/reflections/thread/[id]/page.tsx` - Thread view with cabin mode
- `src/app/lib/meaningBridges/buildNarrativeBridge.ts` - Bridge generation logic (1281 lines)
- `src/app/lib/meaningBridges/validateBridges.dev.ts` - Validation harness
- `src/app/components/ThreadConnections.tsx` - Bridge display component
- `src/app/components/BridgeCardCabin.tsx` - Cabin mode bridge card
- `src/app/components/ContinueThreadButton.tsx` - Thread navigation

**Data flow summary:**
1. User clicks "Generate Bridges" → loads all reflections
2. Client-side bridge generation runs → evaluates reflection pairs
3. Bridges scored using heuristics (sequence, scale, systemic, media, contrast)
4. Bridges encrypted → upserted to `reflection_link_bridges` table
5. UI fetches bridges via `list_reflection_link_bridges` RPC
6. Bridges decrypted → displayed with explanations

**DB tables or RPCs touched:**
- Table: `public.reflection_link_bridges`
  - Columns: `id uuid`, `wallet_address text`, `from_reflection_id uuid`, `to_reflection_id uuid`, `ciphertext text`, `iv text`, `alg text`, `version int`, `created_at timestamptz`, `updated_at timestamptz`
- RPC: `list_reflection_link_bridges(w text, p_limit integer, p_offset integer)` - Returns bridges
- RPC: `upsert_reflection_link_bridge` (from migration 017) - Upserts bridge

**Status:** ⚠️ **Partially Working** (Dev validation complete, coverage ~84%, 16 orphan reflections)

**Known risks or bugs:**
- Coverage not reaching 85% target (currently 84%)
- Orphan reflections not clearly explained in UI
- Bridge generation is deterministic but may produce low-quality explanations
- Some bridges marked as `isFallback` (generic template text)
- Legacy `reflection_sources` table still exists (migration 019, 020) but should use `entry_sources`

---

### ✅ Feature 4: Source Linking System (Phase 5.2)

**What the user can do:**
- Create external sources (YouTube, books, articles, podcasts, notes, links, files)
- Link sources to reflections
- View sources linked to a reflection
- View reflections linked to a source
- Manage sources list

**Where in UI:**
- Routes:
  - `/sources` - Sources management page
  - `/sources/[sourceId]` - Single source view
  - `/` (Home) - Source linking menu on reflections

**Main components and files:**
- `src/app/sources/page.tsx` - Sources list and creation
- `src/app/lib/sources.ts` - Source CRUD (`insertSource`, `listSources`, `updateSource`, `deleteSource`)
- `src/app/lib/entrySources.ts` - Entry-source linking (`linkSourceToEntry`, `unlinkSourceFromEntry`, `listSourcesForEntry`, `listEntriesForSource`)
- `src/app/components/SourceForm.tsx` - Source creation form
- `src/app/components/LinkedSourcesBacklinks.tsx` - Display linked sources
- `src/app/components/SourceLinkMenu.tsx` - Link source to reflection

**Data flow summary:**
1. User creates source → `insertSource` encrypts metadata → stores in `sources` table
2. User links source to entry → `linkSourceToEntry` inserts into `entry_sources` bridge table
3. On reflection view → `listSourcesForEntry` fetches linked sources → decrypts metadata
4. On source view → `listEntriesForSource` fetches linked entries

**DB tables or RPCs touched:**
- Table: `public.sources` (migration 021)
  - Columns: `id uuid`, `user_wallet text`, `kind text`, `title text`, `author text`, `url text`, `external_id text`, `metadata jsonb`, `created_at timestamptz`, `updated_at timestamptz`
- Table: `public.entry_sources` (migration 021)
  - Columns: `id uuid`, `user_wallet text`, `entry_id uuid` (FK to `entries`), `source_id uuid` (FK to `sources`), `note text`, `created_at timestamptz`
- No RPCs (uses direct Supabase queries with RLS)

**Status:** ✅ **Working** (Migration 021 applied, code updated to use `sources` and `entry_sources`)

**Known risks or bugs:**
- Legacy files `externalSources.ts` and `reflectionSources.ts` still exist but are unused (can be deleted)
- Runtime check `checkSourcesTableExists` warns if tables missing (good safety net)
- Schema verification script `scripts/checkSchema.ts` exists but requires manual run

---

### ✅ Feature 5: Sharing System (Phase 3)

**What the user can do:**
- Share insights as PNG images (download)
- Share insights as encrypted capsules to wallet addresses
- View received shares in `/shared` page
- Open and decrypt received capsules
- Revoke sent shares

**Where in UI:**
- Routes:
  - `/shared` - Received shares list
  - `/shared/wallet/[id]` - Wallet-specific shares
  - `/shared/open/[id]` - Open a received capsule
  - `/share/[capsuleId]` - Public share link (if implemented)

**Main components and files:**
- `src/app/shared/page.tsx` - Shares list
- `src/app/shared/open/[id]/page.tsx` - Capsule opening
- `src/app/lib/shares.ts` - Share CRUD (`rpcInsertShare`, `rpcFetchShares`)
- `src/app/lib/share/sharePack.ts` - SharePack contract (canonical type)
- `src/app/lib/share/buildShareText.ts` - Platform-specific caption generation
- `src/app/lib/share/exportPng.ts` - PNG export via `html-to-image`
- `src/app/insights/yearly/components/SharePackBuilder.tsx` - Yearly wrap share builder

**Data flow summary:**
1. User clicks share → `SharePackBuilder` builds `SharePack` object
2. For PNG: `exportPng` uses `html-to-image` to capture DOM → downloads blob
3. For wallet share: Content encrypted with content key → key wrapped for recipient → stored in `wallet_shares` table
4. Recipient opens share → decrypts wrapped key → decrypts content → displays

**DB tables or RPCs touched:**
- Table: `public.shares` (migration 003)
  - Columns: `id uuid`, `sender_wallet text`, `recipient_wallet text`, `slice_kind text`, `title text`, `ciphertext text`, `expires_at timestamptz`, `created_at timestamptz`
- Table: `public.accepted_shares` (migration 003)
  - Columns: `id uuid`, `wallet_address text`, `share_id uuid`, `slice_kind text`, `title text`, `ciphertext text`, `source_label text`, `received_at timestamptz`, `created_at timestamptz`
- Table: `public.wallet_shares` (migration 014)
  - Columns: `id uuid`, `created_by_wallet text`, `recipient_wallet text`, `kind text`, `ciphertext text`, `iv text`, `wrapped_key text`, `expires_at timestamptz`, `revoked_at timestamptz`, `version text`, `message text`
- Table: `public.capsules` (migration 010)
  - Columns: `capsule_id text`, `ciphertext text`, `wrapped_key text`, `recipient_pubkey text`, `checksum text`, `created_at timestamptz`, `expires_at timestamptz`, `sender_wallet text`
- RPC: `insert_share`, `get_share`, `list_accepted_shares`, `insert_accepted_share`, `delete_accepted_share`
- RPC: `insert_wallet_share`, `list_wallet_shares_sent`, `list_wallet_shares_received`, `get_wallet_share`, `revoke_wallet_share`
- RPC: `insert_capsule`, `get_capsule`

**Status:** ⚠️ **Partially Working** (Multiple sharing systems exist, unclear which is canonical)

> NOTE  
> SharePack is now the canonical sharing spine across all lenses.  
> This file will be updated with a formal SharePack capability section **after post-stability cleanup** is complete, to avoid documenting moving targets.

**Known risks or bugs:**
- Four different sharing tables (`shares`, `accepted_shares`, `wallet_shares`, `capsules`) - unclear which is primary
- SharePack builder exists but may not be fully integrated with all sharing paths
- Public share links (`/share/[capsuleId]`) may not be implemented

---

### ✅ Feature 6: Pins System (Phase 2.1)

**What the user can do:**
- Pin clusters, threads, or bridges
- View pinned artifacts in `/reflections/pins`
- Delete pins

**Where in UI:**
- Route: `/reflections/pins` - Pins list page

**Main components and files:**
- `src/app/reflections/pins/page.tsx` - Pins view
- `src/app/lib/pins.ts` - Pin CRUD operations
- `src/app/lib/meaningBridges/buildNarrativeBridge.ts` - Bridge pinning integration

**Data flow summary:**
1. User pins artifact → encrypted payload created → stored in `derived_artifacts` table
2. On pins page → `list_derived_artifacts` RPC fetches → decrypts → displays

**DB tables or RPCs touched:**
- Table: `public.derived_artifacts` (migration 015)
  - Columns: `id uuid`, `wallet_address text`, `kind text`, `scope text`, `ciphertext text`, `encryption_version integer`, `created_at timestamptz`, `updated_at timestamptz`
- RPC: `insert_derived_artifact`, `list_derived_artifacts`, `update_derived_artifact`, `delete_derived_artifact`

**Status:** ✅ **Working**

**Known risks or bugs:**
- None identified

---

### ✅ Feature 7: Mind View (Graph Visualization)

**What the user can do:**
- View force-directed graph of reflections
- See clusters and connections
- Navigate to thread view from graph nodes

**Where in UI:**
- Route: `/reflections/mind` - Mind view page

**Main components and files:**
- `src/app/reflections/mind/page.tsx` - Mind view page
- `src/app/components/clusters/SpatialClusterLayout.tsx` - Graph layout
- Uses `react-force-graph-2d` library

**Data flow summary:**
1. Loads reflections → builds graph locally using TF-IDF cosine similarity
2. Graph cached in localStorage (encrypted)
3. Clusters computed via connected components
4. Graph rendered with force-directed layout

**DB tables or RPCs touched:**
- Uses `public.entries` via `rpcFetchEntries`
- Graph stored in localStorage (not in DB)

**Status:** ✅ **Working**

**Known risks or bugs:**
- Graph computation may be expensive for large reflection sets
- localStorage cache may become stale

---

### ✅ Feature 8: Contacts System

**What the user can do:**
- Store encrypted contact labels for wallet addresses
- View contacts list

**Where in UI:**
- Not visible in main UI (may be used internally for sharing)

**Main components and files:**
- `src/app/lib/contacts.ts` - Contact CRUD

**Data flow summary:**
1. Contact label encrypted → stored in `contacts` table
2. On load → `list_contacts` RPC fetches → decrypts labels

**DB tables or RPCs touched:**
- Table: `public.contacts` (migration 004)
  - Columns: `id uuid`, `wallet_address text`, `contact_wallet text`, `ciphertext text`, `created_at timestamptz`
- RPC: `insert_contact`, `list_contacts`, `delete_contact`

**Status:** ✅ **Working** (but not prominently used in UI)

**Known risks or bugs:**
- Contacts UI not visible in main navigation

---

## C) Data Model and Security

### Database Tables

#### ✅ `public.entries` (Journal entries)
- **Purpose:** Stores encrypted reflection entries
- **Columns:** `id uuid`, `wallet_address text`, `ciphertext text`, `created_at timestamptz`, `deleted_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/UPDATE/DELETE all verify `wallet_address = get_wallet_from_header()`
- **Plaintext metadata:** `wallet_address`, `created_at`, `deleted_at`
- **Encrypted:** `ciphertext` (contains encrypted JSON)

#### ✅ `public.internal_events` (Internal events)
- **Purpose:** Stores navigation and system events
- **Columns:** `id uuid`, `wallet_address text`, `event_at timestamptz`, `ciphertext text`, `encryption_version integer`, `created_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/UPDATE/DELETE all verify `wallet_address = get_wallet_from_header()`
- **Plaintext metadata:** `wallet_address`, `event_at`, `created_at`
- **Encrypted:** `ciphertext` (may contain unencrypted metadata for navigation events per migration 002)

#### ✅ `public.sources` (External sources)
- **Purpose:** Stores external source metadata (YouTube, books, articles, etc.)
- **Columns:** `id uuid`, `user_wallet text`, `kind text`, `title text`, `author text`, `url text`, `external_id text`, `metadata jsonb`, `created_at timestamptz`, `updated_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/UPDATE/DELETE all verify `user_wallet = get_wallet_from_header()`
- **Plaintext metadata:** All columns (metadata is JSONB, may contain encrypted fields)
- **Encrypted:** `metadata` field may contain encrypted notes/tags (encrypted client-side)

#### ✅ `public.entry_sources` (Entry-source links)
- **Purpose:** Bridge table linking entries to sources
- **Columns:** `id uuid`, `user_wallet text`, `entry_id uuid` (FK to `entries`), `source_id uuid` (FK to `sources`), `note text`, `created_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/DELETE all verify `user_wallet = get_wallet_from_header()`
- **Plaintext metadata:** All columns
- **Encrypted:** None (links are metadata)

#### ✅ `public.reflection_link_bridges` (Narrative bridges)
- **Purpose:** Stores encrypted semantic bridges between reflection pairs
- **Columns:** `id uuid`, `wallet_address text`, `from_reflection_id uuid`, `to_reflection_id uuid`, `ciphertext text`, `iv text`, `alg text`, `version int`, `created_at timestamptz`, `updated_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/UPDATE/DELETE all verify `wallet_address = get_wallet_from_header()`
- **Plaintext metadata:** `wallet_address`, `from_reflection_id`, `to_reflection_id`
- **Encrypted:** `ciphertext`, `iv` (encrypted bridge payload)

#### ✅ `public.derived_artifacts` (Pins)
- **Purpose:** Stores encrypted pin payloads
- **Columns:** `id uuid`, `wallet_address text`, `kind text`, `scope text`, `ciphertext text`, `encryption_version integer`, `created_at timestamptz`, `updated_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/UPDATE/DELETE all verify `wallet_address = get_wallet_from_header()`
- **Plaintext metadata:** `wallet_address`, `kind`, `scope`
- **Encrypted:** `ciphertext` (encrypted pin payload JSON)

#### ✅ `public.contacts` (Encrypted contacts)
- **Purpose:** Stores encrypted contact labels
- **Columns:** `id uuid`, `wallet_address text`, `contact_wallet text`, `ciphertext text`, `created_at timestamptz`
- **RLS:** ✅ Enabled
- **Policies:** SELECT/INSERT/DELETE all verify `wallet_address = get_wallet_from_header()`
- **Plaintext metadata:** `wallet_address`, `contact_wallet`
- **Encrypted:** `ciphertext` (encrypted contact label)

#### ⚠️ `public.shares` (Legacy shares)
- **Purpose:** Stores shared slices (legacy)
- **RLS:** ✅ Enabled
- **Status:** May be superseded by `wallet_shares` or `capsules`

#### ⚠️ `public.accepted_shares` (Legacy accepted shares)
- **Purpose:** Recipient's accepted shares (legacy)
- **RLS:** ✅ Enabled
- **Status:** May be superseded by `wallet_shares`

#### ⚠️ `public.wallet_shares` (Wallet-based shares)
- **Purpose:** Stores wallet-to-wallet shares with wrapped keys
- **RLS:** ✅ Enabled
- **Status:** Active sharing system

#### ⚠️ `public.capsules` (Capsule shares)
- **Purpose:** Stores encrypted capsules for advanced sharing
- **RLS:** ✅ Enabled
- **Status:** Active sharing system

#### ⚠️ `public.reflection_sources` (Legacy)
- **Purpose:** Legacy table (migrations 012, 013, 019, 020)
- **Status:** ❌ **Deprecated** - Should use `entry_sources` instead

#### ⚠️ `public.external_sources` (Legacy)
- **Purpose:** Legacy table (migration 011)
- **Status:** ❌ **Deprecated** - Should use `sources` instead

#### ⚠️ `public.entries_external` (External entries)
- **Purpose:** Stores external entries imported from sources
- **RLS:** ✅ Enabled
- **Status:** May be unused or legacy

### RPC Functions

**Entry Management:**
- `list_entries(w text, include_deleted boolean)` - Returns encrypted entries
- `insert_entry(w text, cipher text)` - Inserts encrypted entry
- `soft_delete_entry(w text, entry_id uuid)` - Soft delete
- `restore_entry(w text, entry_id uuid)` - Restore from trash
- `hard_delete_entry(w text, entry_id uuid)` - Permanent delete

**Internal Events:**
- `insert_internal_event(w text, p_event_at timestamptz, p_ciphertext text, p_encryption_version integer)` - Insert event
- `list_internal_events(w text, p_limit integer, p_offset integer)` - List events
- `list_internal_events_by_range(w text, p_start timestamptz, p_end timestamptz)` - Range query
- `log_internal_event(wallet text, event_type text, ts timestamptz)` - Simple logging (unencrypted metadata)

**Bridges:**
- `list_reflection_link_bridges(w text, p_limit integer, p_offset integer)` - List bridges
- `upsert_reflection_link_bridge` (migration 017) - Upsert bridge

**Sources:**
- No RPCs (uses direct Supabase queries with RLS)

**Sharing:**
- `insert_share`, `get_share`, `list_accepted_shares`, `insert_accepted_share`, `delete_accepted_share`
- `insert_wallet_share`, `list_wallet_shares_sent`, `list_wallet_shares_received`, `get_wallet_share`, `revoke_wallet_share`
- `insert_capsule`, `get_capsule`

**Pins:**
- `insert_derived_artifact`, `list_derived_artifacts`, `update_derived_artifact`, `delete_derived_artifact`

**Contacts:**
- `insert_contact`, `list_contacts`, `delete_contact`

### Wallet Header / Auth Assumptions

- **No server-side authentication** - All authorization via RLS policies
- **Wallet address from header:** `x-wallet-address` header set by client
- **Helper function:** `get_wallet_from_header()` reads header and normalizes to lowercase
- **Client sets header:** `getSupabaseForWallet(wallet)` creates Supabase client with header
- **RLS pattern:** All policies verify `lower(wallet_address) = get_wallet_from_header()`

---

## D) Encryption and Key Handling

### Key Derivation

**Flow:**
1. User connects wallet via RainbowKit/Wagmi
2. `useEncryptionSession` hook detects wallet connection
3. Checks `sessionStorage` for existing session (key: `soe_encryption_session_${wallet}`)
4. If missing or expired (>24 hours), requests `personal_sign`:
   - Message: `"Story of Emergence — encryption key consent for {address}"`
   - User approves in wallet → signature hex received
5. Key derivation:
   - Signature hex → `hexToBytes` → SHA-256 digest → `crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])`
6. Session stored in `sessionStorage`:
   ```json
   {
     "walletAddress": "0x...",
     "signature": "0x...",
     "consentTimestamp": 1234567890
   }
   ```
7. Key cached in React state (never persisted to disk)

**Files:**
- `src/lib/crypto.ts` - `deriveKeyFromSignature(address)`, `keyFromSignatureHex(hexSig)`
- `src/app/lib/useEncryptionSession.ts` - Session management hook

### What is Encrypted

**Encrypted before storage:**
- ✅ Reflection entries (`ciphertext` in `entries` table)
- ✅ Internal events (`ciphertext` in `internal_events` table) - *Note: navigation events may be unencrypted per migration 002*
- ✅ Narrative bridges (`ciphertext` + `iv` in `reflection_link_bridges` table)
- ✅ Pins (`ciphertext` in `derived_artifacts` table)
- ✅ Contact labels (`ciphertext` in `contacts` table)
- ✅ Source metadata (`metadata` JSONB in `sources` table) - encrypted client-side before insert
- ✅ Shared capsules (`ciphertext` in `wallet_shares`, `capsules` tables)

**Encryption format:**
- **Current:** `v1:<base64(iv||ciphertext+tag)>` (AES-GCM, 12-byte IV, 16-byte tag)
- **Legacy:** Base64-encoded JSON (fallback supported)

**Encryption functions:**
- `aesGcmEncryptText(sessionKey, plaintext)` → v1 format string
- `aesGcmDecryptText(sessionKey, ciphertext)` → plaintext
- `encryptJSON(sessionKey, obj)` → v1 format string (JSON stringified first)

### What Metadata is Stored in Plaintext

**Always plaintext:**
- `wallet_address` / `user_wallet` (all tables)
- `created_at`, `updated_at`, `deleted_at` (timestamps)
- `from_reflection_id`, `to_reflection_id` (bridge table)
- `entry_id`, `source_id` (link tables)
- `kind`, `scope` (categorical fields)
- `iv`, `alg`, `version` (encryption metadata)

**May be plaintext:**
- Source `title`, `author`, `url`, `external_id` (user choice)
- Internal event `ciphertext` for navigation events (unencrypted JSON per migration 002)

### Failure Modes and Recovery

**Key loss:**
- ❌ **No recovery** - If user loses wallet or signature, data is permanently inaccessible
- Keys are derived from signature, not stored
- No key escrow or backup mechanism

**Decryption failures:**
- Legacy format fallback: `tryDecodeLegacyJSON` attempts base64 decode
- If decryption fails: Entry shows `"Unable to decrypt this entry"` message
- No automatic retry or key rotation

**Session expiration:**
- Consent expires after 24 hours
- User must re-sign to continue
- No automatic re-consent

**Corrupted ciphertext:**
- No checksum validation before decryption
- Decryption failures may throw errors (caught and displayed as "Unable to decrypt")

---

## E) Insights Engine

### Lenses Implemented

1. ✅ **Weekly** (`/insights/weekly`)
   - Computes weekly distribution cards
   - Uses `computeWeeklyInsights` (legacy) or `computeInsightsForWindow` (canonical)

2. ✅ **Summary** (`/insights/summary`)
   - Always-on summary cards
   - Uses `computeSummaryInsights` (canonical engine)

3. ✅ **Timeline** (`/insights/timeline`)
   - Temporal waveform visualization
   - Uses `computeTimelineInsights` (canonical engine)

4. ✅ **Yearly** (`/insights/yearly`)
   - Year narrative, archetype, identity line, moments
   - Uses `computeInsightsForWindow` + yearly-specific logic
   - Includes SharePack builder

5. ✅ **Distributions** (`/insights/distributions`)
   - Distribution pattern analysis (normal, lognormal, powerlaw, mixed)
   - Uses `distributionLayer.ts`

6. ✅ **Year-over-Year** (`/insights/yoy`, `/insights/year-over-year`)
   - Compares two years
   - Uses `computeYearOverYearCard` (not yet in canonical engine)

7. ✅ **Lifetime** (`/insights/lifetime`)
   - Cumulative metrics across all time
   - Uses `computeInsightsForWindow` with lifetime window

### Where Computations Happen

**All client-side:**
- `src/app/lib/insights/computeInsightsForWindow.ts` - Canonical computation function
- `src/app/lib/insightEngine.ts` - Unified engine wrapper
- `src/app/lib/insights/distributionLayer.ts` - Distribution analysis
- `src/app/lib/insights/yearlyWrap.ts` - Yearly wrap computation
- `src/app/lib/weeklyInsights.ts` - Weekly insights (legacy)

**No server-side computation** - All insights computed in browser after decryption

### What is Cached

**Client-side caching:**
- Graph cache in `localStorage` (encrypted, keyed by wallet + scope)
- Drafts in `localStorage` (unencrypted, keyed by wallet)
- Session key in `sessionStorage` (signature hex, not key itself)

**No server-side caching** - Insights computed on-demand

### Share Actions and Export Surface

**Share actions available:**
- ✅ Download PNG (via `html-to-image` library)
- ✅ Copy caption (platform-specific text)
- ✅ Share to wallet (encrypted capsule)
- ✅ Public share link (may not be fully implemented)

**Export formats:**
- PNG image (from DOM capture)
- JSON export of decrypted reflections (via `ExportButton`)

**SharePack contract:**
- `src/app/lib/share/sharePack.ts` - Canonical `SharePack` type
- Used by Yearly Wrap share builder
- Fields: `year`, `oneSentenceSummary`, `archetype`, `distributionLabel`, `keyNumbers`, `topMoments`, `mirrorInsight`, `generatedAt`, `privacyLabel`

---

## F) Sharing and Artifacts

### What "Share" Currently Does

**On Insights pages:**
- `ShareActionsBar` component shows share options
- Click share → opens dialog with platform options (Instagram, LinkedIn, X, Threads, TikTok)
- Generate PNG → `exportPng` captures DOM element → downloads blob
- Copy caption → copies platform-specific text to clipboard
- Share to wallet → opens dialog for recipient address → creates encrypted capsule

**On Yearly Wrap page:**
- `SharePackBuilder` component builds `SharePack` object
- Generates canonical share pack → exports PNG or creates capsule
- Uses `buildYearlySharePack` to construct pack from yearly insights

**On Threads page:**
- "Send to Pins" button on bridges (not share, but similar action)

### Share Pack Builder

**Implementation:**
- `src/app/insights/yearly/components/SharePackBuilder.tsx` (1241 lines)
- `src/app/lib/share/sharePack.ts` - SharePack contract
- `src/app/lib/share/buildShareText.ts` - Platform-specific caption generation
- `src/app/lib/share/exportPng.ts` - PNG export

**What it does:**
- Builds `SharePack` from yearly insights data
- Generates platform-specific captions
- Exports PNG images
- Creates encrypted capsules for wallet sharing

### Image Export Details

**Library:** `html-to-image` (npm package)
**Method:** `toPng(element, options)` captures DOM element as PNG
**Target:** Elements marked with `data-share-root` attribute
**Format:** PNG blob downloaded via browser download

### What is Missing for Phase 3 Distribution

**Missing:**
- ❌ Public share links not fully implemented (`/share/[capsuleId]` route exists but may not work)
- ❌ Share pack builder only integrated with Yearly Wrap (not other lenses)
- ❌ No share analytics or tracking
- ❌ No share expiration UI (expires_at exists in DB but not enforced in UI)
- ❌ Multiple sharing systems (`shares`, `wallet_shares`, `capsules`) - unclear which is canonical

---

## G) Source Linking System

### Tables

**✅ `public.sources`** (migration 021)
- Stores external source metadata
- Columns: `id`, `user_wallet`, `kind`, `title`, `author`, `url`, `external_id`, `metadata`, `created_at`, `updated_at`
- RLS enabled, wallet-scoped

**✅ `public.entry_sources`** (migration 021)
- Bridge table linking entries to sources
- Columns: `id`, `user_wallet`, `entry_id` (FK to `entries`), `source_id` (FK to `sources`), `note`, `created_at`
- RLS enabled, wallet-scoped
- Unique constraint on `(entry_id, source_id)`

**❌ `public.reflection_sources`** (migrations 012, 013, 019, 020)
- **Legacy table** - Should not be used
- Code updated to use `entry_sources` instead

**❌ `public.external_sources`** (migration 011)
- **Legacy table** - Should not be used
- Code updated to use `sources` instead

### How Sources are Created and Attached

**Creation:**
1. User navigates to `/sources` page
2. Fills `SourceForm` (kind, title, author, url, etc.)
3. `insertSource` called → encrypts `metadata` → inserts into `sources` table

**Attachment:**
1. User clicks "Link source" on reflection (in Home page)
2. `SourceLinkMenu` shows source picker
3. `linkSourceToEntry` called → inserts into `entry_sources` table
4. UI updates to show linked sources

**Viewing:**
- `LinkedSourcesBacklinks` component displays sources linked to entry
- `listSourcesForEntry` fetches links → decrypts metadata → displays

### Current Errors and Root Cause

**✅ No current errors** - Migration 021 applied, code updated to use correct tables

**Known issues:**
- Legacy files `externalSources.ts` and `reflectionSources.ts` still exist but unused (can be deleted)
- Runtime check `checkSourcesTableExists` warns if tables missing (good safety net)
- Schema verification script exists but requires manual run (`npm run schema:check`)

---

## H) Deployment and Runbook

### How to Run Locally

**Prerequisites:**
- Node.js >= 20
- pnpm (package manager)
- Supabase project with migrations applied
- Ethereum wallet (for testing)

**Steps:**
1. Clone repository
2. Install dependencies: `pnpm install`
3. Set environment variables (see below)
4. Run dev server: `pnpm dev`
5. Open `http://localhost:3000`
6. Connect wallet (Base Sepolia testnet)

**Important:** Dev server must run on port 3000 (see README.md for port conflict resolution)

### Required Environment Variables

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

**Optional:**
- `NEXT_PUBLIC_ENABLE_BRIDGE_BUILDER` - Enable dev bridge builder UI
- `NODE_ENV` - Set to `development` for dev features

**Wallet Connect:**
- Uses Base Sepolia testnet (configured in `src/app/providers/WagmiClientProvider.tsx`)
- No additional env vars needed for wallet

### How to Run Migrations

**Method 1: Supabase SQL Editor (Manual)**
1. Open Supabase dashboard → SQL Editor
2. Copy migration SQL from `supabase/migrations/XXX_name.sql`
3. Paste and run
4. Run `NOTIFY pgrst, 'reload schema';` to refresh PostgREST cache

**Method 2: Supabase CLI (if configured)**
- `supabase db push` (if migrations tracked)

**Migration order:**
- Migrations numbered sequentially (001, 002, 003, ...)
- Must run in order
- Latest: `021_create_sources_and_entry_sources.sql`

### How to Verify Schema

**Runtime check:**
- App checks `sources` table on boot (via `checkSourcesTableExists`)
- Shows warning banner if missing

**Manual verification:**
- Run `npm run schema:check` (uses `scripts/checkSchema.ts`)
- Checks for `public.sources` and `public.entry_sources` tables
- Exits with error if tables missing

**SQL verification:**
```sql
SELECT to_regclass('public.sources') as sources,
       to_regclass('public.entry_sources') as entry_sources;
```

### Common Fixes

**PostgREST schema cache:**
- Run `NOTIFY pgrst, 'reload schema';` in Supabase SQL Editor
- Needed after table creation or RLS policy changes

**Port conflict:**
- Check `lsof -i:3000` to find process using port 3000
- Kill process if it's Story of Emergence: `kill -9 <PID>`
- Restart dev server

**Missing tables:**
- Run migration 021 if `sources` or `entry_sources` missing
- Check `npm run schema:check` output

**RLS policy errors:**
- Verify `get_wallet_from_header()` function exists
- Check wallet address header is set correctly in client
- Verify policies use `lower(wallet_address) = get_wallet_from_header()`

---

## I) Roadmap Alignment

### Phase 0: Encrypted Ledger ✅ **Complete**

**Status:** Fully implemented and stable
- ✅ Client-side encryption (AES-GCM)
- ✅ Key derivation from wallet signature
- ✅ Ciphertext-only storage in Supabase
- ✅ RLS policies enforced
- ✅ Entry CRUD operations working

### Phase 1: Observer/Signal Engine ✅ **Complete**

**Status:** Fully implemented and stable
- ✅ Canonical insight engine (`computeInsightsForWindow`)
- ✅ Weekly, Summary, Timeline lenses working
- ✅ Distribution layer implemented
- ✅ Deterministic outputs for same input
- ✅ All computation client-side

### Phase 2: Narrative Lenses ✅ **Complete**

**Status:** Fully implemented per `docs/STATUS.md`
- ✅ Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime lenses
- ✅ Consistent Share actions across lenses
- ✅ Canonical engine produces real computed output
- ✅ Reflections fallback working

### Phase 2.1: Insight Taxonomy ⚠️ **In Progress**

**Status:** Threads feature in dev validation
- ✅ Narrative bridge generation working
- ✅ Bridge validation harness exists
- ⚠️ Coverage at 84% (target 85%)
- ⚠️ 16 orphan reflections not clearly explained
- ⚠️ Bridge quality may need tuning

### Phase 3: Distribution of Meaning ⚠️ **Partially Complete**

**Status:** Sharing infrastructure exists but incomplete
- ✅ SharePack contract defined
- ✅ PNG export working
- ✅ Encrypted capsules working
- ⚠️ Public share links not fully implemented
- ⚠️ Share pack builder only integrated with Yearly Wrap
- ⚠️ Multiple sharing systems (unclear which is canonical)

### Phase 5.2: Source Linking ✅ **Complete**

**Status:** Migration 021 applied, code updated
- ✅ `sources` and `entry_sources` tables created
- ✅ Source CRUD operations working
- ✅ Entry-source linking working
- ✅ Legacy tables deprecated but still exist

---

## Top 5 Things Most Likely to Break in Prod

1. **Missing `entries` table migration**
   - `entries` table referenced by FK in `entry_sources` but creation migration not found in repo
   - **Risk:** App may fail if table doesn't exist
   - **Mitigation:** Verify table exists in Supabase, add migration if missing

2. **Multiple sharing systems**
   - Four different sharing tables (`shares`, `accepted_shares`, `wallet_shares`, `capsules`)
   - **Risk:** Unclear which system is canonical, may cause confusion or bugs
   - **Mitigation:** Document canonical system, deprecate others

3. **Legacy table references**
   - `reflection_sources` and `external_sources` tables still exist (migrations 012, 013, 019, 020, 011)
   - **Risk:** Code may accidentally use legacy tables
   - **Mitigation:** Delete legacy tables after confirming no code references

4. **Session key expiration**
   - Consent expires after 24 hours, user must re-sign
   - **Risk:** Users may lose work if session expires mid-edit
   - **Mitigation:** Show clear warning before expiration, auto-save drafts

5. **Decryption failures**
   - No checksum validation, corrupted ciphertext may cause errors
   - **Risk:** Data loss if ciphertext corrupted
   - **Mitigation:** Add checksum validation, better error handling

---

## Top 5 Next Tasks with Highest Leverage

1. **Consolidate sharing systems**
   - **Impact:** High - Reduces confusion, simplifies codebase
   - **Effort:** Medium - Need to audit all sharing code, pick canonical system, migrate
   - **Deliverable:** Single canonical sharing system, deprecate others

2. **Complete Threads coverage**
   - **Impact:** High - Core feature incomplete
   - **Effort:** Medium - Tune bridge generation weights, improve orphan handling
   - **Deliverable:** Coverage ≥85%, clear orphan explanation UI

3. **Add `entries` table migration**
   - **Impact:** High - Prevents production failure
   - **Effort:** Low - Create migration file, verify schema
   - **Deliverable:** Migration file in repo, verified in Supabase

4. **Migrate Weekly insights to canonical engine**
   - **Impact:** Medium - Consistency across lenses
   - **Effort:** Low - Replace `computeWeeklyInsights` with `computeInsightsForWindow`
   - **Deliverable:** Weekly lens uses canonical engine

5. **Delete legacy tables and code**
   - **Impact:** Medium - Reduces technical debt
   - **Effort:** Low - Delete `reflection_sources`, `external_sources` tables and unused files
   - **Deliverable:** Legacy tables removed, unused files deleted

---

**End of Report**

---

## How this file is updated going forward

This document is a **capabilities inventory**, not a roadmap.

Update this file only when a capability becomes:
- Stable
- Canonical
- Safe for others to rely on

This file intentionally **lags daily development**.

Daily changes, experiments, and migrations belong in:
- `docs/STATUS.md` (daily leadership loop)
- Pull requests and commit history

When to update this file:
- A new lens becomes canonical
- A storage or sharing spine becomes the default
- A user facing capability is considered "real"

When not to update this file:
- During refactors
- During migrations
- During experimentation or cleanup

If in doubt, do **not** update this file.
Wait until reality settles.


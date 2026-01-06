# Story of Emergence Architecture Map

## 1. Product Definition

Story of Emergence is a private wallet bound journal and insight engine. Users connect their Ethereum wallet and sign a consent message to derive an AES GCM encryption key. All reflection entries are encrypted client side before storage. Supabase stores only ciphertext. The system computes insights across multiple time horizons from decrypted reflections. Users can share encrypted capsules with other wallet addresses or export insights as static images.

## 2. System Diagram

### 2.1 Identity Layer

Wallet connection via Wagmi and RainbowKit. Wallet address normalized to lowercase. No server side authentication. All authorization happens via Row Level Security policies that read wallet address from request headers.

### 2.2 Key Derivation

User signs message "Story of Emergence — encryption key consent for {address}" using personal_sign. Signature hex converted to bytes. SHA 256 digest computed. Result imported as AES GCM key with encrypt and decrypt capabilities. Key never stored on disk. Key cached in sessionStorage with consent timestamp. Consent expires after 24 hours.

### 2.3 Crypto Envelope Format

Two formats exist. Legacy format is base64 encoded JSON. Current format is v1 prefix followed by base64 encoded IV concatenated with ciphertext plus authentication tag. Envelope structure includes ciphertext base64, IV base64, optional tag base64, and version string. AES GCM uses 12 byte IV and 16 byte authentication tag appended to ciphertext.

### 2.4 Storage Layer

Supabase PostgreSQL database. All tables use Row Level Security. RLS policies read wallet address from x wallet address header via get_wallet_from_header function. Tables store ciphertext columns. No plaintext stored server side except metadata like timestamps and wallet addresses.

### 2.5 Fetch and Decrypt Pipeline

Client calls RPC function with wallet address parameter. Supabase RPC verifies wallet matches header. Returns encrypted rows. Client decrypts each row using session key. Plaintext parsed as JSON. Legacy entries fall back to base64 decode if v1 prefix missing.

### 2.6 Insights Engine Pipeline

Decrypted reflections converted to ReflectionEntry format. Time windows computed for each lens. Distribution layer analyzes frequency patterns. Canonical computeInsightsForWindow function produces InsightArtifact. Artifact contains InsightCard array and metadata. Cards include id, kind, title, explanation, evidence, computedAt. Custom data stored in metadata fields prefixed with underscore.

### 2.7 Sharing and Artifacts Hooks

Share pack builder creates encrypted capsules. Capsule contains kind, payload with title, ciphertext, IV, version. Capsule stored in shares table as JSONB. Recipient wallet address included. Shares can be revoked via revoked_at timestamp. Public share images generated via html2canvas from DOM elements marked with data share root attribute.

### 2.8 Graph and Links Layer

Reflection graph built locally using TF IDF cosine similarity and temporal proximity. Signal edges weighted 70 percent lexical, 30 percent time. Graph cached encrypted in localStorage keyed by wallet and scope. Clusters computed via connected components with progressive weight threshold. Reason edges produced by meaning bridge system detect semantic signals between reflection pairs. Reason edges stored encrypted in reflection_link_bridges table. Pins system stores encrypted derived artifacts for clusters, threads, and bridges.

### 2.9 Signal Edges vs Reason Edges

Signal edges are cheap detectors that propose candidate connections. They use lexical overlap via TF IDF cosine similarity, temporal proximity within 30 days, shared source detection, and tag overlap. Signal edges include a weight value and reasons array with strings like lexical or time. They are stored in encrypted graph cache in localStorage.

Reason edges are structured explanations of why two reflections connect, written like causal narratives. They answer why beyond mere similarity. Reason edges contain title, claim, consequences, frame, echoes, and detected signals. They are stored encrypted in reflection_link_bridges table. Similarity is the signal. Reasoning is the product.

## 3. Exact Runtime Flow

### 3.1 First Visit Without Wallet

User lands on home page. Wagmi provider initializes. No wallet connected state. UI shows connect wallet prompt. No Supabase calls made. No encryption session exists.

### 3.2 Connect Wallet

User clicks connect via RainbowKit. Wallet extension prompts for connection. Wallet address obtained via useAccount hook. Address stored in Wagmi state. Connection state becomes true.

### 3.3 Consent Signature and Key Creation

useEncryptionSession hook detects wallet connection. Checks sessionStorage for existing session. If missing or expired, requests personal_sign. User approves signature in wallet. Signature hex received. Key derived via SHA 256 digest. Key imported as AES GCM CryptoKey. Session stored in sessionStorage with wallet address, signature hex, consent timestamp. Hook sets ready state to true and exposes aesKey.

### 3.4 Save Reflection

User types reflection text in textarea. On save, rpcInsertEntry called with wallet, sessionKey, plaintext object. Plaintext JSON stringified. Encrypted via aesGcmEncryptText producing v1 format string. Supabase RPC insert_entry called with wallet and ciphertext. RPC verifies wallet matches header. Row inserted with wallet_address, ciphertext, created_at. Entry ID returned. UI updates to show saved state.

### 3.5 Load Reflections

rpcFetchEntries called with wallet and sessionKey. Supabase RPC list_entries returns encrypted rows. Each row decrypted via decryptJSON. Legacy entries fall back to base64 decode. Decrypted entries converted to ReflectionEntry format with id, createdAt, plaintext, deletedAt. Entries sorted by createdAt descending. UI renders list of reflections.

### 3.6 Generate Insights

User navigates to insights page. Selected lens determines time window. Decrypted reflections filtered to window. computeInsightsForWindow called with entries and window. Distribution layer computes frequency patterns. Cards generated with metrics and explanations. Artifact returned with cards array. UI renders cards using InsightSignalCard component. Share actions available via ShareActionsBar.

### 3.7 Export or Share Pack

User clicks share button. ShareActionsBar shows options. Copy caption copies text to clipboard. Download PNG calls html2canvas on data share root element. Share to wallet opens dialog for recipient address. Send privately creates encrypted capsule. Capsule encrypted with content key. Content key wrapped for recipient using recipient derived key. Capsule stored in shares table. Recipient can decrypt using their wallet derived key.

### 3.8 Logout and Key Disposal

User disconnects wallet via RainbowKit. Wagmi clears connection state. useEncryptionSession detects wallet change. Session cleared from sessionStorage. aesKey set to null. Ready state set to false. All decrypted data remains in React state until component unmounts. No explicit key zeroing but keys are CryptoKey objects managed by browser.

## 4. Signal Edges vs Reason Edges

### 4.1 Signal Edges

Signal edges represent detected similarity between reflections. They are computed locally using TF IDF cosine similarity and temporal proximity. Edges are weighted 70 percent lexical similarity, 30 percent temporal proximity. Signal edges include a weight value and reasons array containing strings like lexical or time. Signal edges are stored in encrypted graph cache in localStorage. They are used for graph visualization and cluster computation. Signal edges are cheap detectors that propose candidate connections.

### 4.2 Reason Edges

Reason edges represent semantic bridges between reflection pairs. They are produced by analyzing signal edges and building meaning bridges. Reason edges contain structured explanations including claims, evidence, consequences, and frames. Reason edges are stored encrypted in reflection_link_bridges table. They answer why two reflections connect beyond mere similarity. Similarity is the signal. Reasoning is the product.

### 4.3 Reason Edge Payload Schema

The encrypted payload stored in reflection_link_bridges ciphertext column follows this JSON schema based on the MeaningBridge type:

```typescript
{
  title: string;                    // Short title like "Scale breaks intuition"
  claim: string;                    // Main claim about the connection
  translation?: string;             // Optional translation of key numbers/units
  consequences: string[];           // Array of consequence statements
  frame: string;                    // Framing statement about causality
  echoes: string[];                 // Array of echo statements from each reflection
  signals: Array<{                  // Detected semantic signals
    kind: "scale" | "systems" | "trust" | "policy" | "incentives" | "time" | "source" | "numbers";
    score: number;
    hits: string[];
  }>;
  createdAtIso: string;            // ISO timestamp when bridge was created
  version: number;                 // Schema version, currently 1
}
```

This payload is encrypted using AES GCM with the user's wallet derived key before storage. The encryption envelope includes ciphertext, IV, algorithm, and version fields stored separately in the table.

### 4.4 Worked Example: Farzi to Dhurandhar Connection

Reflection A contains text about Farzi counterfeit scale mentioning billions and crores. Reflection B contains text about Dhurandhar systems and currency policy. Signal edge detects lexical overlap on scale and systems keywords plus temporal proximity. Reason edge payload constructed:

```json
{
  "title": "Scale breaks intuition",
  "claim": "These reflections connect through a chain: a trigger, a translation into scale, then second order effects on systems, policy, and trust.",
  "translation": "Key numbers and units detected: billion, crore, million, scale.",
  "consequences": [
    "Billion level scale changes behavior from incremental to structural.",
    "Large flows can distort measurement and policy transmission."
  ],
  "frame": "This bridge links a concrete trigger to a system level frame. The connection is not just shared words, it is shared causality.",
  "echoes": [
    "From A: Farzi reflection first sentence about scale and systems...",
    "From B: Dhurandhar reflection first sentence about policy and trust..."
  ],
  "signals": [
    {
      "kind": "scale",
      "score": 0.75,
      "hits": ["billion", "scale", "magnitude"]
    },
    {
      "kind": "systems",
      "score": 0.68,
      "hits": ["system", "networks", "feedback"]
    },
    {
      "kind": "numbers",
      "score": 0.60,
      "hits": ["billion", "crore", "million"]
    }
  ],
  "createdAtIso": "2024-01-15T10:30:00.000Z",
  "version": 1
}
```

This payload is JSON stringified, encrypted with AES GCM, and stored in reflection_link_bridges table with separate ciphertext and IV columns.

## 5. Data Model Inventory

### 5.1 entries

Status: TBD. RPC functions list_entries and insert_entry are called in code but table creation and RPC definitions not found in verified migrations.

Purpose: Stores encrypted reflection entries.

Key columns: id uuid primary key, wallet_address text, ciphertext text, created_at timestamptz, deleted_at timestamptz nullable.

Plaintext vs ciphertext: ciphertext column contains v1 format encrypted JSON. wallet_address and timestamps are plaintext.

RLS policy pattern: SELECT, INSERT, UPDATE, DELETE policies check lower wallet_address equals get_wallet_from_header.

RPC functions: list_entries takes wallet and include_deleted boolean, returns rows ordered by created_at desc. insert_entry takes wallet and ciphertext, returns id. soft_delete_entry sets deleted_at. restore_entry clears deleted_at. delete_entry hard deletes row.

### 5.2 internal_events

Purpose: Stores encrypted internal event payloads for insight computation.

Key columns: id uuid primary key, wallet_address text, event_at timestamptz, ciphertext text, encryption_version integer, created_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted JSON payload. wallet_address and event_at are plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: insert_internal_event takes wallet, event_at, ciphertext, version. list_internal_events takes wallet, limit, offset, returns rows ordered by event_at desc. list_internal_events_by_range takes wallet, start, end timestamps.

### 5.3 shares

Purpose: Stores encrypted share capsules for wallet to wallet sharing.

Key columns: id uuid primary key, owner_wallet text, recipient_wallet text, capsule jsonb, created_at timestamptz, revoked_at timestamptz nullable.

Plaintext vs ciphertext: capsule jsonb contains encrypted payload with ciphertext, IV, version. Wallet addresses are plaintext.

RLS policy pattern: SELECT allows owner to see sent shares, recipient to see received shares if not revoked. INSERT requires owner matches header. UPDATE requires owner matches.

RPC functions: list_shares_by_owner takes wallet, limit, offset. list_shares_by_recipient takes wallet, limit, offset, filters revoked_at null. insert_share takes owner, recipient, capsule jsonb. get_share takes share_id, verifies recipient matches header.

### 5.4 reflection_links

Status: Verified table exists in migration 009_reflection_links.sql. RPC function list_reflection_links is called in code but definition not found in verified migrations. Marked TBD.

Purpose: Links reflections to external sources.

Key columns: id uuid primary key, wallet_address text, reflection_id uuid, source_id text, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: All columns plaintext. Links are metadata only.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_reflection_links takes wallet parameter w, limit, offset. Returns rows with wallet_address, reflection_id, source_id. Status TBD.

### 5.5 reflection_sources

Purpose: Stores external source metadata.

Key columns: id text primary key, wallet_address text, title text, kind text, metadata jsonb, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: All columns plaintext. Source metadata not encrypted.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_reflection_sources takes wallet parameter w. Returns source rows.

### 5.6 external_entries

Purpose: Stores external entries imported from sources.

Key columns: id uuid primary key, wallet_address text, source_id text, external_id text, title text, content text, metadata jsonb, created_at timestamptz.

Plaintext vs ciphertext: All columns plaintext. External content stored as plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_external_entries takes wallet parameter w. Returns external entry rows.

### 5.7 contacts

Purpose: Stores encrypted contact information.

Key columns: id uuid primary key, wallet_address text, ciphertext text, encryption_version integer, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted contact payload. wallet_address is plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_contacts takes wallet parameter w, limit, offset. Returns encrypted contact rows. Client decrypts ciphertext.

### 5.8 capsules

Purpose: Stores encrypted capsule payloads for advanced sharing.

Key columns: id uuid primary key, wallet_address text, kind text, ciphertext text, created_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted capsule payload. wallet_address and kind are plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_capsules takes wallet parameter w. get_capsule takes capsule_id, verifies wallet matches.

### 5.9 derived_artifacts

Purpose: Stores encrypted pin payloads for clusters, threads, and bridges.

Key columns: id uuid primary key, wallet_address text, kind text, scope text, ciphertext text, encryption_version integer, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted pin payload JSON. wallet_address, kind, scope are plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: insert_derived_artifact takes wallet, kind, scope, ciphertext, version, returns id. list_derived_artifacts takes wallet, kind nullable, limit, offset. update_derived_artifact takes wallet, id, ciphertext. delete_derived_artifact takes wallet, id.

### 5.10 reflection_link_bridges

Purpose: Stores encrypted semantic bridges between reflection pairs.

Key columns: id uuid primary key, wallet_address text, from_reflection_id uuid, to_reflection_id uuid, ciphertext text, iv text, alg text, version integer, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: ciphertext and iv contain encrypted bridge payload. Wallet address and reflection IDs are plaintext.

RLS policy pattern: All policies verify wallet_address matches header. Unique index on wallet_address, from_reflection_id, to_reflection_id prevents duplicates.

RPC functions: list_reflection_link_bridges takes wallet parameter w, limit, offset, returns rows ordered by updated_at desc.

## 6. Code Map

### 6.1 Key Directories

src/app: Next.js App Router pages and API routes. All pages are client components using use client directive. API routes handle server side Supabase calls with wallet header extraction.

src/app/lib: Client side utilities for entries, shares, contacts, sources, insights, pins, meaning bridges. All encryption and decryption happens here.

src/lib: Shared libraries for crypto, graph building, artifacts, narratives. Pure functions with no React dependencies.

src/components: Reusable React components. UI components like NeoCard, InsightSignalCard. Visualization components like TimelineWaveform, DeterminismEmergenceAxis.

src/app/insights: Insights lens pages. Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime. Each page uses canonical insight engine.

src/app/reflections: Reflection views. Mind view shows force directed graph. Thread view shows narrative chains. Pins view shows saved artifacts.

### 6.2 App Router Pages

/: Home page with reflection editor and list. HomeClient component handles all interaction.

/insights: Insights hub with tab navigation. Routes to individual lens pages.

/insights/weekly: Weekly insights lens. Shows weekly distribution cards.

/insights/summary: Summary insights lens. Shows always on summary cards.

/insights/timeline: Timeline insights lens. Shows temporal waveform visualization.

/insights/yearly: Yearly insights lens. Shows year narrative and archetype.

/insights/distributions: Distribution insights lens. Shows distribution patterns.

/insights/yoy: Year over year comparison lens.

/insights/lifetime: Lifetime insights lens. Shows cumulative metrics.

/reflections/mind: Mind view with force directed graph. Shows reflection clusters and bridges.

/reflections/thread/[id]: Thread view for single reflection. Shows connected neighbors with bridges.

/reflections/pins: Pins view with tabs for clusters, threads, bridges.

/shared: Shared content view. Shows received shares.

/sources: External sources management.

### 6.3 Core Libraries

src/lib/crypto.ts: AES GCM encryption and decryption. Key derivation from signature. Envelope format helpers. Legacy format support.

src/app/lib/entries.ts: Entry CRUD operations. rpcFetchEntries, rpcInsertEntry, rpcSoftDelete, rpcHardDelete, restoreEntryRpc. Encryption wrapper functions.

src/app/lib/supabase.ts: Supabase client singleton. getSupabaseForWallet creates client with x wallet address header. Caches clients per wallet address.

src/app/lib/useEncryptionSession.ts: React hook for encryption session management. Handles signature request, key derivation, session storage, consent expiration.

### 6.4 Hooks

useAccount: Wagmi hook for wallet connection state and address.

useEncryptionSession: Custom hook for encryption key and ready state.

useReflectionLinks: Custom hook for reflection to source links.

useNarrativeTone: Custom hook for narrative tone preference with localStorage persistence.

useDensity: Custom hook for density mode preference with localStorage persistence.

### 6.5 Crypto Utilities

aesGcmEncryptText: Encrypts plaintext string, returns v1 format string with IV and tag.

aesGcmDecryptText: Decrypts v1 format string, returns plaintext.

deriveKeyFromSignature: Requests personal_sign, computes SHA 256 digest, imports as AES GCM key.

encryptJSON: Wraps JSON object encryption. Handles circular references.

decryptJSON: Wraps JSON decryption. Falls back to legacy base64 decode.

### 6.6 Insight Engine Modules

src/app/lib/insights/computeInsightsForWindow.ts: Canonical insight computation function. Takes entries and window, returns InsightArtifact.

src/app/lib/insights/distributionLayer.ts: Distribution pattern analysis. Computes frequency per day, magnitude proxy, classification.

src/app/lib/insights/timeWindows.ts: Time window utilities. Computes window start and end dates for each lens.

src/app/lib/insights/alwaysOnSummary.ts: Summary insight computation. Compares current week to previous week.

src/lib/artifacts: Artifact builders for each lens. WeeklyArtifact, SummaryArtifact, TimelineArtifact, YearlyArtifact, LifetimeArtifact.

### 6.7 Share Pack Builder

src/app/lib/shares.ts: Share creation and listing. rpcInsertShare, rpcListShares, rpcGetShare.

src/lib/sharing.ts: Capsule encryption and key wrapping. wrapKeyForRecipient, unwrapKeyForRecipient, encryptSlice, decryptSlice.

src/app/insights/components/ShareActionsBar.tsx: Unified share actions component. Copy caption, download PNG, share to wallet, send privately.

### 6.8 Reflection Links and Mind View Modules

src/lib/graph/buildReflectionGraph.ts: Graph builder using TF IDF and temporal proximity. Returns Edge array with weights and reasons.

src/lib/graph/graphCache.ts: Encrypted graph cache in localStorage. Validates cache age and reflection ID changes.

src/lib/graph/clusterGraph.ts: Cluster computation via connected components with progressive threshold.

src/lib/graph/buildThread.ts: Thread path construction from cluster nodes and edges.

src/app/lib/meaningBridges/buildSignals.ts: Semantic signal detection between reflection texts.

src/app/lib/meaningBridges/buildBridge.ts: Meaning bridge construction from signals.

src/app/lib/meaningBridges/storage.ts: Encrypted bridge storage and retrieval.

src/app/reflections/mind/page.tsx: Mind view page with ForceGraph2D. Handles node focus, edge hover, bridge display.

## 7. Cryptography Boundary

### 7.1 Where Plaintext Exists

Plaintext exists only in browser memory after decryption. React component state holds decrypted reflections. CryptoKey objects exist in JavaScript memory. Session storage holds signature hex and consent timestamp, not the key itself.

### 7.2 Where Ciphertext Exists

Ciphertext stored in Supabase database columns. Ciphertext transmitted over HTTPS in request bodies. Ciphertext cached in localStorage for graph edges and pin payloads. Ciphertext in sessionStorage for relationship graphs.

### 7.3 How Keys Are Stored in Memory

AES GCM keys stored as CryptoKey objects in React state. Keys never serialized to strings. Keys accessible only to components with access to useEncryptionSession hook. Keys cleared when wallet disconnects or session expires.

### 7.4 What Never Leaves the Device

Encryption keys never leave the browser. Plaintext reflections never sent to server. Decrypted insights computed entirely client side. Wallet private keys never accessed by application.

### 7.5 Threat Model Assumptions

Assumes browser is trusted environment. Assumes HTTPS prevents man in the middle attacks. Assumes Supabase RLS policies correctly enforce wallet scoping. Assumes wallet extension securely manages private keys. Does not protect against compromised browser or device. Does not protect against malicious browser extensions. Server side admins cannot read plaintext but can see ciphertext and metadata.

## 8. Known Gotchas

### 8.1 Wallet Not Ready Race

Components may render before wallet connects. useEncryptionSession hook handles this with ready state. Early returns prevent RPC calls without wallet. Some components show loading state until wallet ready.

### 8.2 JWT Wallet Address Dependency

RLS policies use get_wallet_from_header function, not JWT claims. This allows anon role access. x wallet address header must be set on all Supabase clients. Server side API routes extract header from request and pass to Supabase client.

### 8.3 RLS vs Anon Role Differences

All RPC functions use SECURITY DEFINER to bypass RLS on function execution. Functions manually verify wallet matches header. This allows anon role to execute functions. Direct table access would require authenticated role with JWT claims.

### 8.4 SSR vs Client Boundaries

All pages use use client directive. No server side rendering of sensitive data. API routes run on server but only handle metadata queries. Encryption and decryption always client side.

### 8.5 Turbopack Quirks

Next.js Turbopack may cache modules incorrectly during development. Restart dev server if imports fail. Dynamic imports used for heavy libraries like react force graph 2d.

## 9. Verified Capabilities Today

### 9.1 Wallet and Encryption

- [x] Wallet connection via Wagmi and RainbowKit functional
- [x] Consent signature flow derives AES GCM key
- [x] Key cached in sessionStorage with expiration
- [x] Encryption and decryption work client side

### 9.2 Data Storage

- [x] internal_events table exists with RLS policies
- [x] shares table exists with capsule JSONB column
- [x] reflection_links table exists
- [x] reflection_sources table exists
- [x] external_entries table exists as entries_external
- [x] contacts table exists
- [x] capsules table exists
- [x] derived_artifacts table exists
- [x] reflection_link_bridges table exists
- [ ] entries table RPCs called but table definition not verified in migrations

### 9.3 Insights Engine

- [x] computeInsightsForWindow function exists and routes to lens artifacts
- [x] Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime lenses render
- [x] Distribution layer computes frequency patterns
- [x] ShareActionsBar component unified across lenses
- [x] InsightSignalCard component renders cards

### 9.4 Graph and Mind View

- [x] buildReflectionGraph function computes signal edges
- [x] Graph cache stores edges encrypted in localStorage
- [x] Cluster computation via connected components works
- [x] Mind view renders force directed graph
- [x] Thread view shows connected reflections
- [x] Meaning bridges build and store reason edges
- [x] Bridge pinning saves to derived_artifacts

### 9.5 Sharing

- [x] Share creation encrypts capsules
- [x] Share listing works for owner and recipient
- [x] PNG export via html2canvas functional
- [x] Share to wallet dialog exists

### 9.6 RPC Functions Verified

- [x] insert_internal_event exists
- [x] list_internal_events exists
- [x] list_internal_events_by_range exists
- [x] list_shares_by_owner exists
- [x] list_shares_by_recipient exists
- [x] insert_share exists
- [x] get_share exists
- [x] list_external_entries exists
- [x] list_contacts exists
- [x] get_capsule exists
- [x] insert_derived_artifact exists
- [x] list_derived_artifacts exists
- [x] update_derived_artifact exists
- [x] delete_derived_artifact exists
- [x] list_reflection_link_bridges exists
- [ ] list_entries called but definition not verified
- [ ] insert_entry called but definition not verified
- [ ] list_reflection_links called but definition not verified

## 10. Future Tables and RPCs

The following are referenced in code but not verified in migrations. They may exist in unverified migrations or be planned for future implementation.

### 10.1 entries Table

RPC functions list_entries, insert_entry, soft_delete_entry, restore_entry, delete_entry are called in src/app/lib/entries.ts but table creation and RPC definitions not found in verified migrations.

### 10.2 list_reflection_links RPC

Function is called in src/app/lib/reflectionLinks.ts but definition not found in migration 009_reflection_links.sql which only creates the table.


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

Reflection graph built locally using TF IDF cosine similarity and temporal proximity. Edges weighted 70 percent lexical, 30 percent time. Graph cached encrypted in localStorage keyed by wallet and scope. Clusters computed via connected components with progressive weight threshold. Meaning bridges detect semantic signals between reflection pairs. Bridges stored encrypted in reflection_link_bridges table. Pins system stores encrypted derived artifacts for clusters, threads, and bridges.

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

## 4. Data Model Inventory

### 4.1 entries

Purpose: Stores encrypted reflection entries.

Key columns: id uuid primary key, wallet_address text, ciphertext text, created_at timestamptz, deleted_at timestamptz nullable.

Plaintext vs ciphertext: ciphertext column contains v1 format encrypted JSON. wallet_address and timestamps are plaintext.

RLS policy pattern: SELECT, INSERT, UPDATE, DELETE policies check lower wallet_address equals get_wallet_from_header.

RPC functions: list_entries takes wallet and include_deleted boolean, returns rows ordered by created_at desc. insert_entry takes wallet and ciphertext, returns id. soft_delete_entry sets deleted_at. restore_entry clears deleted_at. delete_entry hard deletes row.

### 4.2 internal_events

Purpose: Stores encrypted internal event payloads for insight computation.

Key columns: id uuid primary key, wallet_address text, event_at timestamptz, ciphertext text, encryption_version integer, created_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted JSON payload. wallet_address and event_at are plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: insert_internal_event takes wallet, event_at, ciphertext, version. list_internal_events takes wallet, limit, offset, returns rows ordered by event_at desc. list_internal_events_by_range takes wallet, start, end timestamps.

### 4.3 shares

Purpose: Stores encrypted share capsules for wallet to wallet sharing.

Key columns: id uuid primary key, owner_wallet text, recipient_wallet text, capsule jsonb, created_at timestamptz, revoked_at timestamptz nullable.

Plaintext vs ciphertext: capsule jsonb contains encrypted payload with ciphertext, IV, version. Wallet addresses are plaintext.

RLS policy pattern: SELECT allows owner to see sent shares, recipient to see received shares if not revoked. INSERT requires owner matches header. UPDATE requires owner matches.

RPC functions: list_shares_by_owner takes wallet, limit, offset. list_shares_by_recipient takes wallet, limit, offset, filters revoked_at null. insert_share takes owner, recipient, capsule jsonb. get_share takes share_id, verifies recipient matches header.

### 4.4 reflection_links

Purpose: Links reflections to external sources.

Key columns: id uuid primary key, wallet_address text, reflection_id uuid, source_id text, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: All columns plaintext. Links are metadata only.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_reflection_links takes wallet parameter w, limit, offset. Returns rows with wallet_address, reflection_id, source_id.

### 4.5 reflection_sources

Purpose: Stores external source metadata.

Key columns: id text primary key, wallet_address text, title text, kind text, metadata jsonb, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: All columns plaintext. Source metadata not encrypted.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_reflection_sources takes wallet parameter w. Returns source rows.

### 4.6 external_entries

Purpose: Stores external entries imported from sources.

Key columns: id uuid primary key, wallet_address text, source_id text, external_id text, title text, content text, metadata jsonb, created_at timestamptz.

Plaintext vs ciphertext: All columns plaintext. External content stored as plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_external_entries takes wallet parameter w. Returns external entry rows.

### 4.7 contacts

Purpose: Stores encrypted contact information.

Key columns: id uuid primary key, wallet_address text, ciphertext text, encryption_version integer, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted contact payload. wallet_address is plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_contacts takes wallet parameter w, limit, offset. Returns encrypted contact rows. Client decrypts ciphertext.

### 4.8 capsules

Purpose: Stores encrypted capsule payloads for advanced sharing.

Key columns: id uuid primary key, wallet_address text, kind text, ciphertext text, created_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted capsule payload. wallet_address and kind are plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: list_capsules takes wallet parameter w. get_capsule takes capsule_id, verifies wallet matches.

### 4.9 derived_artifacts

Purpose: Stores encrypted pin payloads for clusters, threads, and bridges.

Key columns: id uuid primary key, wallet_address text, kind text, scope text, ciphertext text, encryption_version integer, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: ciphertext contains encrypted pin payload JSON. wallet_address, kind, scope are plaintext.

RLS policy pattern: All policies verify wallet_address matches header.

RPC functions: insert_derived_artifact takes wallet, kind, scope, ciphertext, version, returns id. list_derived_artifacts takes wallet, kind nullable, limit, offset. update_derived_artifact takes wallet, id, ciphertext. delete_derived_artifact takes wallet, id.

### 4.10 reflection_link_bridges

Purpose: Stores encrypted semantic bridges between reflection pairs.

Key columns: id uuid primary key, wallet_address text, from_reflection_id uuid, to_reflection_id uuid, ciphertext text, iv text, alg text, version integer, created_at timestamptz, updated_at timestamptz.

Plaintext vs ciphertext: ciphertext and iv contain encrypted bridge payload. Wallet address and reflection IDs are plaintext.

RLS policy pattern: All policies verify wallet_address matches header. Unique index on wallet_address, from_reflection_id, to_reflection_id prevents duplicates.

RPC functions: list_reflection_link_bridges takes wallet parameter w, limit, offset, returns rows ordered by updated_at desc.

## 5. Code Map

### 5.1 Key Directories

src/app: Next.js App Router pages and API routes. All pages are client components using use client directive. API routes handle server side Supabase calls with wallet header extraction.

src/app/lib: Client side utilities for entries, shares, contacts, sources, insights, pins, meaning bridges. All encryption and decryption happens here.

src/lib: Shared libraries for crypto, graph building, artifacts, narratives. Pure functions with no React dependencies.

src/components: Reusable React components. UI components like NeoCard, InsightSignalCard. Visualization components like TimelineWaveform, DeterminismEmergenceAxis.

src/app/insights: Insights lens pages. Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime. Each page uses canonical insight engine.

src/app/reflections: Reflection views. Mind view shows force directed graph. Thread view shows narrative chains. Pins view shows saved artifacts.

### 5.2 App Router Pages

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

### 5.3 Core Libraries

src/lib/crypto.ts: AES GCM encryption and decryption. Key derivation from signature. Envelope format helpers. Legacy format support.

src/app/lib/entries.ts: Entry CRUD operations. rpcFetchEntries, rpcInsertEntry, rpcSoftDelete, rpcHardDelete, restoreEntryRpc. Encryption wrapper functions.

src/app/lib/supabase.ts: Supabase client singleton. getSupabaseForWallet creates client with x wallet address header. Caches clients per wallet address.

src/app/lib/useEncryptionSession.ts: React hook for encryption session management. Handles signature request, key derivation, session storage, consent expiration.

### 5.4 Hooks

useAccount: Wagmi hook for wallet connection state and address.

useEncryptionSession: Custom hook for encryption key and ready state.

useReflectionLinks: Custom hook for reflection to source links.

useNarrativeTone: Custom hook for narrative tone preference with localStorage persistence.

useDensity: Custom hook for density mode preference with localStorage persistence.

### 5.5 Crypto Utilities

aesGcmEncryptText: Encrypts plaintext string, returns v1 format string with IV and tag.

aesGcmDecryptText: Decrypts v1 format string, returns plaintext.

deriveKeyFromSignature: Requests personal_sign, computes SHA 256 digest, imports as AES GCM key.

encryptJSON: Wraps JSON object encryption. Handles circular references.

decryptJSON: Wraps JSON decryption. Falls back to legacy base64 decode.

### 5.6 Insight Engine Modules

src/app/lib/insights/computeInsightsForWindow.ts: Canonical insight computation function. Takes entries and window, returns InsightArtifact.

src/app/lib/insights/distributionLayer.ts: Distribution pattern analysis. Computes frequency per day, magnitude proxy, classification.

src/app/lib/insights/timeWindows.ts: Time window utilities. Computes window start and end dates for each lens.

src/app/lib/insights/alwaysOnSummary.ts: Summary insight computation. Compares current week to previous week.

src/lib/artifacts: Artifact builders for each lens. WeeklyArtifact, SummaryArtifact, TimelineArtifact, YearlyArtifact, LifetimeArtifact.

### 5.7 Share Pack Builder

src/app/lib/shares.ts: Share creation and listing. rpcInsertShare, rpcListShares, rpcGetShare.

src/lib/sharing.ts: Capsule encryption and key wrapping. wrapKeyForRecipient, unwrapKeyForRecipient, encryptSlice, decryptSlice.

src/app/insights/components/ShareActionsBar.tsx: Unified share actions component. Copy caption, download PNG, share to wallet, send privately.

### 5.8 Reflection Links and Mind View Modules

src/lib/graph/buildReflectionGraph.ts: Graph builder using TF IDF and temporal proximity. Returns Edge array with weights and reasons.

src/lib/graph/graphCache.ts: Encrypted graph cache in localStorage. Validates cache age and reflection ID changes.

src/lib/graph/clusterGraph.ts: Cluster computation via connected components with progressive threshold.

src/lib/graph/buildThread.ts: Thread path construction from cluster nodes and edges.

src/app/lib/meaningBridges/buildSignals.ts: Semantic signal detection between reflection texts.

src/app/lib/meaningBridges/buildBridge.ts: Meaning bridge construction from signals.

src/app/lib/meaningBridges/storage.ts: Encrypted bridge storage and retrieval.

src/app/reflections/mind/page.tsx: Mind view page with ForceGraph2D. Handles node focus, edge hover, bridge display.

## 6. Cryptography Boundary

### 6.1 Where Plaintext Exists

Plaintext exists only in browser memory after decryption. React component state holds decrypted reflections. CryptoKey objects exist in JavaScript memory. Session storage holds signature hex and consent timestamp, not the key itself.

### 6.2 Where Ciphertext Exists

Ciphertext stored in Supabase database columns. Ciphertext transmitted over HTTPS in request bodies. Ciphertext cached in localStorage for graph edges and pin payloads. Ciphertext in sessionStorage for relationship graphs.

### 6.3 How Keys Are Stored in Memory

AES GCM keys stored as CryptoKey objects in React state. Keys never serialized to strings. Keys accessible only to components with access to useEncryptionSession hook. Keys cleared when wallet disconnects or session expires.

### 6.4 What Never Leaves the Device

Encryption keys never leave the browser. Plaintext reflections never sent to server. Decrypted insights computed entirely client side. Wallet private keys never accessed by application.

### 6.5 Threat Model Assumptions

Assumes browser is trusted environment. Assumes HTTPS prevents man in the middle attacks. Assumes Supabase RLS policies correctly enforce wallet scoping. Assumes wallet extension securely manages private keys. Does not protect against compromised browser or device. Does not protect against malicious browser extensions. Server side admins cannot read plaintext but can see ciphertext and metadata.

## 7. Known Gotchas

### 7.1 Wallet Not Ready Race

Components may render before wallet connects. useEncryptionSession hook handles this with ready state. Early returns prevent RPC calls without wallet. Some components show loading state until wallet ready.

### 7.2 JWT Wallet Address Dependency

RLS policies use get_wallet_from_header function, not JWT claims. This allows anon role access. x wallet address header must be set on all Supabase clients. Server side API routes extract header from request and pass to Supabase client.

### 7.3 RLS vs Anon Role Differences

All RPC functions use SECURITY DEFINER to bypass RLS on function execution. Functions manually verify wallet matches header. This allows anon role to execute functions. Direct table access would require authenticated role with JWT claims.

### 7.4 SSR vs Client Boundaries

All pages use use client directive. No server side rendering of sensitive data. API routes run on server but only handle metadata queries. Encryption and decryption always client side.

### 7.5 Turbopack Quirks

Next.js Turbopack may cache modules incorrectly during development. Restart dev server if imports fail. Dynamic imports used for heavy libraries like react force graph 2d.

## 8. Current State Marker

### 8.1 Phase Map Anchor

Insights v1 is complete. All seven lenses functional and consistent. Sharing system operational. Graph and mind view operational. Pins system operational. Bridge system operational.

### 8.2 Which Phases Are Complete

Phase One: Wallet connect, encryption, entry storage, RLS enforcement. Complete.

Phase Two: Sharing system, capsules, external sources. Complete.

Phase Three: Insights engine, all seven lenses, distribution analysis. Complete.

Phase Four: Graph building, clustering, mind view, thread view. Complete.

Phase Five: Meaning bridges, bridge pinning. Complete.

### 8.3 What Is Currently Being Built Next

Share export consistency polish. PNG export standardization across lenses. Debug panel gating improvements.

### 8.4 Insights v1 Status

All seven Insights lenses complete and consistent. Weekly, Summary, Timeline, Yearly, Distributions, YoY, Lifetime all functional. Canonical computeInsightsForWindow engine used throughout. ShareActionsBar unified across lenses. Deterministic computation verified. Empty state handling graceful. Reflections fallback prevents stuck states.


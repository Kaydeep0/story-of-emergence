# Meaning Graph Architecture

## 1. Overview

The Meaning Graph is a two layer system for connecting reflections. The similarity layer detects lexical and temporal proximity. The reasoning layer produces semantic bridges that explain why reflections connect. Similarity is a signal. Reasoning is the product.

## 2. Signal Edges vs Reason Edges

### 2.1 Signal Edges

Signal edges represent detected similarity between reflections. They are computed locally using TF IDF cosine similarity and temporal proximity. Edges are weighted 70 percent lexical similarity, 30 percent temporal proximity. Signal edges include a weight value and reasons array containing strings like "lexical" or "time". Signal edges are stored in encrypted graph cache in localStorage. They are used for graph visualization and cluster computation.

### 2.2 Reason Edges

Reason edges represent semantic bridges between reflection pairs. They are produced by analyzing signal edges and building meaning bridges. Reason edges contain structured explanations including claims, evidence, consequences, and frames. Reason edges are stored encrypted in reflection_link_bridges table. They answer why two reflections connect beyond mere similarity. Similarity is the signal. Reasoning is the product.

## 3. Reason Edge Payload Schema

The encrypted payload stored in reflection_link_bridges ciphertext column follows this JSON schema:

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

## 4. Worked Example: Farzi to Dhurandhar Connection

### 4.1 Plaintext Reason Edge Payload

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

### 4.2 Encryption and Storage

This payload is JSON stringified. The string is encrypted using AES GCM with a 12 byte IV. The ciphertext and IV are base64 encoded. The encrypted envelope is stored in reflection_link_bridges table with separate columns for ciphertext, iv, alg set to AES GCM, and version set to 1. The wallet address and reflection IDs are stored as plaintext for RLS policy matching.

## 5. Table and RPC Inventory

### 5.1 reflection_link_bridges Table

Status: Verified exists in migration 016_reflection_link_bridges.sql

Columns: id uuid primary key, wallet_address text, from_reflection_id uuid, to_reflection_id uuid, ciphertext text, iv text, alg text default AES GCM, version int default 1, created_at timestamptz, updated_at timestamptz.

Unique constraint on wallet_address, from_reflection_id, to_reflection_id prevents duplicate bridges.

RLS policies enforce wallet scoping using get_wallet_from_header function.

### 5.2 list_reflection_link_bridges RPC

Status: Verified exists in migration 016_reflection_link_bridges.sql

Function signature: list_reflection_link_bridges(w text, p_limit integer default 200, p_offset integer default 0)

Returns: Table with id, wallet_address, from_reflection_id, to_reflection_id, ciphertext, iv, alg, version, created_at, updated_at.

Orders results by updated_at descending.

Grants execute permission to anon and authenticated roles.

### 5.3 Graph Cache Storage

Status: Verified exists in src/lib/graph/graphCache.ts

Storage location: localStorage with key pattern reflection_graph_{wallet}_{scope}

Cache entry includes metadata with reflection IDs and computed timestamp, plus encrypted edges array.

Cache validation checks age less than 12 hours and reflection ID set unchanged.

### 5.4 Signal Edge Computation

Status: Verified exists in src/lib/graph/buildReflectionGraph.ts

Function: buildReflectionGraph takes reflections array and topK parameter default 6.

Returns Edge array with from, to, weight, reasons fields.

Uses TF IDF cosine similarity for lexical component, temporal proximity for time component.

## 6. Verified Today Checklist

### 6.1 Graph Building

- [x] buildReflectionGraph function exists and computes signal edges
- [x] Graph cache stores edges encrypted in localStorage
- [x] Cache validation checks age and reflection ID changes
- [x] Signal edges include weight and reasons array

### 6.2 Meaning Bridges

- [x] buildBridgeSignals function detects semantic signals
- [x] buildMeaningBridge function constructs reason edge payload
- [x] MeaningBridge type matches payload schema
- [x] Bridge storage encrypts payload before saving

### 6.3 Database Layer

- [x] reflection_link_bridges table exists with correct schema
- [x] list_reflection_link_bridges RPC function exists
- [x] RLS policies enforce wallet scoping
- [x] Unique constraint prevents duplicate bridges

### 6.4 Integration Points

- [x] Mind view loads bridges and displays in WhyLinkedPanel
- [x] Bridge pinning saves bridges to derived_artifacts table
- [x] Thread view shows bridges between connected reflections
- [x] Bridge building triggered for top edges in graph

## 7. Canonical Phase Map Reference

For phase completion status, see docs/PHASES.md. This document describes current implementation state only. Phase completion claims are maintained in the canonical phase map.


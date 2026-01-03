# Phase 4 — Yearly Narrative System

**Status:** COMPLETE & LOCKED

## Section 1 — What Exists

• Lifetime page scaffold (`/insights/lifetime`)
• Year pages with Themes, Transitions, Anchors sections (`/insights/year/[year]`)
• YearSelector component with navigation
• Deterministic narrative assembly (`assembleYearNarrativeDeterministic.ts`)
• Confidence scoring system (`confidenceScoring.ts`)
• Confidence bands (tentative, emerging, supported, strong)
• Confidence-gated rendering (sorting and visual treatment)
• Source trace UI (expandable provenance inspection)
• Narrative trace metadata computation
• Reflection ID linking to source reflections

## Section 2 — What Phase 4 Explicitly Does Not Do

• No interpretation of meaning
• No advice or recommendations
• No emotional framing or sentiment analysis
• No summarization or paraphrasing
• No cross-year inference or comparison
• No identity claims or personality assessment
• No AI-generated text or semantic compression
• No stored narrative drafts (always derived live)
• No reflection content exposure in trace UI
• No automatic narrative generation on page load

## Section 3 — Invariants

These rules must never be broken:

• Reflections are the only source of truth
• Narratives are derived and disposable (can be deleted without data loss)
• Confidence affects visibility and ordering, not wording
• Provenance is always inspectable (every narrative line links to reflection IDs)
• Uncertainty is shown, never hidden (confidence scores always visible)
• Trace metadata is computed live, never persisted
• No reflection text is ever modified or exposed in narrative views
• Narrative assembly is deterministic (same inputs → same outputs)
• Confidence scoring is structural only (no semantic interpretation)

If a future change violates one of these, it must become Phase 5+, not a silent edit.

## Section 4 — Upgrade Gate

Any system that interprets, compresses, or reframes meaning must be implemented as a new phase with its own contract.

Examples that require Phase 5+:
• AI-generated narrative summaries
• Cross-year pattern analysis
• Identity or personality insights
• Emotional tone analysis
• Advice or recommendations
• Semantic meaning extraction

Phase 4 is structure only. Meaning interpretation belongs to Phase 5 and beyond.


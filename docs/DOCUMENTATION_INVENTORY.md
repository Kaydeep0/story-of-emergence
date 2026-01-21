# Documentation Inventory and Relevance Audit

**Generated:** 2026-01-20  
**Purpose:** Complete classification of all documentation files  
**Scope:** `/docs` directory (78 files) + root-level phase files (5 files) = 83 total  
**Status:** Analysis only - no deletions or moves yet

---

## Classification Categories

- **Canonical**: Actively governs development, referenced in protocols, binding
- **Historical**: Useful record, no longer active but important for context
- **Superseded**: Replaced by another doc, redundant
- **Orphaned**: No longer referenced or needed
- **Future Intent**: Not yet active, no implementation authority

---

## Canonical Files (Actively Binding)

### Core Laws (Referenced in `0_START_HERE.md`)
1. **INVARIANTS.md** - System invariants, non-negotiable rules
   - Status: Active, binding
   - Referenced by: 0_START_HERE.md, PROTOCOL_REENTRY_AND_PROGRESS.md, CURSOR_RULES.md
   - Phase: Core invariant

2. **POSTURE.md** - Product posture and architectural layers
   - Status: Active, binding
   - Referenced by: 0_START_HERE.md, README.md
   - Phase: Core invariant

3. **SCOPE.md** - Product scope and non-negotiable guarantees
   - Status: Active, binding
   - Referenced by: 0_START_HERE.md
   - Phase: Core invariant

4. **OBSERVATION_BOUNDARIES.md** - Observation vs interpretation boundary
   - Status: Active, binding (canonical constraint)
   - Referenced by: 0_START_HERE.md, ARCHITECTURE_NOW.md
   - Phase: Core invariant

### Design Contracts (Referenced in `0_START_HERE.md`)
5. **DESIGN_NORTH_STAR.md** - Design principles
   - Status: Active
   - Referenced by: 0_START_HERE.md
   - Phase: Design contract

6. **OBSERVER_LAYER.md** - Observer layer invariant document
   - Status: Active
   - Referenced by: 0_START_HERE.md
   - Phase: Observer design

7. **OBSERVER_V0.md** - Observer v0 contract (frozen)
   - Status: Complete and frozen
   - Referenced by: 0_START_HERE.md, STATUS.md
   - Phase: Observer v0

8. **CONTINUITY_OF_SELF.md** - What the system remembers
   - Status: Active
   - Referenced by: 0_START_HERE.md
   - Phase: Design contract

### System Maps (Referenced in `0_START_HERE.md`)
9. **CORE_STACK.md** - Canonical layer architecture
   - Status: Active
   - Referenced by: 0_START_HERE.md
   - Phase: Architecture

10. **ARCHITECTURE_NOW.md** - Current system mental model
    - Status: Active (after Phase 21 stabilization)
    - Referenced by: 0_START_HERE.md, PROTOCOL_START_OF_DAY.md, README.md
    - Phase: Architecture

### Transition Rules (Referenced in `0_START_HERE.md`)
11. **ENGINE_CLOSURE.md** - Rules of engagement for engine closure
    - Status: Active
    - Referenced by: 0_START_HERE.md
    - Phase: Engine closure

12. **ENGINE_CLOSURE_CRITERIA.md** - One-page closure criteria
    - Status: Active
    - Referenced by: 0_START_HERE.md
    - Phase: Engine closure

### Operational Truth
13. **STATUS.md** - Operational truth, not product law
    - Status: Active, updated daily
    - Referenced by: 0_START_HERE.md, PROTOCOL_REENTRY_AND_PROGRESS.md, README.md
    - Phase: Operational

14. **NEXT.md** - Forward gating and priorities
    - Status: Active, gating line added 2026-01-20
    - Referenced by: Protocols
    - Phase: Operational

15. **0_START_HERE.md** - Canonical index
    - Status: Active, primary entry point
    - Referenced by: All protocols
    - Phase: Core index

### Observer v1 Design Contracts
16. **OBSERVER_V1.md** - Observer v1 design sketch
    - Status: Active design contract
    - Referenced by: Implementation files
    - Phase: Observer v1

17. **OBSERVER_V1_FIRST_CAPABILITY.md** - First capability selection
    - Status: Active design contract
    - Referenced by: Implementation
    - Phase: Observer v1

18. **PATTERN_SIGNATURE.md** - Pattern signature schema
    - Status: Active design contract
    - Referenced by: Implementation
    - Phase: Observer v1

19. **PATTERN_PERSISTENCE_RULE.md** - Pattern persistence check rules
    - Status: Active design contract
    - Referenced by: Implementation
    - Phase: Observer v1

20. **OBSERVER_SPEECH.md** - Observer speech constraint
    - Status: Active design contract
    - Referenced by: Implementation
    - Phase: Observer v1

21. **OBSERVER_V1_IMPLEMENTATION_BOUNDARY.md** - Implementation blast radius
    - Status: Active design contract
    - Referenced by: Implementation
    - Phase: Observer v1

### Daily Protocols (Active)
22. **PROTOCOL_START_OF_DAY.md** - Start of day protocol
    - Status: Active, binding
    - Referenced by: PROTOCOL_INVENTORY.md
    - Phase: Daily protocol

23. **PROTOCOL_END_OF_DAY.md** - End of day protocol
    - Status: Active, binding
    - Referenced by: PROTOCOL_INVENTORY.md
    - Phase: Daily protocol

24. **PROTOCOL_REENTRY_AND_PROGRESS.md** - Re-entry protocol
    - Status: Active, binding
    - Referenced by: PROTOCOL_START_OF_DAY.md, PROTOCOL_INVENTORY.md
    - Phase: Daily protocol

25. **PROTOCOL_INVENTORY.md** - Protocol inventory
    - Status: Active reference
    - Referenced by: This audit
    - Phase: Protocol reference

### Build and Operations
26. **BUILD_NOTES.md** - Build issues and resolutions
    - Status: Active reference
    - Referenced by: NEXT.md
    - Phase: Operations

---

## Historical Files (Useful Record, No Longer Active)

### Phase Completion Records
27. **PHASE_3_COMPLETE.md** - Phase 3 completion record
    - Status: Historical, locked
    - Referenced by: PHASE_AUDIT_REPORT.md, PHASES.md
    - Phase: Phase 3 (complete)

28. **PHASE_3_DISTRIBUTION.md** - Phase 3 distribution details
    - Status: Historical, locked
    - Referenced by: PHASE_AUDIT_REPORT.md
    - Phase: Phase 3 (complete)

29. **PHASES.md** - Phase 3 completion marker
    - Status: Historical reference
    - Referenced by: PROTOCOL_REENTRY_AND_PROGRESS.md
    - Phase: Phase 3 summary

### Audit Reports (Historical but Important)
30. **PHASE_AUDIT_REPORT.md** - Phase audit report (2026-01-20)
    - Status: Historical audit, useful reference
    - Referenced by: Consolidation work
    - Phase: Audit

31. **AUDIT_CLOSEOUT.md** - Insight Contract + Observer v0 audit closeout
    - Status: Historical, audit complete
    - Referenced by: None
    - Phase: Audit (2024)

32. **INSIGHT_CONTRACT_AUDIT.md** - Insight Contract audit report
    - Status: Historical audit
    - Referenced by: None
    - Phase: Audit (2025-01-06)

33. **LENS_VERIFICATION_REPORT.md** - Lens verification report
    - Status: Historical audit
    - Referenced by: None
    - Phase: Audit (2025-01-06)

34. **POST_MERGE_AUDIT_2026-01-07.md** - Post-merge audit
    - Status: Historical audit
    - Referenced by: None
    - Phase: Audit (2026-01-07)

35. **PHASE20_AUDIT.md** - Phase 20 boundary audit
    - Status: Historical audit (2024)
    - Referenced by: None
    - Phase: Audit (Phase 20)

### Completion Maps (Historical)
36. **INSIGHTS_COMPLETION_MAP.md** - Insights completion map
    - Status: Historical reference
    - Referenced by: PHASE_3_COMPLETE.md
    - Phase: Phase 3

37. **INSIGHTS_AUDIT_COMPLETION_MAP.md** - Code audit completion map
    - Status: Historical audit
    - Referenced by: None
    - Phase: Audit

### Milestones and Reports
38. **MILESTONE_2026_01_05.md** - Milestone summary
    - Status: Historical milestone
    - Referenced by: None
    - Phase: Milestone

39. **END_OF_DAY_REPORT.md** - End of day protocol report template
    - Status: Historical template
    - Referenced by: PROTOCOL_END_OF_DAY.md
    - Phase: Daily protocol template

40. **START_OF_DAY_REPORT.md** - Start of day report template
    - Status: Historical template
    - Referenced by: None
    - Phase: Daily protocol template

### Freeze Documents (Historical)
41. **WEEKLY_LENS_FREEZE.md** - Weekly lens freeze policy
    - Status: Historical freeze document
    - Referenced by: PHASE_3_COMPLETE.md
    - Phase: Phase 3 freeze

---

## Future Intent Files (Not Yet Active, No Implementation Authority)

### Phase Declarations (Intent Only)
42. **PHASE4.md** - Phase 4 intent (Distribution Engine)
    - Status: Future intent, not active
    - Referenced by: PHASE_AUDIT_REPORT.md
    - Phase: Phase 4 (future)

43. **PHASE12.md** - Phase 12 declaration (Mirror vs Lens)
    - Status: Decision document (2024), intent only
    - Referenced by: PHASE12_DECLARATION.md, PHASE20_AUDIT.md
    - Phase: Phase 12 (declaration)

44. **PHASE12_DECLARATION.md** - Phase 12.1 final declaration
    - Status: Declaration only, no code
    - Referenced by: PHASE12.md
    - Phase: Phase 12 (declaration)

45. **PHASE13.md** - Phase 13 mirror surface design
    - Status: Design document, no code changes
    - Referenced by: PHASE20_AUDIT.md
    - Phase: Phase 13 (future intent)

46. **PHASE14.md** - Phase 14 mirror interaction rules
    - Status: Design document, no code changes
    - Referenced by: PHASE20_AUDIT.md
    - Phase: Phase 14 (future intent)

47. **PHASE15.md** - Phase 15 temporal presentation rules
    - Status: Design document, no code changes
    - Referenced by: PHASE20_AUDIT.md
    - Phase: Phase 15 (future intent)

48. **PHASE16.md** - Phase 16 mirror comparison rules
    - Status: Design document, no code changes
    - Referenced by: PHASE20_AUDIT.md
    - Phase: Phase 16 (future intent)

49. **PHASE17.md** - Phase 17 mirror aggregation rules
    - Status: Aggregation design document, no code changes
    - Referenced by: PHASE17_1.md, PHASE20_AUDIT.md
    - Phase: Phase 17 (future intent)

50. **PHASE17_1.md** - Phase 17.1 extension
    - Status: Design document extension
    - Referenced by: PHASE17.md
    - Phase: Phase 17 (future intent)

51. **PHASE18.md** - Phase 18 observer agency boundary
    - Status: Declaration only, no code changes
    - Referenced by: PHASE20_AUDIT.md
    - Phase: Phase 18 (future intent)

52. **PHASE19.md** - Phase 19 observer feedback loop boundary
    - Status: Declaration only, no code changes
    - Referenced by: PHASE20_AUDIT.md
    - Phase: Phase 19 (future intent)

---

## Superseded Files (Replaced by Another Doc)

53. **ARCHITECTURE.md** - Old architecture map
    - Status: Superseded by ARCHITECTURE_NOW.md
    - Referenced by: CURSOR_RULES.md
    - Phase: Superseded
    - **Action**: Archive or merge into ARCHITECTURE_NOW.md

---

## Orphaned Files (No Longer Referenced or Needed)

### Deprecation and Cleanup (Historical Intent)
54. **SHARING_DEPRECATION.md** - Sharing deprecation notes
    - Status: Historical, superseded by SCOPE.md canonical declaration
    - Referenced by: None
    - Phase: Deprecation (now in SCOPE.md)

55. **CLEANUP_PLAN.md** - Legacy cleanup plan
    - Status: Frozen intent, historical
    - Referenced by: STATUS.md (mentioned in scope freeze)
    - Phase: Cleanup intent

### Beta and Signal Logs (Historical)
56. **BETA_READINESS.md** - Beta readiness audit
    - Status: Historical, pre-beta checklist
    - Referenced by: None
    - Phase: Beta (2024)

57. **BETA_DRY_RUN_NOTES.md** - Beta dry run notes
    - Status: Historical notes
    - Referenced by: None
    - Phase: Beta

58. **BETA_SIGNAL_LOG.md** - Signal extraction log
    - Status: Historical signal collection
    - Referenced by: None
    - Phase: Phase 26 (historical)

59. **PRICING_SIGNAL_LOG.md** - Pricing signal log
    - Status: Historical signal log
    - Referenced by: None
    - Phase: Historical

### Release Documents (Historical)
60. **OBSERVER_V0_RELEASE.md** - Observer v0 release notes
    - Status: Historical release
    - Referenced by: None
    - Phase: Observer v0 release

### Snapshot Documents (Historical)
61. **INVESTOR_SNAPSHOT.md** - Investor snapshot
    - Status: Historical snapshot
    - Referenced by: None
    - Phase: Snapshot

62. **POSITIONING_LOCK.md** - Positioning lock document
    - Status: Historical positioning
    - Referenced by: None
    - Phase: Historical

63. **INVITATION.md** - Invitation language
    - Status: Historical reference
    - Referenced by: None
    - Phase: Historical

64. **CATEGORY.md** - Category and shelf placement
    - Status: Historical reference
    - Referenced by: None
    - Phase: Historical

65. **WHAT_THIS_IS.md** - What this is document
    - Status: Historical reference
    - Referenced by: None
    - Phase: Historical

### Cursor and Memory Files (Operational)
66. **CURSOR_RULES.md** - Cursor rules
    - Status: Active operational reference
    - Referenced by: None (used by Cursor IDE)
    - Phase: Operational tooling

67. **CURSOR_MEMORY.md** - Cursor memory
    - Status: Active operational reference
    - Referenced by: None (used by Cursor IDE)
    - Phase: Operational tooling

### Meaning Layer (Historical/Reference)
68. **MEANING_GRAPH.md** - Meaning graph architecture
    - Status: Historical architecture reference
    - Referenced by: None
    - Phase: Meaning layer (historical)

69. **THREADS_V1.md** - Threads v1 document
    - Status: Historical reference
    - Referenced by: None
    - Phase: Threads (historical)

### Insight Documents (Historical/Reference)
70. **INSIGHT_CONTRACT.md** - Insight contract
    - Status: Historical contract (may be active)
    - Referenced by: INSIGHT_CONTRACT_AUDIT.md
    - Phase: Insight contract

71. **INSIGHT_GUARDRAILS.md** - Insight guardrails
    - Status: Historical constraint document
    - Referenced by: None
    - Phase: Phase 21 stabilization

72. **INSIGHT_TAXONOMY.md** - Insight taxonomy
    - Status: Historical constraint document (Phase 21)
    - Referenced by: None
    - Phase: Phase 21 stabilization

### Sanctuary Documents (Historical/Reference)
73. **SANCTUARY_PRINCIPLES.md** - Sanctuary principles
    - Status: Historical reference
    - Referenced by: PROTOCOL_REENTRY_AND_PROGRESS.md
    - Phase: Sanctuary

74. **SANCTUARY_BASELINE.md** - Sanctuary baseline
    - Status: Historical reference
    - Referenced by: None
    - Phase: Sanctuary

75. **SANCTUARY_STRUCTURE.md** - Sanctuary structure
    - Status: Historical reference
    - Referenced by: None
    - Phase: Sanctuary

### Other Reference Documents
76. **WHAT_THE_SYSTEM_REMEMBERS.md** - What the system remembers
    - Status: Historical reference
    - Referenced by: None
    - Phase: Historical

77. **KNOWN_GAPS.md** - Known gaps
    - Status: Historical reference
    - Referenced by: None
    - Phase: Historical

78. **PERSONAL_MODES.md** - Personal modes
    - Status: Historical reference
    - Referenced by: None
    - Phase: Historical

---

## Summary Statistics

- **Canonical (Active)**: 26 files
- **Historical (Important Record)**: 15 files
- **Future Intent (No Implementation Authority)**: 11 files
- **Superseded**: 1 file
- **Orphaned**: 25 files

**Total in `/docs`**: 78 files

---

## Root-Level Phase Files (Outside `/docs`)

### Historical Phase Plans
79. **PHASE_2_PLAN.md** (root) - Phase 2 plan
    - Status: Historical plan
    - Referenced by: PHASE_AUDIT_REPORT.md
    - Phase: Phase 2 (historical)

80. **PHASE_3_COMPLETE.md** (root) - Phase 3 completion marker
    - Status: Historical, duplicate of docs/PHASE_3_COMPLETE.md
    - Referenced by: None
    - Phase: Phase 3 (duplicate)

81. **PHASE_4_PLAN.md** (root) - Phase 4 plan
    - Status: Historical plan
    - Referenced by: None
    - Phase: Phase 4 (historical)

82. **PHASE_4_COMPLETE.md** (root) - Phase 4 completion marker
    - Status: Historical completion
    - Referenced by: None
    - Phase: Phase 4 (historical)

83. **PHASE_4_1_YEAR_OVER_YEAR.md** (root) - Phase 4.1 YoY
    - Status: Historical phase completion
    - Referenced by: None
    - Phase: Phase 4.1 (historical)

84. **PHASE_5_INTENT.md** (root) - Phase 5 lifetime intelligence intent
    - Status: Future intent, no implementation authority
    - Referenced by: Code comments
    - Phase: Phase 5 (future intent)

**Total Root-Level**: 6 files

**Grand Total**: 84 files (78 in `/docs` + 6 root-level)

---

## Proposed Cleanup Map

### Move to `/docs/archive/` (Historical but Keep)
- All Phase 12-19 declaration documents (future intent, no implementation)
- All audit reports (historical but useful)
- All beta/signal logs (historical)
- All milestone/release documents
- All snapshot documents
- All historical freeze documents
- All completion maps (historical)
- All sanctuary documents (historical)
- All meaning layer historical docs
- All insight historical docs (contract, guardrails, taxonomy)
- All deprecation/cleanup plans (now in SCOPE.md)
- All orphaned reference documents
- Root-level phase files (PHASE_2_PLAN, PHASE_3_COMPLETE, PHASE_4_PLAN, PHASE_4_COMPLETE, PHASE_4_1_YEAR_OVER_YEAR, PHASE_5_INTENT)

**Estimated**: ~55 files to archive

### Merge Candidates
- **ARCHITECTURE.md** → Merge into ARCHITECTURE_NOW.md (if still useful)
- **SHARING_DEPRECATION.md** → Already superseded by SCOPE.md canonical declaration

### Keep Top-Level (Canonical + Active Operational)
- All Core Laws (4 files)
- All Design Contracts (4 files)
- All System Maps (2 files)
- All Transition Rules (2 files)
- All Operational Truth (3 files)
- All Observer v1 Contracts (6 files)
- All Daily Protocols (4 files)
- All Build/Operations (1 file)
- **Total**: ~26 files remain top-level

### Never Touch Again (Frozen)
- OBSERVER_V0.md (explicitly frozen)
- PHASE_3_COMPLETE.md (locked)
- All Phase 12-19 declarations (intent only, no implementation)

---

## Duplicate Phase Definitions

- **PHASE12.md** and **PHASE12_DECLARATION.md**: Both cover Phase 12, declaration is more specific
- **PHASE17.md** and **PHASE17_1.md**: Extension relationship, keep both

---

## Phase Numbers Never Activated

- Phase 5: Referenced in code (`PHASE_5_INTENT.md` not found, may be in root)
- Phase 6-11: Not found in docs (may be historical)
- Phase 21+: Referenced in some docs but not as phase declarations

---

## Recommendations

1. **Archive ~50 historical files** to `/docs/archive/` to reduce cognitive load
2. **Keep ~26 canonical files** top-level for active development
3. **Merge ARCHITECTURE.md** into ARCHITECTURE_NOW.md if still useful
4. **Mark Phase 12-19 as "Intent Only"** in a single index file
5. **Create `/docs/archive/README.md`** explaining what's archived and why

---

## Next Steps

1. Review this inventory for classification errors
2. Confirm archive list
3. Execute archive moves (no deletions)
4. Update 0_START_HERE.md if needed
5. Create archive README

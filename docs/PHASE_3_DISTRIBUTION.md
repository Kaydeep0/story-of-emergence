# Phase 3 – Distribution Layer

## Purpose

Phase 3 unlocks the ability to share insights as immutable artifacts. Every lens (Weekly, Summary, Lifetime, Yearly) can generate a shareable artifact that conforms to a strict contract. This ensures:

- **Privacy-first**: Only derived views are shared, never raw journal text
- **Consistency**: All artifacts use the same structure and sharing mechanisms
- **Identity**: Every artifact has a deterministic ID and provenance
- **Control**: Users can share privately via encrypted capsules or export as PNG/caption

Phase 3 establishes the "distribution of meaning" layer—the controlled emission of insights from the private vault.

## Artifact Contract

All artifacts conform to the `ShareArtifact` contract defined in `src/lib/lifetimeArtifact.ts`:

```typescript
type ShareArtifact = {
  kind: 'lifetime' | 'weekly' | 'yearly';
  generatedAt: string; // ISO timestamp
  wallet: string;
  artifactId: string; // Deterministic SHA-256 hash

  inventory: {
    totalReflections: number;
    firstReflectionDate: string | null;
    lastReflectionDate: string | null;
    distinctMonths: number;
  };

  signals: Array<{
    id: string;
    label: string;
    confidence: number; // 0–1
    evidenceCount: number;
  }>;
};
```

**Invariants:**
- All fields must be present (use `null` for missing values, never `undefined`)
- `artifactId` is computed deterministically from `wallet + kind + firstReflectionDate + lastReflectionDate`
- `signals` represent structural patterns, not interpretations
- No UI language, no derived prose, no recommendations

## Lenses

### Weekly
- **Generator**: `generateWeeklyArtifact(weeklyInsight, wallet)`
- **Input**: `WeeklyInsight` from weekly insights computation
- **Signals**: Top days with reflection activity
- **Kind**: `'weekly'`

### Summary
- **Generator**: `generateSummaryArtifact(reflections, wallet)`
- **Input**: Recent reflection entries (typically last 7-14 days)
- **Signals**: Top 5 days by reflection count
- **Kind**: `'weekly'` (focuses on recent activity)

### Lifetime
- **Generator**: `generateLifetimeArtifact(reflections, wallet)`
- **Input**: All decrypted reflections
- **Signals**: Top 5 years by reflection count
- **Kind**: `'lifetime'`

### Yearly
- **Generator**: `generateYearlyArtifact(reflections, distributionResult, wallet)`
- **Input**: Year's reflections + distribution analysis
- **Signals**: Top spike days with formatted dates (e.g., "Jan 15, 2025")
- **Kind**: `'yearly'`

### Timeline (Lifetime view)
- **Generator**: `generateTimelineArtifact(reflections, wallet)`
- **Input**: All timeline reflection entries
- **Signals**: Top 5 months by reflection count
- **Kind**: `'lifetime'` (spans all reflections)

## Share Actions

All lenses expose three share actions:

### PNG
- Generates a canvas-based image with artifact data
- Includes provenance line: `"Private reflection • Generated from encrypted data • {date range}"`
- Downloads as `soe-{kind}-{date}.png`
- Includes artifact identity in metadata

### Caption
- Uses canonical caption generator: `generateLifetimeCaption(artifact)`
- Platform-agnostic text suitable for social sharing
- Includes artifact metadata and date range
- Sanitized to remove sensitive identifiers

### Send privately
- Opens `ShareCapsuleDialog` component
- Creates encrypted `ShareCapsule` using client-side encryption
- Key derived from `senderWallet + recipient + artifactId`
- Server cannot read encrypted payload
- Logs capsule to console (for now)

## Guardrails

### No Hooks in Conditionals
**Rule**: All hooks (`useState`, `useEffect`, `useMemo`) must be declared at the top level of the component, before any early returns or conditional branches.

**Why**: React requires hooks to be called in the same order on every render. Conditional hooks cause "hooks order violation" errors.

**Pattern**:
```typescript
// ✅ Good
const [artifact, setArtifact] = useState(null);
useEffect(() => { ... }, [deps]);
if (!mounted) return null;

// ❌ Bad
if (condition) {
  const [artifact, setArtifact] = useState(null); // Violation!
}
```

### All Artifacts Generated Top-Level
**Rule**: Artifact generation `useEffect` hooks must be at the component top level, not inside IIFEs or conditional renders.

**Pattern**:
```typescript
// ✅ Good
useEffect(() => {
  if (!reflections?.length || !address) {
    setArtifact(null);
    return;
  }
  generateArtifact(reflections, address).then(setArtifact);
}, [reflections, address]);

// ❌ Bad
{address && (() => {
  useEffect(() => { ... }, []); // Violation!
  return <ShareButton />;
})()}
```

### One ShareCapsuleDialog Per Page
**Rule**: Each lens has exactly one `ShareCapsuleDialog` instance, rendered at the page bottom, gated by artifact existence.

**Pattern**:
```typescript
// At bottom of component, outside mode conditionals
{address && lifetimeArtifact && (
  <ShareCapsuleDialog
    artifact={lifetimeArtifact}
    senderWallet={address}
    isOpen={showLifetimeCapsuleDialog}
    onClose={() => setShowLifetimeCapsuleDialog(false)}
  />
)}
```

### Artifact Identity Required
**Rule**: Every artifact must have an `artifactId` before sharing. Runtime guards throw if missing.

**Enforcement**:
```typescript
if (!artifact.artifactId) {
  throw new Error('Artifact missing identity: artifactId is required');
}
```

## Phase Boundary

**Phase 3 ends here.**

All new insight logic belongs to Phase 4+:
- Phase 4.1: Year-over-Year narrative generator
- Phase 4.2: Lifetime vs Recent contrast
- Phase 4.3: Pattern drift detection

**What Phase 3 Does NOT Do:**
- Generate new insights (only distributes existing ones)
- Interpret or recommend (only structures observable data)
- Auto-link sources (only manual linking exists)
- Public sharing (only private capsules and local exports)

**What Phase 3 IS:**
- A distribution layer for existing insights
- A privacy-first sharing mechanism
- A consistent artifact contract across lenses
- A controlled emission of meaning from the vault

## File Structure

```
src/lib/artifacts/
  ├── lifetimeArtifact.ts      # ShareArtifact type contract
  ├── artifactId.ts            # Deterministic ID generation
  ├── provenance.ts             # Provenance line generator
  ├── lifetimeCaption.ts        # Canonical caption generator
  ├── weeklyArtifact.ts         # Weekly artifact generator
  ├── summaryArtifact.ts        # Summary artifact generator
  ├── timelineArtifact.ts       # Timeline artifact generator
  ├── yearlyArtifact.ts         # Yearly artifact generator
  └── lifetimeArtifact.ts       # Lifetime artifact generator

src/lib/shareCapsule.ts        # Encrypted capsule creation
src/app/components/
  └── ShareCapsuleDialog.tsx   # Capsule creation UI
```

## Testing Checklist

Before modifying Phase 3, verify:

- [ ] All lenses generate artifacts with valid `artifactId`
- [ ] No hooks are inside conditionals or IIFEs
- [ ] Share actions appear only when artifact exists
- [ ] PNG generation includes provenance line
- [ ] Caption uses canonical generator
- [ ] Capsule dialog opens and closes correctly
- [ ] No duplicate share action buttons
- [ ] All artifacts conform to `ShareArtifact` contract

## Future Changes

If you need to extend Phase 3:

1. **New Lens**: Add generator in `src/lib/artifacts/`, wire state/useEffect in `src/app/insights/page.tsx`, add share actions UI
2. **New Share Action**: Add handler, ensure artifact identity check, follow existing pattern
3. **Contract Change**: Version the contract, update all generators, ensure backward compatibility

**Do NOT:**
- Add insight computation logic (belongs in Phase 4+)
- Change artifact contract without versioning
- Move hooks into conditionals
- Create multiple dialogs per lens


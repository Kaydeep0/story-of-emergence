# Legacy or Orphaned Code File Candidates

Generated: 2026-01-21

## Files Explicitly Marked Legacy/Frozen/Deprecated

### High Confidence (Explicitly Marked)

1. **`src/app/lib/weeklyInsights.ts`**
   - Marked: `LEGACY: Frozen. Weekly lens uses canonical insights engine. Do not extend.`
   - Status: Wrapper around canonical engine, kept for type exports
   - Action: Keep for now (type exports), but could be removed if types moved

2. **`src/lib/shareCapsule.ts`**
   - Marked: `LEGACY: Do not extend. Canonical sharing uses wallet_shares.`
   - Status: Old capsule system, replaced by wallet_shares
   - Action: Candidate for removal after verifying no active usage

3. **`src/app/insights/yearly/components/ShareActionsBar.tsx`**
   - Marked: `LEGACY: Frozen. Unused. All lenses use canonical ShareActionsBar`
   - Status: Unused component, kept for reference only
   - Action: Safe to remove

4. **`src/app/lib/shares.ts`**
   - Marked: `DEPRECATED: Legacy shares table functions. ⚠️ DO NOT USE`
   - Status: Old shares table API
   - Action: Candidate for removal (see STATUS.md cleanup tasks)

5. **`src/app/lib/share/renderSharePackPNG.tsx`**
   - Marked: `@deprecated Use SharePackRenderer with mode='png' instead`
   - Status: Legacy wrapper, 0 references found
   - Action: Safe to remove (replaced by SharePackRenderer)

6. **`src/app/lib/share/renderSharePack.tsx`**
   - Marked: `@deprecated Use SharePackRenderer component instead`
   - Status: Legacy wrapper, still imported by SharePackBuilder and generateSharePackPng
   - Action: Review - migrate callers to SharePackRenderer, then remove

7. **`src/app/shared/open/page.tsx`**
   - Marked: `Legacy capsule route redirector`
   - Status: Redirect route for old capsule URLs
   - Action: Keep for backward compatibility (mentioned in STATUS.md cleanup)

8. **`src/app/shared/open/[id]/page.tsx`**
   - Marked: `Legacy share route redirector`
   - Status: Redirect route for old share URLs
   - Action: Keep for backward compatibility (mentioned in STATUS.md cleanup)

### Medium Confidence (Legacy Patterns)

9. **`src/lib/sharing.ts`**
   - Contains: `DEPRECATED: AcceptedShare and AcceptedShareRow types removed`
   - Status: Has legacy capsule encoding/decoding functions
   - Action: Review - may still be used by legacy routes

10. **`src/app/lib/insights/distributionLayer.ts`**
    - Contains: `computeDistributionLayerLegacy` function
    - Status: Used by `computeDistributionsArtifact.ts`
    - Action: Keep for now (still in use)

11. **`src/app/lib/insights/computeDistributionsArtifact.ts`**
    - Uses: `computeDistributionLayerLegacy`
    - Status: Active usage of legacy function
    - Action: Keep (but could refactor to use canonical function)

12. **`src/app/lib/insights/normalizeCard.ts`**
    - Contains: `LegacyInsightCard` type
    - Status: Active adapter for legacy card format
    - Action: Keep (still needed for compatibility)

## Files with Legacy References (May Contain Legacy Code)

13. **`src/app/share/renderers/renderSharePack.tsx`**
    - Contains: Legacy SharePack adapter (`adaptToContractPack`)
    - Status: Active but handles legacy format conversion
    - Action: Review - may be removable if all SharePacks are canonical

14. **`src/app/insights/components/ShareActionsBar.tsx`**
    - Contains: Legacy ShareArtifact support (deprecated)
    - Status: Active but supports both SharePack and legacy artifact
    - Action: Review - could remove legacy artifact support

15. **`src/lib/walletShares.ts`**
    - Contains: Legacy artifact format support
    - Status: Active but handles both SharePack and legacy artifacts
    - Action: Review - could remove legacy artifact support

16. **`src/app/lib/reflectionLinks.ts`**
    - Marked: `Legacy reflection links - now uses entry_sources table`
    - Status: Still referenced but deprecated
    - Action: Review usage, migrate to entrySources.ts

17. **`src/app/lib/externalSources.ts`**
    - Contains: Legacy fallback for plain base64(JSON)
    - Status: Active fallback code
    - Action: Keep (backward compatibility)

18. **`src/lib/crypto.ts`**
    - Contains: Legacy encrypt/decrypt functions
    - Status: Active fallback code
    - Action: Keep (backward compatibility)

19. **`src/app/lib/entries.ts`**
    - Contains: Legacy decoder for earliest placeholder rows
    - Status: Active fallback code
    - Action: Keep (backward compatibility)

## Likely Orphaned Files (Low Reference Count)

**Note:** Test files (`.test.ts`) naturally have 0 references - they're run by test runners, not imported. These are NOT orphans.

### Actually Unused (0 references, not tests)

20. **`src/app/insights/components/ContrastDistribution.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

21. **`src/app/insights/components/MiniSparkline.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

22. **`src/app/insights/yearly/share/ShareCardRenderer.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

23. **`src/app/components/SourceForm.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

24. **`src/app/components/DebugInsightStrip.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

25. **`src/app/components/InsightsFromSources.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

26. **`src/app/components/share/YearlyShareCard.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

27. **`src/app/components/share/YearlyWrapShareCard.tsx`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

28. **`src/app/lib/share/renderSharePackPNG.tsx`**
    - Status: 0 references found, marked deprecated
    - Action: Safe to remove (replaced by SharePackRenderer)

29. **`src/app/lib/share/wrapForRecipient.ts`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

30. **`src/lib/shareArtifacts.ts`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

31. **`src/lib/useLifetimeSignalInventory.ts`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

32. **`src/lib/walletEncryption.ts`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

33. **`src/lib/featureFlags.ts`**
    - Status: 0 references found
    - Action: Verify if unused, remove if confirmed

### Active Files (Keep)

- `src/app/lib/insights/computeWeeklyArtifact.ts` - Used by `computeInsightsForWindow.ts`
- `src/app/components/ShareCapsuleDialog.tsx` - Used by ShareActionsBar (but uses legacy capsule system)

## Summary

### Safe to Remove (High Confidence)
1. **`src/app/insights/yearly/components/ShareActionsBar.tsx`**
   - Explicitly marked unused, all lenses use canonical ShareActionsBar
   - Action: Remove

2. **`src/app/lib/shares.ts`**
   - Explicitly deprecated, marked "DO NOT USE", 0 imports found
   - Action: Remove (mentioned in STATUS.md cleanup tasks)

3. **`src/app/lib/share/renderSharePackPNG.tsx`**
   - Deprecated wrapper, 0 references found
   - Action: Remove (replaced by SharePackRenderer)

### Review for Removal (Medium Confidence)
4. **`src/app/lib/share/renderSharePack.tsx`**
   - Deprecated wrapper, still imported by SharePackBuilder and generateSharePackPng
   - Action: Migrate callers to SharePackRenderer, then remove

5. **`src/lib/shareCapsule.ts`**
   - Legacy capsule system, replaced by wallet_shares
   - Action: Verify no active usage, remove if confirmed

6. **`src/app/lib/weeklyInsights.ts`**
   - Frozen wrapper, kept for type exports
   - Action: Move types to canonical location, then remove

7. **`src/app/components/share/YearlyShareCard.tsx`**
   - 0 references found
   - Action: Verify if unused, remove if confirmed

8. **`src/app/components/share/YearlyWrapShareCard.tsx`**
   - 0 references found
   - Action: Verify if unused, remove if confirmed

9. **`src/app/lib/share/wrapForRecipient.ts`**
   - 0 references found
   - Action: Verify if unused, remove if confirmed

10. **`src/lib/shareArtifacts.ts`**
    - 0 references found
    - Action: Verify if unused, remove if confirmed

### Keep for Now (Backward Compatibility)
- Legacy route redirectors (`src/app/shared/open/*`) - Keep for old URLs
- Legacy fallback decoders (`src/lib/crypto.ts`, `src/app/lib/entries.ts`) - Keep for data compatibility
- Legacy format adapters (`src/app/share/renderers/renderSharePack.tsx`) - Keep until all SharePacks canonical
- Legacy reflection links (`src/app/lib/reflectionLinks.ts`) - Keep until migration complete

### Future Cleanup (After Migration)
- Legacy artifact support in ShareActionsBar, walletShares
- Legacy SharePack adapters in renderSharePack.tsx
- Legacy reflection links (migrate to entrySources)
- Legacy distribution functions (refactor to canonical)

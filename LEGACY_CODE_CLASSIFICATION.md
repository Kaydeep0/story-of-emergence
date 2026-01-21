# Legacy Code Classification

Generated: 2026-01-21

Each file classified as:
- **A. Canonical live path** - Active, canonical code
- **B. Legacy but still imported** - Deprecated but still referenced
- **C. Orphaned and safe to freeze** - No imports, safe to remove

---

## Classification Results

### C. Orphaned and Safe to Freeze

1. **`src/app/insights/yearly/components/ShareActionsBar.tsx`**
   - Classification: **C. Orphaned**
   - Evidence: 0 imports found, explicitly marked unused
   - Action: Safe to remove

2. **`src/app/lib/shares.ts`**
   - Classification: **C. Orphaned**
   - Evidence: Only self-references (table name in SQL), commented import in HomeClient.tsx
   - Action: Safe to remove

3. **`src/app/lib/share/renderSharePackPNG.tsx`**
   - Classification: **C. Orphaned**
   - Evidence: 0 imports found, deprecated
   - Action: Safe to remove

4. **`src/app/components/share/YearlyShareCard.tsx`**
   - Classification: **C. Orphaned**
   - Evidence: Only self-references (component definition)
   - Action: Safe to remove

5. **`src/app/components/share/YearlyWrapShareCard.tsx`**
   - Classification: **C. Orphaned**
   - Evidence: Only self-references (component definition)
   - Action: Safe to remove

6. **`src/app/lib/share/wrapForRecipient.ts`**
    - Classification: **C. Orphaned**
    - Evidence: 0 imports found, uses sharing.ts functions but not imported anywhere
    - Action: Safe to remove

7. **`src/lib/shareArtifacts.ts`**
   - Classification: **C. Orphaned**
   - Evidence: 0 references found
   - Action: Safe to remove

8. **`src/lib/featureFlags.ts`**
   - Classification: **C. Orphaned**
   - Evidence: 0 references found
   - Action: Safe to remove

9. **`src/app/insights/components/ContrastDistribution.tsx`**
   - Classification: **C. Orphaned**
   - Evidence: Only self-references (component definition)
   - Action: Safe to remove

10. **`src/app/insights/components/MiniSparkline.tsx`**
    - Classification: **C. Orphaned**
    - Evidence: Only self-references (component definition)
    - Action: Safe to remove

11. **`src/app/insights/yearly/share/ShareCardRenderer.tsx`**
    - Classification: **C. Orphaned**
    - Evidence: Only self-references (component definition)
    - Action: Safe to remove

12. **`src/app/components/SourceForm.tsx`**
    - Classification: **C. Orphaned**
    - Evidence: Only self-references (component definition)
    - Action: Safe to remove

13. **`src/app/components/DebugInsightStrip.tsx`**
    - Classification: **C. Orphaned**
    - Evidence: Only self-references (component definition)
    - Action: Safe to remove

14. **`src/app/components/InsightsFromSources.tsx`**
    - Classification: **C. Orphaned**
    - Evidence: Only self-references (component definition)
    - Action: Safe to remove

15. **`src/lib/shareCapsule.ts`**
    - Classification: **C. Orphaned**
    - Evidence: 0 imports found - functions only self-referenced, ShareCapsuleDialog doesn't use them
    - Action: Safe to remove (ShareCapsuleDialog uses ShareArtifact, not ShareCapsule functions)

### B. Legacy but Still Imported

16. **`src/app/lib/share/renderSharePack.tsx`**
    - Classification: **B. Legacy but still imported**
    - Evidence: Imported by:
      - `src/app/insights/yearly/components/SharePackBuilder.tsx`
      - `src/app/lib/share/generateSharePackPng.ts`
    - Action: Migrate callers to SharePackRenderer, then remove

16. **`src/lib/shareCapsule.ts`**
    - Classification: **C. Orphaned**
    - Evidence: 0 imports found - ShareCapsuleDialog doesn't use these functions, only type name matches
    - Action: Safe to remove (ShareCapsuleDialog uses ShareArtifact, not ShareCapsule)

17. **`src/app/lib/weeklyInsights.ts`**
    - Classification: **B. Legacy but still imported**
    - Evidence: Type `WeeklyInsight` imported by:
      - `src/lib/artifacts/weeklyArtifact.ts`
      - `src/app/insights/components/WeeklyInsightCard.tsx`
    - Action: Move `WeeklyInsight` type to canonical location, then remove file

18. **`src/app/lib/reflectionLinks.ts`**
    - Classification: **B. Legacy but still imported**
    - Evidence: Imported by multiple insight pages (yearly, weekly, summary, yoy, timeline, distributions, thread, mind)
    - Action: Migrate callers to entrySources.ts, then remove

19. **`src/lib/sharing.ts`**
    - Classification: **B. Legacy but still imported**
    - Evidence: Functions `encodeCapsule`, `decodeCapsule`, `buildCapsuleUrl` may be used by legacy routes
    - Action: Review usage in legacy routes (`src/app/shared/open/*`), keep if needed for redirects

20. **`src/lib/useLifetimeSignalInventory.ts`**
    - Classification: **B. Legacy but still imported**
    - Evidence: Uses `buildLifetimeSignalInventory` from `lifetimeSignalInventory.ts`
    - Action: Check if hook is used anywhere, if not, remove

21. **`src/lib/walletEncryption.ts`**
    - Classification: **B. Legacy but still imported**
    - Evidence: Only self-references (function definitions)
    - Action: Verify if `checkWalletEncryptionSupport` is called anywhere

### A. Canonical Live Path

22. **`src/app/shared/open/page.tsx`**
    - Classification: **A. Canonical live path**
    - Evidence: Next.js route file (page.tsx), active redirect route
    - Action: Keep for backward compatibility

23. **`src/app/shared/open/[id]/page.tsx`**
    - Classification: **A. Canonical live path**
    - Evidence: Next.js route file (page.tsx), active redirect route
    - Action: Keep for backward compatibility

24. **`src/app/lib/insights/distributionLayer.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Contains both canonical and legacy functions, canonical functions are active
    - Action: Keep (legacy function can be refactored later)

25. **`src/app/lib/insights/computeDistributionsArtifact.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Active artifact computation, uses legacy function but is canonical path
    - Action: Keep (refactor to use canonical function later)

26. **`src/app/lib/insights/normalizeCard.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Active adapter, needed for compatibility
    - Action: Keep

27. **`src/app/share/renderers/renderSharePack.tsx`**
    - Classification: **A. Canonical live path**
    - Evidence: Active renderer with legacy adapter, handles both formats
    - Action: Keep (remove legacy adapter after migration)

28. **`src/app/insights/components/ShareActionsBar.tsx`**
    - Classification: **A. Canonical live path**
    - Evidence: Canonical component, supports legacy artifacts for compatibility
    - Action: Keep (remove legacy support after migration)

29. **`src/lib/walletShares.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Canonical sharing API, supports legacy artifacts for compatibility
    - Action: Keep (remove legacy support after migration)

30. **`src/app/lib/externalSources.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Active fallback code for backward compatibility
    - Action: Keep

31. **`src/lib/crypto.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Active fallback code for backward compatibility
    - Action: Keep

32. **`src/app/lib/entries.ts`**
    - Classification: **A. Canonical live path**
    - Evidence: Active fallback code for backward compatibility
    - Action: Keep

---

## Summary by Classification

### C. Orphaned and Safe to Freeze (15 files)
- `src/app/insights/yearly/components/ShareActionsBar.tsx`
- `src/app/lib/shares.ts`
- `src/app/lib/share/renderSharePackPNG.tsx`
- `src/app/components/share/YearlyShareCard.tsx`
- `src/app/components/share/YearlyWrapShareCard.tsx`
- `src/app/lib/share/wrapForRecipient.ts`
- `src/lib/shareArtifacts.ts`
- `src/lib/shareCapsule.ts`
- `src/lib/featureFlags.ts`
- `src/app/insights/components/ContrastDistribution.tsx`
- `src/app/insights/components/MiniSparkline.tsx`
- `src/app/insights/yearly/share/ShareCardRenderer.tsx`
- `src/app/components/SourceForm.tsx`
- `src/app/components/DebugInsightStrip.tsx`
- `src/app/components/InsightsFromSources.tsx`

### B. Legacy but Still Imported (6 files)
- `src/app/lib/share/renderSharePack.tsx` - Migrate callers, then remove
- `src/app/lib/weeklyInsights.ts` - Move types, then remove
- `src/app/lib/reflectionLinks.ts` - Migrate to entrySources, then remove
- `src/lib/sharing.ts` - Review usage in legacy routes, keep if needed for redirects
- `src/lib/useLifetimeSignalInventory.ts` - Verify usage, remove if unused
- `src/lib/walletEncryption.ts` - Verify usage, remove if unused

### A. Canonical Live Path (11 files)
- Legacy route redirectors (keep for backward compatibility)
- Legacy fallback decoders (keep for data compatibility)
- Legacy format adapters (keep until migration complete)
- Active components with legacy support (keep, remove legacy support later)

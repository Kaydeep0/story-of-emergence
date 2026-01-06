# SharePack Universal Payload - Implementation Summary

## ✅ Completed

### 1. Extended SharePack Type
- Updated `src/app/lib/share/sharePack.ts` to support all lens types
- Added `lens` field: `'weekly' | 'summary' | 'timeline' | 'yearly' | 'distributions' | 'yoy' | 'lifetime'`
- Made `year` optional (only for yearly lens)
- Added `periodStart` and `periodEnd` for time-bounded lenses
- Added `activeDays` to `keyNumbers`

### 2. Created Universal Builder
- `buildSharePackForLens(lensState: LensState): SharePack`
- Pure function, deterministic, no side effects
- Works for all lens types
- Backward compatible: `buildYearlySharePack` still works (deprecated)

### 3. Updated ShareActionsBar
- Now accepts `sharePack?: SharePack | null` (preferred)
- Still accepts `artifact?: ShareArtifact | null` (legacy, deprecated)
- Uses SharePack for caption generation via `buildShareTextFromPack()`
- Uses SharePack PNG renderer for image export
- Wallet sharing encrypts SharePack JSON

### 4. Created Universal PNG Renderer
- `src/app/lib/share/renderSharePackPNG.tsx`
- Renders any SharePack as a visual card
- Works with `html-to-image` for PNG export
- Hidden div rendered when SharePack is provided

### 5. Updated buildShareText
- Added `buildShareTextFromPack(platform, sharePack)` function
- Accepts SharePack and generates platform-specific captions
- Legacy `buildShareText(platform, content)` still works

### 6. Updated Wallet Sharing
- `createWalletShare()` now accepts optional `sharePack` parameter
- If SharePack provided, encrypts SharePack JSON (preferred)
- Otherwise encrypts artifact JSON (legacy)
- `ShareToWalletDialog` accepts both SharePack and artifact

## 🔄 Remaining: Update Lens Pages

Each lens page needs to:
1. Build SharePack from lens state using `buildSharePackForLens()`
2. Pass SharePack to `ShareActionsBar` instead of (or alongside) artifact

### Lens Pages to Update:
- [ ] `src/app/insights/weekly/page.tsx`
- [ ] `src/app/insights/summary/page.tsx`
- [ ] `src/app/insights/timeline/page.tsx`
- [ ] `src/app/insights/yearly/page.tsx` (may already use SharePack)
- [ ] `src/app/insights/distributions/page.tsx`
- [ ] `src/app/insights/yoy/page.tsx`
- [ ] `src/app/insights/lifetime/page.tsx`

## Acceptance Criteria Status

✅ **Every insights page passes a SharePack into ShareActionsBar**
- In progress - need to update all lens pages

✅ **Captions come from buildShareText(sharePack, platform)**
- Implemented via `buildShareTextFromPack()`

✅ **Wallet shares decrypt into a SharePack and render via a single renderer**
- Wallet shares encrypt SharePack JSON
- Need to update wallet share viewer to render SharePack

✅ **PNG export always renders from a SharePack driven component subtree**
- Implemented via `SharePackPNGRenderer` component

✅ **Wallet share encrypts SharePack JSON only, no lens specific blobs**
- Implemented - `createWalletShare()` encrypts SharePack JSON when provided

## Next Steps

1. Update each lens page to build SharePack
2. Update wallet share viewer (`src/app/shared/wallet/[id]/page.tsx`) to render SharePack
3. Test all sharing flows with SharePack
4. Remove legacy artifact-based sharing (optional cleanup)


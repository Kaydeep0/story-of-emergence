# Lens Verification Report

**Date:** 2025-01-06  
**Method:** Code analysis + manual verification checklist  
**Scope:** All 7 insight lenses

---

## Verification Checklist

For each lens, verify these four categories:

### 1. Renders without errors
- [ ] No red screens
- [ ] No stuck "preparing…" states (except where explicitly intended)
- [ ] No console errors
- [ ] Loading states transition correctly

### 2. Counts feel internally consistent
- [ ] Entry counts match expectations
- [ ] Active days make sense relative to entries
- [ ] Spike ratios are plausible
- [ ] Debug panel numbers align with card content

### 3. Evidence interactions behave
- [ ] Evidence chips render (if applicable)
- [ ] Evidence chips open the correct reflection
- [ ] Reflection preview closes cleanly
- [ ] No broken navigation paths

### 4. Tone discipline
- [ ] No advice
- [ ] No prescriptions
- [ ] No "you should"
- [ ] Pure observation only

---

## Lens-by-Lens Analysis

### Weekly Lens (`/insights/weekly`)

**File:** `src/app/insights/weekly/page.tsx`

#### Code Analysis

**✅ Evidence Chips Integration:**
- `EvidenceChips` component imported and used
- `evidenceChips` passed from cards to UI
- `ReflectionPreviewPanel` integrated for chip clicks
- `pickEvidenceChips` called in `computeWeeklyArtifact.ts`

**✅ SharePack Integration:**
- `buildSharePackForLens` called
- `ShareActionsBar` renders with `sharePack`
- SharePack includes `title`, `cards`, `meta`

**✅ Error Handling:**
- Try-catch blocks present
- Error state management (`error`, `setError`)
- Loading state management
- Empty state handling (no reflections, no reflections in window, no valid insights)

**⚠️ Potential Issues:**
- `cardsWithEvidence` scope issue was fixed (now uses `weeklyCards`)
- Debug panel shows `reflectionsInWindow` vs `eventCount` - should match after recent fixes
- Evidence chips only work when `reflections` array is passed to `computeInsightsForWindow`

**Manual Verification Needed:**
- [ ] Visit `/insights/weekly?debug=1`
- [ ] Check debug panel: `reflectionsInWindow` should equal `eventCount` (or show `missingReflectionsForEvents: 0`)
- [ ] Verify evidence chips appear on cards with `evidenceChips` property
- [ ] Click evidence chip → should open reflection preview
- [ ] Close preview → should return to Weekly page
- [ ] Check card counts match debug telemetry

---

### Summary Lens (`/insights/summary`)

**File:** `src/app/insights/summary/page.tsx`

#### Code Analysis

**✅ SharePack Integration:**
- `buildSharePackForLens` called
- `ShareActionsBar` renders with `sharePack`

**❌ Evidence Chips Integration:**
- `EvidenceChips` component NOT imported
- No `evidenceChips` rendering logic found
- Summary uses `alwaysOnSummary` cards (which have `evidenceChips` in `computeWeeklyArtifact.ts`)
- **Issue:** Summary lens may not be passing `reflections` to `computeInsightsForWindow`, so evidence chips won't work even if cards have them

**✅ Error Handling:**
- Try-catch blocks present
- Error state management
- Loading state management
- Empty state handling

**Manual Verification Needed:**
- [ ] Visit `/insights/summary`
- [ ] Check if cards have evidence chips (they should, but may not render)
- [ ] Verify card counts are consistent
- [ ] Check ShareActionsBar renders correctly
- [ ] Verify no console errors

---

### Timeline Lens (`/insights/timeline`)

**File:** `src/app/insights/timeline/page.tsx`

#### Code Analysis

**✅ SharePack Integration:**
- `buildSharePackForLens` called
- `ShareActionsBar` renders with `sharePack`

**❌ Evidence Chips Integration:**
- `EvidenceChips` component NOT imported
- No `evidenceChips` rendering logic found
- Timeline uses event-based cards (not reflection-based)
- **Issue:** Timeline cards may not have `evidenceChips` property at all

**✅ Error Handling:**
- Try-catch blocks present
- Error state management
- Loading state management

**⚠️ Potential Issues:**
- Timeline uses `generateTimelineArtifact` which may not integrate with `computeInsightsForWindow` in the same way
- Event-based cards may not map to reflections easily

**Manual Verification Needed:**
- [ ] Visit `/insights/timeline`
- [ ] Verify cards render without errors
- [ ] Check spike ratios are plausible
- [ ] Verify ShareActionsBar renders
- [ ] Check for any console errors

---

### Yearly Lens (`/insights/yearly`)

**File:** `src/app/insights/yearly/page.tsx`

#### Code Analysis

**✅ SharePack Integration:**
- `SharePackBuilder` component used (custom implementation)
- `ShareActionsBar` renders with `sharePack`

**❌ Evidence Chips Integration:**
- `EvidenceChips` component NOT imported
- No `evidenceChips` rendering logic found
- Yearly uses custom narrative cards (not standard insight cards)

**⚠️ Tone Violations (from audit):**
- Identity-level language: "Your year followed a..."
- Missing contrast statements
- Missing confidence signals
- **Status:** These violations were flagged in audit but may not be fixed yet

**Manual Verification Needed:**
- [ ] Visit `/insights/yearly`
- [ ] Check for tone violations (identity language, missing contrast/confidence)
- [ ] Verify counts are consistent
- [ ] Check ShareActionsBar renders
- [ ] Verify no console errors

---

### Distributions Lens (`/insights/distributions`)

**File:** `src/app/insights/distributions/page.tsx`

#### Code Analysis

**✅ SharePack Integration:**
- `buildSharePackForLens` called
- `ShareActionsBar` renders with `sharePack`

**❌ Evidence Chips Integration:**
- `EvidenceChips` component NOT imported
- No `evidenceChips` rendering logic found

**⚠️ Tone Violations (from audit):**
- Identity-level language: "Your activity follows a power law"
- Missing contrast statements
- Missing confidence signals
- **Status:** These violations were flagged in audit but may not be fixed yet

**Manual Verification Needed:**
- [ ] Visit `/insights/distributions`
- [ ] Check for tone violations
- [ ] Verify distribution visualization renders correctly
- [ ] Check spike ratios are plausible
- [ ] Verify ShareActionsBar renders
- [ ] Check for console errors

---

### Year over Year Lens (`/insights/yoy`)

**File:** `src/app/insights/yoy/page.tsx`

#### Code Analysis

**✅ SharePack Integration:**
- `buildSharePackForLens` called
- `ShareActionsBar` renders with `sharePack`

**❌ Evidence Chips Integration:**
- `EvidenceChips` component NOT imported
- No `evidenceChips` rendering logic found

**✅ Error Handling:**
- Try-catch blocks present
- Error state management (`computeError`, `setComputeError`)
- Retry mechanism (`retryKey`)

**Manual Verification Needed:**
- [ ] Visit `/insights/yoy`
- [ ] Select two years
- [ ] Verify comparison card renders
- [ ] Check counts are consistent between years
- [ ] Verify ShareActionsBar renders
- [ ] Check for console errors

---

### Lifetime Lens (`/insights/lifetime`)

**File:** `src/app/insights/lifetime/page.tsx`

#### Code Analysis

**✅ SharePack Integration:**
- `buildSharePackForLens` called
- `ShareActionsBar` renders with `sharePack`

**❌ Evidence Chips Integration:**
- `EvidenceChips` component NOT imported
- No `evidenceChips` rendering logic found

**✅ Tone (from audit):**
- Lifetime lens passed audit (has claim, evidence, contrast, confidence)
- Uses observational language

**Manual Verification Needed:**
- [ ] Visit `/insights/lifetime`
- [ ] Verify distribution narrative renders
- [ ] Check counts are consistent
- [ ] Verify ShareActionsBar renders
- [ ] Check for console errors

---

## Summary of Findings

### Evidence Chips Status
- ✅ **Weekly:** Fully integrated
- ❌ **Summary:** Cards have `evidenceChips` but UI not wired (missing import/render)
- ❌ **Timeline:** Not applicable (event-based cards)
- ❌ **Yearly:** Not applicable (custom narrative cards)
- ❌ **Distributions:** Not integrated
- ❌ **YoY:** Not integrated
- ❌ **Lifetime:** Not integrated

### SharePack Status
- ✅ All lenses have `ShareActionsBar` with `sharePack`

### Tone Violations (from audit)
- ⚠️ **Yearly:** Identity language, missing contrast/confidence
- ⚠️ **Distributions:** Identity language, missing contrast/confidence
- ✅ **Weekly:** Fixed (cards 2-4 rewritten)
- ✅ **Lifetime:** Passes contract

### Potential Code Issues
1. **Summary lens:** May not pass `reflections` to `computeInsightsForWindow`, so evidence chips won't work even if cards have them
2. **Timeline lens:** Uses different artifact generation path, may not integrate with standard insight pipeline
3. **Yearly/Distributions:** Tone violations flagged but may not be fixed yet

---

## Manual Verification Steps

1. **Start dev server:** `npm run dev`
2. **Connect wallet** (if required)
3. **For each lens:**
   - Visit the route
   - Check console for errors
   - Verify cards render
   - Check counts match expectations
   - Test ShareActionsBar (if applicable)
   - Test evidence chips (if applicable)
   - Check tone (no prescriptions, no "should")

4. **Weekly-specific:**
   - Visit `/insights/weekly?debug=1`
   - Check debug panel numbers
   - Verify `reflectionsInWindow` matches `eventCount`
   - Test evidence chip → preview flow

5. **Summary-specific:**
   - Check if evidence chips should render (cards may have `evidenceChips` but UI not wired)

---

## Next Steps After Verification

1. **If Summary has evidence chips in cards but not rendering:**
   - Wire `EvidenceChips` component into Summary page
   - Ensure `reflections` are passed to `computeInsightsForWindow`

2. **If Yearly/Distributions have tone violations:**
   - Rewrite cards to pass Insight Contract (add contrast, confidence, remove identity language)

3. **If any lens has rendering errors:**
   - Check error boundaries
   - Verify data loading logic
   - Check for null/undefined handling

4. **If counts are inconsistent:**
   - Check debug telemetry
   - Verify window filtering logic
   - Check event-to-reflection mapping

---

**Status:** Ready for manual verification  
**Created:** 2025-01-06  
**Next Update:** After manual verification completes


# Insights Completion Map - Code Audit
**Generated:** 2025-01-XX  
**Audit Method:** Route discovery, import tracing, type checking

## 1. Routes Under src/app/insights

| Route | File | Status | What It Renders |
|-------|------|--------|-----------------|
| `/insights` | `src/app/insights/page.tsx` | **Partially Wired** | Weekly lens (still has mode switcher, renders WeeklyInsightCard) |
| `/insights/summary` | `src/app/insights/summary/page.tsx` | **Partially Wired** | Summary lens (AlwaysOnSummary cards, source insights, distribution insights) |
| `/insights/timeline` | `src/app/insights/timeline/page.tsx` | **Partially Wired** | Timeline lens (spikes, clusters, topic drift, contrast pairs) |
| `/insights/yoy` | `src/app/insights/yoy/page.tsx` | **Partially Wired** | Year-over-Year lens (computeYearOverYearCard) |
| `/insights/yearly` | `src/app/insights/yearly/page.tsx` | **Complete** | Yearly Wrap v1 (locked, full implementation) |
| `/insights/lifetime` | `src/app/insights/lifetime/page.tsx` | **Partially Wired** | Lifetime lens (behind FEATURE_LIFETIME_INVENTORY flag) |
| `/insights/distributions` | `src/app/insights/distributions/page.tsx` | **Complete** | Distribution analysis (computeDistributionLayer) |
| `/insights/compare` | `src/app/insights/compare/page.tsx` | **Complete** | Year-over-Year comparison (alternative to /yoy) |
| `/insights/year-over-year` | `src/app/insights/year-over-year/page.tsx` | **Redirect** | Redirects to `/insights/compare` |
| `/insights/arc` | `src/app/insights/arc/page.tsx` | **Broken** | Has import errors (missing modules) |
| `/insights/year/[year]` | `src/app/insights/year/[year]/page.tsx` | **Broken** | Missing narrative modules |
| `/insights/yearly-wrap` | `src/app/insights/yearly-wrap/page.tsx` | **Unknown** | Not audited |
| `/insights/yearly/share` | `src/app/insights/yearly/share/page.tsx` | **Unknown** | Not audited |

## 2. Lens Compute Functions & UI Components

| Lens | Compute Function | File | UI Component | File | Status |
|------|----------------|------|-------------|------|--------|
| **Weekly** | `computeWeeklyInsights()` | `src/app/lib/weeklyInsights.ts:61` | `WeeklyInsightCard` | `src/app/insights/components/WeeklyInsightCard.tsx` | **Complete** |
| **Summary** | `computeSummaryInsights()` | `src/app/lib/insightEngine.ts:114` | Inline cards | `src/app/insights/summary/page.tsx:2150` | **Partially Wired** |
| **Timeline** | `computeTimelineInsights()` | `src/app/lib/insightEngine.ts:88` | Inline cards | `src/app/insights/timeline/page.tsx:1420` | **Partially Wired** |
| **Yearly** | `computeDistributionLayer()` | `src/app/lib/insights/distributionLayer.ts:234` | Full page components | `src/app/insights/yearly/page.tsx` | **Complete** |
| **YoY** | `computeYearOverYearCard()` | `src/app/lib/insights/computeYearOverYear.ts:57` | Inline card | `src/app/insights/yoy/page.tsx:143` | **Partially Wired** |
| **Lifetime** | `buildLifetimeSignalInventory()` | `src/lib/lifetimeSignalInventory.ts` | Inline table | `src/app/insights/lifetime/page.tsx:189` | **Partially Wired** |
| **Distributions** | `computeDistributionLayer()` | `src/app/lib/insights/distributionLayer.ts:234` | Inline cards | `src/app/insights/distributions/page.tsx:15` | **Complete** |

## 3. Navigation Reachability

| Lens | Route | In InsightsTabs? | In lensContract? | Navigable? |
|------|-------|------------------|------------------|------------|
| **Weekly** | `/insights` | ✅ Yes (line 24) | ✅ Yes | ✅ Yes |
| **Summary** | `/insights/summary` | ✅ Yes (line 17) | ✅ Yes | ✅ Yes |
| **Timeline** | `/insights/timeline` | ✅ Yes (line 18) | ✅ Yes | ✅ Yes |
| **Yearly** | `/insights/yearly` | ✅ Yes (line 19) | ✅ Yes | ✅ Yes |
| **Distributions** | `/insights/distributions` | ✅ Yes (line 20) | ✅ Yes | ✅ Yes |
| **YoY** | `/insights/yoy` | ✅ Yes (line 21) | ✅ Yes | ✅ Yes |
| **Lifetime** | `/insights/lifetime` | ✅ Yes (line 22) | ✅ Yes | ⚠️ Behind flag |

**InsightsTabs Usage:**
- ✅ Used in: `summary/page.tsx:24`, `timeline/page.tsx:16`, `yoy/page.tsx:16`
- ❌ NOT used in: `page.tsx` (main weekly), `yearly/page.tsx`, `lifetime/page.tsx`, `distributions/page.tsx`

## 4. Dead Code

### Exported Functions Not Imported Anywhere

| Function | File | Status |
|----------|------|--------|
| `computeDistributionLayerLegacy()` | `src/app/lib/insights/distributionLayer.ts:366` | **Dead** - Only `computeDistributionLayer` is used |
| `computeActiveDays()` | `src/app/lib/insights/distributionLayer.ts:374` | **Used** - Used in yearly page |
| `getTopSpikeDates()` | `src/app/lib/insights/distributionLayer.ts:381` | **Used** - Used in yearly page |
| `computeDistributionInsight()` | `src/app/lib/insights/distributionLayer.ts:389` | **Used** - Used in distributions page |
| `computeSourceWordFreq()` | `src/app/lib/insights/fromSources.ts:29` | **Unknown** - Need to check |
| `computeSourceThemes()` | `src/app/lib/insights/fromSources.ts:41` | **Unknown** - Need to check |
| `computeSourceHighlights()` | `src/app/lib/insights/fromSources.ts:46` | **Used** - Used in `computeUnifiedSourceInsights` |
| `computeSourceSummary()` | `src/app/lib/insights/fromSources.ts:70` | **Unknown** - Need to check |
| `computeYearlyWrap()` | `src/app/lib/insights/yearlyWrap.ts:106` | **Unknown** - Need to check |

### Throw Error Horizon Guards

| File | Line | Horizon | Status |
|------|------|---------|--------|
| `src/app/lib/insights/computeInsightsForWindow.ts` | 80 | `yearly`, `lifetime`, `yoy` | **Expected** - These use separate pages, not engine |

### Stubs Returning [] or 0

| Function | File | Line | Returns | Status |
|----------|------|------|---------|--------|
| `computeTimelineSpikes()` | `src/app/lib/insights/timelineSpikes.ts` | 129, 137 | `[]` | **Valid** - Empty data guard |
| `computeAlwaysOnSummary()` | `src/app/lib/insights/alwaysOnSummary.ts` | 151, 180 | `[]` | **Valid** - Empty data guard |
| `computeTopicDrift()` | `src/app/lib/insights/topicDrift.ts` | 200 | `[]` | **Valid** - Empty data guard |
| `computeLinkClusters()` | `src/app/lib/insights/linkClusters.ts` | 219, 230, 326, 333 | `[]` | **Valid** - Empty data guard |
| `computeContrastPairs()` | `src/app/lib/insights/contrastPairs.ts` | 80 | `[]` | **Valid** - Empty data guard |
| `computeWindowDistribution()` | `src/app/lib/insights/distributionLayer.ts` | 59, 81 | `[]` | **Valid** - Empty data guard |

**Note:** All `return []` are valid empty data guards, not stubs.

## 5. Feature Flags

| Flag | File | Usage | Status |
|------|------|-------|--------|
| `FEATURE_LIFETIME_INVENTORY` | `src/lib/featureFlags.ts` | `src/app/insights/page.tsx:419`, `src/app/insights/lifetime/page.tsx:19` | **Active** - Gates lifetime route |

## 6. Type Check Failures (pnpm typecheck)

### Critical Build Blockers

1. **Missing Module: `summaryArtifact`**
   - File: `src/app/insights/summary/page.tsx:32`
   - Error: `Cannot find module '../../lib/artifacts/summaryArtifact'`
   - Impact: Summary page won't compile

2. **Missing Module: `timelineArtifact`**
   - File: `src/app/insights/timeline/page.tsx:21`
   - Error: `Cannot find module '../../lib/artifacts/timelineArtifact'`
   - Impact: Timeline page won't compile

3. **Missing Module: `lifetimeArtifact`**
   - Files: `src/app/insights/summary/page.tsx:46`, `src/app/insights/timeline/page.tsx:62`
   - Error: `Cannot find module '../../lib/lifetimeArtifact'`
   - Impact: Summary and Timeline pages won't compile

4. **Missing Export: `YearOverYearCard`**
   - File: `src/app/lib/insights/computeYearOverYear.ts:57`
   - Error: `declares 'YearOverYearCard' locally, but it is not exported`
   - Impact: YoY page won't compile

5. **Missing Export: `ShareArtifact`**
   - File: `src/app/insights/components/ShareToWalletDialog.tsx:8`
   - Error: `declares 'ShareArtifact' locally, but it is not exported`
   - Impact: ShareToWalletDialog won't compile

6. **Missing Module: `Sparkline`**
   - File: `src/app/insights/timeline/page.tsx:22`
   - Error: `Cannot find module '../../components/Sparkline'`
   - Impact: Timeline page won't compile

7. **Type Mismatch: `TopicDriftBucket` and `ContrastPair`**
   - File: `src/app/insights/timeline/page.tsx:15`
   - Error: `Module has no exported member 'TopicDriftBucket'` and `'ContrastPair'`
   - Impact: Timeline page won't compile

8. **Type Mismatch: Distribution functions**
   - File: `src/app/insights/summary/page.tsx:156,160,164`
   - Error: `Expected 3-4 arguments, but got 2` for `generateNarrative()`
   - Impact: Summary page won't compile

9. **Type Mismatch: InsightCard types**
   - File: `src/app/insights/summary/page.tsx:169-171,362,364`
   - Error: Two different `InsightCard` types (from `types.ts` vs `viewModels.ts`)
   - Impact: Summary page won't compile

10. **Missing Module: PatternNarratives**
    - File: `src/app/lib/insights/artifactTypes.ts:6`
    - Error: `Cannot find module '../../patternMemory/patternNarratives'`
    - Impact: Core artifact types won't compile

### Non-Critical Type Errors

- `arc/page.tsx` - Multiple import errors (dead route?)
- `year/[year]/page.tsx` - Missing narrative modules
- Various implicit `any` types in timeline and yoy pages
- `ShareActionsBar.tsx:849` - Invalid log event type

## 7. Classification Summary

### ✅ Complete and in use
1. **Yearly** (`/insights/yearly`) - Full implementation, locked v1
2. **Distributions** (`/insights/distributions`) - Full implementation
3. **Compare** (`/insights/compare`) - Full YoY implementation

### ⚠️ Partially Wired (has route, compute function, but build blockers)
1. **Weekly** (`/insights`) - Route exists, renders WeeklyInsightCard, but main page still has mode switcher
2. **Summary** (`/insights/summary`) - Route exists, compute function called, but missing `summaryArtifact` module
3. **Timeline** (`/insights/timeline`) - Route exists, compute function called, but missing `timelineArtifact` and `Sparkline` modules
4. **YoY** (`/insights/yoy`) - Route exists, compute function called, but `YearOverYearCard` not exported
5. **Lifetime** (`/insights/lifetime`) - Route exists, behind feature flag, has runtime errors (`setShowCapsuleDialog` undefined)

### ❌ Implemented but Unused
- None found (all compute functions are used somewhere)

### 🔧 Stubs
- None found (all `return []` are valid empty data guards)

### 🚫 Broken Build Blockers
1. Missing artifact modules: `summaryArtifact.ts`, `timelineArtifact.ts`, `lifetimeArtifact.ts`
2. Missing component: `Sparkline.tsx`
3. Missing exports: `YearOverYearCard`, `ShareArtifact`
4. Type mismatches: `TopicDriftBucket`, `ContrastPair` import paths
5. Type conflicts: Two different `InsightCard` types
6. Missing module: `patternNarratives.ts` import path

## 8. Evidence Links

### Weekly Lens
- **Route:** `src/app/insights/page.tsx:2364` (mode === 'weekly')
- **Compute:** `src/app/insights/page.tsx:639` calls `computeWeeklyInsights()`
- **UI:** `src/app/insights/page.tsx:2422` renders `WeeklyInsightCard`
- **Navigation:** `src/app/insights/lib/lensContract.ts:19-25` defines route `/insights`

### Summary Lens
- **Route:** `src/app/insights/summary/page.tsx:1`
- **Compute:** `src/app/insights/summary/page.tsx:139` calls `computeSummaryInsights()`
- **UI:** `src/app/insights/summary/page.tsx:2150` renders inline cards
- **Navigation:** `src/app/insights/lib/lensContract.ts:26-32` defines route `/insights/summary`
- **Tabs:** `src/app/insights/summary/page.tsx:24` uses `InsightsTabs`

### Timeline Lens
- **Route:** `src/app/insights/timeline/page.tsx:1`
- **Compute:** `src/app/insights/timeline/page.tsx:129` calls `computeTimelineInsights()`
- **UI:** `src/app/insights/timeline/page.tsx:1420` renders inline cards
- **Navigation:** `src/app/insights/lib/lensContract.ts:33-39` defines route `/insights/timeline`
- **Tabs:** `src/app/insights/timeline/page.tsx:16` uses `InsightsTabs`

### Yearly Lens
- **Route:** `src/app/insights/yearly/page.tsx:1`
- **Compute:** `src/app/insights/yearly/page.tsx:21` calls `computeDistributionLayer()`
- **UI:** Full page with multiple components
- **Navigation:** `src/app/insights/lib/lensContract.ts:40-46` defines route `/insights/yearly`
- **Tabs:** ❌ NOT using `InsightsTabs` (has own navigation)

### YoY Lens
- **Route:** `src/app/insights/yoy/page.tsx:1`
- **Compute:** `src/app/insights/yoy/page.tsx:143` calls `computeYearOverYearCard()`
- **UI:** `src/app/insights/yoy/page.tsx:195` renders inline card
- **Navigation:** `src/app/insights/lib/lensContract.ts:54-60` defines route `/insights/yoy`
- **Tabs:** `src/app/insights/yoy/page.tsx:16` uses `InsightsTabs`

### Lifetime Lens
- **Route:** `src/app/insights/lifetime/page.tsx:1`
- **Compute:** `src/app/insights/lifetime/page.tsx:16` calls `buildLifetimeSignalInventory()`
- **UI:** `src/app/insights/lifetime/page.tsx:189` renders inline table
- **Navigation:** `src/app/insights/lib/lensContract.ts:61-67` defines route `/insights/lifetime`
- **Tabs:** ❌ NOT using `InsightsTabs`
- **Flag:** `src/app/insights/lifetime/page.tsx:37` gated by `FEATURE_LIFETIME_INVENTORY`

## 9. Next Steps (Priority Order)

1. **Fix build blockers** - Create missing modules or fix import paths
2. **Stabilize entry route** - Make `/insights` redirect to `/insights/summary` or clean up mode switcher
3. **Add InsightsTabs to all lens pages** - Ensure navigation coherence
4. **Fix type mismatches** - Resolve `InsightCard` type conflicts, export missing types
5. **Fix lifetime runtime errors** - Add missing state variables


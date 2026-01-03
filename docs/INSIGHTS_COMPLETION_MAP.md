# Insights Completion Map

**Generated:** 2025-01-XX  
**Purpose:** Canonical checklist and freeze point for insight features

## Complete and in use

### 1. Weekly Insights (`/insights` - Weekly mode)
- **Computation:** `computeWeeklyInsights()` → `WeeklyInsight[]`
- **UI:** `WeeklyInsightCard` component renders main card
- **Share:** `ShareActionsBar` wired with artifact generation
- **Narratives:** Pattern narratives attached via `computeInsightsForWindowEngine` and rendered via `NarrativeBlock`
- **Evidence:** `src/app/insights/page.tsx` (lines 637, 2422), `src/app/lib/weeklyInsights.ts`, `src/app/insights/components/WeeklyInsightCard.tsx`

### 2. Timeline Spikes (`/insights` - Timeline mode)
- **Computation:** `computeTimelineInsights()` → `TimelineSpikeCard[]`
- **UI:** Rendered inline with expand/collapse, source badges
- **Share:** `ShareActionsBar` wired
- **Evidence:** `src/app/insights/page.tsx` (lines 965, 1420), `src/app/lib/insights/timelineSpikes.ts`

### 3. Link Clusters (`/insights` - Timeline mode)
- **Computation:** `computeTimelineInsights()` → `LinkClusterCard[]`
- **UI:** Rendered inline with token tags and evidence lists
- **Evidence:** `src/app/insights/page.tsx` (lines 965, 1435), `src/app/lib/insights/linkClusters.ts`

### 4. Topic Drift (`/insights` - Timeline & Summary modes)
- **Computation:** `computeTimelineInsights()` / `computeSummaryInsights()` → `TopicDriftBucket[]`
- **UI:** Rendered with trend badges (rising/stable/fading), strength indicators
- **Evidence:** `src/app/insights/page.tsx` (lines 965, 1552), `src/app/lib/insights/topicDrift.ts`

### 5. Contrast Pairs (`/insights` - Timeline mode)
- **Computation:** `computeTimelineInsights()` → `ContrastPair[]`
- **UI:** Rendered as cards, clickable to open `InsightDrawer`
- **Evidence:** `src/app/insights/page.tsx` (lines 965, 1767), `src/app/lib/insights/contrastPairs.ts`

### 6. Always-On Summary (`/insights` - Summary mode)
- **Computation:** `computeSummaryInsights()` → `AlwaysOnSummaryCard[]`
- **UI:** Rendered as cards with type badges (Trend/Consistency/Pattern/Spike)
- **Narratives:** `NarrativeBlock` renders narratives from `summaryInsightArtifacts`
- **Evidence:** `src/app/insights/page.tsx` (lines 819, 2147), `src/app/lib/insights/alwaysOnSummary.ts`

### 7. Source Insights (`/insights` - Summary mode)
- **Computation:** `computeUnifiedSourceInsights()` → `UnifiedSourceInsights`
- **UI:** `InsightsSourceCard` components in grid layout
- **Evidence:** `src/app/insights/page.tsx` (lines 926, 2103), `src/app/lib/insights/fromSources.ts`

### 8. Distribution Insights (`/insights` - Summary mode)
- **Computation:** `buildDistributionFromReflections()` + `classifyDistribution()` + `generateDistributionInsight()`
- **UI:** `InsightPanel` and `InsightTimeline` components with toggle
- **Evidence:** `src/app/insights/page.tsx` (lines 1038, 2243), `src/app/lib/distributions/`

### 9. Yearly Wrap (`/insights/yearly`)
- **Computation:** `computeDistributionLayer()`, `computeWindowDistribution()`, `determineArchetype()`, `buildEmergenceMap()`
- **UI:** Full page with IdentityLine, YearShapeGlyph, ThreeMoments, MirrorSection, EmergenceMapViz
- **Share:** `ShareActionsBar` with `PublicSharePayload` support
- **Evidence:** `src/app/insights/yearly/page.tsx`, `src/app/lib/insights/distributionLayer.ts`

### 10. Insight Detail Drawer
- **Component:** `InsightDrawer` opens on card click
- **Evidence:** `src/app/insights/page.tsx` (line 2451), `src/app/insights/components/InsightDrawer.tsx`

### 11. Share Actions (`ShareActionsBar`)
- **Features:** Copy caption, Download PNG, Native share, Send privately, Copy link (public share), Share to wallet
- **Evidence:** `src/app/insights/components/ShareActionsBar.tsx`, used in Weekly/Timeline/Summary/Lifetime modes and Yearly page

### 12. Pattern Narratives (Weekly only)
- **Pipeline:** `extractPatternsFromArtifact()` → `snapshotPatterns()` → `analyzePatternDeltas()` → `generatePatternNarratives()` → `selectNarratives()` → `attachNarrativesToArtifact()`
- **UI:** Rendered via `NarrativeBlock` in `WeeklyInsightCard`
- **Evidence:** `src/app/lib/insights/computeInsightsForWindow.ts` (lines 57-64), only active for Weekly horizon

## Implemented but not wired to UI

### 1. Year-over-Year Computation
- **Function:** `computeYearOverYearCard()` exists in `computeYearOverYear.ts`
- **Status:** Not used in main `/insights` page
- **Evidence:** `src/app/lib/insights/computeYearOverYear.ts`, `/insights/compare` page exists but uses different narrative generation

### 2. Pattern Memory System (beyond Weekly)
- **Functions:** `snapshotPatterns()`, `analyzePatternDeltas()`, `generatePatternNarratives()`, `selectNarratives()`
- **Status:** Only wired for Weekly horizon; other horizons throw errors in `computeInsightsForWindow`
- **Evidence:** `src/app/lib/insights/computeInsightsForWindow.ts` (line 52)

### 3. Share to Wallet Dialog
- **Component:** `ShareToWalletDialog` exists and imported
- **Status:** Rendered in `ShareActionsBar` but may not be fully tested/accessible
- **Evidence:** `src/app/insights/components/ShareToWalletDialog.tsx`, `src/app/insights/components/ShareActionsBar.tsx` (line 1056)

## Partially implemented

### 1. Lifetime Mode (`/insights` - Lifetime mode)
- **Computation:** `computeInsightsForWindow()` with `lifetimeWindow`
- **UI:** Basic stats display, minimal rendering
- **Status:** Behind `FEATURE_LIFETIME_INVENTORY` flag, basic implementation
- **Evidence:** `src/app/insights/page.tsx` (line 2298), separate `/insights/lifetime` route exists with full implementation

### 2. Distribution Layer (multiple scopes)
- **Functions:** `computeDistributionLayer()`, `computeWindowDistribution()`, `computeDistributionInsight()`
- **Status:** Used in Yearly and Distributions pages, partially in Summary mode
- **Evidence:** `src/app/lib/insights/distributionLayer.ts`

## Stub or placeholder

### 1. Engine Horizon Support (`computeInsightsForWindow`)
- **Status:** Only `'weekly'` horizon implemented; `'yearly'`, `'lifetime'`, `'yoy'` throw errors
- **Evidence:** `src/app/lib/insights/computeInsightsForWindow.ts` (line 52)

### 2. Legacy Engine Functions (`insightEngine.ts`)
- **Functions:** `runTimelineInsights()`, `runSummaryInsights()`, `calculateStreak()`, `extractTopicTrends()`, `detectActivitySpikes()`
- **Status:** All return empty values/stubs, marked `@deprecated`
- **Evidence:** `src/app/lib/insightEngine.ts` (lines 160-210)

### 3. Summary Mode "Coming Soon" Section
- **Location:** Line 2285-2291 in `page.tsx`
- **Content:** Placeholder list for "Activity heatmap by day of week" and "Source engagement breakdown"

## Do not touch

### Yearly Wrap v1 - Locked
- **File:** `src/app/insights/yearly/page.tsx`
- **Status:** Marked as "v1 - Locked" in header comment (line 11)
- **Rule:** No new features, no expansion. This is a finished artifact.
- **Evidence:** Comment at top of file: "Locked as v1: No new features, no expansion. This is a finished artifact."


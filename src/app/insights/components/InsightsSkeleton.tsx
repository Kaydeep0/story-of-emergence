/**
 * Loading skeleton components for the Insights page
 * Matches the styling and layout of actual insight cards
 */

/**
 * Skeleton for the three metric tiles at the top of Weekly tab
 */
export function SummaryStatsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl bg-white/5 animate-pulse p-4"
        >
          <div className="h-8 bg-white/10 rounded w-16 mx-auto mb-2" />
          <div className="h-4 bg-white/5 rounded w-24 mx-auto" />
        </div>
      ))}
    </div>
  );
}

/**
 * Generic skeleton for an insight card row
 * Matches the spacing and layout of real insight cards
 */
export function InsightCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] animate-pulse p-5 space-y-3">
      {/* Card header */}
      <div className="flex items-start justify-between">
        <div className="h-5 bg-white/10 rounded w-48" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-white/5 rounded-full" />
          <div className="h-6 bg-white/5 rounded-full w-16" />
        </div>
      </div>

      {/* Explanation text */}
      <div className="space-y-2">
        <div className="h-4 bg-white/5 rounded w-full" />
        <div className="h-4 bg-white/5 rounded w-3/4" />
      </div>

      {/* Optional evidence section */}
      <div className="flex flex-wrap gap-2">
        <div className="h-6 bg-white/5 rounded w-20" />
        <div className="h-6 bg-white/5 rounded w-16" />
        <div className="h-6 bg-white/5 rounded w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Timeline tab sections (Topic Drift, Contrast Pairs)
 */
export function TimelineSectionSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <InsightCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for Summary tab stats grid
 */
export function SummaryStatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="text-center">
          <div className="h-4 bg-white/5 rounded w-20 mx-auto mb-1" />
          <div className="h-8 bg-white/10 rounded w-16 mx-auto" />
        </div>
      ))}
    </div>
  );
}


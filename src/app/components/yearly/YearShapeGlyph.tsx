'use client';

interface YearShapeGlyphProps {
  dailyCounts: number[];
  topSpikeDates: string[];
  mode?: 'page' | 'card';
}

export function YearShapeGlyph({ dailyCounts, topSpikeDates, mode = 'page' }: YearShapeGlyphProps) {
  if (dailyCounts.length === 0) return null;

  const maxCount = Math.max(...dailyCounts, 1);
  const spikeDatesSet = new Set(topSpikeDates);

  // Convert to 52 weeks (approximate)
  const weeks: number[] = [];
  const entriesPerWeek = Math.ceil(dailyCounts.length / 52);
  
  for (let week = 0; week < 52; week++) {
    const start = week * entriesPerWeek;
    const end = Math.min(start + entriesPerWeek, dailyCounts.length);
    const weekCount = dailyCounts.slice(start, end).reduce((sum, count) => sum + count, 0);
    weeks.push(weekCount);
  }

  const maxWeekCount = Math.max(...weeks, 1);

  // Check if a date falls in a week (approximate)
  const isSpikeWeek = (weekIndex: number): boolean => {
    if (mode === 'card') return false; // No dates on card
    const weekStartDay = weekIndex * entriesPerWeek;
    return topSpikeDates.some(date => {
      // Approximate check - in real implementation would need proper date math
      return false; // Simplified for now
    });
  };

  return (
    <div className="w-full">
      {mode === 'page' && (
        <div className="mb-2 text-xs text-white/60 text-center">
          The shape of your year
        </div>
      )}
      <div className="flex items-end gap-0.5 h-24 w-full">
        {weeks.map((count, index) => {
          const height = maxWeekCount > 0 ? (count / maxWeekCount) * 100 : 2;
          const isSpike = isSpikeWeek(index);
          
          return (
            <div
              key={index}
              className="flex-1 min-w-[2px] relative group"
              style={{ height: '100%' }}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isSpike
                    ? 'bg-orange-400/60 hover:bg-orange-400/80'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
                style={{
                  height: `${Math.max(height, 2)}%`,
                  minHeight: '2px',
                }}
                title={mode === 'page' ? `Week ${index + 1}: ${count} entries` : undefined}
              />
            </div>
          );
        })}
      </div>
      {mode === 'page' && (
        <p className="mt-2 text-xs text-white/50 text-center">
          Unique to you. Computed locally.
        </p>
      )}
    </div>
  );
}


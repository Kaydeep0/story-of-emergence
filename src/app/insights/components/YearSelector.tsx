'use client';

/**
 * YearSelector - Static year selector component
 * 
 * Visual only - establishes time as a first-class dimension.
 * Clicking does nothing (scaffolding phase).
 */

const YEARS = [2025, 2024, 2023];

export default function YearSelector() {
  return (
    <div className="space-y-2">
      {YEARS.map((year) => (
        <div
          key={year}
          className="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors cursor-default"
        >
          {year}
        </div>
      ))}
    </div>
  );
}


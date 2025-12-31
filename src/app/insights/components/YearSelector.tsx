'use client';

import { useRouter } from 'next/navigation';

/**
 * YearSelector - Year selector component with navigation
 * 
 * Establishes time as a first-class dimension.
 * Clicking navigates to year view (still no data fetching).
 */

const YEARS = [2025, 2024, 2023];

export default function YearSelector() {
  const router = useRouter();

  const handleYearClick = (year: number) => {
    router.push(`/insights/year/${year}`);
  };

  return (
    <div className="space-y-2">
      {YEARS.map((year) => (
        <button
          key={year}
          onClick={() => handleYearClick(year)}
          className="w-full text-left px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
        >
          {year}
        </button>
      ))}
    </div>
  );
}


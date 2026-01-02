// src/app/insights/components/InsightsTabs.tsx
// Route-driven tab navigation for Insights lenses
// Task C: Convert tab clicks into route navigation

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LENSES, LENS_ORDER, getInsightFeatureStatus } from '../lib/lensContract';

export function InsightsTabs() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab based on route
  const getActiveTab = (): string | null => {
    if (pathname === '/insights/summary') return 'summary';
    if (pathname === '/insights/timeline') return 'timeline';
    if (pathname === '/insights/yearly' || pathname.startsWith('/insights/year/')) return 'yearly';
    if (pathname === '/insights/distributions') return 'distributions';
    if (pathname === '/insights/yoy' || pathname === '/insights/compare' || pathname.startsWith('/insights/year-over-year')) return 'yoy';
    if (pathname === '/insights/lifetime') return 'lifetime';
    // Default: /insights and /insights/weekly both highlight Weekly
    if (pathname === '/insights' || pathname.startsWith('/insights/weekly')) return 'weekly';
    return null;
  };

  const activeTab = getActiveTab();

  const handleTabClick = (lensKey: string, route: string, e: React.MouseEvent) => {
    e.preventDefault();
    router.push(route);
  };

  return (
    <div className="flex justify-center mb-10">
      <div className="inline-flex rounded-xl p-1 bg-white/3">
        {LENS_ORDER.map((key) => {
          const lens = LENSES[key];
          const isActive = activeTab === key;
          const featureStatus = getInsightFeatureStatus(key);

          // Skip disabled lenses
          if (featureStatus.status === 'disabled') {
            return null;
          }

          return (
            <Link
              key={key}
              href={lens.route}
              onClick={(e) => handleTabClick(key, lens.route, e)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-white text-black font-medium'
                  : featureStatus.status === 'coming_soon'
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title={featureStatus.reason}
            >
              {lens.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/insights/summary', label: 'Summary' },
  { href: '/insights/weekly', label: 'Weekly' },
  { href: '/insights/timeline', label: 'Timeline' },
  { href: '/insights/yearly', label: 'Yearly' },
  { href: '/insights/distributions', label: 'Distributions' },
  { href: '/insights/lifetime', label: 'Lifetime' },
];

export default function InsightsTabs() {
  const pathname = usePathname();
  const currentPath = pathname || '';
  
  // Handle /insights route - treat it as summary
  const normalizedPath = currentPath === '/insights' ? '/insights/summary' : currentPath;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8">
      <div className="rounded-2xl border border-white/10 bg-black/60 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center justify-center gap-2">
          {tabs.map((tab) => {
            const isActive = normalizedPath === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-xl border border-white/10 px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}


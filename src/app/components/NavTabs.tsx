'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Reflections' },
  { href: '/insights', label: 'Insights' },
  { href: '/sources', label: 'Sources' },
];

const devTabs = [
  { href: '/threads', label: 'Threads' },
  { href: '/reflections/pins', label: 'Pins' },
];

export default function NavTabs() {
  const pathname = usePathname();

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <nav className="flex gap-1">
      {tabs.map((tab) => {
        const isActive = tab.href === '/' 
          ? pathname === '/' 
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1 text-sm transition-colors ${
              isActive
                ? 'bg-white/5 text-white/70'
                : 'text-white/60 hover:text-white/70 hover:bg-white/3'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      {isDev && (
        <>
          <div className="h-4 w-px bg-white/20 mx-1" />
          {devTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`rounded-lg px-3 py-1 text-xs transition-colors ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </>
      )}
    </nav>
  );
}


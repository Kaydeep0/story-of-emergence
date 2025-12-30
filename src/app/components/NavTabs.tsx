'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Reflections' },
  { href: '/insights', label: 'Insights' },
  { href: '/sources', label: 'Sources' },
];

export default function NavTabs() {
  const pathname = usePathname();

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
                : 'text-white/50 hover:text-white/70 hover:bg-white/3'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}


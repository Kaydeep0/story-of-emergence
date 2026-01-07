// src/app/reflections/thread/page.tsx
// Thread View - Server component wrapper with Suspense boundary

import { Suspense } from 'react';
import ThreadClient from './ThreadClient';

export default function ThreadViewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-[hsl(var(--muted))]">Loading thread...</p>
        </div>
      </main>
    }>
      <ThreadClient />
    </Suspense>
  );
}

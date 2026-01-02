'use client';

/**
 * Weekly lens - Under construction
 * 
 * This route is reserved for weekly insights but is not yet implemented.
 * For now, it redirects to Summary which provides always-on insights.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InsightsTabs } from '../components/InsightsTabs';

export default function WeeklyPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to summary for now
    router.replace('/insights/summary');
  }, [router]);

  // Show tabs while redirecting
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">Weekly</h1>
        <p className="text-center text-sm text-white/50 mb-8">Your encrypted activity this week</p>
        <InsightsTabs />
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/60">Redirecting to Summary...</p>
        </div>
      </section>
    </div>
  );
}


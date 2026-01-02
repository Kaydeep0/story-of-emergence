'use client';

/**
 * Weekly lens - Coming next
 * 
 * Weekly insights for the last 7 days. Focus, momentum, spikes.
 * This lens will complement Summary with a tighter time window.
 */

import Link from 'next/link';
import { InsightsTabs } from '../components/InsightsTabs';
import { LENSES } from '../lib/lensContract';

export default function WeeklyPage() {
  const lens = LENSES.weekly;

  return (
    <div className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-normal text-center mb-3">{lens.label}</h1>
        <p className="text-center text-sm text-white/50 mb-8">{lens.description}</p>

        <InsightsTabs />

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-sm text-white/70">
            Weekly lens is coming next. Summary is stable, Timeline is stable,
            Yearly is stable. Weekly is the next compute pass.
          </p>

          <div className="mt-4">
            <Link
              href="/insights/summary"
              className="inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition-colors"
            >
              Back to Summary
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

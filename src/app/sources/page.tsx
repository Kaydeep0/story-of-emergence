// src/app/sources/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useLogEvent } from '../lib/useLogEvent';

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const [mounted, setMounted] = useState(false);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event when page loads
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_sources');
  }, [mounted, connected, logEvent]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-8">
          <p className="text-sm uppercase tracking-wide text-zinc-400">
            Story of Emergence
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            Sources
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">
            This is where you will connect the streams that feed your mind. 
            Reflections, saved links, books, videos, and other activity you decide to bring in.
          </p>
        </header>

        <section className="space-y-6">
          {/* Empty state card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-6">
            <h2 className="text-lg font-medium">
              No sources connected yet
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              When you connect a source, entries from that stream will be encrypted with your key 
              and show up in Insights and future evolution views.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                className="cursor-not-allowed rounded-full bg-zinc-800 px-4 py-2 text-sm text-zinc-400"
              >
                Add source (coming soon)
              </button>

              <Link
                href="/insights"
                className="text-sm text-sky-400 underline-offset-4 hover:underline"
              >
                Go to Insights
              </Link>
            </div>
          </div>

          {/* Roadmap hints card */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950 px-5 py-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Coming in Phase One and Phase Two
            </p>

            <ul className="mt-3 space-y-2 text-sm text-zinc-400">
              <li>
                Private imports for links, notes, and external activity.
              </li>
              <li>
                Internal events that log how you use Story of Emergence 
                without revealing content.
              </li>
              <li>
                Source level controls so you can decide what flows into Insights.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}

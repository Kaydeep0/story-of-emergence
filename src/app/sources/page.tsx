// src/app/sources/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLogEvent } from '../lib/useLogEvent';

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const { logEvent } = useLogEvent();
  const [mounted, setMounted] = useState(false);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event when page loads (connected wallet only)
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_sources');
  }, [mounted, connected, logEvent]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur px-4 py-2 flex items-center justify-between">
        <span className="font-semibold">Story of Emergence</span>
        <ConnectButton />
      </header>

      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
        <p className="text-center text-sm text-white/60 mb-6">
          Connected feeds and external activity will appear here in a future phase.
        </p>

        {/* Empty state card */}
        <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
              />
            </svg>
          </div>

          <h2 className="text-lg font-medium">No sources connected yet</h2>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            When you connect a source, entries from that stream will be encrypted with your key
            and show up in Insights and future evolution views.
          </p>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full bg-white/5 border border-white/10 px-5 py-2 text-sm text-white/40"
          >
            Add source (coming soon)
          </button>
        </div>

        {/* Roadmap hints card */}
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Coming soon</p>
          <ul className="text-sm text-zinc-300 space-y-1">
            <li>• Private imports for links, notes, and external activity</li>
            <li>• Source level controls for what flows into Insights</li>
            <li>• YouTube, X, LinkedIn, and RSS feed connections</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

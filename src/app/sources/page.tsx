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
  // source_kind: ui, event_type: navigate_sources
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('navigate_sources');
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
        <p className="text-center text-sm text-white/60 mb-8">
          Import external content and connect feeds to enrich your reflections.
        </p>

        {/* Import file panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white/50"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-medium text-white/90">Import file</h2>
              <p className="text-xs text-white/50">Upload notes, bookmarks, or exported data</p>
            </div>
          </div>

          <p className="text-sm text-white/60">
            Soon you&apos;ll be able to import files directly into your encrypted vault. 
            Supported formats will include JSON exports from popular apps, markdown notes, 
            and browser bookmark exports.
          </p>

          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white/40 w-full transition-colors"
          >
            Import file (coming soon)
          </button>
        </div>

        {/* Empty state / no sources connected */}
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

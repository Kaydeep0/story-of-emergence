'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { mockSources } from '../lib/sources';

export default function SourcesPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const connected = isConnected && !!address;

  if (!mounted) return null;

  return (
    <section className="max-w-2xl mx-auto px-4 py-10">
      {/* Not connected state */}
      {!connected && (
        <div className="rounded-2xl border border-white/10 p-8 text-center space-y-6">
          <div className="text-4xl">🔗</div>
          <h2 className="text-xl font-medium">Connect your wallet to set up Sources</h2>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            Once connected, you'll be able to import activity from YouTube, X, LinkedIn, and more.
          </p>
          <div className="flex justify-center pt-2">
            <ConnectButton />
          </div>
        </div>
      )}

      {/* Connected state */}
      {connected && (
        <>
          <h1 className="text-2xl font-semibold text-center mb-2">Sources</h1>
          <p className="text-center text-sm text-white/60 mb-8">
            External activity that will flow into your internal events timeline
          </p>

          <div className="rounded-2xl border border-white/10 p-6 space-y-6">
            {/* Explanation */}
            <div className="space-y-3">
              <p className="text-sm text-white/80 leading-relaxed">
                Sources let you import your digital footprint from other platforms. 
                Each source becomes part of your encrypted timeline, giving you a complete 
                picture of your attention and engagement across the web.
              </p>
            </div>

            {/* Upcoming adapters */}
            <div>
              <h3 className="text-xs uppercase tracking-wider text-white/50 mb-3">
                Upcoming adapters
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-3 text-sm text-white/70">
                  <span className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                    ▶
                  </span>
                  <span>YouTube watch history</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-white/70">
                  <span className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400">
                    𝕏
                  </span>
                  <span>X bookmarks or likes</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-white/70">
                  <span className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    in
                  </span>
                  <span>LinkedIn articles</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-white/70">
                  <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/60">
                    📄
                  </span>
                  <span>File imports (JSON, CSV)</span>
                </li>
              </ul>
            </div>

            {/* Current sources list using mock data */}
            <div className="rounded-2xl border border-white/10 p-6 space-y-4 mt-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm uppercase tracking-wide text-white/60">
                  Connected sources
                </h3>
                <p className="text-xs text-white/40">
                  These are placeholders. Real connections coming soon.
                </p>
              </div>

              {mockSources.length === 0 ? (
                <p className="text-sm text-white/50">
                  No sources connected yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {mockSources.map(source => (
                    <li
                      key={source.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm text-white">{source.label}</p>
                        <p className="text-xs text-white/50">
                          Status: {source.status}
                        </p>
                      </div>
                      <button
                        disabled
                        className="text-xs rounded-lg px-3 py-1 border border-white/20 text-white/60 cursor-not-allowed"
                      >
                        Coming soon
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Empty state */}
            <div className="rounded-xl border border-dashed border-white/20 p-6 text-center">
              <div className="text-3xl mb-3 opacity-40">📭</div>
              <p className="text-sm text-white/50">No sources imported yet.</p>
            </div>

            {/* Disabled button */}
            <button
              disabled
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white/40 cursor-not-allowed"
            >
              Add source
            </button>
          </div>
        </>
      )}
    </section>
  );
}


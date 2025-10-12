'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSignMessage, useSwitchChain, useChainId } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { useMemo } from 'react';

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance, isLoading: balLoading } = useBalance({
    address,
    chainId,
    query: { enabled: !!address },
  });

  const { signMessage, isPending: signing } = useSignMessage();
  const { switchChain, isPending: switching } = useSwitchChain();

  const shortAddr = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ''),
    [address]
  );

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur px-4 py-2 flex items-center justify-between">
        <span className="font-semibold">Story of Emergence</span>
        <ConnectButton />
      </header>

      <section className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {!isConnected ? (
          <p className="text-white/70">
            Connect your wallet to view balance and try a quick signed message.
          </p>
        ) : (
          <>
            <div className="grid gap-4 rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Address</span>
                <span className="font-mono">{shortAddr}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Network</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{chainId}</span>
                  {chainId !== baseSepolia.id && (
                    <button
                      onClick={() => switchChain({ chainId: baseSepolia.id })}
                      disabled={switching}
                      className="rounded-xl border border-white/20 px-3 py-1 hover:bg-white/5"
                    >
                      {switching ? 'Switching…' : 'Switch to Base Sepolia'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Balance</span>
                <span className="font-mono">
                  {balLoading ? '…' : balance ? `${balance.formatted} ${balance.symbol}` : '—'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 p-6 space-y-3">
              <h3 className="font-semibold">Try a free, on-chain-safe action</h3>
              <p className="text-white/70 text-sm">
                Signing a message proves wallet control (no gas, no funds needed).
              </p>
              <button
                onClick={() =>
                  signMessage({ message: 'Hello from Story of Emergence 👋' })
                }
                disabled={signing}
                className="rounded-2xl bg-white text-black px-4 py-2 hover:bg-white/90"
              >
                {signing ? 'Waiting for signature…' : 'Sign a message'}
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

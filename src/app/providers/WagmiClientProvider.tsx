'use client';

import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from 'react';
import { WagmiProvider, createConfig, http, type Config } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

const queryClient = new QueryClient();

// Create a minimal SSR-safe config that doesn't use WalletConnect
// This ensures WagmiProvider is always available, preventing WagmiProviderNotFoundError
const ssrSafeConfig = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

export default function WagmiClientProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Config>(ssrSafeConfig);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Lazy-load WalletConnect config only in browser runtime
    let mounted = true;

    (async () => {
      try {
        // Dynamic import ensures WalletConnect code never runs during SSR/build
        const { getDefaultConfig } = await import('@rainbow-me/rainbowkit');

        if (!mounted) return;

        const wagmiConfig = getDefaultConfig({
          appName: 'Story of Emergence',
          projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
          chains: [baseSepolia],
          transports: {
            [baseSepolia.id]: http(),
          },
          ssr: false,
        });

        if (mounted) {
          setConfig(wagmiConfig);
          setReady(true);
        }
      } catch (err) {
        console.error('Failed to initialize WalletConnect:', err);
        if (mounted) {
          setReady(true); // Still use SSR-safe config even if WalletConnect fails
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Always render WagmiProvider to prevent WagmiProviderNotFoundError
  // Start with SSR-safe config, upgrade to WalletConnect config when ready
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {ready ? (
          <RainbowKitProvider>
            {children}
          </RainbowKitProvider>
        ) : (
          // Render without RainbowKit during SSR/initial load
          <>{children}</>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}


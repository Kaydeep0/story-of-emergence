'use client';

import WagmiClientProvider from './WagmiClientProvider';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <WagmiClientProvider>{children}</WagmiClientProvider>;
}


'use client';

import React from 'react';
import WagmiClientProvider from './providers/WagmiClientProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <WagmiClientProvider>{children}</WagmiClientProvider>;
}

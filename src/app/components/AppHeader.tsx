'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NavTabs from './NavTabs';
import { EncryptionStatus } from './EncryptionStatus';
import { UnlockBanner } from './UnlockBanner';
import { VaultHealthPanel } from './vault/VaultHealthPanel';

export function AppHeader() {
  const [healthPanelOpen, setHealthPanelOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              Story of Emergence
            </Link>
            <NavTabs />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/shared')}
              className="text-white/40 hover:text-white/60 transition-colors"
              aria-label="Shared content"
              title="Shared content"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
              </svg>
            </button>
            <button
              onClick={() => setHealthPanelOpen(true)}
              className="text-white/40 hover:text-white/60 transition-colors"
              aria-label="Vault health"
              title="Vault health"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </button>
            <EncryptionStatus />
            <ConnectButton />
          </div>
        </div>
      </header>
      <UnlockBanner />
      <VaultHealthPanel isOpen={healthPanelOpen} onClose={() => setHealthPanelOpen(false)} />
    </>
  );
}


'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NavTabs from './NavTabs';
import { EncryptionStatus } from './EncryptionStatus';
import { UnlockBanner } from './UnlockBanner';

export function AppHeader() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-semibold">
              Story of Emergence
            </Link>
            <NavTabs />
          </div>
          <div className="flex items-center gap-3">
            <EncryptionStatus />
            <ConnectButton />
          </div>
        </div>
      </header>
      <UnlockBanner />
    </>
  );
}


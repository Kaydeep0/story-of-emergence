import type { Metadata } from 'next';
import './globals.css';
import ClientToaster from '@/components/ClientToaster';
import Providers from './providers';
import { AppHeader } from './components/AppHeader';
import { VaultUnlockOverlay } from './components/vault/VaultUnlockOverlay';

export const metadata: Metadata = {
  title: 'Story of Emergence',
  description: 'One idea. One reflection. Private by default.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[hsl(var(--bg0))] text-[hsl(var(--text))]">
        {/* Universal layout background - no fixed positioning, no heavy filters during scroll */}
        <div className="pointer-events-none fixed inset-0 opacity-60 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_20%,hsl(var(--accent)/0.10),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_70%,hsl(var(--accent2)/0.08),transparent_60%)]" />
        </div>

        <div className="relative">
          <Providers>
            <ClientToaster />
            <AppHeader />
            <VaultUnlockOverlay />
            <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
          </Providers>
        </div>
      </body>
    </html>
  );
}

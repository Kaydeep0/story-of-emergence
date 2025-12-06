import type { Metadata } from 'next';
import './globals.css';
import ClientToaster from '@/components/ClientToaster';
import Providers from './providers';
import { AppHeader } from './components/AppHeader';
import { VaultUnlockOverlay } from './components/VaultUnlockOverlay';

export const metadata: Metadata = {
  title: 'Story of Emergence',
  description: 'One idea. One reflection. Private by default.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <ClientToaster />
          <AppHeader />
          <VaultUnlockOverlay />
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

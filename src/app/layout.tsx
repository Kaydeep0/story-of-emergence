import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import ClientToaster from '@/components/ClientToaster';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Providers from './providers';
import NavTabs from './components/NavTabs';

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
          <header className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
              <div className="flex items-center gap-6">
                <Link href="/" className="font-semibold">
                  Story of Emergence
                </Link>
                <NavTabs />
              </div>
              <ConnectButton />
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

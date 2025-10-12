import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export const metadata: Metadata = {
  title: 'Story of Emergence',
  description: 'One idea. One reflection. Private by default.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <header className="sticky top-0 z-10 border-b border-white/10 bg-black/60 backdrop-blur">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold">Story of Emergence</Link>
              <ConnectButton />
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

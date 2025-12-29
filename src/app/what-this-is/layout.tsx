import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'What This Is — Story of Emergence',
  description: 'A quiet explanation.',
};

export default function WhatThisIsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Minimal header - product name only, no nav, no actions */}
      <header className="what-this-is-header border-b border-gray-200 bg-white">
        <div className="max-w-[680px] mx-auto px-6 py-4">
          <div className="text-lg font-medium text-gray-900">Story of Emergence</div>
        </div>
      </header>
      {children}
    </>
  );
}


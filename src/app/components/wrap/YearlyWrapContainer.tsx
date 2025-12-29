'use client';

import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

/**
 * Export-ready container for Yearly Wrap
 * Constrains width to print-friendly max (~720px)
 * White or near-white background
 * No sticky UI
 * Designed to render cleanly in PDF, screenshot, static HTML
 */
export function YearlyWrapContainer({ children }: Props) {
  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="max-w-[720px] mx-auto px-8 py-12 print:px-8 print:py-12">
        {children}
      </div>
    </div>
  );
}


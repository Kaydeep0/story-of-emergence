'use client';

import InsightsTabs from './components/InsightsTabs';

export default function InsightsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InsightsTabs />
      {children}
    </>
  );
}


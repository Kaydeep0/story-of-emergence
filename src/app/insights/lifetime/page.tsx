'use client';

import InsightsContent from '../components/InsightsContent';

export default function LifetimePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <InsightsContent mode="lifetime" />
    </main>
  );
}

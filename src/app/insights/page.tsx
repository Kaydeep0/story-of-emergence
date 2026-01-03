'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Insights entry route - redirects to Summary lens
 * 
 * Summary is the default lens for insights, providing always-on insights
 * from recent activity. Other lenses (Weekly, Timeline, Yearly, etc.) are
 * available via their dedicated routes.
 */
export default function InsightsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/insights/summary');
  }, [router]);

  // Show nothing while redirecting
  return null;
}

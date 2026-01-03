// src/app/share/year/[slug]/page.tsx
// Public Year Share Page - Read-only route
// Renders PublicSharePayload into PublicShareImage

import { Suspense } from 'react';
import { ShareYearClient } from './ShareYearClient';

/**
 * Public Year Share Page
 * 
 * Read-only route that renders PublicSharePayload as PublicShareImage.
 * 
 * Rules:
 * - No wallet
 * - No user context
 * - No calls to action
 * - No navigation back into the app
 * - No analytics
 * - No imports from insights computation, encryption, Supabase, wallet, or identity
 */
export default function ShareYearPage() {
  return (
    <main className="min-h-screen bg-black">
      <Suspense
        fallback={
          <div className="min-h-screen bg-black text-white flex items-center justify-center">
            <p className="text-white/60 text-sm">Loading...</p>
          </div>
        }
      >
        <ShareYearClient />
      </Suspense>
    </main>
  );
}

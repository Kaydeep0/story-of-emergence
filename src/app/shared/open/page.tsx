'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy capsule route redirector
 * Redirects /shared/open to canonical /shared page
 * 
 * This route exists for backward compatibility with old capsule URLs.
 * All new shares use /shared/wallet/[id] via wallet_shares table.
 */
export default function LegacyCapsuleRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to canonical shared page
    router.replace('/shared');
  }, [router]);

  // Show minimal loading state during redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-white/60">Redirecting...</div>
    </div>
  );
}

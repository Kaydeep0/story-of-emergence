'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/**
 * Legacy share route redirector
 * Redirects /shared/open/[id] to canonical /shared/wallet/[id]
 * 
 * This route exists for backward compatibility with old share links.
 * All new shares use /shared/wallet/[id] via wallet_shares table.
 */
export default function LegacyShareRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const shareId = Array.isArray(params.id) ? params.id[0] : params.id;
    if (shareId) {
      // Redirect to canonical wallet share route
      router.replace(`/shared/wallet/${shareId}`);
    } else {
      // Invalid ID, redirect to main shared page
      router.replace('/shared');
    }
  }, [params.id, router]);

  // Show minimal loading state during redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-white/60">Redirecting...</div>
    </div>
  );
}

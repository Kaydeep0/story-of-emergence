// src/app/share/year/[slug]/ShareYearClient.tsx
// Client component that parses slug and renders PublicShareImage
// Read-only, no wallet, no user context
//
// DEV TESTING:
// 1. In private app (localhost:3000/insights/yearly), click "Copy link" button
// 2. Copy the generated /share/year/[slug] URL
// 3. Open incognito window and paste the URL
// 4. Verify: Image renders correctly, Download button works, PNG matches rendered image
// 5. Test invalid slug: Modify URL slug to invalid base64url, verify "Not found" shows quietly

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { parseSlug } from './parseSlug';
import { PublicShareImage } from '../../../components/share/PublicShareImage';
import { PublicShareImageDownload } from '../../../components/share/PublicShareImageDownload';

/**
 * Share Year Client Component
 * 
 * Parses slug, validates to PublicSharePayload, then renders PublicShareImage.
 * 
 * Rules:
 * - No wallet
 * - No user context
 * - No calls to action
 * - No navigation back into the app
 * - No analytics
 */
export function ShareYearClient() {
  const params = useParams();
  
  // Get slug from params
  const slug = Array.isArray(params.slug) 
    ? params.slug[0] 
    : (params.slug as string | undefined);

  // Parse and validate slug
  const payload = React.useMemo(() => {
    if (!slug) {
      return null;
    }
    return parseSlug(slug);
  }, [slug]);

  // Not found state - quiet, same visual style as app
  if (!payload) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-white/60 text-sm">
            This share link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  // Render PublicShareImage with download button
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-10">
      {/* Public Share Context Header - Quiet orientation */}
      <p className="text-xs text-white/40 text-center mb-4">
        A shared observation derived from personal reflection.
      </p>

      {/* Main image */}
      <div className="mb-8">
        <PublicShareImage payload={payload} width={1200} height={628} />
      </div>

      {/* Download button */}
      <div className="mb-6">
        <PublicShareImageDownload payload={payload} />
      </div>

      {/* Observational footer */}
      <p className="text-xs text-white/40 text-center max-w-2xl">
        This image was generated from encrypted private journal data.
      </p>
    </div>
  );
}


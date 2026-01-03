// src/app/components/share/PublicShareImageDownload.tsx
// Download button for PublicShareImage - Lives outside the image component
// Pure client-side render → image export

'use client';

import React, { useRef, useState } from 'react';
import type { PublicSharePayload } from '../../lib/share/publicSharePayload';
import { PublicShareImage } from './PublicShareImage';
import { exportPublicShareImage } from '../../lib/share/exportPublicShareImage';
import { toast } from 'sonner';

/**
 * Public Share Image Download Component
 * 
 * Provides a download button for PublicShareImage.
 * Button lives outside the image component.
 * Disabled if payload missing.
 */
export interface PublicShareImageDownloadProps {
  /** Public Share Payload to render and download */
  payload: PublicSharePayload | null;
  
  /** Optional width for image (default: 1200) */
  width?: number;
  
  /** Optional height for image (default: 628) */
  height?: number;
  
  /** Optional className for button */
  buttonClassName?: string;
}

/**
 * Public Share Image Download Component
 * 
 * Renders PublicShareImage in a hidden container and provides
 * a download button that exports it as PNG.
 */
export function PublicShareImageDownload({
  payload,
  width = 1200,
  height = 628,
  buttonClassName,
}: PublicShareImageDownloadProps) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    if (!payload || !imageRef.current) {
      return;
    }

    try {
      setIsExporting(true);
      await exportPublicShareImage(imageRef.current);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Failed to download image');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {/* Hidden image container for export */}
      {payload && (
        <div
          ref={imageRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            visibility: 'hidden',
          }}
        >
          <PublicShareImage payload={payload} width={width} height={height} />
        </div>
      )}

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={!payload || isExporting}
        className={buttonClassName || 'px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed'}
        title={!payload ? 'No payload available' : isExporting ? 'Exporting...' : 'Download image as PNG'}
      >
        {isExporting ? 'Exporting...' : 'Download Image'}
      </button>
    </>
  );
}


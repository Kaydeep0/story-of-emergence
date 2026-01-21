/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical ShareActionsBar from components/ShareActionsBar.tsx
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

// src/app/insights/yearly/components/ShareActionsBar.tsx
//
// Share Actions Bar for canonical SharePack
// Phase 3.3: UI-only sharing actions using frozen SharePack contract

'use client';

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { SharePack } from '../../../lib/share/sharePack';
import type { SharePackFrame } from '../../../lib/share/renderSharePack';
import { buildSharePackCaption, type Platform } from '../../../lib/share/buildSharePackCaption';
import { generateSharePackPng } from '../../../lib/share/generateSharePackPng';
import { sanitizeFilename } from '../../../lib/share/sanitizeShareMetadata';
import { FirstTimeShareModal, hasSeenFirstTimeShare } from './FirstTimeShareModal';

export interface ShareActionsBarProps {
  /** Canonical SharePack to share */
  pack: SharePack | null;
  /** Frame type for rendering */
  frame: SharePackFrame;
  /** Platform for caption style */
  platform: Platform;
  /** Year for filename generation */
  year: number;
  /** Whether vault is ready (disable if not) */
  encryptionReady?: boolean;
}

/**
 * Check if Web Share API is supported
 */
function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Get platform-specific share intent URL
 */
function getPlatformShareIntent(platform: Platform): { label: string; url: string; helperText: string } {
  const intents: Record<Platform, { label: string; url: string; helperText: string }> = {
    instagram: {
      label: 'Open Instagram',
      url: 'https://www.instagram.com/',
      helperText: 'Upload the downloaded image',
    },
    linkedin: {
      label: 'Open LinkedIn',
      url: 'https://www.linkedin.com/feed/?shareActive=true',
      helperText: 'Upload the downloaded image and paste caption',
    },
    tiktok: {
      label: 'Open TikTok',
      url: 'https://www.tiktok.com/upload',
      helperText: 'Upload the downloaded image',
    },
    threads: {
      label: 'Open Threads',
      url: 'https://www.threads.net/',
      helperText: 'Upload the downloaded image',
    },
    x: {
      label: 'Open X',
      url: 'https://x.com/compose/tweet',
      helperText: 'Upload the downloaded image and paste caption',
    },
  };
  return intents[platform] || { label: 'Open platform', url: 'https://www.instagram.com/', helperText: 'Upload the downloaded image' };
}

/**
 * Generate filename for download
 */
function generateFilename(platform: Platform, year: number): string {
  const platformTag = platform === 'x' ? 'x' : platform;
  const filename = `story-of-emergence-${year}-${platformTag}.png`;
  return sanitizeFilename(filename);
}

/**
 * ShareActionsBar component
 * 
 * Provides sharing actions for canonical SharePack:
 * - Copy Caption
 * - Download Image (PNG from renderSharePack)
 * - Share (Web Share API if supported)
 * - Platform Helpers (not auto-posting)
 */
export function ShareActionsBar({
  pack,
  frame,
  platform,
  year,
  encryptionReady = true,
}: ShareActionsBarProps) {
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [pngBlob, setPngBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<(() => void) | null>(null);

  // Generate PNG blob from SharePack
  const generatePng = useCallback(async (): Promise<Blob | null> => {
    if (!pack) {
      toast.error('No share pack available');
      return null;
    }

    if (pngBlob) {
      return pngBlob; // Return cached blob if available
    }

    setIsGeneratingPng(true);
    try {
      const blob = await generateSharePackPng(pack, frame);
      setPngBlob(blob);
      return blob;
    } catch (err: any) {
      console.error('Failed to generate PNG:', err);
      toast.error('Failed to generate image. Please try again.');
      return null;
    } finally {
      setIsGeneratingPng(false);
    }
  }, [pack, frame, pngBlob]);

  // Build caption from SharePack
  const buildCaption = useCallback((): string => {
    if (!pack) return '';
    if (caption) return caption; // Return cached caption if available
    
    const builtCaption = buildSharePackCaption(pack, platform);
    setCaption(builtCaption);
    return builtCaption;
  }, [pack, platform, caption]);

  // Execute share action with first-time modal check
  const executeWithFirstTimeCheck = (action: () => void) => {
    // Check if user has seen first-time modal
    if (!hasSeenFirstTimeShare()) {
      // Show modal and store pending action
      setPendingShareAction(() => action);
      setShowFirstTimeModal(true);
    } else {
      // Execute immediately
      action();
    }
  };

  // Handle first-time modal confirmation
  const handleFirstTimeConfirm = () => {
    setShowFirstTimeModal(false);
    if (pendingShareAction) {
      pendingShareAction();
      setPendingShareAction(null);
    }
  };

  // Handle first-time modal cancel
  const handleFirstTimeCancel = () => {
    setShowFirstTimeModal(false);
    setPendingShareAction(null);
    // Cancel aborts share - no action taken
  };

  // Copy caption to clipboard
  const handleCopyCaption = async () => {
    if (!encryptionReady) {
      toast.error('Unlock your vault to export');
      return;
    }

    executeWithFirstTimeCheck(async () => {
      const text = buildCaption();
      if (!text) {
        toast.error('No caption available');
        return;
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          toast.success('Caption copied');
        } else {
          // Fallback: create hidden textarea, select, and copy
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.left = '-999999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          toast.success('Caption copied');
        }
      } catch (err: any) {
        console.error('Failed to copy caption:', err);
        toast.error('Failed to copy caption');
      }
    });
  };

  // Internal download logic (without first-time check)
  const doDownloadImage = async (): Promise<boolean> => {
    const blob = await generatePng();
    if (!blob) return false;

    try {
      const url = URL.createObjectURL(blob);
      const filename = generateFilename(platform, year);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Image downloaded');
      return true;
    } catch (err: any) {
      console.error('Failed to download image:', err);
      toast.error('Failed to download image');
      return false;
    }
  };

  // Download image as PNG (with first-time check)
  const handleDownloadImage = async () => {
    if (!encryptionReady) {
      toast.error('Unlock your vault to export');
      return;
    }

    executeWithFirstTimeCheck(async () => {
      await doDownloadImage();
    });
  };

  // Web Share API
  const handleWebShare = async () => {
    if (!encryptionReady) {
      toast.error('Unlock your vault to export');
      return;
    }

    executeWithFirstTimeCheck(async () => {
      if (!isWebShareSupported()) {
        // Fallback to download if Web Share not supported
        toast.info('Web Share not supported. Downloading image instead.');
        await doDownloadImage();
        return;
      }

      const blob = await generatePng();
      if (!blob) return;

      const text = buildCaption();

      try {
        const file = new File([blob], generateFilename(platform, year), { type: 'image/png' });
        
        // Try files first, fallback to text only if files not supported
        try {
          await navigator.share({
            title: `My ${year} Yearly Wrap`,
            text: text,
            files: [file],
          });
        } catch (fileError: any) {
          // If file sharing fails, try text only
          if (fileError.name !== 'AbortError') {
            await navigator.share({
              title: `My ${year} Yearly Wrap`,
              text: text,
            });
          } else {
            throw fileError; // Re-throw abort errors
          }
        }
      } catch (err: any) {
        // User cancelled or error - don't show error for cancellation
        if (err.name !== 'AbortError') {
          console.error('Web Share failed:', err);
          toast.error('Failed to share. Try downloading instead.');
        }
      }
    });
  };

  // Platform helper - open platform with guidance
  const handlePlatformHelper = async () => {
    if (!encryptionReady) {
      toast.error('Unlock your vault to export');
      return;
    }

    executeWithFirstTimeCheck(async () => {
      const intent = getPlatformShareIntent(platform);
      
      // For X, prefill caption via intent URL
      if (platform === 'x') {
        const text = buildCaption();
        const textParam = encodeURIComponent(text.slice(0, 200)); // X has character limits
        const xUrl = `https://x.com/intent/tweet?text=${textParam}`;
        window.open(xUrl, '_blank', 'noopener,noreferrer');
        // Also copy caption to clipboard (without first-time check since we already showed modal)
        const captionText = buildCaption();
        if (captionText && navigator.clipboard) {
          navigator.clipboard.writeText(captionText).catch(() => {});
        }
        return;
      }
      
      // For LinkedIn, copy caption and open
      if (platform === 'linkedin') {
        const captionText = buildCaption();
        if (captionText && navigator.clipboard) {
          navigator.clipboard.writeText(captionText).catch(() => {});
        }
        window.open(intent.url, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // For Instagram and TikTok, download image and copy caption, then open platform
      if (platform === 'instagram' || platform === 'tiktok') {
        const captionText = buildCaption();
        if (captionText && navigator.clipboard) {
          navigator.clipboard.writeText(captionText).catch(() => {});
        }
        await doDownloadImage();
        window.open(intent.url, '_blank', 'noopener,noreferrer');
        return;
      }
      
      // For other platforms, download and copy caption
      const captionText = buildCaption();
      if (captionText && navigator.clipboard) {
        navigator.clipboard.writeText(captionText).catch(() => {});
      }
      await doDownloadImage();
      window.open(intent.url, '_blank', 'noopener,noreferrer');
    });
  };

  const hasPack = !!pack;
  const isDisabled = !encryptionReady || !hasPack;

  return (
    <div className="space-y-3">
      {/* First-Time Share Education Modal */}
      <FirstTimeShareModal
        isOpen={showFirstTimeModal}
        onConfirm={handleFirstTimeConfirm}
        onCancel={handleFirstTimeCancel}
      />

      {/* Privacy Context - always visible */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/40">
          Derived from encrypted private journal
        </span>
        <div className="group relative">
          <svg
            className="w-4 h-4 text-white/30 cursor-help"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 border border-white/20 rounded-lg text-xs text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Computed locally. No raw entries included.
          </div>
        </div>
      </div>

      {/* Primary actions */}
      <div className="flex flex-wrap gap-2">
        {/* Copy Caption */}
        <button
          type="button"
          onClick={handleCopyCaption}
          disabled={isDisabled}
          title={!encryptionReady ? 'Unlock your vault to export' : !hasPack ? 'Generate share pack first' : 'Copy caption'}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Copy Caption
        </button>

        {/* Download Image */}
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isDisabled || isGeneratingPng}
          title={!encryptionReady ? 'Unlock your vault to export' : !hasPack ? 'Generate share pack first' : 'Download PNG image'}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isGeneratingPng ? 'Generating...' : 'Download Image'}
        </button>

        {/* Web Share API (only show if supported) */}
        {isWebShareSupported() && (
          <button
            type="button"
            onClick={handleWebShare}
            disabled={isDisabled || isGeneratingPng}
            title={!encryptionReady ? 'Unlock your vault to export' : !hasPack ? 'Generate share pack first' : 'Share via native share dialog'}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Share
          </button>
        )}
      </div>

      {/* Platform helpers */}
      {hasPack && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePlatformHelper}
              disabled={isDisabled || isGeneratingPng}
              title={!encryptionReady ? 'Unlock your vault to export' : getPlatformShareIntent(platform).label}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {getPlatformShareIntent(platform).label}
            </button>
          </div>
          <p className="text-xs text-white/40">
            {getPlatformShareIntent(platform).helperText}
          </p>
        </div>
      )}

      {/* Web Share fallback message */}
      {!isWebShareSupported() && hasPack && (
        <p className="text-xs text-white/40">
          Web Share not available. Download image and share manually.
        </p>
      )}
    </div>
  );
}


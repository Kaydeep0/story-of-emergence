'use client';

/**
 * ShareActions - Unified share actions for Yearly Share Pack
 * 
 * Provides:
 * - Copy caption
 * - Download image
 * - Web Share API (when supported)
 * - Platform helper links
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import type { ShareFrame } from '../../../share/renderers/renderSharePack';
import { sanitizeCaption } from '../../../lib/share/sanitizeShareMetadata';
import { ShareSafetyBanner } from './ShareSafetyBanner';
import { SHARE_DEFAULTS } from '../../../lib/share/shareDefaults';
import { ShareConfirmationModal, shouldShowShareConfirmation } from './ShareConfirmationModal';

export interface ShareActionsProps {
  imageBlob: Blob | null;
  captionText: string;
  frame: ShareFrame;
  platform: 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'threads';
  tiktokOverlay?: string[];
  filename?: string;
  encryptionReady?: boolean; // Disable sharing if vault is locked
}

/**
 * Get platform-specific share intent URL
 */
function getPlatformShareIntent(platform: ShareActionsProps['platform']): { label: string; url: string } {
  const intents: Record<ShareActionsProps['platform'], { label: string; url: string }> = {
    instagram: {
      label: 'Open Instagram',
      url: 'https://www.instagram.com/',
    },
    linkedin: {
      label: 'Open LinkedIn',
      url: 'https://www.linkedin.com/feed/?shareActive=true',
    },
    tiktok: {
      label: 'Open TikTok',
      url: 'https://www.tiktok.com/upload',
    },
    threads: {
      label: 'Open Threads',
      url: 'https://www.threads.net/',
    },
    x: {
      label: 'Open X',
      url: 'https://x.com/compose/tweet',
    },
  };
  return intents[platform] || { label: 'Open platform', url: 'https://www.instagram.com/' };
}

/**
 * Check if Web Share API is supported
 */
function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * ShareActions component
 */
export function ShareActions({
  imageBlob,
  captionText,
  frame,
  platform,
  tiktokOverlay,
  filename = 'story-of-emergence-yearly-wrap.png',
  encryptionReady = true,
}: ShareActionsProps) {
  // Sanitize caption to remove any sensitive metadata
  const sanitizedCaption = sanitizeCaption(captionText);

  const [showIntentGate, setShowIntentGate] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<(() => void) | null>(null);

  // Share intent gate - confirmation before action
  const confirmShareAction = (action: string, callback: () => void) => {
    // Check if vault is locked
    if (!encryptionReady) {
      toast.error('Unlock your vault to export');
      return;
    }
    
    // Check if first-time confirmation is needed
    if (shouldShowShareConfirmation()) {
      setShowConfirmation(true);
      setConfirmationAction(() => callback);
      return;
    }
    
    // Otherwise proceed with intent gate
    setShowIntentGate(action);
    setPendingAction(() => callback);
  };

  const handleConfirmationConfirm = () => {
    setShowConfirmation(false);
    if (confirmationAction) {
      // Now proceed with intent gate
      setShowIntentGate('confirmed');
      setPendingAction(() => confirmationAction);
      setConfirmationAction(null);
    }
  };

  const handleConfirmationCancel = () => {
    setShowConfirmation(false);
    setConfirmationAction(null);
  };

  const executePendingAction = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
      setShowIntentGate(null);
    }
  };

  // Copy caption to clipboard
  const handleCopyCaption = async () => {
    if (!sanitizedCaption) {
      toast.error('No caption available');
      return;
    }

    confirmShareAction('copy-caption', async () => {
      try {
        // Try clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(sanitizedCaption);
        } else {
          // Fallback: create hidden textarea, select, and copy
          const textarea = document.createElement('textarea');
          textarea.value = sanitizedCaption;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.left = '-999999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        // No success toast - quiet persistence
      } catch (err: any) {
        console.error('Failed to copy caption:', err);
        toast.error('Failed to copy caption');
      }
    });
  };

  // Copy image to clipboard
  const handleCopyImage = async () => {
    if (!imageBlob) {
      toast.error('No image available. Generate share pack first.');
      return;
    }

    if (!navigator.clipboard || !navigator.clipboard.write) {
      toast.error('Clipboard API not supported');
      return;
    }

    confirmShareAction('copy-image', async () => {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': imageBlob }),
        ]);
        // No success toast - quiet persistence
      } catch (err: any) {
        console.error('Failed to copy image:', err);
        toast.error('Failed to copy image');
      }
    });
  };

  // Download image
  const handleDownload = () => {
    if (!imageBlob) {
      toast.error('No image available. Generate share pack first.');
      return;
    }

    confirmShareAction('download', () => {
      try {
        const url = URL.createObjectURL(imageBlob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Auto-copy caption after successful download
        if (sanitizedCaption) {
          navigator.clipboard.writeText(sanitizedCaption).catch(() => {
            // Silent fail - caption copy is nice-to-have
          });
        }
        
        // No success toast - quiet persistence
      } catch (err: any) {
        console.error('Failed to download image:', err);
        toast.error('Failed to download image');
      }
    });
  };

  // Web Share API
  const handleWebShare = async () => {
    if (!imageBlob) {
      toast.error('No image available. Generate share pack first.');
      return;
    }

    if (!isWebShareSupported()) {
      // Fallback to download if Web Share not supported
      handleDownload();
      return;
    }

    confirmShareAction('web-share', async () => {
      try {
        // Convert blob to File for Web Share API
        const file = new File([imageBlob], filename, { type: 'image/png' });
        
        // Web Share API with file (use sanitized caption)
        // Try files first, fallback to text only if files not supported
        try {
          await navigator.share({
            title: `My ${new Date().getFullYear()} Yearly Wrap`,
            text: sanitizedCaption,
            files: [file],
          });
        } catch (fileError: any) {
          // If file sharing fails, try text only
          if (fileError.name !== 'AbortError') {
            await navigator.share({
              title: `My ${new Date().getFullYear()} Yearly Wrap`,
              text: sanitizedCaption,
            });
          } else {
            throw fileError; // Re-throw abort errors
          }
        }
        
        // No success toast - quiet persistence
      } catch (err: any) {
        // User cancelled or error - don't show error for cancellation
        if (err.name !== 'AbortError') {
          console.error('Web Share failed:', err);
          // Fallback to download on error
          handleDownload();
        }
      }
    });
  };

  // Platform helper - open platform with guidance
  const handlePlatformHelper = () => {
    const intent = getPlatformShareIntent(platform);
    
    // For X and LinkedIn, try to prefill caption if possible
    if (platform === 'x') {
      // X/Twitter intent URL with text parameter (use sanitized caption)
      const textParam = encodeURIComponent(sanitizedCaption.slice(0, 200)); // X has character limits
      const xUrl = `https://x.com/intent/tweet?text=${textParam}`;
      window.open(xUrl, '_blank', 'noopener,noreferrer');
      // Also copy caption to clipboard for easy pasting
      handleCopyCaption().catch(() => {});
      return;
    }
    
    if (platform === 'linkedin') {
      // LinkedIn doesn't support direct text prefill, but we can copy caption
      handleCopyCaption().catch(() => {});
      window.open(intent.url, '_blank', 'noopener,noreferrer');
      // No toast - quiet action
      return;
    }
    
    // For Instagram and TikTok, copy caption and download image, then open platform
    if (platform === 'instagram' || platform === 'tiktok') {
      handleCopyCaption().catch(() => {});
      handleDownload();
      window.open(intent.url, '_blank', 'noopener,noreferrer');
      // No toast - quiet action
      return;
    }
    
    // For other platforms, just open and copy caption
    window.open(intent.url, '_blank', 'noopener,noreferrer');
    handleCopyCaption().catch(() => {});
    // No toast - quiet action
  };

  // Copy TikTok overlay
  const handleCopyTikTokOverlay = async () => {
    if (!tiktokOverlay || tiktokOverlay.length === 0) {
      toast.error('TikTok overlay not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(tiktokOverlay.join('\n'));
      // No success toast - quiet persistence
    } catch (err: any) {
      console.error('Failed to copy TikTok overlay:', err);
      toast.error('Failed to copy TikTok overlay');
    }
  };

  const hasImage = !!imageBlob;
  const hasCaption = !!sanitizedCaption;

  const isDisabled = !encryptionReady;

  return (
    <div className="space-y-3">
      {/* Share Confirmation Modal */}
      <ShareConfirmationModal
        isOpen={showConfirmation}
        onConfirm={handleConfirmationConfirm}
        onCancel={handleConfirmationCancel}
      />

      {/* Share Safety Banner */}
      <ShareSafetyBanner />

      {/* Share Intent Gate - confirmation surface */}
      {showIntentGate && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
          <p className="text-sm text-white/70">
            Create a shareable artifact
          </p>
          <p className="text-xs text-white/50">
            You control what leaves your vault.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={executePendingAction}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors text-sm"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => {
                setShowIntentGate(null);
                setPendingAction(null);
              }}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Primary actions */}
      {!showIntentGate && (
        <div className="flex flex-wrap gap-2">
          {/* Copy caption */}
          {hasCaption && (
            <button
              type="button"
              onClick={handleCopyCaption}
              disabled={isDisabled}
              title={isDisabled ? 'Unlock your vault to export' : 'Copy caption'}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Copy caption
            </button>
          )}

          {/* Download image */}
          {hasImage && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDisabled}
              title={isDisabled ? 'Unlock your vault to export' : 'Download artifact'}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Download artifact
            </button>
          )}

          {/* Copy image */}
          {hasImage && navigator.clipboard && 'write' in navigator.clipboard && (
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isDisabled}
              title={isDisabled ? 'Unlock your vault to export' : 'Copy image'}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Copy image
            </button>
          )}

          {/* Web Share API (only show if supported) */}
          {hasImage && isWebShareSupported() && (
            <button
              type="button"
              onClick={handleWebShare}
              disabled={isDisabled}
              title={isDisabled ? 'Unlock your vault to export' : 'Share'}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Share
            </button>
          )}
        </div>
      )}

      {/* Platform helpers */}
      {hasImage && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePlatformHelper}
            disabled={isDisabled}
            title={isDisabled ? 'Unlock your vault to export' : getPlatformShareIntent(platform).label}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {getPlatformShareIntent(platform).label}
          </button>
        </div>
      )}

      {/* TikTok overlay (only for TikTok platform) */}
      {platform === 'tiktok' && tiktokOverlay && tiktokOverlay.length > 0 && (
        <div>
          <button
            type="button"
            onClick={handleCopyTikTokOverlay}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-colors text-sm"
          >
            Copy TikTok overlay
          </button>
        </div>
      )}

      {/* Helper text */}
      <p className="text-xs text-white/40">
        Computed locally. Nothing uploaded.
      </p>

      {/* Revocation messaging */}
      {hasImage && (
        <p className="text-xs text-white/30 italic pt-2 border-t border-white/5">
          Shared files cannot be revoked once downloaded. Future shares remain private.
        </p>
      )}
    </div>
  );
}


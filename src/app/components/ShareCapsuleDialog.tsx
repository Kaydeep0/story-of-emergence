'use client';

/**
 * Share Capsule Dialog
 * 
 * Simple dialog for copying caption and downloading PNG.
 * Used by "Send privately" button.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import type { ShareArtifact } from '../../lib/lifetimeArtifact';
import { generateArtifactPNG, generateArtifactFilename, buildShareCaption } from '../insights/components/ShareActionsBar';

type ShareCapsuleDialogProps = {
  artifact: ShareArtifact;
  senderWallet: string;
  isOpen: boolean;
  onClose: () => void;
  fallbackPatterns?: string[];
};

export function ShareCapsuleDialog({
  artifact,
  senderWallet,
  isOpen,
  onClose,
  fallbackPatterns,
}: ShareCapsuleDialogProps) {
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const caption = buildShareCaption(artifact, fallbackPatterns);

  const handleCopyCaption = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(caption);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = caption;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast('Caption copied');
    } catch (err) {
      console.error('Failed to copy caption:', err);
      toast.error('Failed to copy caption');
    }
  };

  const handleDownloadPNG = async () => {
    if (!artifact) return;

    setDownloading(true);
    try {
      const blob = await generateArtifactPNG(artifact, fallbackPatterns);
      const url = URL.createObjectURL(blob);
      const filename = generateArtifactFilename(artifact);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Image downloaded');
    } catch (err) {
      console.error('Failed to generate image:', err);
      toast.error('Failed to generate image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="rounded-2xl border border-white/10 bg-black p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">Copy or download</h3>
            <p className="text-xs text-white/50 mt-1">Use Messages, email, or AirDrop</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          
          <div className="flex flex-col gap-2">
            <button
              onClick={handleCopyCaption}
              className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy caption
            </button>
            
            {artifact && (
              <button
                onClick={handleDownloadPNG}
                disabled={downloading}
                className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                {downloading ? 'Preparing...' : 'Download PNG'}
              </button>
            )}
          </div>
          
          <p className="text-xs text-white/50 text-center">
            Paste caption into Messages or share the image file
          </p>
        </div>
      </div>
    </div>
  );
}


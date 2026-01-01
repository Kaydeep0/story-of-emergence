'use client';

/**
 * Share Actions Bar
 * 
 * Single source of truth for share actions across all Insights views.
 * Supports: Copy caption, Download PNG, Native Share, Send privately.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import type { ShareArtifact } from '../../../lib/lifetimeArtifact';
import { generateLifetimeCaption } from '../../../lib/artifacts/lifetimeCaption';
import { generateProvenanceLine } from '../../../lib/artifacts/provenance';
import { ShareCapsuleDialog } from '../../components/ShareCapsuleDialog';

export interface ShareActionsBarProps {
  artifact: ShareArtifact | null;
  senderWallet: string | undefined;
  encryptionReady: boolean;
  onSendPrivately?: () => void; // Optional callback for external dialog handling
  // Optional: fallback data for when artifact signals are empty but UI has content
  fallbackPatterns?: string[]; // For Weekly: latest.topGuessedTopics
}

/**
 * Generate PNG from artifact
 */
async function generateArtifactPNG(artifact: ShareArtifact, fallbackPatterns?: string[]): Promise<Blob> {
  if (!artifact.artifactId) {
    throw new Error('Artifact missing identity: artifactId is required');
  }

  // Debug logging
  console.log('generateArtifactPNG called with artifact:', artifact);
  console.log('Artifact signals:', artifact.signals);
  console.log('Fallback patterns:', fallbackPatterns);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  canvas.width = 1200;
  canvas.height = 800;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'left';
  const scopeLabel = artifact.kind === 'lifetime' ? 'Lifetime Reflection' 
    : artifact.kind === 'weekly' ? 'Weekly Reflection'
    : 'Yearly Reflection';
  ctx.fillText(`Story of Emergence — ${scopeLabel}`, 60, 80);

  // Date range
  ctx.font = '24px sans-serif';
  ctx.fillStyle = '#cccccc';
  let y = 130;
  if (artifact.inventory.firstReflectionDate) {
    ctx.fillText(`First reflection: ${artifact.inventory.firstReflectionDate.split('T')[0]}`, 60, y);
    y += 40;
  }
  if (artifact.inventory.lastReflectionDate) {
    ctx.fillText(`Most recent: ${artifact.inventory.lastReflectionDate.split('T')[0]}`, 60, y);
    y += 40;
  }

  // Observed patterns - use signals if available, otherwise fallback to patterns array
  const patternsToRender = artifact.signals && artifact.signals.length > 0
    ? artifact.signals.map(s => s.label)
    : (fallbackPatterns && fallbackPatterns.length > 0 ? fallbackPatterns : []);

  if (patternsToRender.length > 0) {
    y += 20;
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Observed Patterns', 60, y);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cccccc';
    patternsToRender.slice(0, 5).forEach((pattern) => {
      y += 30;
      ctx.fillText(`• ${pattern}`, 80, y);
    });
  } else {
    // Debug: log when patterns are missing
    console.warn('No patterns to render. Artifact signals:', artifact.signals, 'Fallback:', fallbackPatterns);
    y += 20;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText('No patterns detected', 60, y);
  }

  // Provenance line
  y = canvas.height - 40;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  const provenanceLine = generateProvenanceLine(artifact);
  ctx.fillText(provenanceLine, canvas.width / 2, y);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to generate blob')), 'image/png');
  });

  return blob;
}

export function ShareActionsBar({ artifact, senderWallet, encryptionReady, onSendPrivately, fallbackPatterns }: ShareActionsBarProps) {
  const [showCapsuleDialog, setShowCapsuleDialog] = useState(false);

  if (!artifact || !senderWallet) {
    return null;
  }

  const caption = generateLifetimeCaption(artifact);

  const handleCopyCaption = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(caption);
        toast('Caption copied');
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
        toast('Caption copied');
      }
    } catch (err) {
      toast.error('Failed to copy caption');
    }
  };

  const handleDownloadImage = async () => {
    if (!artifact) return;

    // Debug: log artifact structure
    console.log('PNG artifact payload', artifact);
    console.log('weeklyArtifact for export:', artifact);
    console.log('Artifact signals:', artifact.signals);
    console.log('Artifact inventory:', artifact.inventory);
    console.log('Fallback patterns:', fallbackPatterns);

    try {
      const blob = await generateArtifactPNG(artifact, fallbackPatterns);
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const filename = `soe-${artifact.kind}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.png`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('Image downloaded');
    } catch (err) {
      toast.error('Failed to generate image');
    }
  };

  const handleWebShare = async () => {
    if (!artifact) return;

    if (!navigator.share) {
      toast('Share not available on this device');
      return;
    }

    try {
      const blob = await generateArtifactPNG(artifact, fallbackPatterns);
      const file = new File([blob], `soe-${artifact.kind}-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
      
      const shareData: ShareData = {
        title: `Story of Emergence — ${artifact.kind === 'lifetime' ? 'Lifetime' : artifact.kind === 'weekly' ? 'Weekly' : 'Yearly'} Reflection`,
        text: caption,
      };

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        shareData.files = [file];
      }

      await navigator.share(shareData);
      toast('Ready to share');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
  };

  const handleSendPrivately = () => {
    if (onSendPrivately) {
      onSendPrivately();
    } else {
      setShowCapsuleDialog(true);
    }
  };

  const isDisabled = !encryptionReady;

  return (
    <>
      <div className="mb-6 flex gap-2 items-center">
        <button
          onClick={handleDownloadImage}
          disabled={isDisabled}
          className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isDisabled ? 'Unlock your vault to export' : ''}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          PNG
        </button>
        <button
          onClick={handleCopyCaption}
          disabled={isDisabled}
          className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isDisabled ? 'Unlock your vault to export' : ''}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Caption
        </button>
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleWebShare}
            disabled={isDisabled}
            className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isDisabled ? 'Unlock your vault to export' : ''}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share
          </button>
        )}
        <button
          onClick={handleSendPrivately}
          disabled={isDisabled}
          className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={isDisabled ? 'Unlock your vault to export' : ''}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Send privately
        </button>
      </div>

      {showCapsuleDialog && artifact && senderWallet && (
        <ShareCapsuleDialog
          artifact={artifact}
          senderWallet={senderWallet}
          isOpen={showCapsuleDialog}
          onClose={() => setShowCapsuleDialog(false)}
        />
      )}
    </>
  );
}


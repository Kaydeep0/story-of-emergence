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
 * Normalize Weekly export data from various artifact shapes
 * Ensures both summary and patterns are extracted regardless of artifact version
 */
function normalizeWeeklyExport(artifact: ShareArtifact, fallbackPatterns?: string[]): { summaryLines: string[]; patterns: string[] } {
  const artifactAny = artifact as any;
  
  // Extract summary lines from multiple possible fields
  let summaryLines: string[] = [];
  if (artifactAny?.summaryLines && Array.isArray(artifactAny.summaryLines)) {
    summaryLines = artifactAny.summaryLines.filter(Boolean);
  } else if (artifactAny?.summaryText) {
    summaryLines = [String(artifactAny.summaryText)];
  } else if (artifactAny?.summary) {
    summaryLines = [String(artifactAny.summary)];
  }

  // Extract patterns from multiple possible fields
  let patterns: string[] = [];
  
  // Priority order for patterns:
  // 1. artifact.signals (standard contract)
  if (artifact.signals && artifact.signals.length > 0) {
    patterns = artifact.signals.map(s => s.label);
  }
  // 2. artifact.signals.topGuessedTopics (if signals is an object)
  else if (artifactAny.signals?.topGuessedTopics && Array.isArray(artifactAny.signals.topGuessedTopics)) {
    patterns = artifactAny.signals.topGuessedTopics;
  }
  // 3. artifact.signals.topics
  else if (artifactAny.signals?.topics && Array.isArray(artifactAny.signals.topics)) {
    patterns = artifactAny.signals.topics;
  }
  // 4. artifact.topGuessedTopics (direct)
  else if (artifactAny.topGuessedTopics && Array.isArray(artifactAny.topGuessedTopics)) {
    patterns = artifactAny.topGuessedTopics;
  }
  // 5. artifact.topGuessedTopic (singular)
  else if (artifactAny.topGuessedTopic) {
    patterns = Array.isArray(artifactAny.topGuessedTopic) ? artifactAny.topGuessedTopic : [artifactAny.topGuessedTopic];
  }
  // 6. artifact.topics
  else if (artifactAny.topics && Array.isArray(artifactAny.topics)) {
    patterns = artifactAny.topics;
  }
  // 7. artifact.patterns
  else if (artifactAny.patterns && Array.isArray(artifactAny.patterns)) {
    patterns = artifactAny.patterns.filter(Boolean);
  }
  // 8. artifact.observedPatterns
  else if (artifactAny.observedPatterns && Array.isArray(artifactAny.observedPatterns)) {
    patterns = artifactAny.observedPatterns.filter(Boolean);
  }
  // 9. Fallback patterns prop
  else if (fallbackPatterns && fallbackPatterns.length > 0) {
    patterns = fallbackPatterns.filter(Boolean);
  }
  // 10. Try topDays/peakDays as fallback
  else {
    const topDays = artifactAny?.topDays ?? artifactAny?.peakDays ?? [];
    if (Array.isArray(topDays) && topDays.length > 0) {
      patterns = topDays
        .filter((d: any) => d?.date && (d?.count ?? d?.reflections))
        .slice(0, 5)
        .map((d: any) => {
          const c = d.count ?? d.reflections;
          return `${c} reflection${c === 1 ? '' : 's'} on ${d.date}`;
        });
    }
  }

  return { summaryLines, patterns };
}

/**
 * Generate PNG from artifact
 */
async function generateArtifactPNG(artifact: ShareArtifact, fallbackPatterns?: string[]): Promise<Blob> {
  if (!artifact.artifactId) {
    throw new Error('Artifact missing identity: artifactId is required');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');

  canvas.width = 1200;
  canvas.height = 1000; // Increased height to accommodate summary
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

  // Normalize Weekly export data (handles all artifact shapes)
  const { summaryLines, patterns } = normalizeWeeklyExport(artifact, fallbackPatterns);

  // Render Summary section if available
  if (summaryLines.length > 0) {
    y += 30;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Summary', 60, y);
    y += 30;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cccccc';
    // Render each summary line with text wrapping
    const maxWidth = canvas.width - 120; // 60px margin on each side
    for (const summaryLine of summaryLines) {
      const words = summaryLine.split(' ');
      let line = '';
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, 60, y);
          y += 25;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        ctx.fillText(line, 60, y);
        y += 25;
      }
      y += 10; // Extra spacing between summary lines
    }
  }

  // Render Observed Patterns section if available
  if (patterns.length > 0) {
    y += 30; // Match Summary section spacing
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Observed Patterns', 60, y); // Align with Summary header (60px left margin)
    y += 30;
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#cccccc';
    const maxPatterns = 5;
    const patternsToShow = patterns.slice(0, maxPatterns);
    const remainingCount = patterns.length - maxPatterns;
    
    patternsToShow.forEach((pattern) => {
      y += 30;
      ctx.fillText(`• ${pattern}`, 60, y); // Align with Summary content (60px left margin)
    });
    
    // Show "and N more" if there are additional patterns
    if (remainingCount > 0) {
      y += 30;
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(`and ${remainingCount} more`, 60, y);
    }
  }

  // Only show "No patterns detected" if both summary and patterns are empty
  if (summaryLines.length === 0 && patterns.length === 0) {
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

/**
 * Generate canonical caption from artifact with fallback for empty content
 * Uses normalized data extraction to ensure consistent captions
 */
function generateShareCaption(artifact: ShareArtifact, fallbackPatterns?: string[]): string {
  const { summaryLines, patterns } = normalizeWeeklyExport(artifact, fallbackPatterns);
  
  // If artifact has no meaningful content, provide a minimal fallback
  if (summaryLines.length === 0 && patterns.length === 0 && artifact.signals.length === 0) {
    const scopeLabel = artifact.kind === 'lifetime' ? 'Lifetime Reflection' 
      : artifact.kind === 'weekly' ? 'Weekly Reflection'
      : 'Yearly Reflection';
    return `Story of Emergence — ${scopeLabel}\n\nGenerated from encrypted personal reflections.\nShared intentionally.`;
  }

  // Use the canonical caption generator, which handles standard artifact structure
  return generateLifetimeCaption(artifact);
}

/**
 * Generate deterministic filename for artifact download
 */
function generateArtifactFilename(artifact: ShareArtifact): string {
  const kind = artifact.kind;
  
  // Use artifact ID if available (most deterministic)
  if (artifact.artifactId) {
    // Use first 8 chars of artifact ID for brevity
    const shortId = artifact.artifactId.substring(0, 8);
    return `soe-${kind}-${shortId}.png`;
  }
  
  // Fallback to date range
  const startDate = artifact.inventory.firstReflectionDate 
    ? artifact.inventory.firstReflectionDate.split('T')[0]
    : null;
  const endDate = artifact.inventory.lastReflectionDate 
    ? artifact.inventory.lastReflectionDate.split('T')[0]
    : null;
  
  if (startDate && endDate) {
    return `soe-${kind}-${startDate}_to_${endDate}.png`;
  } else if (startDate) {
    return `soe-${kind}-${startDate}.png`;
  } else {
    // Last resort: current date
    const now = new Date();
    return `soe-${kind}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.png`;
  }
}

/**
 * Check if artifact has meaningful content to share
 */
function hasShareableContent(artifact: ShareArtifact, fallbackPatterns?: string[]): boolean {
  const { summaryLines, patterns } = normalizeWeeklyExport(artifact, fallbackPatterns);
  return summaryLines.length > 0 || patterns.length > 0 || artifact.signals.length > 0;
}

export function ShareActionsBar({ artifact, senderWallet, encryptionReady, onSendPrivately, fallbackPatterns }: ShareActionsBarProps) {
  const [showCapsuleDialog, setShowCapsuleDialog] = useState(false);
  const [linkedInCaptionCopied, setLinkedInCaptionCopied] = useState(false);

  if (!artifact || !senderWallet) {
    return null;
  }

  const caption = generateShareCaption(artifact, fallbackPatterns);
  const hasContent = hasShareableContent(artifact, fallbackPatterns);
  const isDisabled = !encryptionReady || !hasContent;

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

  const handleXShare = () => {
    // X (Twitter) intent URL with pre-filled text
    const encodedText = encodeURIComponent(caption);
    const url = `https://x.com/intent/tweet?text=${encodedText}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = async () => {
    // LinkedIn doesn't support text prefill, so copy caption and open LinkedIn
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(caption);
        setLinkedInCaptionCopied(true);
        toast('Caption copied');
        setTimeout(() => setLinkedInCaptionCopied(false), 3000);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = caption;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setLinkedInCaptionCopied(true);
        toast('Caption copied');
        setTimeout(() => setLinkedInCaptionCopied(false), 3000);
      }
    } catch (err) {
      toast.error('Failed to copy caption');
      return;
    }
    
    // Open LinkedIn new post page
    window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank', 'noopener,noreferrer');
    toast('Paste caption into LinkedIn post');
  };

  const handleIMessageShare = () => {
    // Try SMS/iMessage link with body (iOS Safari supports this)
    const encodedText = encodeURIComponent(caption);
    const smsUrl = `sms:&body=${encodedText}`;
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.location.href = smsUrl;
    } else {
      // Fallback: copy caption and show instruction
      handleCopyCaption();
      toast('Caption copied. Paste into Messages');
    }
  };

  // Helper text for empty artifacts
  const helperText = !hasContent 
    ? 'Add reflections to generate shareable content'
    : !encryptionReady
    ? 'Unlock your vault to export'
    : null;

  return (
    <>
      <div className="mb-6 space-y-3">
        {/* Primary actions row */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleCopyCaption}
            disabled={isDisabled}
            className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title={helperText || 'Copy caption to clipboard'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Caption
          </button>
          <button
            onClick={handleDownloadImage}
            disabled={isDisabled}
            className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title={helperText || 'Download PNG image'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            PNG
          </button>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleWebShare}
              disabled={isDisabled}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title={helperText || 'Share via native share dialog'}
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
            title={helperText || 'Send privately to one recipient'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Send privately
          </button>
        </div>

        {/* Platform helper links */}
        {hasContent && encryptionReady && (
          <div className="flex flex-wrap gap-2 items-center pt-1 border-t border-white/5">
            <span className="text-xs text-white/40 mr-1">Share to:</span>
            <button
              onClick={handleXShare}
              className="px-2 py-1 text-xs text-white/50 hover:text-white/70 transition-colors flex items-center gap-1"
              title="Open X (Twitter) with caption pre-filled"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X
            </button>
            <button
              onClick={handleLinkedInShare}
              className="px-2 py-1 text-xs text-white/50 hover:text-white/70 transition-colors flex items-center gap-1"
              title={linkedInCaptionCopied ? 'Caption copied! Open LinkedIn and paste' : 'Copy caption and open LinkedIn'}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              {linkedInCaptionCopied ? 'Copied' : 'LinkedIn'}
            </button>
            <button
              onClick={handleIMessageShare}
              className="px-2 py-1 text-xs text-white/50 hover:text-white/70 transition-colors flex items-center gap-1"
              title="Share via iMessage (iOS) or copy caption"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              iMessage
            </button>
          </div>
        )}

        {/* Helper text for empty artifacts */}
        {helperText && (
          <p className="text-xs text-white/40 mt-2">{helperText}</p>
        )}
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


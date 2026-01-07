'use client';

/**
 * Share Actions Bar
 * 
 * Single source of truth for share actions across all Insights views.
 * Supports: Copy caption, Download PNG, Native Share, Send privately.
 * 
 * Phase 3.4: Adds privacy context, confirmation modal, and audit logging.
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { ShareArtifact } from '../../../lib/artifacts/types';
import type { SharePack } from '../../lib/share/sharePack';
import { ShareCapsuleDialog } from '../../components/ShareCapsuleDialog';
import type { PublicSharePayload } from '../../lib/share/publicSharePayload';
import { buildPublicShareUrl } from '../../lib/share/encodePublicSharePayload';
import { ShareToWalletDialog } from './ShareToWalletDialog';
import { buildShareTextFromPack } from '../../lib/share/buildShareText';
import { SharePackRenderer } from '../../lib/share/SharePackRenderer';
import { toBlob, toPng } from 'html-to-image';
import html2canvas from 'html2canvas';

/**
 * Canonical privacy label string
 * Used consistently across UI, captions, and PNG footers
 */
const PRIVACY_LABEL = 'Private reflection · Generated from encrypted data';

/**
 * SessionStorage key for share confirmation
 */
const SHARE_CONFIRMED_KEY = 'soe_share_confirmed';

export interface ShareActionsBarProps {
  /** SharePack - Universal payload from any lens (preferred) */
  sharePack?: SharePack | null;
  /** Legacy ShareArtifact - deprecated, use sharePack instead */
  artifact?: ShareArtifact | null;
  senderWallet: string | undefined;
  encryptionReady: boolean;
  onSendPrivately?: () => void; // Optional callback for external dialog handling
  // Optional: fallback data for when artifact signals are empty but UI has content
  fallbackPatterns?: string[]; // For Weekly: latest.topGuessedTopics
  // Optional: PublicSharePayload for generating public share URL
  publicSharePayload?: PublicSharePayload | null;
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

type ExportNode = HTMLElement;

/**
 * Convert a DOM node to a PNG Blob using html2canvas (reliable fallback)
 * This handles CSS that html-to-image cannot serialize (backdrop-filter, filters, etc.)
 */
async function nodeToPngBlobViaHtml2Canvas(node: HTMLElement): Promise<Blob> {
  const rect = node.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));

  if (width === 0 || height === 0) {
    throw new Error("Export failed because the share card has zero size");
  }

  const canvas = await html2canvas(node, {
    backgroundColor: "#0b0b0c",
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
  });

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png")
  );

  if (!blob) {
    throw new Error("PNG export failed: canvas toBlob returned null");
  }
  return blob;
}

/**
 * Generate PNG from artifact
 */
export async function generateArtifactPNG(artifact: ShareArtifact, fallbackPatterns?: string[]): Promise<Blob> {
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

  // Provenance line (canonical privacy label)
  y = canvas.height - 40;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'center';
  ctx.fillText(PRIVACY_LABEL, canvas.width / 2, y);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to generate blob')), 'image/png');
  });

  return blob;
}

/**
 * Format date from ISO string to short format (e.g., "Dec 29")
 */
function formatShortDate(iso: string | null): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  } catch {
    return '';
  }
}

/**
 * Format date range for caption (e.g., "Dec 29 – Jan 5")
 */
function formatDateRangeForCaption(startDate: string | null, endDate: string | null): string {
  const start = formatShortDate(startDate);
  const end = formatShortDate(endDate);
  
  if (start && end && start !== end) {
    return `${start} – ${end}`;
  } else if (start) {
    return start;
  } else if (end) {
    return end;
  }
  return '';
}

/**
 * Build canonical share caption from artifact
 * 
 * Format:
 * - Lens name (Weekly, Summary, Yearly)
 * - Time range
 * - One insight line (summary or first pattern)
 * - Provenance footer
 * 
 * Example:
 * Weekly Reflection · Dec 29 – Jan 5
 * 
 * This week you recorded 348 events across 7 reflections.
 * Patterns emerged around focus and money.
 * 
 * Generated privately from encrypted data.
 */
export function buildShareCaption(artifact: ShareArtifact, fallbackPatterns?: string[]): string {
  const lines: string[] = [];
  
  // Lens name
  const lensName = artifact.kind === 'lifetime' ? 'Lifetime Reflection'
    : artifact.kind === 'weekly' ? 'Weekly Reflection'
    : artifact.kind === 'yearly' ? 'Yearly Reflection'
    : 'Reflection';
  
  // Time range
  const dateRange = formatDateRangeForCaption(
    artifact.inventory.firstReflectionDate,
    artifact.inventory.lastReflectionDate
  );
  
  // Header line: "Lens name · Date range"
  if (dateRange) {
    lines.push(`${lensName} · ${dateRange}`);
  } else {
    lines.push(lensName);
  }
  
  lines.push(''); // Blank line
  
  // Extract normalized data
  const { summaryLines, patterns } = normalizeWeeklyExport(artifact, fallbackPatterns);
  
  // One insight line: prefer summary, fallback to first pattern
  if (summaryLines.length > 0) {
    // Use first summary line (or first sentence if it's long)
    const firstSummary = summaryLines[0];
    // If it's very long, try to take first sentence
    const firstSentence = firstSummary.split(/[.!?]/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length < firstSummary.length) {
      lines.push(firstSentence + '.');
    } else {
      lines.push(firstSummary);
    }
  } else if (patterns.length > 0) {
    // Use first pattern as insight
    lines.push(`Patterns emerged around ${patterns[0]}.`);
  } else if (artifact.signals.length > 0) {
    // Use first signal label
    lines.push(`Patterns emerged around ${artifact.signals[0].label}.`);
  }
  
  // If we have additional patterns, add them
  if (patterns.length > 1) {
    const additionalPatterns = patterns.slice(1, 3); // Max 2 more
    if (additionalPatterns.length > 0) {
      lines.push(`Patterns emerged around ${additionalPatterns.join(', ')}.`);
    }
  }
  
  lines.push(''); // Blank line
  
  // Provenance footer (canonical privacy label)
  lines.push(PRIVACY_LABEL);
  
  return lines.join('\n');
}

/**
 * Generate deterministic, human-friendly filename for artifact download
 * 
 * Formats:
 * - Weekly: soe-weekly-YYYY-MM-DD_to_YYYY-MM-DD.png
 * - Yearly: soe-yearly-YYYY.png
 * - Lifetime: soe-lifetime-YYYY-MM-DD.png (generation date)
 * - Summary: soe-summary-YYYY-MM-DD.png (generation date)
 */
export function generateArtifactFilename(artifact: ShareArtifact): string {
  const kind = artifact.kind;
  
  // Extract dates (YYYY-MM-DD format)
  const startDate = artifact.inventory.firstReflectionDate 
    ? artifact.inventory.firstReflectionDate.split('T')[0]
    : null;
  const endDate = artifact.inventory.lastReflectionDate 
    ? artifact.inventory.lastReflectionDate.split('T')[0]
    : null;
  
  // Generation date (fallback for lifetime/summary)
  const generationDate = new Date().toISOString().split('T')[0];
  
  if (kind === 'weekly') {
    // Weekly: soe-weekly-YYYY-MM-DD_to_YYYY-MM-DD.png
    if (startDate && endDate) {
      return `soe-weekly-${startDate}_to_${endDate}.png`;
    } else if (startDate) {
      return `soe-weekly-${startDate}.png`;
    } else {
      return `soe-weekly-${generationDate}.png`;
    }
  } else if (kind === 'yearly') {
    // Yearly: soe-yearly-YYYY.png
    if (startDate) {
      const year = startDate.split('-')[0];
      return `soe-yearly-${year}.png`;
    } else if (endDate) {
      const year = endDate.split('-')[0];
      return `soe-yearly-${year}.png`;
    } else {
      const year = generationDate.split('-')[0];
      return `soe-yearly-${year}.png`;
    }
  } else if (kind === 'lifetime') {
    // Lifetime: soe-lifetime-YYYY-MM-DD.png (generation date)
    return `soe-lifetime-${generationDate}.png`;
  } else {
    // Summary or other: soe-summary-YYYY-MM-DD.png (generation date)
    return `soe-summary-${generationDate}.png`;
  }
}

/**
 * Check if artifact has meaningful content to share
 */
function hasShareableContent(artifact: ShareArtifact, fallbackPatterns?: string[]): boolean {
  const { summaryLines, patterns } = normalizeWeeklyExport(artifact, fallbackPatterns);
  return summaryLines.length > 0 || patterns.length > 0 || artifact.signals.length > 0;
}

/**
 * Check if user has confirmed sharing intent this session
 */
function hasShareConfirmed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SHARE_CONFIRMED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark share as confirmed for this session
 */
function setShareConfirmed(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SHARE_CONFIRMED_KEY, 'true');
  } catch {
    // Silent fail - sessionStorage may not be available
  }
}

/**
 * Fire-and-forget audit logging for share actions
 * Phase 3.4: Logs share_attempt event with metadata (artifactType, platform, timestamp)
 * Non-blocking: sharing proceeds even if logging fails
 * Never logs content, captions, or decrypted text
 */
function logShareAttempt(
  platform: 'caption' | 'download' | 'web_share' | 'x' | 'linkedin' | 'imessage' | 'copy_link',
  artifact: ShareArtifact
): void {
  // Fire-and-forget: don't block sharing if logging fails
  try {
    const artifactType = artifact.kind === 'weekly' ? 'weekly'
      : artifact.kind === 'yearly' ? 'yearly'
      : artifact.kind === 'lifetime' ? 'lifetime'
      : 'summary';
    
    const metadata = {
      event: 'share_attempt',
      artifactType,
      platform,
      timestamp: new Date().toISOString(),
    };

    // In development, log to console for verification
    if (process.env.NODE_ENV === 'development') {
      console.log('[Share Audit]', metadata);
    }
    
    // Future: send to analytics endpoint
    // fetch('/api/analytics/share', { 
    //   method: 'POST', 
    //   body: JSON.stringify(metadata) 
    // }).catch(() => {});
  } catch {
    // Silent fail - audit logging never blocks sharing
  }
}

/**
 * Share Confirmation Modal Component
 * Phase 3.4: Exact copy as specified in requirements
 */
function ShareConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onCancel}>
      <div className="bg-black border border-white/20 rounded-lg p-6 max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-3">You&apos;re about to share a reflection</h3>
        <p className="text-sm text-white/70 mb-6">
          This artifact is generated from your private, encrypted journal.
          Once shared, it is outside the vault.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-white text-black hover:bg-white/90 transition-colors rounded"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShareActionsBar({ sharePack, artifact, senderWallet, encryptionReady, onSendPrivately, fallbackPatterns, publicSharePayload }: ShareActionsBarProps) {
  const [showCapsuleDialog, setShowCapsuleDialog] = useState(false);
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [linkedInCaptionCopied, setLinkedInCaptionCopied] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const pngRendererRef = useRef<HTMLDivElement>(null);

  // Close share menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    }

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showShareMenu]);

  // Phase 3.4: Buttons must be visible but disabled when vault is not ready
  // Only return null if both sharePack/artifact and publicSharePayload are missing (no data to share at all)
  // Also check if onSendPrivately is provided (for Weekly view)
  const hasPrivateShare = sharePack !== null || artifact !== null || onSendPrivately !== undefined;
  const hasPublicShare = publicSharePayload !== null && publicSharePayload !== undefined;
  
  if (!hasPrivateShare && !hasPublicShare) {
    return null;
  }

  // Build caption from SharePack (preferred) or artifact (legacy)
  const caption = sharePack 
    ? buildShareTextFromPack('instagram', sharePack).caption
    : (artifact ? buildShareCaption(artifact, fallbackPatterns) : '');
  
  const hasContent = sharePack !== null || (artifact 
    ? hasShareableContent(artifact, fallbackPatterns) 
    : (publicSharePayload !== null && publicSharePayload !== undefined));
  const shareConfirmed = hasShareConfirmed();
  
  // Phase 3.4: Disable sharing when vault is not ready
  // Conditions: wallet disconnected, encryption key missing, or zero entries
  // For publicSharePayload, only require encryptionReady (payload is already built)
  const isDisabled = !senderWallet || !encryptionReady || !hasContent;
  
  // Phase 3.4: Specific tooltip messages for each disabled condition
  const getDisabledTooltip = (): string | undefined => {
    if (!senderWallet) {
      return 'Connect wallet to share';
    }
    if (!encryptionReady) {
      return 'Unlock your vault to export';
    }
    if (!hasContent) {
      return 'Add reflections to generate content';
    }
    return undefined;
  };

  // Check if confirmation is needed before executing share action
  // Phase 3.4: Only external shares require confirmation (not "Send privately")
  const executeWithConfirmation = (
    action: () => void, 
    logAction: 'caption' | 'download' | 'web_share' | 'x' | 'linkedin' | 'imessage' | 'copy_link',
    requiresConfirmation: boolean = true
  ) => {
    // Always log attempt (even if cancelled)
    if (artifact) {
      logShareAttempt(logAction, artifact);
    }
    
    if (!requiresConfirmation || shareConfirmed) {
      // Already confirmed this session or doesn't require confirmation, execute immediately
      action();
    } else {
      // Need confirmation first
      setPendingAction(() => {
        return () => {
          setShareConfirmed();
          action();
        };
      });
      setShowConfirmationModal(true);
    }
  };

  const handleCopyCaption = async () => {
    const doCopy = async () => {
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
    
    // Phase 3.4: Copy caption is external share, requires confirmation
    executeWithConfirmation(doCopy, 'caption', true);
  };

  const handleDownloadImage = async () => {
    if (!sharePack && !artifact) return;

    const doDownload = async () => {
      try {
        let blob: Blob;
        let filename: string;
        
        if (sharePack) {
          // Use SharePack PNG renderer
          const wrapper = pngRendererRef.current;
          if (!wrapper) {
            console.error("PNG failed: pngRef missing");
            toast.error("Failed to generate image");
            return;
          }
          
          // Capture the actual SharePackRenderer root element using data attribute
          const node = wrapper.querySelector("[data-share-pack-root]") as HTMLElement | null;
          if (!node) {
            console.error("PNG failed: SharePackRenderer root not found");
            toast.error("Failed to generate image");
            return;
          }
          
          // Wrap capture call with proper error handling
          try {
            blob = await nodeToPngBlobViaHtml2Canvas(node);
            
            const lens = sharePack.lens;
            const dateStr = sharePack.generatedAt.split('T')[0];
            filename = `soe-${lens}-${dateStr}.png`;
          } catch (err) {
            console.error("PNG export failed", err);
            const msg = process.env.NODE_ENV === "development"
              ? `Failed to generate image: ${String(err)}`
              : "Failed to generate image. Please try again.";
            toast.error(msg);
            return;
          }
        } else {
          // Legacy artifact PNG generation
          blob = await generateArtifactPNG(artifact!, fallbackPatterns);
          filename = generateArtifactFilename(artifact!);
        }
        
        if (!(blob instanceof Blob)) {
          throw new Error("PNG generation did not return a valid Blob");
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('Image downloaded');
      } catch (err) {
        console.error("PNG export failed", err);
        const msg = process.env.NODE_ENV === "development"
          ? `Failed to generate image: ${String(err)}`
          : "Failed to generate image. Please try again.";
        toast.error(msg);
      }
    };
    
    // Phase 3.4: PNG download is external share, requires confirmation
    executeWithConfirmation(doDownload, 'download', true);
  };

  const handleWebShare = async () => {
    if (!sharePack && !artifact) return;

    if (!navigator.share) {
      toast('Web share not supported');
      return;
    }

    const doShare = async () => {
      try {
        let blob: Blob;
        let filename: string;
        
        if (sharePack) {
          // Use SharePack PNG renderer
          const wrapper = pngRendererRef.current;
          if (!wrapper) {
            console.error("PNG failed: pngRef missing");
            toast.error("Failed to generate image");
            return;
          }
          
          // Capture the actual SharePackRenderer root element using data attribute
          const node = wrapper.querySelector("[data-share-pack-root]") as HTMLElement | null;
          if (!node) {
            console.error("PNG failed: SharePackRenderer root not found");
            toast.error("Failed to generate image");
            return;
          }
          
          // Wrap capture call with proper error handling
          try {
            blob = await nodeToPngBlobViaHtml2Canvas(node);
            
            const lens = sharePack.lens;
            const dateStr = sharePack.generatedAt.split('T')[0];
            filename = `soe-${lens}-${dateStr}.png`;
          } catch (err) {
            console.error("PNG export failed", err);
            const msg = process.env.NODE_ENV === "development"
              ? `Failed to generate image: ${String(err)}`
              : "Failed to generate image. Please try again.";
            toast.error(msg);
            return;
          }
        } else {
          // Legacy artifact PNG generation
          blob = await generateArtifactPNG(artifact!, fallbackPatterns);
          filename = generateArtifactFilename(artifact!);
        }
        
        if (!(blob instanceof Blob)) {
          throw new Error("PNG generation did not return a valid Blob");
        }
        
        const file = new File([blob], filename, { type: 'image/png' });
        
        const shareData: ShareData = {
          text: caption,
        };

        // Include file if supported
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await navigator.share(shareData);
        // User cancelled or shared successfully - no toast needed
      } catch (err: any) {
        // AbortError means user cancelled - don't show error
        if (err.name !== 'AbortError') {
          console.error("PNG export failed", err);
          const msg = err instanceof Error ? err.message : String(err);
          toast.error(msg || "Failed to share");
        }
      }
    };
    
    // Phase 3.4: Web share is external share, requires confirmation
    executeWithConfirmation(doShare, 'web_share', true);
  };

  const handleSendPrivately = () => {
    // "Send privately" always opens ShareCapsuleDialog (never system share sheet)
    // It uses encrypted capsules, so it's safe and doesn't need the warning modal
    
    // If onSendPrivately callback exists, use it (for Weekly, Summary, etc. that manage their own dialogs)
    if (onSendPrivately) {
      onSendPrivately();
      return;
    }
    
    // Otherwise, open internal dialog directly
    setShowCapsuleDialog(true);
  };

  const handleXShare = () => {
    const doShare = () => {
      // X (Twitter) intent URL with pre-filled text
      // Twitter has a ~280 character limit, but URL encoding adds overhead
      // Safe limit is ~200 characters to account for encoding
      const safeLength = 200;
      let textToShare = caption;
      
      if (caption.length > safeLength) {
        // Truncate and add ellipsis
        textToShare = caption.substring(0, safeLength - 1) + '…';
      }
      
      const encodedText = encodeURIComponent(textToShare);
      const url = `https://x.com/intent/tweet?text=${encodedText}`;
      
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        toast('Popup blocked. Use the X icon again after allowing popups.');
      } else {
        toast('Opening X');
      }
    };
    
    // Phase 3.4: X share is external share, requires confirmation
    executeWithConfirmation(doShare, 'x', true);
  };

  const handleLinkedInShare = async () => {
    const doShare = async () => {
      // Step 1: Copy caption to clipboard
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
      } catch (err) {
        toast.error('Failed to copy caption');
        return;
      }
      
      // Step 2: Open LinkedIn share composer
      const url = 'https://www.linkedin.com/feed/?shareActive=true';
      const popup = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        toast('Popup blocked. Use the LinkedIn icon again after allowing popups.');
      } else {
        toast('Opening LinkedIn');
      }
    };
    
    // Phase 3.4: LinkedIn share is external share, requires confirmation
    executeWithConfirmation(doShare, 'linkedin', true);
  };

  const handleIMessageShare = async () => {
    const doShare = async () => {
      // Copy caption to clipboard (no deep linking - unreliable)
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
        toast('Paste caption into iMessage');
      } catch (err) {
        toast.error('Failed to copy caption');
      }
    };
    
    // Phase 3.4: iMessage share is external share, requires confirmation
    executeWithConfirmation(doShare, 'imessage', true);
  };

  const handleCopyLink = async () => {
    if (!publicSharePayload) {
      toast.error('Share link not available');
      return;
    }

    const doCopy = async () => {
      try {
        const url = buildPublicShareUrl(publicSharePayload);
        if (!url) {
          toast.error('Failed to generate share link');
          return;
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = url;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          textarea.style.left = '-999999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        toast('Link copied');
      } catch (err) {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link');
      }
    };

    // Copy link is external share, requires confirmation
    executeWithConfirmation(doCopy, 'copy_link', true);
  };

  // Phase 3.4: Get specific tooltip for disabled state
  const disabledTooltip = getDisabledTooltip();

  return (
    <>
      <div className="mb-6 space-y-3" data-no-export="true">
        {/* Primary actions row */}
        <div className="flex flex-wrap gap-2 items-center">
          {(sharePack || artifact) && (
            <>
              <button
                onClick={isDisabled ? undefined : handleCopyCaption}
                disabled={isDisabled}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title={disabledTooltip || 'Copy caption to clipboard'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Caption
              </button>
              <button
                onClick={isDisabled ? undefined : handleDownloadImage}
                disabled={isDisabled}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title={disabledTooltip || 'Download PNG image'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                PNG
              </button>
            </>
          )}
          {/* Share button with menu - only show if we have public share or sharePack/artifact */}
          {(hasPublicShare || sharePack || artifact) && (
            <div className="relative" ref={shareMenuRef}>
              <button
                onClick={isDisabled ? undefined : () => setShowShareMenu(!showShareMenu)}
                disabled={isDisabled}
                className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                title={disabledTooltip || 'Share options'}
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
              
              {/* Share menu dropdown */}
              {showShareMenu && !isDisabled && (
                <div className="absolute top-full left-0 mt-1 bg-black border border-white/20 rounded-lg shadow-lg z-50 min-w-[160px]">
                  {publicSharePayload && (
                    <button
                      onClick={() => {
                        handleCopyLink();
                        setShowShareMenu(false);
                      }}
                      className="w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      Copy link
                    </button>
                  )}
                  {(sharePack || artifact) && typeof navigator !== 'undefined' && 'share' in navigator && (
                    <button
                      onClick={() => {
                        handleWebShare();
                        setShowShareMenu(false);
                      }}
                      className="w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      Native share
                    </button>
                  )}
                  {(sharePack || artifact) && (
                    <>
                      {publicSharePayload || (typeof navigator !== 'undefined' && 'share' in navigator) ? (
                        <div className="border-t border-white/10 my-1"></div>
                      ) : null}
                      <button
                        onClick={() => {
                          setShowWalletDialog(true);
                          setShowShareMenu(false);
                        }}
                        className="w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                        Share to wallet
                      </button>
                      <div className="border-t border-white/10 my-1"></div>
                      <button
                        onClick={() => {
                          handleXShare();
                          setShowShareMenu(false);
                        }}
                        className="w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        X (Twitter)
                      </button>
                      <button
                        onClick={() => {
                          handleLinkedInShare();
                          setShowShareMenu(false);
                        }}
                        className="w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </button>
                      <button
                        onClick={() => {
                          handleIMessageShare();
                          setShowShareMenu(false);
                        }}
                        className="w-full px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        iMessage
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {hasPrivateShare && (
            <button
              onClick={() => {
                console.log("Send privately clicked", { address: senderWallet, encryptionReady, sharePack: !!sharePack, artifact: !!artifact });
                setShowWalletDialog(true);
              }}
              disabled={!senderWallet || !encryptionReady}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!senderWallet ? 'Connect wallet to share' : !encryptionReady ? 'Unlock your vault to export' : 'Send privately to one recipient'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Send privately
            </button>
          )}
        </div>

        {/* Phase 3.4: Privacy context label (single location) */}
        {hasContent && encryptionReady && senderWallet && (
          <p className="text-xs text-white/40 mt-2">{PRIVACY_LABEL}</p>
        )}
      </div>

      {/* Share Confirmation Modal */}
      <ShareConfirmationModal
        isOpen={showConfirmationModal}
        onConfirm={() => {
          setShowConfirmationModal(false);
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
        onCancel={() => {
          setShowConfirmationModal(false);
          setPendingAction(null);
        }}
      />

      {/* ShareCapsuleDialog - only show if using internal dialog (not external callback) */}
      {showCapsuleDialog && artifact && senderWallet && !onSendPrivately && (
        <ShareCapsuleDialog
          artifact={artifact}
          senderWallet={senderWallet}
          isOpen={showCapsuleDialog}
          onClose={() => setShowCapsuleDialog(false)}
          fallbackPatterns={fallbackPatterns}
        />
      )}

      {/* Dedicated PNG capture surface - always mounted, invisible but in layout */}
      {sharePack && (
        <div
          ref={pngRendererRef}
          style={{
            position: 'fixed',
            top: 0,
            left: -10000,
            width: 1200,
            pointerEvents: 'none',
            opacity: 0,
          }}
        >
          <SharePackRenderer sharePack={sharePack} mode="png" frame="square" />
        </div>
      )}
      
      {/* ShareToWalletDialog - for wallet-based sharing */}
      {showWalletDialog && (sharePack || artifact) && senderWallet && (
        <ShareToWalletDialog
          sharePack={sharePack || undefined}
          artifact={artifact || undefined}
          senderWallet={senderWallet}
          isOpen={showWalletDialog}
          onClose={() => setShowWalletDialog(false)}
        />
      )}
    </>
  );
}


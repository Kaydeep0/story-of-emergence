// src/app/insights/components/ShareToWalletDialog.tsx
// Dialog for sharing artifacts to a wallet address

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { ShareArtifact } from '../../../lib/artifacts/types';
import type { SharePack } from '../../lib/share/sharePack';
import { getSupabaseForWallet } from '../../../lib/supabase';
import { createWalletShare } from '../../../lib/walletShares';

type ShareToWalletDialogProps = {
  /** SharePack - Universal payload (preferred) */
  sharePack?: SharePack;
  /** Legacy ShareArtifact - deprecated, use sharePack instead */
  artifact?: ShareArtifact;
  senderWallet: string;
  isOpen: boolean;
  onClose: () => void;
};

type ExpirationOption = '24h' | '7d' | 'never';

const EXPIRATION_OPTIONS: { value: ExpirationOption; label: string }[] = [
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: 'never', label: 'Never' },
];

export function ShareToWalletDialog({
  sharePack,
  artifact,
  senderWallet,
  isOpen,
  onClose,
}: ShareToWalletDialogProps) {
  const [recipientWallet, setRecipientWallet] = useState('');
  const [message, setMessage] = useState('');
  const [expiration, setExpiration] = useState<ExpirationOption>('7d');
  const [creating, setCreating] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!recipientWallet.trim()) {
      toast.error('Recipient wallet address is required');
      return;
    }

    // Validate wallet address format (basic check)
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(recipientWallet.trim())) {
      toast.error('Invalid wallet address format');
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabaseForWallet(senderWallet);
      
      // Calculate expiration date
      let expiresAt: Date | null = null;
      if (expiration === '24h') {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (expiration === '7d') {
        expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      // Create wallet share - use SharePack (preferred) or artifact (legacy)
      if (!sharePack && !artifact) {
        toast.error('No share data available');
        return;
      }
      
      // createWalletShare accepts sharePack as optional parameter
      // If sharePack is provided, it will be used; otherwise artifact is used
      const shareId = await createWalletShare(
        supabase,
        artifact || {
          kind: 'summary',
          generatedAt: new Date().toISOString(),
          wallet: senderWallet,
          artifactId: 'placeholder',
          inventory: {
            totalReflections: 0,
            firstReflectionDate: null,
            lastReflectionDate: null,
            distinctMonths: 0,
          },
          signals: [],
        },
        recipientWallet.trim(),
        expiresAt,
        message.trim() || null,
        sharePack || undefined
      );

      // Generate share link
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const shareUrl = `${baseUrl}/shared/wallet/${shareId}`;
      setShareLink(shareUrl);

      toast.success('Share created successfully');
    } catch (error: any) {
      console.error('Failed to create wallet share:', error);
      
      // Handle specific error cases
      toast.error(error.message || 'Failed to create wallet share');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareLink);
      } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
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
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    setRecipientWallet('');
    setMessage('');
    setExpiration('7d');
    setShareLink(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="rounded-2xl border border-white/10 bg-black p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Share to wallet</h3>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {shareLink ? (
          // Success state: show link
          <div className="space-y-4">
            <p className="text-sm text-white/70">
              Share created successfully. Send this link to the recipient.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
              />
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white text-sm transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          // Form state
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Recipient wallet address
              </label>
              <input
                type="text"
                value={recipientWallet}
                onChange={(e) => setRecipientWallet(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/20 font-mono text-sm"
                disabled={creating}
                autoFocus
              />
              <p className="text-xs text-white/50 mt-1">
                Enter the recipient&apos;s wallet address
              </p>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Optional message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/20 text-sm resize-none"
                disabled={creating}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Expiration
              </label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as ExpirationOption)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/20 text-sm"
                disabled={creating}
              >
                {EXPIRATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-white/50">
              Note: Once opened, the recipient can save the content. Revocation prevents future access but cannot remove already-opened content.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={handleClose}
                disabled={creating}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !recipientWallet.trim()}
                className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating...' : 'Create capsule'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


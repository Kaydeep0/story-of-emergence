'use client';

/**
 * Share Capsule Dialog
 * 
 * Minimal UI for creating a share capsule.
 * Prompts for recipient identifier and creates encrypted capsule.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import type { ShareArtifact } from '../../lib/lifetimeArtifact';
import { createShareCapsule } from '../../lib/shareCapsule';

type ShareCapsuleDialogProps = {
  artifact: ShareArtifact;
  senderWallet: string;
  isOpen: boolean;
  onClose: () => void;
};

export function ShareCapsuleDialog({
  artifact,
  senderWallet,
  isOpen,
  onClose,
}: ShareCapsuleDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!recipient.trim()) {
      toast.error('Recipient identifier is required');
      return;
    }

    setCreating(true);
    try {
      // Create capsule
      const capsule = await createShareCapsule(artifact, senderWallet, recipient.trim());
      
      // Success - capsule is logged to console
      toast('Shared privately');
      
      // Reset and close
      setRecipient('');
      onClose();
    } catch (err: any) {
      console.error('Failed to create share capsule', err);
      toast.error(err?.message || 'Failed to create share capsule');
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = () => {
    setRecipient('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-2xl border border-white/10 bg-black p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-medium text-white mb-4">Send privately</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Recipient identifier
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Wallet address or public key"
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/20"
              disabled={creating}
              autoFocus
            />
            <p className="text-xs text-white/50 mt-1">
              Enter the recipient&apos;s wallet address or public key
            </p>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              disabled={creating}
              className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !recipient.trim()}
              className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


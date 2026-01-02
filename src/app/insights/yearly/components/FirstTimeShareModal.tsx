// src/app/insights/yearly/components/FirstTimeShareModal.tsx
// First-Time Share Education Modal
// Phase 3.3: UX-only trust guardrail for first external share

'use client';

import { useEffect } from 'react';

export interface FirstTimeShareModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * SessionStorage key for tracking if user has seen first-time share modal
 */
const FIRST_TIME_SHARE_KEY = 'soe_first_time_share_seen';

/**
 * Check if user has seen first-time share modal this session
 */
export function hasSeenFirstTimeShare(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(FIRST_TIME_SHARE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark first-time share modal as seen for this session
 */
export function markFirstTimeShareSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(FIRST_TIME_SHARE_KEY, 'true');
  } catch {
    // Silent fail - sessionStorage may not be available
  }
}

/**
 * First-Time Share Education Modal
 * 
 * Shows exactly once per session (minimum).
 * Blocks share action until acknowledged.
 * No auto-dismiss, no silent bypass.
 */
export function FirstTimeShareModal({
  isOpen,
  onConfirm,
  onCancel,
}: FirstTimeShareModalProps) {
  // Handle Escape key to close
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

  const handleConfirm = () => {
    markFirstTimeShareSeen();
    onConfirm();
  };

  return (
    <>
      {/* Backdrop - blocks interaction, no auto-dismiss */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
        onClick={(e) => {
          // Prevent backdrop click from closing modal
          e.stopPropagation();
        }}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div
          className="rounded-2xl border border-white/10 bg-black/95 backdrop-blur p-6 max-w-md w-full space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h3 className="text-lg font-normal text-white/90">
            What you&apos;re sharing
          </h3>
          
          {/* Bullet points */}
          <ul className="space-y-2 text-sm text-white/70 leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-white/50 mt-0.5">•</span>
              <span>Derived summary only</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/50 mt-0.5">•</span>
              <span>No raw reflections</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/50 mt-0.5">•</span>
              <span>Computed locally</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-white/50 mt-0.5">•</span>
              <span>You control when and where it&apos;s shared</span>
            </li>
          </ul>
          
          {/* Explicit callout */}
          <div className="pt-2 border-t border-white/10">
            <p className="text-sm text-white/80 font-medium">
              Your private journal entries are never shared.
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors text-sm font-medium"
            >
              I understand
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition-colors text-sm text-white/60"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
}


'use client';

import { useState, useEffect } from 'react';

interface ShareConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SESSION_STORAGE_KEY = 'share_confirmation_dismissed';

export function ShareConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
}: ShareConfirmationModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (dontShowAgain && typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    }
    onConfirm();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div
          className="rounded-2xl border border-white/10 bg-black/95 backdrop-blur p-6 max-w-md w-full space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-normal text-white/90">
            Export derived artifact
          </h3>
          <p className="text-sm text-white/70 leading-relaxed">
            You are exporting a derived artifact.
            Your private journal remains encrypted and untouched.
          </p>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-white/20"
            />
            <span className="text-xs text-white/60">
              Don&apos;t show again this session
            </span>
          </label>
          
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition-colors text-sm"
            >
              Continue
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

/**
 * Check if share confirmation should be shown
 * Returns false if user dismissed it this session
 */
export function shouldShowShareConfirmation(): boolean {
  if (typeof window === 'undefined') return true;
  return sessionStorage.getItem(SESSION_STORAGE_KEY) !== 'true';
}


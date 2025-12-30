'use client';

import React, { useState, useEffect } from 'react';
import { SHARE_FIRST_TIME_EXPLANATION } from '../../../lib/share/shareDefaults';

/**
 * ShareSafetyBanner - Privacy-first messaging for sharing
 * 
 * Displays clear messaging about what is and isn't shared.
 * Visible guardrail, not hidden logic.
 */

export function ShareSafetyBanner() {
  const [showExplanation, setShowExplanation] = useState(false);

  // Show explanation first time only, then disappear
  useEffect(() => {
    const hasSeenExplanation = localStorage.getItem('share-explanation-seen');
    if (!hasSeenExplanation) {
      setShowExplanation(true);
      localStorage.setItem('share-explanation-seen', 'true');
    }
  }, []);

  if (!showExplanation) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-4">
      <div className="flex items-start gap-2">
        {/* Archive/seal icon - feels like sealed artifact, not published */}
        <svg
          className="w-4 h-4 text-white/50 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-xs text-white/60 leading-relaxed">
            {SHARE_FIRST_TIME_EXPLANATION}
          </p>
          <button
            onClick={() => setShowExplanation(false)}
            className="text-xs text-white/40 hover:text-white/60 mt-2 underline"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}


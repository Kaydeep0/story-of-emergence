'use client';

/**
 * ShareSafetyBanner - Privacy-first messaging for sharing
 * 
 * Displays clear messaging about what is and isn't shared.
 * Visible guardrail, not hidden logic.
 */

import React from 'react';

export function ShareSafetyBanner() {
  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 mb-4">
      <div className="flex items-start gap-2">
        {/* Privacy icon */}
        <svg
          className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
        <p className="text-xs text-green-300 leading-relaxed">
          Shared views never include raw journal text. You control what leaves your vault.
        </p>
      </div>
    </div>
  );
}


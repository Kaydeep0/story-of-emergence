// src/app/lib/useLogEvent.ts
// Hook for logging internal events via the API

'use client';

import { useCallback } from 'react';
import { useAccount } from 'wagmi';

export type EventType =
  | 'page_reflections'
  | 'page_insights'
  | 'page_sources'
  | 'page_shared'
  | 'reflection_saved'
  | 'reflection_deleted'
  | 'reflection_restored'
  | 'draft_created'
  | 'draft_deleted'
  | 'export_triggered'
  | 'capsule_open_success'
  | 'capsule_open_failed'
  | 'share_accepted'
  | 'share_dismissed'
  | 'share_created';

/**
 * Hook that provides a function to log internal events
 * Returns a logEvent function that handles wallet headers automatically
 */
export function useLogEvent() {
  const { address } = useAccount();

  const logEvent = useCallback(
    async (type: EventType, ts?: Date) => {
      // Skip if no wallet connected
      if (!address) return;

      try {
        await fetch('/api/events/log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address.toLowerCase(),
          },
          body: JSON.stringify({
            type,
            ts: ts?.toISOString(),
          }),
        });
      } catch (err) {
        // Silent fail for event logging - don't interrupt user flow
        console.error('[useLogEvent] Failed to log event:', err);
      }
    },
    [address]
  );

  return { logEvent };
}

/**
 * Non-hook version for use in event handlers where hooks aren't available
 * Requires wallet address to be passed explicitly
 */
export async function logEventDirect(
  walletAddress: string,
  type: EventType,
  ts?: Date
): Promise<void> {
  if (!walletAddress) return;

  try {
    await fetch('/api/events/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': walletAddress.toLowerCase(),
      },
      body: JSON.stringify({
        type,
        ts: ts?.toISOString(),
      }),
    });
  } catch (err) {
    console.error('[logEventDirect] Failed to log event:', err);
  }
}


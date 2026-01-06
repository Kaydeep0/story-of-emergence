'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { toast } from 'sonner';
import type { ReflectionEntry } from '../lib/insights/types';
import { rpcInsertPin, type NarrativeBridgePinPayload } from '../lib/pins';

type BridgeConnection = {
  connectedReflection: ReflectionEntry;
  explanation: string;
  reasons: string[];
  weight: number; // Always present (has safe default if missing from storage)
  // Debug-only fields (hidden in Cabin mode)
  fromId?: string;
  toId?: string;
  bridgeId?: string;
  signals?: {
    scaleHits?: string[];
    systemicHits?: string[];
    mediaHits?: string[];
    contrastHits?: string[];
    daysApart?: number;
  };
};

type BridgeCardCabinProps = {
  connection: BridgeConnection;
  primaryReflection: ReflectionEntry;
  index: number;
  onOpenCabin?: () => void; // Optional callback to open in cabin mode
};

/**
 * Cabin mode bridge card - clean, human-readable view
 * Shows only: date, reflection title, bridge sentence, minimal reason chips
 */
export function BridgeCardCabin({ connection, primaryReflection, index, onOpenCabin }: BridgeCardCabinProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const { address } = useAccount();
  const { aesKey: sessionKey } = useEncryptionSession();

  const connectedTitle =
    typeof connection.connectedReflection.plaintext === 'string'
      ? connection.connectedReflection.plaintext.split('\n')[0].slice(0, 80) || '(no title)'
      : '(no title)';

  const connectedDate = new Date(connection.connectedReflection.createdAt).toLocaleDateString();

  // Filter out empty explanations
  if (!connection.explanation || connection.explanation.trim().length === 0) {
    return null;
  }

  // Check for fallback patterns (defensive check)
  const normalizedExplanation = connection.explanation.toLowerCase().trim();
  const isFallbackPattern = [
    'this later reflection builds on the earlier one',
    'this connects to an earlier reflection',
    'this builds on what came before',
    'you viewed this from another angle',
    'you saw this differently the second time',
  ].some(pattern => normalizedExplanation === pattern || normalizedExplanation.includes(pattern));

  if (isFallbackPattern) {
    return null;
  }

  const handlePin = async () => {
    if (!address || !sessionKey || !connection.fromId || !connection.toId) {
      toast.error('Unable to pin bridge: missing required data');
      return;
    }

    setIsPinning(true);
    try {
      const pinPayload: NarrativeBridgePinPayload = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        label: connection.explanation.slice(0, 100), // Use bridge sentence as label
        fromReflectionId: connection.fromId,
        toReflectionId: connection.toId,
        explanation: connection.explanation,
        reasons: connection.reasons,
        weight: connection.weight,
        tags: [], // Optional tags can be added later
      };

      await rpcInsertPin(
        address,
        sessionKey,
        'narrative_bridge_pin',
        'user', // scope
        pinPayload
      );

      toast.success('Bridge pinned');
    } catch (err: any) {
      console.error('Failed to pin bridge', err);
      toast.error('Failed to pin bridge: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div className="pl-3 border-l-2 border-white/10 space-y-1.5">
      {/* Cabin mode: Clean view */}
      <div className="text-xs text-white/60 font-medium">
        {connectedDate} • {connectedTitle}
      </div>
      <div className="text-xs text-white/70 leading-relaxed italic">
        "{connection.explanation}"
      </div>
      {connection.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {connection.reasons.slice(0, 2).map((reason, rIdx) => (
            <span
              key={rIdx}
              className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-xs text-white/50"
            >
              {reason}
            </span>
          ))}
          {connection.reasons.length > 2 && (
            <span className="px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-xs text-white/40">
              +{connection.reasons.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1">
        {onOpenCabin ? (
          <button
            onClick={() => {
              // Open cabin from bridge always triggers auto-cabin
              onOpenCabin();
            }}
            className="text-xs text-white/50 hover:text-white/70 underline"
          >
            Open cabin
          </button>
        ) : (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-white/50 hover:text-white/70 underline"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        )}
        {address && sessionKey && connection.fromId && connection.toId && (
          <>
            <span className="text-xs text-white/30">•</span>
            <button
              onClick={handlePin}
              disabled={isPinning}
              className="text-xs text-white/50 hover:text-white/70 underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPinning ? 'Pinning...' : 'Pin this bridge'}
            </button>
          </>
        )}
      </div>

      {/* Debug details (hidden by default) */}
      {showDetails && (
        <BridgeCardDebug connection={connection} primaryReflection={primaryReflection} />
      )}
    </div>
  );
}

/**
 * Debug mode bridge card - full diagnostic information
 * Shows: score breakdown, metadata IDs, excerpts, provenance
 */
function BridgeCardDebug({ connection, primaryReflection }: { connection: BridgeConnection; primaryReflection: ReflectionEntry }) {
  // Sanity check: ensure all required provenance data exists
  // Note: weight is always present (has safe default), so we don't check for it
  const missing: string[] = [];
  if (!connection.fromId) missing.push('fromId');
  if (!connection.toId) missing.push('toId');
  if (!connection.reasons || connection.reasons.length === 0) missing.push('reasons');

  // Get reflection excerpts
  const fromReflection = primaryReflection;
  const toReflection = connection.connectedReflection;

  const fromExcerpt = fromReflection
    ? (typeof fromReflection.plaintext === 'string'
        ? fromReflection.plaintext.slice(0, 100).replace(/\n/g, ' ')
        : '(no text)')
    : '(missing)';
  const toExcerpt = typeof toReflection.plaintext === 'string'
    ? toReflection.plaintext.slice(0, 100).replace(/\n/g, ' ')
    : '(no text)';

  if (!fromReflection) missing.push('fromReflection');
  if (!toReflection) missing.push('toReflection');

  // Log error if any required data is missing
  if (missing.length > 0) {
    console.error(`[provenance] Missing required data for bridge ${connection.bridgeId?.slice(0, 8)}:`, missing);
  }

  // Calculate score breakdown from signals if available
  const scoreBreakdown: Array<{ component: string; value: number }> = [];
  if (connection.signals) {
    if (connection.reasons.includes('sequence')) {
      scoreBreakdown.push({ component: 'sequence', value: connection.signals.daysApart !== undefined ? Math.max(0, 1 - (connection.signals.daysApart || 0) / 30) : 0 });
    }
    if (connection.reasons.includes('scale') && connection.signals.scaleHits) {
      scoreBreakdown.push({ component: 'scale', value: Math.min(1, connection.signals.scaleHits.length / 3) });
    }
    if (connection.reasons.includes('systemic') && connection.signals.systemicHits) {
      scoreBreakdown.push({ component: 'systemic', value: Math.min(1, connection.signals.systemicHits.length / 3) });
    }
    if (connection.reasons.includes('media') && connection.signals.mediaHits) {
      scoreBreakdown.push({ component: 'media', value: connection.signals.mediaHits.length > 0 ? 1 : 0 });
    }
    if (connection.reasons.includes('contrast') && connection.signals.contrastHits) {
      scoreBreakdown.push({ component: 'contrast', value: connection.signals.contrastHits.length > 0 ? 1 : 0 });
    }
  }

  return (
    <div className="mt-2 pt-2 border-t border-white/5 space-y-2 text-xs">
      {missing.length > 0 && (
        <div className="text-red-400/80 font-semibold">
          ⚠ Missing: {missing.join(', ')}
        </div>
      )}
      <div className="text-white/40 font-mono space-y-1">
        <div className="font-semibold text-white/60">A Excerpt:</div>
        <div className="pl-2 text-white/50 italic">{fromExcerpt}...</div>
        <div className="font-semibold text-white/60 mt-2">B Excerpt:</div>
        <div className="pl-2 text-white/50 italic">{toExcerpt}...</div>
        <div className="font-semibold text-white/60 mt-2">Score Breakdown:</div>
        {scoreBreakdown.length > 0 ? (
          <div className="pl-2 space-y-0.5">
            {scoreBreakdown.map((sb, idx) => (
              <div key={idx} className="text-white/50">
                {sb.component}: {sb.value.toFixed(3)}
              </div>
            ))}
            {connection.weight !== undefined && (
              <div className="text-white/60 font-semibold mt-1">
                Total: {connection.weight.toFixed(3)}
              </div>
            )}
          </div>
        ) : (
          <div className="pl-2 text-white/40">
            Total: {connection.weight.toFixed(3)}
          </div>
        )}
        <div className="font-semibold text-white/60 mt-2">Reason Classification:</div>
        <div className="pl-2 text-white/50">
          {connection.reasons.length > 0 ? connection.reasons.join(', ') : 'none'}
        </div>
        <div className="font-semibold text-white/60 mt-2">Metadata:</div>
        <div className="pl-2 space-y-0.5 text-white/40">
          <div>From ID: {connection.fromId?.slice(0, 8)}...</div>
          <div>To ID: {connection.toId?.slice(0, 8)}...</div>
          {connection.bridgeId && (
            <div>Bridge ID: {connection.bridgeId.slice(0, 8)}...</div>
          )}
          {connection.signals?.daysApart !== undefined && (
            <div>Days apart: {connection.signals.daysApart}</div>
          )}
        </div>
      </div>
    </div>
  );
}


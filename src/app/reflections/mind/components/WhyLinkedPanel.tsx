'use client';

import type { MeaningBridge } from "@/app/lib/meaningBridges/types";
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcInsertPin } from '../../../lib/pins';
import { toast } from 'sonner';

export function WhyLinkedPanel(props: { 
  bridge: MeaningBridge | null;
  fromId?: string;
  toId?: string;
}) {
  const b = props.bridge;
  const { address } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey } = useEncryptionSession();
  const [pinning, setPinning] = useState(false);

  if (!b) return null;

  const handlePinBridge = async () => {
    if (!address || !sessionKey || !encryptionReady || !props.fromId || !props.toId) {
      toast.error('Wallet not ready');
      return;
    }

    try {
      setPinning(true);
      const payload = {
        id: `${props.fromId}:${props.toId}`,
        createdAt: new Date().toISOString(),
        label: b.title,
        fromReflectionId: props.fromId,
        toReflectionId: props.toId,
        bridge: b,
      };

      await rpcInsertPin(address, sessionKey, 'bridge_pin', 'bridge', payload);
      toast.success('Bridge pinned');
    } catch (err: any) {
      console.error('Failed to pin bridge', err);
      toast.error(err.message || 'Failed to pin bridge');
    } finally {
      setPinning(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm text-emerald-300">Why linked</div>
        {props.fromId && props.toId && (
          <button
            onClick={handlePinBridge}
            disabled={pinning || !encryptionReady || !sessionKey}
            className="px-3 py-1 rounded border border-emerald-400/50 bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pinning ? 'Pinning...' : 'Pin bridge'}
          </button>
        )}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{b.title}</div>
      <div className="mt-3 text-sm text-white/80">{b.claim}</div>

      {b.translation ? (
        <div className="mt-3 text-sm text-white/70">{b.translation}</div>
      ) : null}

      {b.consequences?.length ? (
        <ul className="mt-3 space-y-1 text-sm text-white/70">
          {b.consequences.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 text-xs text-white/60">{b.frame}</div>

      {b.echoes?.length ? (
        <div className="mt-3 space-y-2 text-xs text-white/60">
          {b.echoes.slice(0, 2).map((e, i) => (
            <div key={i} className="rounded-xl bg-white/5 p-2">{e}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}


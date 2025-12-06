'use client';

import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../lib/useEncryptionSession';

export function EncryptionStatus() {
  const { isConnected } = useAccount();
  const { ready, error } = useEncryptionSession();

  // Determine status
  let status: 'active' | 'locked' | 'disconnected';
  let label: string;
  let colorClass: string;

  if (!isConnected) {
    status = 'disconnected';
    label = 'Wallet disconnected';
    colorClass = 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  } else if (ready) {
    status = 'active';
    label = 'Encrypted session active';
    colorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  } else {
    status = 'locked';
    label = error ? 'Encryption error' : 'Wallet connected, encrypted session locked';
    colorClass = error 
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
      : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colorClass}`}
      title={error || label}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'active'
            ? 'bg-emerald-400'
            : status === 'locked'
            ? 'bg-amber-400'
            : 'bg-zinc-400'
        }`}
      />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">
        {status === 'active' ? 'Active' : status === 'locked' ? 'Locked' : 'Disconnected'}
      </span>
    </div>
  );
}


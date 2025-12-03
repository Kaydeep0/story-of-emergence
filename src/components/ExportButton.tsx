'use client';

import { useState } from 'react';
import { downloadJSON } from '../app/lib/export'; // <-- correct path
import { toast } from "sonner";


type ExportButtonProps = {
  walletAddress?: string;
  items?: unknown[];
};

function getItemsFallback(items?: unknown[]) {
  if (Array.isArray(items)) return items;
  const g = globalThis as any;
  if (Array.isArray(g.__soeDecryptedEntries)) return g.__soeDecryptedEntries as unknown[];
  return [];
}

function getWalletFallback(wallet?: string) {
  if (wallet && wallet.length) return wallet;
  const g = globalThis as any;
  if (typeof g.__soeWallet === 'string') return g.__soeWallet as string;
  return '';
}

export default function ExportButton({ walletAddress, items }: ExportButtonProps) {
  const [busy, setBusy] = useState(false);

  async function onExport() {
  const list = getItemsFallback(items);
  const addr = getWalletFallback(walletAddress);

  if (!list || list.length === 0) {
    toast.error("Nothing to export yet");
    return;
  }

  try {
    setBusy(true);
    const exportedAt = new Date().toISOString();
    const payload = {
      v: 1,
      exported_at: exportedAt,
      wallet_address: addr,
      count: list.length,
      entries: list,
    };
    const safeAddr = addr ? addr.slice(0, 8) : "anon";
    const fname = `soe_export_${safeAddr}_${exportedAt.replace(/[:.]/g, "")}.json`;
    downloadJSON(fname, payload);
    toast.success("Exported JSON");
  } catch (err: any) {
    console.error(err);
    toast.error("Export failed");
  } finally {
    setBusy(false);
  }
}


  return (
    <button
      onClick={onExport}
      disabled={busy}
      className="px-3 py-2 rounded-xl shadow text-sm border border-neutral-300 disabled:opacity-60"
      title="Export decrypted reflections as JSON"
    >
      {busy ? 'Exporting...' : 'Export JSON'}
    </button>
  );
}

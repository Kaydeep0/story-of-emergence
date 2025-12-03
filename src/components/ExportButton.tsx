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

  const list = getItemsFallback(items);
  const addr = getWalletFallback(walletAddress);
  const hasReflections = list && list.length > 0;

  async function onExport() {
    if (!addr) {
      toast.error("Connect your wallet to export.");
      return;
    }

    if (!hasReflections) {
      toast.error("Nothing to export yet");
      return;
    }

    try {
      setBusy(true);
      const exportedAt = new Date().toISOString();
      const payload = {
        version: 1,
        exportedAt,
        walletAddress: addr,
        reflections: list,
      };
      const shortAddr = addr.slice(0, 6);
      const date = exportedAt.slice(0, 10); // YYYY-MM-DD
      const filename = `soe_export_${shortAddr}_${date}.json`;
      downloadJSON(filename, payload);
      toast.success(`Exported ${list.length} reflections to ${filename}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }


  return (
    <button
      onClick={onExport}
      disabled={busy || !hasReflections}
      className="px-3 py-2 rounded-xl shadow text-sm border border-neutral-300 disabled:opacity-60"
      title={hasReflections ? "Export decrypted reflections as JSON" : "No reflections to export"}
    >
      {busy ? 'Exporting...' : 'Export JSON'}
    </button>
  );
}

'use client';

// components (relative to src/app/page.tsx)
import ReflectionsSkeleton from '../components/ReflectionsSkeleton';
import EmptyReflections from '../components/EmptyReflections';
import ExportButton from '../components/ExportButton';

// react + ui
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSignMessage, useSwitchChain, useChainId } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { incSaveCount, messageForSave } from '@/app/lib/toast';

import { getSupabaseForWallet } from './lib/supabase';
import { keyFromSignatureHex, encryptJSON, decryptJSON, tryDecodeLegacyJSON } from '../lib/crypto';

type Item = {
  id: string;
  ts: string;
  deleted_at?: string | null;
  note: string; // plaintext after decrypt
};

function humanizeSignError(e: any) {
  if (e?.code === 4001) return 'Signature request was rejected.';
  if (e?.code === -32002) return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return e?.shortMessage || e?.message || 'Unexpected signing error.';
}

export default function Home() {
  // ---- hooks must be called first, same order every render ----
  const { address, isConnected } = useAccount();
  const signLockRef = useRef(false);

  const chainId = useChainId();
  const { data: balance, isLoading: balLoading } = useBalance({
    address,
    chainId,
    query: { enabled: !!address },
  });
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const { switchChain, isPending: switching } = useSwitchChain();
  const sb = useMemo(() => getSupabaseForWallet(address ?? ''), [address]);

  // ---- local state ----
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('first test reflection from Story of Emergence');
  const [items, setItems] = useState<Item[]>([]);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
  const [showDeleted, setShowDeleted] = useState(false);

  const [loadingList, setLoadingList] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const signingConsentRef = useRef(false);
  const [saving, setSaving] = useState(false);

  // cache the consent signature so we don’t re-prompt every time this session
  const [consentSig, setConsentSig] = useState<string | null>(null);
  useEffect(() => {
    const s = sessionStorage.getItem('soe-consent-sig');
    if (s) setConsentSig(s);
  }, []);

  // autosize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [note]);

  // prevent hydration mismatch — render only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // expose wallet and decrypted items for ExportButton
  useEffect(() => {
    (globalThis as any).__soeWallet = address ?? '';
  }, [address]);
  useEffect(() => {
    (globalThis as any).__soeDecryptedEntries = items;
  }, [items]);

  // If the wallet account changes, drop any previous session signature (wrong key)
  useEffect(() => {
    setConsentSig(null);
    sessionStorage.removeItem('soe-consent-sig');
  }, [address]);

  const connected = isConnected && !!address;
  const w = (address ?? '').toLowerCase();

  // auto-load when connected (and after mount)
  useEffect(() => {
    if (!mounted) return;
    if (!connected) return;
    if (items.length > 0) return; // don’t spam if we already have items
    loadMyReflections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, connected]);

  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  // ask wallet for (or reuse) a consent signature; return AES key
  async function getSessionKey(): Promise<CryptoKey> {
    if (!connected || !address) throw new Error('Connect wallet first');

    let sig = consentSig;

    if (!sig) {
      if (signingConsentRef.current) {
        setStatus('Signature already pending — check MetaMask.');
        throw new Error('PENDING_SIG');
      }
      signingConsentRef.current = true;
      try {
        const msg = `Story of Emergence — encryption key consent for ${address}`;
        setStatus('Requesting signature in MetaMask… (look for the popup)');
        sig = await signMessageAsync({ message: msg });
        setConsentSig(sig);
        sessionStorage.setItem('soe-consent-sig', sig);
      } catch (e: any) {
        setStatus(humanizeSignError(e));
        throw e;
      } finally {
        signingConsentRef.current = false;
      }
    }
    return keyFromSignatureHex(sig);
  }

  // ---- load my reflections (fetch → decrypt → show plaintext) ----
  async function loadMyReflections() {
    try {
      if (!connected) {
        setStatus('Connect wallet first');
        return;
      }

      setLoadingList(true);
      setStatus('Fetching your entries…');

      // Build query once
      let q = sb
        .from('entries')
        .select('id, created_at, ciphertext, deleted_at')
        .eq('wallet_address', w)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!showDeleted) q = q.is('deleted_at', null);

      const { data: rows, error: listErr } = await q;
      if (listErr) throw listErr;

      // prepare key
      setStatus('Preparing decryption key…');
      const key = await getSessionKey();

      // decrypt each row (legacy → AES → fallback)
      const next: Item[] = [];
      for (const row of rows ?? []) {
        const legacy = tryDecodeLegacyJSON(row.ciphertext as string);
        if (legacy) {
          next.push({
            id: row.id,
            ts: row.created_at,
            deleted_at: row.deleted_at,
            note: typeof legacy?.note === 'string' ? legacy.note : JSON.stringify(legacy),
          });
          continue;
        }

        try {
          const obj = await decryptJSON(row.ciphertext as string, key);
          next.push({
            id: row.id,
            ts: row.created_at,
            deleted_at: row.deleted_at,
            note: typeof obj?.note === 'string' ? obj.note : JSON.stringify(obj),
          });
        } catch {
          const ct = (row.ciphertext ?? '') as string;
          next.push({
            id: row.id,
            ts: row.created_at,
            deleted_at: row.deleted_at,
            note: ct.length ? `[unable to decrypt] ${ct.slice(0, 60)}…` : '[no ciphertext]',
          });
        }
      }

      setItems(next);
      setStatus(next.length ? '' : showDeleted ? 'Trash is empty.' : 'No entries yet.');
    } catch (e: any) {
      setStatus(`Error: ${e?.message ?? 'Load failed'}`);
    } finally {
      setLoadingList(false);
    }
  }

  // ---- save one reflection (plaintext -> AES encrypt -> insert) ----
  async function saveReflection() {
    try {
      if (!connected) {
        setStatus('Connect wallet first');
        return;
      }

      const text = note.trim();
      if (!text) {
        setStatus('Type something first');
        textareaRef.current?.focus();
        return;
      }

      signLockRef.current = true;
      setSaving(true);
      setStatus('Preparing encryption key…');
      toast.message('Requesting signature in MetaMask…');

      const key = await getSessionKey();

      const item = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        note: text,
      };

      const ciphertext = await encryptJSON(item, key);
      const { data: insRow, error: insErr } = await sb
        .from('entries')
        .insert({ wallet_address: w, ciphertext })
        .select('id')
        .single();

      if (insErr) throw insErr;

      setStatus('Saved (AES)!');
      const n = incSaveCount();
      toast.success(messageForSave(n));
      setNote('');
      textareaRef.current?.focus();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      setStatus(`Error: ${msg}`);
      toast.error(`Save failed: ${msg}`);
    } finally {
      signLockRef.current = false;
      setSaving(false);
    }
  }

  // ---- soft-delete one item ----
  async function deleteEntry(id: string) {
    try {
      if (!connected) {
        setStatus('Connect wallet first');
        return;
      }
      const ok = window.confirm('Delete this reflection (move to Trash)?');
      if (!ok) return;

      setDeletingIds((m) => ({ ...m, [id]: true }));
      setStatus('Deleting…');

      // Preflight: visible under RLS?
      const { data: preRows, error: preErr } = await sb
        .from('entries')
        .select('id, deleted_at', { count: 'exact', head: false })
        .eq('id', id)
        .eq('wallet_address', w)
        .limit(2);

      if (preErr) throw preErr;
      if (!preRows?.length) throw new Error('Row not visible to you (RLS)');
      if (preRows.length > 1) throw new Error('Duplicate id matched (unexpected)');

     
      // Soft-delete (no SELECT required)
const { error: delErr } = await sb
  .from('entries')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id)
  .eq('wallet_address', w)
  .is('deleted_at', null);

if (delErr) throw delErr;


      // Optimistic UI
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, deleted_at: new Date().toISOString() } : it))
      );
      setStatus('Deleted.');
    } catch (e: any) {
      console.error(e);
      setStatus(`Delete failed: ${e?.message ?? 'Update denied (RLS)'}`);
    } finally {
      setDeletingIds((m) => {
        const { [id]: _gone, ...rest } = m;
        return rest;
      });
    }
  }

  // ---- restore from trash ----
  async function restoreEntry(id: string) {
    try {
      if (!connected) {
        setStatus('Connect wallet first');
        return;
      }
      setStatus('Restoring…');

      const { data: resRow, error: resErr } = await sb
        .from('entries')
        .update({ deleted_at: null })
        .eq('id', id)
        .eq('wallet_address', w)
        .select('id')
        .single();

      if (resErr) throw resErr;
      if (!resRow) throw new Error('No row returned (not your row?)');

      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, deleted_at: null } : it)));
      setStatus('Restored.');
    } catch (e: any) {
      console.error(e);
      setStatus(`Restore failed: ${e?.message ?? 'Update denied (RLS)'}`);
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur px-4 py-2 flex items-center justify-between">
        <span className="font-semibold">Story of Emergence</span>
        <ConnectButton />
      </header>

      <section className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {!isConnected ? (
          <p className="text-white/70">
            Connect your wallet to view balance and try a quick signed message.
          </p>
        ) : (
          <>
            {/* Wallet summary */}
            <div className="grid gap-4 rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Address</span>
                <span className="font-mono">{shortAddr}</span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-3">
                  <button
                    onClick={loadMyReflections}
                    disabled={!isConnected || loadingList}
                    className="rounded-2xl border border-white/20 px-4 py-2 hover:bg-white/5 disabled:opacity-50"
                  >
                    {loadingList ? 'Loading…' : 'Reload'}
                  </button>
                </div>

                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => {
                      setShowDeleted(e.target.checked);
                      loadMyReflections();
                    }}
                  />
                  Show deleted (Trash)
                </label>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Network</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{chainId}</span>
                  {chainId !== baseSepolia.id && (
                    <button
                      onClick={() => switchChain({ chainId: baseSepolia.id })}
                      disabled={switching}
                      className="rounded-xl border border-white/20 px-3 py-1 hover:bg-white/5 disabled:opacity-50"
                    >
                      {switching ? 'Switching…' : 'Switch to Base Sepolia'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-white/70">Balance</span>
                <span className="font-mono">
                  {balLoading ? '…' : balance ? `${balance.formatted} ${balance.symbol}` : '—'}
                </span>
              </div>
            </div>

            {/* Sign a message demo */}
            <div className="rounded-2xl border border-white/10 p-6 space-y-3">
              <h3 className="font-semibold">Try a free, on-chain-safe action</h3>
              <p className="text-white/70 text-sm">
                Signing a message proves wallet control (no gas, no funds needed).
              </p>
              <button
                onClick={async () => {
                  if (!isConnected) {
                    setStatus('Connect wallet first');
                    return;
                  }
                  setStatus('Check MetaMask and click Sign…');
                  try {
                    await signMessageAsync({ message: 'Hello from Story of Emergence' });
                    setStatus('Signed!');
                  } catch (e: any) {
                    setStatus(humanizeSignError(e));
                  }
                }}
                disabled={signing}
                className="rounded-2xl bg-white text-black px-4 py-2 hover:bg-white/90 disabled:opacity-50"
              >
                {signing ? 'Waiting for signature…' : 'Sign a message'}
              </button>
            </div>

            {/* Save / Load */}
            <div className="rounded-2xl border border-white/10 p-6 space-y-3">
              <h3 className="font-semibold">Private reflections</h3>
              <p className="text-white/70 text-sm">
                We encrypt in your browser with a key derived from a wallet signature, then store only ciphertext.
              </p>

              <textarea
                ref={textareaRef}
                className="w-full rounded-xl bg-black border border-white/10 mt-3 p-3"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <div className="flex gap-3 mt-3">
                <button
                  onClick={saveReflection}
                  disabled={!isConnected || saving || signLockRef.current}
                  className="rounded-2xl bg-white text-black px-4 py-2 hover:bg-white/90 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save encrypted'}
                </button>

                <button
                  onClick={loadMyReflections}
                  disabled={!isConnected || loadingList}
                  className="rounded-2xl border border-white/20 px-4 py-2 hover:bg-white/5 disabled:opacity-50"
                >
                  {loadingList ? 'Loading…' : 'Load my reflections'}
                </button>
              </div>

              {/* status line */}
              {status && <p className="text-sm text-white/70">{status}</p>}

              {/* list area with loading + empty states */}
              {loadingList ? (
                <ReflectionsSkeleton />
              ) : items.length === 0 ? (
                <EmptyReflections onLoadClick={loadMyReflections} />
              ) : (
                <>
                  {/* Export toolbar */}
                  <div className="mb-3 flex justify-end">
                    <ExportButton walletAddress={address ?? ''} items={items} />
                  </div>

                  <div className="mt-4 space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="rounded-xl border border-white/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs text-white/50">
                            {new Date(it.ts).toLocaleString()}
                            {it.deleted_at ? ' • in Trash' : ''}
                          </div>

                          <div className="flex gap-2">
                            {it.deleted_at ? (
                              <button
                                onClick={() => restoreEntry(it.id)}
                                className="text-xs rounded-lg border border-white/20 px-2 py-1 hover:bg-white/5"
                                title="Restore this reflection"
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                onClick={() => deleteEntry(it.id)}
                                disabled={!!deletingIds[it.id]}
                                className="text-xs rounded-lg border border-white/20 px-2 py-1 hover:bg-white/5 disabled:opacity-50"
                                title="Delete this reflection"
                              >
                                {deletingIds[it.id] ? 'Deleting…' : 'Delete'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2 whitespace-pre-wrap break-words">{it.note}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

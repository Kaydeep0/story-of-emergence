'use client';





// components (relative to src/app/page.tsx)
import HealthStrip from "./components/HealthStrip";
import ReflectionsSkeleton from '../components/ReflectionsSkeleton';
import EmptyReflections from '../components/EmptyReflections';
import ExportButton from './components/ExportButton';
import {
  rpcFetchEntries,
  rpcInsertEntry,
  rpcSoftDelete,
  rpcHardDelete,
  restoreEntryRpc,
} from "./lib/entries";
import {
  Draft,
  loadDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  renameDraft,
  migrateLegacyDraft,
  moveDraftUp,
  moveDraftDown,
} from "./lib/drafts";
import { rpcInsertInternalEvent } from "./lib/internalEvents";
import { useLogEvent } from "./lib/useLogEvent";





// react + ui
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from "sonner";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSignMessage, useSwitchChain, useChainId } from 'wagmi';
import { baseSepolia } from 'viem/chains';
import { incSaveCount, messageForSave } from '@/app/lib/toast';

import { getSupabaseForWallet } from './lib/supabase';
import { keyFromSignatureHex } from '../lib/crypto';
import { rpcInsertShare } from './lib/shares';
import {
  generateContentKey,
  wrapKeyForRecipient,
  encryptSlice,
  encodeCapsule,
  type CapsulePayload,
} from '../lib/sharing';

type Item = {
  id: string;
  ts: string;
  deleted_at: string | null;
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
  // mounted gate to avoid hydration mismatch
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

// derived helpers — define ONCE, above effects that use them
const connected = isConnected && !!address;
const w = (address ?? '').toLowerCase();

// Event logging hook
const { logEvent } = useLogEvent();

// Log navigation event when page loads (connected wallet only)
useEffect(() => {
  if (!mounted || !connected) return;
  logEvent('page_reflections');
}, [mounted, connected, logEvent]);

// ---- local state ----
const [status, setStatus] = useState('');
const [drafts, setDrafts] = useState<Draft[]>([]);
const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
const [note, setNote] = useState('');
const [items, setItems] = useState<Item[]>([]);
const [showDeleted, setShowDeleted] = useState(false);
const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});
const trashCount = useMemo(() => items.filter(i => i.deleted_at).length, [items]);

// Inline rename state
const [renamingId, setRenamingId] = useState<string | null>(null);
const [renameValue, setRenameValue] = useState('');

// Share modal state
const [sharingItem, setSharingItem] = useState<Item | null>(null);
const [shareRecipient, setShareRecipient] = useState('');
const [shareCreating, setShareCreating] = useState(false);
const [shareCapsuleUrl, setShareCapsuleUrl] = useState<string | null>(null);




// Load drafts from localStorage on mount, migrate legacy single draft
useEffect(() => {
  if (typeof window === "undefined") return;
  migrateLegacyDraft();
  const loaded = loadDrafts();
  setDrafts(loaded);
  // Auto-select first draft if exists
  if (loaded.length > 0) {
    setActiveDraftId(loaded[0].id);
    setNote(loaded[0].content);
  }
}, []);

// Auto-save note content to active draft
useEffect(() => {
  if (typeof window === "undefined") return;
  if (!activeDraftId) return;
  const updated = updateDraft(activeDraftId, note);
  if (updated) {
    setDrafts(prev => prev.map(d => d.id === activeDraftId ? updated : d));
  }
}, [note, activeDraftId]);


const activeCount = useMemo(
  () => items.filter(i => !i.deleted_at).length,
  [items]
);

const lastSaved = useMemo(() => {
  if (items.length === 0) return null;
  // Parse ISO strings to timestamps, filter out any invalid dates
  const timestamps = items
    .map(i => new Date(i.ts).getTime())
    .filter(ts => !isNaN(ts));
  if (timestamps.length === 0) return null;
  const maxTs = Math.max(...timestamps);
  return new Date(maxTs);
}, [items]);


// search box state
const [searchTerm, setSearchTerm] = useState("");

// derive visible items based on Trash toggle and search
const baseItems = useMemo(
  () =>
    showDeleted
      ? items.filter(i => i.deleted_at)    // Trash view
      : items.filter(i => !i.deleted_at),  // Normal view
  [items, showDeleted]
);

const visibleItems = useMemo(
  () => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return baseItems;

    return baseItems.filter(it =>
      (it.note ?? "").toLowerCase().includes(q)
    );
  },
  [baseItems, searchTerm]
);





// pagination
const [nextOffset, setNextOffset] = useState<number | null>(0);
const [loadingMore, setLoadingMore] = useState(false);



// reload when wallet or Trash toggle changes
useEffect(() => {
  if (!mounted) return;
  if (!connected) return;
  loadMyReflections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [mounted, connected, w, showDeleted]);





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



// auto-load when connected and after mount
useEffect(() => {
  if (!mounted) return;
  if (!connected) return;
  if (items.length > 0) return; // avoid spam if already loaded
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
async function loadMyReflections(reset = false) {
  try {
    if (!connected) {
      const msg = "Connect wallet first";
      setStatus(msg);
      toast.error(msg);
      return;
    }

    if (reset) setNextOffset(0);

    // show the top skeleton only for first page
    if (reset || items.length === 0) setLoadingList(true);

    const sessionKey = await getSessionKey();

   const { items: rows, nextOffset: no } = await rpcFetchEntries(
  address!,
  sessionKey,
  {
    includeDeleted: showDeleted,
    limit: 15,
    offset: reset ? 0 : (nextOffset ?? 0),
  }
);


    const mapped = rows.map((i) => ({
      id: i.id,
      ts: i.createdAt.toISOString(),
      deleted_at: i.deletedAt ? i.deletedAt.toISOString() : null,
      note:
        typeof i.plaintext === "object" &&
        i.plaintext !== null &&
        "text" in (i.plaintext as any)
          ? String((i.plaintext as any).text)
          : typeof i.plaintext === "string"
          ? (i.plaintext as string)
          : JSON.stringify(i.plaintext),
    }));

    setItems((prev) => (reset ? mapped : [...prev, ...mapped]));
    setNextOffset(no);

    setStatus("Reflections loaded");
    toast.success("Reflections loaded");
} catch (e: any) {
  if (e?.message === "PENDING_SIG") {
    // user already has a wallet signature prompt
    return;
  }
  console.error(e);
  const msg = e?.message ?? "Load failed";
  setStatus(msg);
  toast.error(msg);
} finally {
  setLoadingList(false);
  setLoadingMore(false);
}
}





async function saveReflection() {
  if (!connected) {
    setStatus("Connect wallet first");
    return;
  }

  const text = note.trim();
  if (!text) {
    setStatus("Type something first");
    textareaRef.current?.focus();
    return;
  }

  signLockRef.current = true;
  setSaving(true);
  setStatus("Preparing encryption key…");

  try {
    const sessionKey = await getSessionKey();
    const { id: entryId } = await rpcInsertEntry(address!, sessionKey, {
      text,
      ts: Date.now(),
    });

    try {
      await rpcInsertInternalEvent(address!, sessionKey, new Date(), {
        source_kind: "journal",
        event_kind: "written",
        content: text,
        url: null,
        topics: [],
        attention_type: null,
        emotional_valence: null,
        raw_metadata: {
          entry_id: entryId,
          length: text.length,
        },
      });
    } catch (e) {
      console.error("Failed to insert internal_event", e);
    }

    setStatus("Saved");
    toast.success("Saved");

    // Clear note and delete the draft after successful encryption
    setNote("");
    if (activeDraftId) {
      deleteDraft(activeDraftId);
      setDrafts(prev => prev.filter(d => d.id !== activeDraftId));
      setActiveDraftId(null);
    }
    await loadMyReflections(true);

} catch (e: any) {
  if (e?.message === "PENDING_SIG") {
    // signature already pending in MetaMask, ignore
    return;
  }
  const msg = e?.message ?? "Save failed";
  setStatus(msg);
  toast.error(msg);
} finally {
  signLockRef.current = false;
  setSaving(false);
}
}




async function deleteEntry(id: string) {
  try {
    setDeletingIds(m => ({ ...m, [id]: true }));

    // optimistic UI
    setItems(prev => prev.map(it => it.id === id ? { ...it, deleted_at: new Date().toISOString() } : it));

    await rpcSoftDelete(address!, id);

    toast.success("Moved to trash");

  } catch (e: any) {

    setItems(prev => prev.map(it => it.id === id ? { ...it, deleted_at: null } : it));

    const msg = e?.message ?? "Delete failed";
    toast.error(msg);
    setStatus(msg);

  } finally {

    setDeletingIds(m => ({ ...m, [id]: false }));

  }
}


async function restoreEntry(id: string) {
  try {
    // optimistic restore in UI
    setItems(prev =>
      prev.map(it =>
        it.id === id ? { ...it, deleted_at: null } : it
      )
    );

    // call RPC to restore in DB
    await restoreEntryRpc(address!, id);

    toast.success("Restored");
  } catch (err: any) {
    console.error(err);

    // revert optimistic change back to deleted
    setItems(prev =>
      prev.map(it =>
        it.id === id
          ? { ...it, deleted_at: new Date().toISOString() }
          : it
      )
    );

    const msg = err?.message ?? "Restore failed";
    setStatus(msg);
    toast.error(msg);
  }
}


async function deleteForever(id: string) {
  if (typeof window !== "undefined") {
    const ok = window.confirm(
      "Delete this reflection permanently? This cannot be undone."
    );
    if (!ok) return;
  }

  try {
    // hard delete in DB
    await rpcHardDelete(address!, id);

    // remove from local list
    setItems(prev => prev.filter(it => it.id !== id));

    toast.success("Deleted permanently");
  } catch (err: any) {
    console.error(err);
    const msg = err?.message ?? "Permanent delete failed";
    setStatus(msg);
    toast.error(msg);
  }
}

// Open share modal for a reflection
function openShareModal(item: Item) {
  setSharingItem(item);
  setShareRecipient('');
  setShareCapsuleUrl(null);
}

// Close share modal
function closeShareModal() {
  setSharingItem(null);
  setShareRecipient('');
  setShareCapsuleUrl(null);
  setShareCreating(false);
}

// Create a share for a reflection
async function createShare() {
  if (!sharingItem || !address || !shareRecipient.trim()) return;

  // Validate recipient wallet address format
  const recipient = shareRecipient.trim().toLowerCase();
  if (!recipient.startsWith('0x') || recipient.length !== 42) {
    toast.error('Please enter a valid wallet address (0x...)');
    return;
  }

  setShareCreating(true);

  try {
    const sessionKey = await getSessionKey();

    // Generate a content key for this share
    const contentKey = await generateContentKey();

    // Create the payload to encrypt
    const payload = {
      content: sharingItem.note,
      preview: sharingItem.note.slice(0, 200),
      createdAt: sharingItem.ts,
      reflectionId: sharingItem.id,
    };

    // Encrypt the payload with the content key
    const ciphertext = await encryptSlice(payload, contentKey);

    // Wrap the content key for the recipient (using sender's key for now)
    // Note: In production, this would use recipient's public key
    const wrappedKey = await wrapKeyForRecipient(contentKey, sessionKey);

    // Generate title from reflection (first 40 chars or fallback)
    const title = sharingItem.note.slice(0, 40).trim() || 'Shared Reflection';

    // Insert the share in Supabase
    const shareId = await rpcInsertShare(
      address,
      recipient,
      'reflection',
      title,
      ciphertext
    );

    // Build the capsule payload
    const capsule: CapsulePayload = {
      shareId,
      wrappedKey,
      senderWallet: address.toLowerCase(),
    };

    // Build the capsule URL (URL-encode the base64url string for safety)
    const capsuleUrl = `${window.location.origin}/shared/open?capsule=${encodeURIComponent(encodeCapsule(capsule))}`;
    setShareCapsuleUrl(capsuleUrl);

    // Log the share event
    logEvent('share_created');

    toast.success('Share created! Copy the link below.');
  } catch (err: any) {
    console.error('Share creation failed:', err);
    const msg = err?.message ?? 'Failed to create share';
    toast.error(msg);
  } finally {
    setShareCreating(false);
  }
}

// Copy capsule URL to clipboard
async function copyCapsuleUrl() {
  if (!shareCapsuleUrl) return;
  try {
    await navigator.clipboard.writeText(shareCapsuleUrl);
    toast.success('Link copied to clipboard!');
  } catch {
    toast.error('Failed to copy link');
  }
}


  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur px-4 py-2 flex items-center justify-between">
        <span className="font-semibold">Story of Emergence</span>
        <ConnectButton />
      </header>

  <HealthStrip
  showDeleted={showDeleted}
  onToggleDeleted={(v) => {
    setShowDeleted(v);
    loadMyReflections(true);
  }}
/>




      <section className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* Wallet summary */}
        <div className="grid gap-4 rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <span className="text-white/70">Address</span>
            <span className="font-mono">{shortAddr}</span>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-3">
              <button
                onClick={() => loadMyReflections(true)}
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
      loadMyReflections(true);
    }}
  />
  <span>Show deleted {trashCount ? `(Trash ${trashCount})` : "(Trash 0)"}</span>
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

          {items.length > 0 && (
  <p className="text-xs text-white/60 mt-1">
    {activeCount} active · {trashCount} in Trash · last saved{" "}
    {lastSaved ? lastSaved.toLocaleString() : "not available"}
  </p>
)}


          {/* Drafts management */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const newDraft = createDraft('');
                setDrafts(prev => [newDraft, ...prev]);
                setActiveDraftId(newDraft.id);
                setNote('');
                textareaRef.current?.focus();
              }}
              className="text-xs rounded-lg border border-white/20 px-2 py-1 hover:bg-white/5"
            >
              + New draft
            </button>
            {drafts.map((d, index) => {
              const isActive = d.id === activeDraftId;
              const isRenaming = renamingId === d.id;
              const isFirst = index === 0;
              const isLast = index === drafts.length - 1;

              const handleConfirmRename = () => {
                const trimmed = renameValue.trim();
                if (!trimmed) {
                  setRenamingId(null);
                  return;
                }
                renameDraft(d.id, trimmed);
                const updated = loadDrafts();
                setDrafts(updated);
                setRenamingId(null);
              };

              const handleCancelRename = () => {
                setRenamingId(null);
                setRenameValue('');
              };

              return (
                <div key={d.id} className="flex items-center gap-1.5">
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmRename();
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      onBlur={handleConfirmRename}
                      className="bg-black border border-white/30 rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-white/50"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setActiveDraftId(d.id);
                        setNote(d.content);
                      }}
                      className={`text-xs rounded-lg border px-2 py-1 max-w-[120px] truncate ${
                        isActive
                          ? 'bg-white text-black border-white font-medium shadow-sm ring-1 ring-white/30'
                          : 'bg-transparent text-white/70 border-white/20 hover:text-white hover:bg-white/5'
                      }`}
                      title={d.content.slice(0, 100) || 'Empty draft'}
                      aria-current={isActive ? "true" : undefined}
                    >
                      {d.title}
                    </button>
                  )}
                  {/* Icon controls with slight gap from draft name */}
                  <div className="flex items-center gap-0.5 ml-1">
                    {/* Reorder buttons */}
                    <button
                      onClick={() => setDrafts(moveDraftUp(d.id))}
                      disabled={isFirst}
                      className="text-xs text-white/50 hover:text-white/80 px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move draft up"
                      aria-label="Move draft up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => setDrafts(moveDraftDown(d.id))}
                      disabled={isLast}
                      className="text-xs text-white/50 hover:text-white/80 px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move draft down"
                      aria-label="Move draft down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => {
                        setRenamingId(d.id);
                        setRenameValue(d.title);
                      }}
                      className="text-xs text-white/50 hover:text-white/80 px-1"
                      title="Rename draft"
                      aria-label="Rename draft"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        deleteDraft(d.id);
                        const updated = loadDrafts();
                        setDrafts(updated);
                        // If the active draft was deleted, switch to next available
                        if (activeDraftId === d.id) {
                          if (updated.length > 0) {
                            setActiveDraftId(updated[0].id);
                            setNote(updated[0].content);
                          } else {
                            setActiveDraftId(null);
                            setNote('');
                          }
                        }
                      }}
                      className="text-xs text-white/50 hover:text-rose-400 px-1"
                      title="Delete draft"
                      aria-label="Delete draft"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <textarea
            ref={textareaRef}
            className="w-full rounded-xl bg-black border border-white/10 mt-3 p-3"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={activeDraftId ? "Write your reflection..." : "Create a new draft to start writing"}
            disabled={!activeDraftId}
          />

          <div className="flex gap-3 mt-3 flex-wrap">
            <button
              onClick={saveReflection}
              disabled={!isConnected || saving || signLockRef.current || !activeDraftId}
              aria-busy={saving}
              className="rounded-2xl bg-white text-black px-4 py-2 hover:bg-white/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save encrypted"}
            </button>

            <button
              onClick={() => loadMyReflections(true)}
              disabled={!isConnected || loadingList}
              className="rounded-2xl border border-white/20 px-4 py-2 hover:bg-white/5 disabled:opacity-50"
            >
              {loadingList ? 'Loading…' : 'Load my reflections'}
            </button>

            {activeDraftId && (
              <button
                onClick={() => {
                  deleteDraft(activeDraftId);
                  setDrafts(prev => {
                    const filtered = prev.filter(d => d.id !== activeDraftId);
                    // Switch to next draft or clear
                    if (filtered.length > 0) {
                      setActiveDraftId(filtered[0].id);
                      setNote(filtered[0].content);
                    } else {
                      setActiveDraftId(null);
                      setNote('');
                    }
                    return filtered;
                  });
                }}
                className="rounded-2xl border border-rose-500/50 text-rose-300 px-4 py-2 hover:bg-rose-500/10"
              >
                Discard draft
              </button>
            )}
          </div>

{/* status line */}
{status && <p className="text-sm text-white/70">{status}</p>}

<div style={{ marginTop: "1rem", marginBottom: "0.75rem" }}>
<input
  placeholder="Search reflections"
  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-white/30 focus:outline-none"
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
</div>


{/* list area with loading + empty states */}
{loadingList ? (
  <ReflectionsSkeleton />
) : visibleItems.length === 0 ? (
  <EmptyReflections onLoadClick={loadMyReflections} />
) : (
  <>
{/* Export toolbar + card count */}
<div className="mb-3 flex items-center justify-between text-xs text-white/50">
  <span>
    Showing {visibleItems.length} of {items.length} reflections
    {showDeleted ? " in Trash" : ""}
  </span>

  <ExportButton
    walletAddress={address ?? ""}
    visibleItems={visibleItems}
    allItems={items}
  />
</div>



    {/* cards */}
    <div className="mt-4 space-y-2">
{visibleItems.map((it) => (
        <div key={it.id} className="rounded-xl border border-white/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="text-xs text-white/50">
              {new Date(it.ts).toLocaleString()}
              {it.deleted_at ? " • in Trash" : ""}
            </div>


    <div className="flex gap-2">
  {showDeleted && it.deleted_at ? (
    <>
      <button
        onClick={() => restoreEntry(it.id)}
        className="text-xs rounded-lg border border-white/20 px-2 py-1 hover:bg-white/5"
        title="Restore this reflection"
      >
        Restore
      </button>

      <button
        onClick={() => deleteForever(it.id)}
        disabled={!!deletingIds[it.id]}
        aria-busy={!!deletingIds[it.id]}
        className="text-xs rounded-lg border border-rose-500/70 px-2 py-1 text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
        title="Delete this reflection permanently"
      >
        {deletingIds[it.id] ? "Deleting…" : "Delete forever"}
      </button>
    </>
  ) : (
    <>
      <button
        onClick={() => openShareModal(it)}
        className="text-xs rounded-lg border border-sky-500/50 px-2 py-1 text-sky-300 hover:bg-sky-500/10"
        title="Share this reflection"
      >
        Share
      </button>
      <button
        onClick={() => deleteEntry(it.id)}
        disabled={!!deletingIds[it.id]}
        aria-busy={!!deletingIds[it.id]}
        className="text-xs rounded-lg border border-white/20 px-2 py-1 hover:bg-white/5 disabled:opacity-50"
        title="Move this reflection to Trash"
      >
        {deletingIds[it.id] ? "Deleting…" : "Delete"}
      </button>
    </>
  )}
</div>


          </div>

          <div className="mt-2 whitespace-pre-wrap break-words">
            {it.note}
          </div>
        </div>
      ))}
    </div>

    {/* global Load more at the very bottom */}
    {nextOffset !== null && (
      <div className="mt-4 flex justify-center">
        <button
          onClick={async () => {
            if (loadingMore) return;
            setLoadingMore(true);
            await loadMyReflections(false);
          }}
          disabled={loadingMore}
          className="rounded-xl border border-white/20 px-4 py-2 hover:bg-white/5 disabled:opacity-50"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      </div>
    )}
  </>
)}




        </div>
      </section>

      {/* Share Modal */}
      {sharingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Share Reflection</h3>
              <button
                onClick={closeShareModal}
                className="text-white/50 hover:text-white transition-colors"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview of reflection */}
            <div className="rounded-xl bg-black/40 border border-white/5 p-3">
              <p className="text-xs text-white/40 mb-1">
                {new Date(sharingItem.ts).toLocaleString()}
              </p>
              <p className="text-sm text-white/70 line-clamp-3">
                {sharingItem.note}
              </p>
            </div>

            {!shareCapsuleUrl ? (
              <>
                {/* Recipient input */}
                <div className="space-y-2">
                  <label className="text-sm text-white/60">Recipient wallet address</label>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={shareRecipient}
                    onChange={(e) => setShareRecipient(e.target.value)}
                    className="w-full rounded-xl bg-black border border-white/10 px-3 py-2 text-sm focus:border-white/30 focus:outline-none font-mono"
                  />
                  <p className="text-xs text-white/40">
                    Enter the wallet address of the person you want to share with.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={createShare}
                    disabled={shareCreating || !shareRecipient.trim()}
                    className="flex-1 rounded-xl bg-sky-600 text-white py-2.5 font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {shareCreating ? 'Creating…' : 'Create Share'}
                  </button>
                  <button
                    onClick={closeShareModal}
                    disabled={shareCreating}
                    className="flex-1 rounded-xl border border-white/20 py-2.5 font-medium hover:bg-white/5 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Success state with capsule URL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span className="text-sm font-medium">Share created!</span>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Capsule link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareCapsuleUrl}
                        className="flex-1 rounded-xl bg-black border border-white/10 px-3 py-2 text-xs font-mono text-white/70 focus:outline-none"
                      />
                      <button
                        onClick={copyCapsuleUrl}
                        className="rounded-xl bg-white text-black px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-xs text-white/40">
                      Send this link to the recipient. They can open it to accept the shared reflection.
                    </p>
                  </div>
                </div>

                {/* Done button */}
                <div className="pt-2">
                  <button
                    onClick={closeShareModal}
                    className="w-full rounded-xl border border-white/20 py-2.5 font-medium hover:bg-white/5 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

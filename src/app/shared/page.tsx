'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEncryptionSession } from '../lib/useEncryptionSession';
import { useLogEvent } from '../lib/useLogEvent';
import { rpcListAcceptedShares, rpcDeleteAcceptedShare } from '../lib/shares';
import {
  rpcListContactsDecrypted,
  rpcInsertContact,
  rpcDeleteContact,
  buildContactsMap,
  type ContactDecrypted,
} from '../lib/contacts';
import type { AcceptedShare, SliceKind } from '../../lib/sharing';

function humanizeSignError(e: unknown): string {
  const err = e as { code?: number; shortMessage?: string; message?: string };
  if (err?.code === 4001) return 'Signature request was rejected.';
  if (err?.code === -32002)
    return 'A signature request is already pending. Open MetaMask and confirm (or cancel), then try again.';
  return err?.shortMessage || err?.message || 'Unexpected signing error.';
}

function SliceKindBadge({ kind }: { kind: SliceKind }) {
  const labels: Record<SliceKind, string> = {
    topic_slice: 'Topic',
    link_collection: 'Links',
    reflection_excerpt: 'Reflection',
    reflection: 'Reflection',
  };
  const colors: Record<SliceKind, string> = {
    topic_slice: 'bg-violet-500/20 text-violet-300',
    link_collection: 'bg-cyan-500/20 text-cyan-300',
    reflection_excerpt: 'bg-amber-500/20 text-amber-300',
    reflection: 'bg-amber-500/20 text-amber-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[kind] || 'bg-white/10 text-white/60'}`}>
      {labels[kind] || kind}
    </span>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-white/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/5 rounded w-16" />
          </div>
          <div className="h-4 bg-white/5 rounded w-2/3" />
          <div className="h-3 bg-white/5 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

function EmptySharedState() {
  return (
    <div className="rounded-2xl border border-white/10 p-8 text-center space-y-4">
      <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-white/30"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium">No shared content yet</h2>
      <p className="text-sm text-white/60 max-w-md mx-auto">
        When someone shares a private slice with you, open the capsule link they send and it will appear here.
      </p>
      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left">
        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">How it works</p>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Receive a capsule link from a contact</li>
          <li>• Open the link to preview and accept the shared slice</li>
          <li>• Accepted slices are re-encrypted under your key</li>
        </ul>
      </div>
    </div>
  );
}

// ----- Helper: extract preview text from share -----
function getPreviewText(share: AcceptedShare): string | null {
  if (typeof share.decryptedPayload !== 'object' || share.decryptedPayload === null) {
    return null;
  }
  const payload = share.decryptedPayload as Record<string, unknown>;
  
  if ('preview' in payload && typeof payload.preview === 'string') {
    return payload.preview;
  }
  if ('content' in payload && typeof payload.content === 'string') {
    const content = payload.content;
    return content.length > 200 ? content.slice(0, 200) + '…' : content;
  }
  if ('links' in payload && Array.isArray(payload.links)) {
    return `${payload.links.length} links`;
  }
  return null;
}

// ----- Helper: extract sender wallet from source label -----
function extractSenderWallet(sourceLabel: string): string | null {
  // sourceLabel is like "From 0x1234...5678 on Dec 4, 2025"
  // We need the full wallet - check if decryptedPayload has it
  const match = sourceLabel.match(/From\s+(0x[a-fA-F0-9…]+)/);
  return match ? match[1] : null;
}

// ----- Helper: extract full sender wallet from share payload -----
// Checks multiple possible field names for robustness
function extractSenderWalletFromSelected(selected: AcceptedShare | null): string | null {
  if (!selected) return null;

  const payload = selected.decryptedPayload as Record<string, unknown> | undefined;

  // Check multiple possible field names in payload
  const candidate =
    (payload?.senderWallet as string | undefined) ||
    (payload?.sender_wallet as string | undefined) ||
    // Also check top-level on the share object (shouldn't be there, but be safe)
    ((selected as Record<string, unknown>).senderWallet as string | undefined) ||
    ((selected as Record<string, unknown>).sender_wallet as string | undefined);

  if (!candidate || typeof candidate !== 'string') return null;

  return candidate.toLowerCase();
}


// ----- Detail Drawer Component -----
function DetailDrawer({
  share,
  onClose,
  onDelete,
  deleting,
  contactName,
  senderWallet,
  onSaveContact,
  savingContact,
}: {
  share: AcceptedShare;
  onClose: () => void;
  onDelete: () => void;
  deleting: boolean;
  contactName: string;
  senderWallet: string | null;
  onSaveContact: (name: string, wallet: string | null) => Promise<void>;
  savingContact: boolean;
}) {
  const preview = getPreviewText(share);
  const senderDisplay = extractSenderWallet(share.sourceLabel) || 'Unknown sender';
  const receivedDate = new Date(share.receivedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const [labelInput, setLabelInput] = useState(contactName);
  const [hasChanges, setHasChanges] = useState(false);

  // Track if input changed from initial value
  useEffect(() => {
    setHasChanges(labelInput !== contactName);
  }, [labelInput, contactName]);

  // Reset input when share or contactName changes
  useEffect(() => {
    setLabelInput(contactName);
  }, [contactName, share.id]);

  async function handleSaveLabel() {
    await onSaveContact(labelInput.trim(), senderWallet);
    setHasChanges(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        {/* Header with slice kind pill */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <SliceKindBadge kind={share.sliceKind} />
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-3">{share.title}</h2>

        {/* Metadata - show contact name if available */}
        <div className="space-y-1 text-sm text-white/60 mb-4">
          {contactName ? (
            <>
              <p className="text-white/90 font-medium">From {contactName}</p>
              <p className="text-xs text-white/40">{senderDisplay}</p>
            </>
          ) : (
            <p>From {senderDisplay}</p>
          )}
          <p>Received {receivedDate}</p>
        </div>

        {/* Preview content */}
        {preview && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 mb-4">
            <p className="text-sm text-white/80 whitespace-pre-wrap">{preview}</p>
          </div>
        )}

        {/* Contact label editor - only show if we can identify the sender wallet */}
        {senderWallet && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mb-6">
            <label className="block text-xs text-white/50 uppercase tracking-wide mb-2">
              Contact label
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Add a name for this sender…"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <button
                type="button"
                onClick={handleSaveLabel}
                disabled={!hasChanges || savingContact}
                className="px-4 py-2 text-sm rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingContact ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="text-xs text-white/40 mt-2">
              This label is encrypted and only visible to you.
            </p>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="px-4 py-2 text-sm rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting…' : 'Delete from Shared'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SharedPage() {
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<AcceptedShare[]>([]);
  const [selected, setSelected] = useState<AcceptedShare | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  // Contacts state - we maintain both array and map for different use cases
  const [, setContacts] = useState<ContactDecrypted[]>([]);
  const [contactsMap, setContactsMap] = useState<Map<string, ContactDecrypted>>(new Map());

  const { logEvent } = useLogEvent();
  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Log navigation event
  useEffect(() => {
    if (!mounted || !connected) return;
    logEvent('page_shared');
  }, [mounted, connected, logEvent]);

  // Reset contacts when wallet changes
  useEffect(() => {
    setContacts([]);
    setContactsMap(new Map());
  }, [address]);

  async function loadShares() {
    if (!connected || !address) return;
    if (!encryptionReady || !sessionKey) {
      if (encryptionError) {
        setError(encryptionError);
        toast.error(encryptionError);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { items } = await rpcListAcceptedShares(address, sessionKey, {
        limit: 50,
        offset: 0,
      });
      setShares(items);

      // Load contacts after shares - don't await to avoid blocking on contact failures
      loadContacts(sessionKey).catch(() => {
        // Silently ignore - loadContacts already logs and doesn't show error toasts
      });
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('Failed to load shares', e);
      const msg = err?.message ?? 'Could not load shared content';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function loadContacts(sessionKey?: CryptoKey) {
    if (!connected || !address) return;
    if (!sessionKey && (!encryptionReady || !sessionKey)) {
      return;
    }

    try {
      const key = sessionKey ?? (encryptionReady ? sessionKey! : null);
      if (!key) return;
      const contactsList = await rpcListContactsDecrypted(address, key);
      setContacts(contactsList);
      setContactsMap(buildContactsMap(contactsList));
    } catch (e: unknown) {
      console.error('Failed to load contacts', e);
      // Don't show error toast for contacts - it's not critical
    }
  }

  // Load shares when connected
  useEffect(() => {
    if (!mounted) return;
    if (!connected) return;
    loadShares();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, connected, address]);

  // Handle delete from drawer
  async function handleDelete() {
    if (!selected || !address) return;

    setDeleting(true);
    try {
      await rpcDeleteAcceptedShare(address, selected.id);
      // Remove from local list
      setShares((prev) => prev.filter((s) => s.id !== selected.id));
      // Close drawer
      setSelected(null);
      toast.success('Removed from Shared');
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('Failed to delete share', e);
      toast.error(err?.message ?? 'Failed to remove share');
    } finally {
      setDeleting(false);
    }
  }

  // Handle save contact from drawer
  async function handleSaveContact(name: string, walletFromDrawer: string | null) {
    if (!selected || !address) return;

    // Use wallet passed from drawer, or fallback to extracting it
    const walletForContact = walletFromDrawer ?? extractSenderWalletFromSelected(selected);
    if (!walletForContact) {
      toast.error('Cannot identify sender wallet');
      return;
    }

    setSavingContact(true);
    try {
      if (!encryptionReady || !sessionKey) {
        if (encryptionError) {
          toast.error(encryptionError);
        } else {
          toast.error('Encryption key not ready');
        }
        return;
      }

      if (name === '') {
        // Empty name - delete the contact if it exists
        const existingContact = contactsMap.get(walletForContact.toLowerCase());
        if (existingContact) {
          await rpcDeleteContact(address, existingContact.id);
          // Update local state
          setContacts((prev) => prev.filter((c) => c.id !== existingContact.id));
          setContactsMap((prev) => {
            const newMap = new Map(prev);
            newMap.delete(walletForContact.toLowerCase());
            return newMap;
          });
          toast.success('Contact label removed');
        }
      } else {
        // Save or update the contact
        const newId = await rpcInsertContact(address, sessionKey, walletForContact, name);
        
        // Update local state
        const newContact: ContactDecrypted = {
          id: newId,
          contactWallet: walletForContact.toLowerCase(),
          name,
          createdAt: new Date().toISOString(),
        };
        
        setContacts((prev) => {
          const existing = prev.findIndex((c) => c.contactWallet === walletForContact.toLowerCase());
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = newContact;
            return updated;
          }
          return [newContact, ...prev];
        });
        
        setContactsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(walletForContact.toLowerCase(), newContact);
          return newMap;
        });
        
        toast.success('Contact label saved');
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('Failed to save contact', e);
      toast.error(err?.message ?? 'Failed to save contact');
    } finally {
      setSavingContact(false);
    }
  }

  // Get contact name for a share
  function getContactNameForShare(share: AcceptedShare): string {
    const senderWallet = extractSenderWalletFromSelected(share);
    if (!senderWallet) return '';
    const contact = contactsMap.get(senderWallet.toLowerCase());
    return contact?.name || '';
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold text-center mb-2">Shared</h1>
        <p className="text-center text-sm text-white/60 mb-8">
          Private content shared with you from trusted contacts.
        </p>

        {/* Not connected state */}
        {!connected && (
          <div className="rounded-2xl border border-white/10 p-6 text-center space-y-4">
            <h2 className="text-lg font-medium">Connect your wallet</h2>
            <p className="text-sm text-white/60">
              Connect your wallet to view shared content and open capsule links.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        )}

        {/* Encryption not ready state */}
        {connected && !encryptionReady && (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 text-center space-y-4">
            <h2 className="text-lg font-medium text-amber-200">Preparing encryption key</h2>
            <p className="text-sm text-white/60">
              {encryptionError || 'Please sign the message in your wallet to continue.'}
            </p>
          </div>
        )}

        {/* Loading state */}
        {connected && loading && <SharedSkeleton />}

        {/* Error state */}
        {connected && !loading && error && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center space-y-3">
            <p className="text-sm text-rose-400">{error}</p>
            <button
              onClick={() => loadShares()}
              className="text-sm text-white/70 underline underline-offset-2 hover:text-white"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {connected && !loading && !error && shares.length === 0 && <EmptySharedState />}

        {/* Shares list */}
        {connected && !loading && !error && shares.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-white/50">
              <span>{shares.length} shared item{shares.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => loadShares()}
                className="text-white/60 hover:text-white transition-colors"
              >
                Refresh
              </button>
            </div>

            {shares.map((share) => {
              const preview = getPreviewText(share);
              const contactName = getContactNameForShare(share);
              const senderDisplay = extractSenderWallet(share.sourceLabel) || 'Unknown';
              
              return (
                <button
                  key={share.id}
                  type="button"
                  onClick={() => setSelected(share)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3 hover:bg-white/[0.04] hover:border-white/20 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="font-medium">{share.title}</h3>
                      {/* Show contact name with wallet below, or just wallet */}
                      {contactName ? (
                        <div>
                          <p className="text-sm text-white/70">From {contactName}</p>
                          <p className="text-xs text-white/40">{senderDisplay}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-white/50">{share.sourceLabel}</p>
                      )}
                    </div>
                    <SliceKindBadge kind={share.sliceKind} />
                  </div>

                  {/* Preview content */}
                  {preview && (
                    <p className="text-sm text-white/70 line-clamp-2">{preview}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>
                      Received {new Date(share.receivedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail drawer */}
      {selected && (
        <DetailDrawer
          share={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
          deleting={deleting}
          contactName={getContactNameForShare(selected)}
          senderWallet={extractSenderWalletFromSelected(selected)}
          onSaveContact={handleSaveContact}
          savingContact={savingContact}
        />
      )}
    </main>
  );
}

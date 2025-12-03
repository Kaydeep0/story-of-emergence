// src/app/lib/drafts.ts
// Local draft management - stored in localStorage before encryption

export type Draft = {
  id: string;
  title: string;
  content: string;
  createdAt: number;   // timestamp ms
  updatedAt: number;   // timestamp ms
};

const STORAGE_KEY = 'soe-drafts';

/** Generate a simple unique ID for drafts */
function generateId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Load all drafts from localStorage */
export function loadDrafts(): Draft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Backfill missing titles for existing drafts
    return parsed.map((d, i) => ({
      ...d,
      title: d.title || `Draft ${i + 1}`,
    }));
  } catch {
    return [];
  }
}

/** Save drafts array to localStorage */
function saveDrafts(drafts: Draft[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

/** Create a new draft */
export function createDraft(content = '', title?: string): Draft {
  const now = Date.now();
  const drafts = loadDrafts();
  const draft: Draft = {
    id: generateId(),
    title: title ?? `Draft ${drafts.length + 1}`,
    content,
    createdAt: now,
    updatedAt: now,
  };
  drafts.unshift(draft); // newest first
  saveDrafts(drafts);
  return draft;
}

/** Update a draft's content */
export function updateDraft(id: string, content: string): Draft | null {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx === -1) return null;
  drafts[idx] = {
    ...drafts[idx],
    content,
    updatedAt: Date.now(),
  };
  saveDrafts(drafts);
  return drafts[idx];
}

/** Rename a draft */
export function renameDraft(id: string, title: string): Draft | null {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx === -1) return null;
  drafts[idx] = {
    ...drafts[idx],
    title,
    updatedAt: Date.now(),
  };
  saveDrafts(drafts);
  return drafts[idx];
}

/** Delete a draft */
export function deleteDraft(id: string): void {
  const drafts = loadDrafts();
  const filtered = drafts.filter(d => d.id !== id);
  saveDrafts(filtered);
}

/** Move a draft up in the list (swap with previous) */
export function moveDraftUp(id: string): Draft[] {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx <= 0) return drafts; // already first or not found
  // Swap with previous
  [drafts[idx - 1], drafts[idx]] = [drafts[idx], drafts[idx - 1]];
  saveDrafts(drafts);
  return drafts;
}

/** Move a draft down in the list (swap with next) */
export function moveDraftDown(id: string): Draft[] {
  const drafts = loadDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx === -1 || idx >= drafts.length - 1) return drafts; // already last or not found
  // Swap with next
  [drafts[idx], drafts[idx + 1]] = [drafts[idx + 1], drafts[idx]];
  saveDrafts(drafts);
  return drafts;
}

/** Get a single draft by ID */
export function getDraft(id: string): Draft | null {
  const drafts = loadDrafts();
  return drafts.find(d => d.id === id) ?? null;
}

// Migration: convert old single-draft format to new multi-draft
export function migrateLegacyDraft(): void {
  if (typeof window === 'undefined') return;
  const legacyKey = 'soe-draft';
  const legacy = localStorage.getItem(legacyKey);
  if (legacy && legacy.trim()) {
    // Only migrate if we don't already have drafts
    const existing = loadDrafts();
    if (existing.length === 0) {
      createDraft(legacy);
    }
    localStorage.removeItem(legacyKey);
  }
}


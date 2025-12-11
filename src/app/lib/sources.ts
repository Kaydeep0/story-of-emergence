// src/app/lib/sources.ts

export type SourceKind =
  | 'youtube_watch_history'
  | 'x_bookmarks'
  | 'linkedin_articles'
  | 'file_import';

export type SourceStatus = 'planned' | 'connected' | 'error' | 'disabled';

export type Source = {
  id: string;
  kind: SourceKind;
  label: string;
  status: SourceStatus;
  createdAt: string;
  lastSyncAt: string | null;
  itemCount: number | null;
};

export type ExternalSourceInput = {
  title: string;
  kind: string;
  sourceId: string;
  notes?: string | null;
};

export type ExternalSourceRow = {
  id: string;
  wallet_address: string;
  kind: string;
  source_id: string;
  title: string;
  url: string | null;
  created_at: string;
  notes: string | null;
  captured_at: string;
};

const localExternalSources: ExternalSourceRow[] = [];

export function getLocalExternalEntries(walletAddress: string): ExternalSourceRow[] {
  return localExternalSources.filter((e) => e.wallet_address.toLowerCase() === walletAddress.toLowerCase());
}

export async function insertExternalSource(
  walletAddress: string,
  input: ExternalSourceInput
): Promise<ExternalSourceRow> {
  const now = new Date().toISOString();
  const row: ExternalSourceRow = {
    id: crypto.randomUUID(),
    wallet_address: walletAddress,
    kind: input.kind,
    source_id: input.sourceId,
    title: input.title,
    url: null,
    created_at: now,
    notes: input.notes ?? null,
    captured_at: now,
  };
  localExternalSources.unshift(row);
  return row;
}

// TEMPORARY MOCK LIST
export const mockSources: Source[] = [
  {
    id: 'youtube',
    kind: 'youtube_watch_history',
    label: 'YouTube watch history',
    status: 'planned',
    createdAt: new Date().toISOString(),
    lastSyncAt: null,
    itemCount: null,
  },
  {
    id: 'x-bookmarks',
    kind: 'x_bookmarks',
    label: 'X bookmarks or likes',
    status: 'planned',
    createdAt: new Date().toISOString(),
    lastSyncAt: null,
    itemCount: null,
  },
  {
    id: 'linkedin-articles',
    kind: 'linkedin_articles',
    label: 'LinkedIn articles',
    status: 'planned',
    createdAt: new Date().toISOString(),
    lastSyncAt: null,
    itemCount: null,
  },
  {
    id: 'file-import',
    kind: 'file_import',
    label: 'File imports (JSON, CSV)',
    status: 'planned',
    createdAt: new Date().toISOString(),
    lastSyncAt: null,
    itemCount: null,
  },
];


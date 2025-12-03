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


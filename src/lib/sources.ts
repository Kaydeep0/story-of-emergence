// src/lib/sources.ts
// TypeScript types for external source entries

export type ExternalSourceKind =
  | 'youtube'
  | 'article'
  | 'book'
  | 'note';

export interface ExternalEntry {
  id: string;
  kind: ExternalSourceKind;
  sourceId?: string;
  title?: string;
  snippet?: string;
  capturedAt: string;
}

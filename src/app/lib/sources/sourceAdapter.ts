import type { InternalEvent } from '../types';

export type SourceKind =
  | 'youtube'
  | 'article'
  | 'book'
  | 'podcast'
  | 'social';

export interface SourceAdapter {
  sourceKind: SourceKind;

  importCapabilities: {
    history?: boolean;
    likes?: boolean;
    saves?: boolean;
    comments?: boolean;
  };

  /**
   * Normalize raw external data into internal events.
   * Must not mutate state.
   * Must not access encryption keys directly.
   */
  normalize(raw: unknown): InternalEvent[];
}

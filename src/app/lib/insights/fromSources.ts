// src/app/lib/insights/fromSources.ts
import type { ReflectionEntry } from './types';

export type SourceEntryLite = {
  id: string;
  sourceId?: string | null;
  title?: string | null;
  kind?: string | null;
};

export interface UnifiedSourceInsights {
  themes: string[];
  topWords: { word: string; count: number }[];
  highlights: { sourceId: string; items: string[]; sourceTitle?: string | null }[];
}

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','else','for','to','of','in','on','at','by','with','about','into','over','after','before','between','so','than','too','very','can','just','from','up','out','as','is','are','was','were','be','been','being','that','this','those','these','it','its','i','me','my','you','your','we','our','they','them','their'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function computeSourceWordFreq(reflections: ReflectionEntry[], limit = 10) {
  const freq = new Map<string, number>();
  reflections.forEach((r) => {
    const tokens = tokenize(typeof r.plaintext === 'string' ? r.plaintext : String(r.plaintext ?? ''));
    tokens.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  });
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

export function computeSourceThemes(reflections: ReflectionEntry[], themeCount = 5): string[] {
  const top = computeSourceWordFreq(reflections, themeCount);
  return top.map((t) => t.word);
}

export function computeSourceHighlights(
  reflections: ReflectionEntry[]
): { sourceId: string; items: string[] }[] {
  const grouped = new Map<string, string[]>();
  reflections.forEach((r) => {
    if (!r.sourceId) return;
    const firstLine =
      typeof r.plaintext === 'string' ? r.plaintext.split('\n')[0] : String(r.plaintext ?? '');
    const items = grouped.get(r.sourceId) ?? [];
    if (firstLine.trim().length > 0) {
      items.push(firstLine);
    }
    grouped.set(r.sourceId, items);
  });
  return Array.from(grouped.entries()).map(([sourceId, items]) => ({
    sourceId,
    items: items.slice(0, 3),
  }));
}

export function computeUnifiedSourceInsights(
  sources: SourceEntryLite[],
  reflections: ReflectionEntry[]
): UnifiedSourceInsights {
  const linkedReflections = reflections.filter((r) => !!r.sourceId);
  const topWords = computeSourceWordFreq(linkedReflections, 10);
  const themes = computeSourceThemes(linkedReflections, 5);
  const rawHighlights = computeSourceHighlights(linkedReflections);

  const titleById = new Map<string, string | null>();
  sources.forEach((s) => {
    if (s.sourceId) titleById.set(s.sourceId, s.title ?? null);
  });

  const highlights = rawHighlights.map((h) => ({
    ...h,
    sourceTitle: titleById.get(h.sourceId) ?? null,
  }));

  return { themes, topWords, highlights };
}

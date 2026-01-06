// src/lib/graph/buildReflectionGraph.ts
// Automatic reflection linking using lexical similarity and time proximity
// Layer 1: Signal layer - computable metrics only

export type Reflection = { id: string; createdAt: string; text: string };
export type Edge = { from: string; to: string; weight: number; reasons: string[] };

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  
  for (const [k, av] of a) {
    na += av * av;
    const bv = b.get(k);
    if (bv) dot += av * bv;
  }
  
  for (const [, bv] of b) {
    nb += bv * bv;
  }
  
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function timeProximityDays(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  const days = Math.abs(a - b) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - Math.min(days, 30) / 30);
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3);
}

function tfidfVectors(refs: Reflection[]): Map<string, number>[] {
  const docs = refs.map(r => tokenize(r.text));
  const df = new Map<string, number>();
  
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const t of seen) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  
  const N = docs.length;
  return docs.map(doc => {
    const tf = new Map<string, number>();
    for (const t of doc) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    
    const v = new Map<string, number>();
    for (const [t, c] of tf) {
      const idf = Math.log((N + 1) / ((df.get(t) ?? 0) + 1));
      v.set(t, c * idf);
    }
    
    return v;
  });
}

export function buildReflectionGraph(refs: Reflection[], topK = 6): Edge[] {
  if (refs.length < 2) {
    return [];
  }
  
  const vecs = tfidfVectors(refs);
  const edges: Edge[] = [];

  for (let i = 0; i < refs.length; i++) {
    const scores: { j: number; w: number; reasons: string[] }[] = [];

    for (let j = 0; j < refs.length; j++) {
      if (i === j) continue;
      
      const lexical = cosine(vecs[i], vecs[j]);
      const time = timeProximityDays(refs[i].createdAt, refs[j].createdAt);

      const w = 0.70 * lexical + 0.30 * time;
      if (w <= 0.12) continue;

      const reasons: string[] = [];
      if (lexical >= 0.18) reasons.push('lexical');
      if (time >= 0.70) reasons.push('time');

      scores.push({ j, w, reasons });
    }

    scores.sort((a, b) => b.w - a.w);
    for (const s of scores.slice(0, topK)) {
      edges.push({ from: refs[i].id, to: refs[s.j].id, weight: s.w, reasons: s.reasons });
    }
  }

  return edges;
}

/**
 * Get related reflections for a specific reflection ID
 */
export function getRelatedReflections(
  reflectionId: string,
  edges: Edge[],
  reflections: Reflection[] | Map<string, Reflection>
): Array<{ reflection: Reflection; edge: Edge }> {
  const reflectionMap = reflections instanceof Map
    ? reflections
    : new Map(reflections.map(r => [r.id, r]));
  
  const related = edges
    .filter(e => e.from === reflectionId)
    .map(edge => {
      const reflection = reflectionMap.get(edge.to);
      return reflection ? { reflection, edge } : null;
    })
    .filter((item): item is { reflection: Reflection; edge: Edge } => item !== null);
  
  related.sort((a, b) => b.edge.weight - a.edge.weight);
  
  return related;
}


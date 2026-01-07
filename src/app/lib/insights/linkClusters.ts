// src/app/lib/insights/linkClusters.ts
// Pure function to compute link clusters from decrypted reflections
// Uses token-overlap (Jaccard similarity) for fast client-side clustering
// Runs entirely client-side - no network calls, no side effects
//
// Observer exclusion: This file uses semantic tokenization and similarity clustering,
// which is explicitly excluded from Observer v0/v1 scope. Observer focuses on
// structural patterns (distribution, timing, evidence surfacing) and does not
// perform semantic analysis, topic modeling, or content-based clustering.
// Link clusters are computed separately and remain outside Observer's contract.

import type { ReflectionEntry, InsightEvidence, LinkClusterCard, LinkClusterData } from './types';
import { validateInsight } from './validateInsight';

/**
 * Configuration for cluster detection
 */
const CLUSTER_CONFIG = {
  // Minimum Jaccard similarity (0-1) to link two entries
  minSimilarity: 0.25,
  // Minimum cluster size to generate an insight
  minClusterSize: 2,
  // Maximum clusters to return
  maxClusters: 5,
  // Maximum entries per cluster evidence
  maxEvidencePerCluster: 6,
  // Stopwords to ignore in tokenization
  stopwords: new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
    'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that',
    'these', 'those', 'am', 'so', 'just', 'very', 'really', 'also', 'only',
    'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'own', 'same', 'than', 'too', 'as', 'if', 'because', 'until', 'while',
    'got', 'get', 'getting', 'like', 'even', 'going', 'went', 'today',
    'yesterday', 'tomorrow', 'now', 'still', 'much', 'many', 'back',
  ]),
  // Minimum token length to keep
  minTokenLength: 3,
};

/**
 * Internal representation of a cluster
 */
type Cluster = {
  entries: ReflectionEntry[];
  tokenSet: Set<string>;
  topTokens: string[];
};

/**
 * Tokenize text into normalized words
 * Removes stopwords, punctuation, and short tokens
 */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  
  // Normalize: lowercase, remove punctuation, split on whitespace
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/);
  
  for (const word of words) {
    if (
      word.length >= CLUSTER_CONFIG.minTokenLength &&
      !CLUSTER_CONFIG.stopwords.has(word)
    ) {
      tokens.add(word);
    }
  }
  
  return tokens;
}

/**
 * Calculate Jaccard similarity between two token sets
 * Returns value between 0 (no overlap) and 1 (identical)
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Find most frequent tokens across entries in a cluster
 */
function findTopTokens(entries: ReflectionEntry[], maxTokens = 5): string[] {
  const tokenCounts = new Map<string, number>();
  
  for (const entry of entries) {
    const tokens = tokenize(entry.plaintext);
    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }
  
  // Sort by frequency, take top N
  return Array.from(tokenCounts.entries())
    .filter(([, count]) => count >= 2) // Token appears in at least 2 entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTokens)
    .map(([token]) => token);
}

/**
 * Generate a cluster title from top tokens
 */
function generateClusterTitle(topTokens: string[]): string {
  if (topTokens.length === 0) return 'Related reflections';
  
  // Capitalize first token for title
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  
  if (topTokens.length === 1) {
    return `Cluster about ${capitalize(topTokens[0])}`;
  }
  
  if (topTokens.length === 2) {
    return `Cluster about ${capitalize(topTokens[0])} and ${topTokens[1]}`;
  }
  
  // Join first few tokens
  const mainTopics = topTokens.slice(0, 3).map(capitalize).join(', ');
  return `Cluster: ${mainTopics}`;
}

/**
 * Generate a one-minute summary from cluster entries
 * Extracts key sentences/phrases from the most representative entries
 */
function generateClusterSummary(entries: ReflectionEntry[], topTokens: string[]): string {
  if (entries.length === 0) return '';
  
  // Get first sentence or chunk from each entry (up to 3)
  const snippets: string[] = [];
  const maxEntries = Math.min(3, entries.length);
  
  for (let i = 0; i < maxEntries; i++) {
    const text = entries[i].plaintext.trim();
    // Extract first sentence or first 100 chars
    const firstSentence = text.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 10) {
      const snippet = firstSentence.length > 80 
        ? firstSentence.slice(0, 80) + '…'
        : firstSentence;
      snippets.push(snippet);
    }
  }
  
  if (snippets.length === 0) {
    // Fallback: describe the cluster by size and topics
    const topicsStr = topTokens.slice(0, 3).join(', ') || 'related themes';
    return `${entries.length} reflections connected by ${topicsStr}.`;
  }
  
  // Build summary with entry count context
  const entryWord = entries.length === 1 ? 'reflection' : 'reflections';
  const topicsPhrase = topTokens.length > 0 
    ? ` around ${topTokens.slice(0, 2).join(' and ')}`
    : '';
  
  return `${entries.length} ${entryWord}${topicsPhrase}. Key themes: "${snippets[0]}"${
    snippets.length > 1 ? ` and "${snippets[1]}"` : ''
  }.`;
}

/**
 * Create a short preview of entry content
 */
function createPreview(plaintext: string, maxLength = 60): string {
  const cleaned = plaintext.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength).trim() + '…';
}

/**
 * Generate unique ID for a cluster insight
 */
function generateClusterId(entries: ReflectionEntry[]): string {
  // Use first entry ID and timestamp for uniqueness
  const firstId = entries[0]?.id?.slice(0, 8) ?? 'unknown';
  return `link_cluster-${firstId}-${Date.now()}`;
}

/**
 * Simple greedy clustering algorithm using token overlap
 * Performance: O(n²) but optimized for <100 entries
 */
function buildClusters(entries: ReflectionEntry[]): Cluster[] {
  if (entries.length === 0) return [];
  
  // Pre-compute token sets for all entries
  const entryTokens = entries.map((entry) => ({
    entry,
    tokens: tokenize(entry.plaintext),
  }));
  
  // Filter out entries with too few tokens
  const validEntries = entryTokens.filter((et) => et.tokens.size >= 3);
  
  if (validEntries.length < 2) return [];
  
  // Build similarity graph (adjacency list)
  const similar = new Map<number, number[]>();
  
  for (let i = 0; i < validEntries.length; i++) {
    similar.set(i, []);
    for (let j = i + 1; j < validEntries.length; j++) {
      const sim = jaccardSimilarity(validEntries[i].tokens, validEntries[j].tokens);
      if (sim >= CLUSTER_CONFIG.minSimilarity) {
        similar.get(i)!.push(j);
        if (!similar.has(j)) similar.set(j, []);
        similar.get(j)!.push(i);
      }
    }
  }
  
  // Greedy clustering: start with highest-degree nodes
  const visited = new Set<number>();
  const clusters: Cluster[] = [];
  
  // Sort indices by number of connections (descending)
  const sortedIndices = Array.from(similar.keys())
    .sort((a, b) => (similar.get(b)?.length ?? 0) - (similar.get(a)?.length ?? 0));
  
  for (const startIdx of sortedIndices) {
    if (visited.has(startIdx)) continue;
    
    // BFS to find connected component
    const clusterIndices = new Set<number>();
    const queue = [startIdx];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      
      visited.add(current);
      clusterIndices.add(current);
      
      for (const neighbor of similar.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }
    
    // Only keep clusters with minimum size
    if (clusterIndices.size >= CLUSTER_CONFIG.minClusterSize) {
      const clusterEntries = Array.from(clusterIndices).map(
        (idx) => validEntries[idx].entry
      );
      
      // Merge token sets
      const tokenSet = new Set<string>();
      for (const idx of clusterIndices) {
        for (const token of validEntries[idx].tokens) {
          tokenSet.add(token);
        }
      }
      
      const topTokens = findTopTokens(clusterEntries);
      
      clusters.push({
        entries: clusterEntries,
        tokenSet,
        topTokens,
      });
    }
  }
  
  // Sort clusters by size (largest first) and limit
  clusters.sort((a, b) => b.entries.length - a.entries.length);
  return clusters.slice(0, CLUSTER_CONFIG.maxClusters);
}

/**
 * Compute link cluster insights from decrypted entries
 *
 * This is a PURE FUNCTION - no side effects, no network calls.
 * Designed to run in <100ms for 100 reflections.
 *
 * Algorithm:
 * 1. Tokenize each entry (remove stopwords, normalize)
 * 2. Compute pairwise Jaccard similarity
 * 3. Build clusters using greedy graph traversal
 * 4. Generate title and summary for each cluster
 * 5. Return insight cards with evidence
 *
 * @param entries - Array of decrypted reflection entries
 * @returns Array of LinkClusterCards
 */
export function computeLinkClusters(entries: ReflectionEntry[]): LinkClusterCard[] {
  // Filter out deleted entries
  const activeEntries = entries.filter((e) => !e.deletedAt);
  
  if (activeEntries.length < CLUSTER_CONFIG.minClusterSize) {
    return [];
  }
  
  // Build clusters
  const clusters = buildClusters(activeEntries);
  
  if (clusters.length === 0) {
    return [];
  }
  
  const computedAt = new Date().toISOString();
  const cards: LinkClusterCard[] = [];
  
  for (const cluster of clusters) {
    // Sort entries by date (newest first) for evidence
    const sortedEntries = [...cluster.entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // Build evidence array
    const evidence: InsightEvidence[] = sortedEntries
      .slice(0, CLUSTER_CONFIG.maxEvidencePerCluster)
      .map((entry) => ({
        entryId: entry.id,
        timestamp: entry.createdAt,
        preview: createPreview(entry.plaintext),
      }));
    
    // Calculate average similarity within cluster (for info)
    // We approximate this as 1 - (unique tokens / total tokens)
    const avgSimilarity = Math.round(
      (1 - cluster.tokenSet.size / (cluster.entries.length * 20)) * 100
    ) / 100;
    
    const title = generateClusterTitle(cluster.topTokens);
    const explanation = generateClusterSummary(cluster.entries, cluster.topTokens);
    
    const card: LinkClusterCard = {
      id: generateClusterId(cluster.entries),
      kind: 'link_cluster',
      title,
      explanation,
      evidence,
      computedAt,
      data: {
        clusterSize: cluster.entries.length,
        topTokens: cluster.topTokens,
        avgSimilarity: Math.max(0, Math.min(1, avgSimilarity)),
      },
    };
    
    // Insight Contract Gatekeeper: Only render contract-compliant insights
    // Non-compliant insights fail silently (no warnings, no placeholders)
    if (validateInsight(card)) {
      cards.push(card);
    }
  }
  
  return cards;
}


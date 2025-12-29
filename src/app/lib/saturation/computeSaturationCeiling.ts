/**
 * Emergence Saturation Ceiling
 * 
 * Ensures that even with continuous genuine novelty, the system enforces
 * a hard ceiling on concurrent meaning, preventing runaway emergence,
 * over-interpretation, or conceptual inflation.
 * 
 * Core rule: Depth never turns into sprawl.
 * 
 * Requirements:
 * - Maximum concurrent meaning cap
 * - Priority rules: stronger persistence and higher novelty outrank recency
 * - Weak meaning collapses first
 * - No user control: no pinning, locking, or prioritization from UI
 * - Deterministic resolution: same reflections → same saturation outcome
 * - Silence preservation: if saturation collapses all meaning, silence is valid
 * - Firewall intact: UI cannot influence saturation, observer trace excluded
 */

export type MeaningNode = {
  id: string;
  type: 'narrative' | 'continuation' | 'cluster' | 'position' | 'drift';
  strength: number; // 0-1, decay-adjusted meaning strength
  novelty: number; // 0-1, novelty score from reflection novelty detection
  persistence: number; // 0-1, how long this meaning has persisted
  createdAt: string; // ISO timestamp
  priority: number; // Computed priority score
};

export type SaturationState = {
  activeNodes: MeaningNode[];
  saturated: boolean; // true when cap is reached
  displacedNodes: string[]; // IDs of nodes that were displaced
};

export type SaturationSignals = {
  candidateNodes: MeaningNode[];
  maxConcurrentMeaning: number; // Hard ceiling (default 8)
  currentTime: string; // ISO timestamp
};

/**
 * Compute priority score for a meaning node
 * 
 * Priority rules:
 * - Stronger persistence outranks recency
 * - Higher novelty outranks recency
 * - Weak meaning collapses first
 * 
 * Priority formula:
 * priority = (strength * 0.4) + (novelty * 0.3) + (persistence * 0.3)
 * 
 * @param node - Meaning node to score
 * @param currentTime - Current time for persistence calculation
 * @returns Priority score (0-1)
 */
function computePriority(node: MeaningNode, currentTime: string): number {
  const createdAtTime = new Date(node.createdAt).getTime();
  const currentTimeMs = new Date(currentTime).getTime();
  
  // Persistence: how long this meaning has persisted (normalized to 0-1)
  // Longer persistence = higher priority
  const ageMs = currentTimeMs - createdAtTime;
  const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const persistence = Math.min(1, ageMs / maxAgeMs);
  
  // Priority combines strength, novelty, and persistence
  // Stronger persistence and higher novelty outrank recency
  const priority = (
    node.strength * 0.4 +
    node.novelty * 0.3 +
    persistence * 0.3
  );
  
  return Math.max(0, Math.min(1, priority));
}

/**
 * Compute saturation ceiling and displacement
 * 
 * When cap is reached, new emergence must displace older or weaker meaning.
 * Priority rules determine which nodes are displaced.
 * 
 * Deterministic: same candidate nodes → same saturation outcome
 * 
 * @param signals - Saturation computation signals
 * @returns SaturationState
 */
export function computeSaturationCeiling(signals: SaturationSignals): SaturationState {
  const { candidateNodes, maxConcurrentMeaning = 8, currentTime } = signals;

  if (candidateNodes.length === 0) {
    // No meaning nodes = no saturation, silence is valid
    return {
      activeNodes: [],
      saturated: false,
      displacedNodes: [],
    };
  }

  // Compute priority for each node
  const nodesWithPriority: MeaningNode[] = candidateNodes.map(node => ({
    ...node,
    priority: computePriority(node, currentTime),
  }));

  // Sort by priority (highest first)
  // Stronger persistence and higher novelty outrank recency
  const sortedNodes = [...nodesWithPriority].sort((a, b) => b.priority - a.priority);

  // Check if saturation cap is reached
  const saturated = sortedNodes.length > maxConcurrentMeaning;

  if (!saturated) {
    // Under cap - all nodes are active
    return {
      activeNodes: sortedNodes,
      saturated: false,
      displacedNodes: [],
    };
  }

  // Over cap - displace weaker/older nodes
  // Keep top N nodes by priority
  const activeNodes = sortedNodes.slice(0, maxConcurrentMeaning);
  const displacedNodes = sortedNodes.slice(maxConcurrentMeaning).map(n => n.id);

  return {
    activeNodes,
    saturated: true,
    displacedNodes,
  };
}

/**
 * Check if a meaning node should be suppressed due to saturation
 * 
 * @param nodeId - ID of the meaning node
 * @param saturationState - Current saturation state
 * @returns true if node should be suppressed
 */
export function shouldSuppressDueToSaturation(
  nodeId: string,
  saturationState: SaturationState
): boolean {
  // Check if node is in displaced list
  if (saturationState.displacedNodes.includes(nodeId)) {
    return true;
  }

  // Check if node is in active list
  const isActive = saturationState.activeNodes.some(n => n.id === nodeId);
  
  // If saturated and not active, suppress
  if (saturationState.saturated && !isActive) {
    return true;
  }

  return false;
}

/**
 * Get active meaning nodes after saturation filtering
 * 
 * @param candidateNodes - All candidate meaning nodes
 * @param saturationState - Current saturation state
 * @returns Filtered list of active nodes
 */
export function getActiveMeaningNodes(
  candidateNodes: MeaningNode[],
  saturationState: SaturationState
): MeaningNode[] {
  return candidateNodes.filter(node => 
    !shouldSuppressDueToSaturation(node.id, saturationState)
  );
}


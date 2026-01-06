// src/lib/graph/seededLayout.ts
// Deterministic seeded layout for pin previews
// Layer 1: Signal layer - computable metrics only

/**
 * Generate a numeric seed from a string
 */
export function seedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Mulberry32 PRNG - fast seeded random number generator
 * Returns a function that generates random numbers between 0 and 1
 */
export function mulberry32(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate deterministic layout points for a set of IDs
 * Uses seeded random to ensure same IDs always get same positions
 * 
 * @param ids - Array of node IDs
 * @param seed - Seed string (e.g., clusterId + walletAddress)
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Map of nodeId -> {x, y}
 */
export function layoutPoints(
  ids: string[],
  seed: string,
  width: number,
  height: number
): Record<string, { x: number; y: number }> {
  const numericSeed = seedFromString(seed);
  const rng = mulberry32(numericSeed);
  
  const points: Record<string, { x: number; y: number }> = {};
  
  // Use a simple spiral layout for deterministic positioning
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.4;
  
  ids.forEach((id, index) => {
    // Use index + id hash for deterministic angle
    const idHash = seedFromString(id);
    const angle = (idHash % 360) * (Math.PI / 180) + (index * 0.618); // Golden angle
    const radius = (rng() * 0.5 + 0.3) * maxRadius; // Random radius between 30% and 80%
    
    points[id] = {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
  
  return points;
}

/**
 * Generate deterministic layout points for a vertical thread
 * Nodes are placed along a vertical spine with slight jitter
 * 
 * @param ids - Array of node IDs in order
 * @param seed - Seed string
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Map of nodeId -> {x, y}
 */
export function layoutThreadPoints(
  ids: string[],
  seed: string,
  width: number,
  height: number
): Record<string, { x: number; y: number }> {
  const numericSeed = seedFromString(seed);
  const rng = mulberry32(numericSeed);
  
  const points: Record<string, { x: number; y: number }> = {};
  
  const centerX = width / 2;
  const padding = height * 0.1;
  const availableHeight = height - (padding * 2);
  
  ids.forEach((id, index) => {
    const t = ids.length > 1 ? index / (ids.length - 1) : 0.5;
    const y = padding + t * availableHeight;
    
    // Add slight horizontal jitter for visual interest
    const idHash = seedFromString(id);
    const jitter = (idHash % 20 - 10) * 0.5; // ±5px jitter
    
    points[id] = {
      x: centerX + jitter,
      y,
    };
  });
  
  return points;
}


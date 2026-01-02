// src/app/lib/insights/patterns/patternId.ts
// Pattern identity and stability layer
// Phase 4.4: Stable pattern IDs across time windows

import type { InsightPatternKind } from '../patternModel';
import type { TimeWindow } from '../timeWindows';

/**
 * Generate a stable, deterministic pattern ID that persists across time windows
 * 
 * This function creates IDs that are stable for the same pattern across different
 * time windows, enabling pattern tracking, persistence detection, and emergence analysis.
 * 
 * Phase 4.4: Identity layer - ensures patterns can be tracked over time.
 * 
 * @param input - Pattern identification parameters
 * @param input.kind - The pattern kind (focus, work, health, etc.)
 * @param input.window - The time window context (used for normalization, not included in ID)
 * @param input.attributes - Key-value pairs that uniquely identify this pattern
 * @returns Deterministic pattern ID string
 * 
 * @example
 * // Same pattern across different weeks gets same ID
 * makePatternId({
 *   kind: 'work',
 *   window: week1,
 *   attributes: { topic: 'meetings', frequency: 'daily' }
 * })
 * // Returns: "work:topic=meetings,frequency=daily"
 */
export function makePatternId(input: {
  kind: InsightPatternKind;
  window: TimeWindow;
  attributes: Record<string, string | number>;
}): string {
  const { kind, attributes } = input;
  
  // Normalize attributes: sort keys for deterministic ordering
  const sortedKeys = Object.keys(attributes).sort();
  
  // Build attribute string: "key1=value1,key2=value2"
  const attributeParts = sortedKeys.map(key => {
    const value = attributes[key];
    // Normalize values: convert to string, lowercase, trim
    const normalizedValue = String(value)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `${key}=${normalizedValue}`;
  });
  
  // Combine: "kind:key1=value1,key2=value2"
  const id = `${kind}:${attributeParts.join(',')}`;
  
  return id;
}


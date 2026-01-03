/**
 * Artifact Provenance
 * 
 * Generates provenance line for artifacts.
 * 
 * Museum placard style: identity, not explanation.
 * Same text across Weekly, Yearly, Lifetime.
 */

import type { ShareArtifact } from './types';

/**
 * Format date range for provenance line
 */
function formatDateRange(
  firstDate: string | null,
  lastDate: string | null
): string {
  if (!firstDate && !lastDate) {
    return 'Date range not available';
  }
  
  if (firstDate === lastDate) {
    // Single date
    if (!firstDate) return 'Date range not available';
    try {
      const date = new Date(firstDate);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Fall through to range format
    }
  }
  
  // Date range
  const formatSingle = (iso: string | null): string => {
    if (!iso) return '';
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };
  
  const start = formatSingle(firstDate);
  const end = formatSingle(lastDate);
  
  if (start && end) {
    return `${start} to ${end}`;
  } else if (start) {
    return `from ${start}`;
  } else if (end) {
    return `until ${end}`;
  }
  
  return 'Date range not available';
}

/**
 * Generate provenance line for artifact
 * 
 * Format: "Private reflection • Generated from encrypted data • {date range}"
 */
export function generateProvenanceLine(artifact: ShareArtifact): string {
  if (!artifact.inventory) {
    return 'Private reflection • Generated from encrypted data';
  }
  
  const dateRange = formatDateRange(
    artifact.inventory.firstReflectionDate,
    artifact.inventory.lastReflectionDate
  );
  
  return `Private reflection • Generated from encrypted data • ${dateRange}`;
}


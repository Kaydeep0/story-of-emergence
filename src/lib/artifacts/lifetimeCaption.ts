/**
 * Lifetime Artifact Caption Generator
 * 
 * Canonical source for Lifetime share caption text.
 * 
 * Rules:
 * - No UI language
 * - No emojis
 * - No marketing tone
 * - Neutral, reflective, declarative
 * - Stable and deterministic
 */

import type { ShareArtifact } from './types';

/**
 * Format date from ISO string to YYYY-MM-DD
 */
function formatDate(iso: string | null): string {
  if (!iso) return 'Not available';
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Not available';
    return date.toISOString().split('T')[0];
  } catch {
    return 'Not available';
  }
}

/**
 * Extract category keywords from signal labels
 * Returns unique, lowercase keywords (max 5)
 */
function extractPatterns(signals: ShareArtifact['signals']): string[] {
  const patterns = new Set<string>();
  
  for (const signal of signals) {
    // Extract simple keywords from labels (lowercase, alphanumeric)
    const words = signal.label
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && w.length < 15);
    
    for (const word of words) {
      if (patterns.size >= 5) break;
      patterns.add(word);
    }
    
    if (patterns.size >= 5) break;
  }
  
  return Array.from(patterns).slice(0, 5);
}

/**
 * Get scope label for caption header
 */
function getScopeLabel(kind: ShareArtifact['kind']): string {
  switch (kind) {
    case 'lifetime':
      return 'Lifetime Reflection';
    case 'weekly':
      return 'Weekly Reflection';
    case 'yearly':
      return 'Yearly Reflection';
    default:
      return 'Reflection';
  }
}

/**
 * Generate canonical caption from share artifact (Lifetime, Weekly, or Yearly)
 * 
 * This is the single source of truth for all artifact captions.
 */
export function generateLifetimeCaption(artifact: ShareArtifact): string {
  const lines: string[] = [];
  
  // Header
  lines.push(`Story of Emergence — ${getScopeLabel(artifact.kind)}`);
  lines.push('');
  
  // Date range
  if (artifact.inventory.firstReflectionDate || artifact.inventory.lastReflectionDate) {
    lines.push(`First reflection: ${formatDate(artifact.inventory.firstReflectionDate)}`);
    lines.push(`Most recent reflection: ${formatDate(artifact.inventory.lastReflectionDate)}`);
    lines.push('');
  }
  
  // Observed patterns
  if (artifact.signals.length > 0) {
    const patterns = extractPatterns(artifact.signals);
    if (patterns.length > 0) {
      lines.push('Observed patterns:');
      for (const pattern of patterns) {
        lines.push(`• ${pattern}`);
      }
      lines.push('');
    }
  }
  
  // Footer
  lines.push('This artifact was generated from encrypted personal reflections.');
  lines.push('Shared intentionally.');
  
  return lines.join('\n');
}


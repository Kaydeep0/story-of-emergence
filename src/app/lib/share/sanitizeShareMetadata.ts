/**
 * sanitizeShareMetadata - Remove sensitive metadata from share content
 * 
 * Ensures exported image and caption do NOT contain:
 * - wallet address
 * - internal IDs
 * - source IDs
 * - timestamps more granular than week
 */

/**
 * Helper function to get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Sanitize text content to remove sensitive metadata
 * @param input - Text content to sanitize
 * @returns Sanitized text with sensitive data removed
 */
export function sanitizeShareMetadata(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove wallet addresses (0x followed by 40 hex characters)
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{40}/g, '[wallet]');

  // Remove internal IDs (UUIDs, entry IDs, etc.)
  // Pattern: alphanumeric IDs that look like database IDs
  sanitized = sanitized.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[id]');
  
  // Remove entry IDs (common patterns)
  sanitized = sanitized.replace(/entry[_-]?id[:\s=]+[a-zA-Z0-9_-]+/gi, '[entry-id]');
  sanitized = sanitized.replace(/reflection[_-]?id[:\s=]+[a-zA-Z0-9_-]+/gi, '[reflection-id]');

  // Remove timestamps more granular than week
  // Remove ISO timestamps (YYYY-MM-DDTHH:mm:ss) - keep only year-week
  sanitized = sanitized.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?/g, (match) => {
    // Extract year and week (YYYY-WW format)
    const date = new Date(match);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      return `${year}-W${week}`;
    }
    // Fallback: just year if parsing fails
    return match.substring(0, 4);
  });

  // Remove date-time patterns (MM/DD/YYYY HH:mm) - keep only year-week
  sanitized = sanitized.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/g, (match) => {
    const dateMatch = match.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const [, month, day, year] = dateMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        const week = getWeekNumber(date);
        return `${year}-W${week}`;
      }
    }
    const yearMatch = match.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : match;
  });

  // Remove Unix timestamps (10 or 13 digit numbers that could be timestamps)
  // Only remove if they're in a context that suggests they're timestamps
  sanitized = sanitized.replace(/timestamp[:\s=]+(\d{10,13})/gi, (match, timestamp) => {
    const date = new Date(parseInt(timestamp) * (timestamp.length === 10 ? 1000 : 1));
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const week = getWeekNumber(date);
      return `timestamp: ${year}-W${week}`;
    }
    return match;
  });

  // Remove source IDs and internal references
  sanitized = sanitized.replace(/source[_-]?id[:\s=]+[a-zA-Z0-9_-]+/gi, '[source-id]');
  sanitized = sanitized.replace(/capsule[_-]?id[:\s=]+[a-zA-Z0-9_-]+/gi, '[capsule-id]');

  return sanitized.trim();
}

/**
 * Sanitize caption text specifically
 * Ensures no sensitive data leaks into share captions
 */
export function sanitizeCaption(caption: string): string {
  return sanitizeShareMetadata(caption);
}

/**
 * Sanitize filename to remove sensitive data
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'story-of-emergence-yearly-wrap.png';
  }

  let sanitized = filename;

  // Remove wallet addresses
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{40}/g, '');

  // Remove internal IDs
  sanitized = sanitized.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '');

  // Ensure it ends with .png
  if (!sanitized.endsWith('.png')) {
    sanitized = sanitized.replace(/\.[^.]+$/, '') + '.png';
  }

  return sanitized || 'story-of-emergence-yearly-wrap.png';
}


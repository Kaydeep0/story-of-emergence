/**
 * sanitizeShareMetadata - Remove sensitive metadata from share content
 * 
 * Ensures exported image and caption do NOT contain:
 * - wallet address
 * - internal IDs
 * - timestamps more granular than year
 */

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

  // Remove timestamps more granular than year
  // Remove ISO timestamps (YYYY-MM-DDTHH:mm:ss)
  sanitized = sanitized.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?/g, (match) => {
    // Extract just the year
    const year = match.substring(0, 4);
    return year;
  });

  // Remove date-time patterns (MM/DD/YYYY HH:mm)
  sanitized = sanitized.replace(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/g, (match) => {
    const yearMatch = match.match(/\d{4}/);
    return yearMatch ? yearMatch[0] : match;
  });

  // Remove Unix timestamps (10 or 13 digit numbers that could be timestamps)
  // Only remove if they're in a context that suggests they're timestamps
  sanitized = sanitized.replace(/timestamp[:\s=]+(\d{10,13})/gi, (match, timestamp) => {
    const date = new Date(parseInt(timestamp) * (timestamp.length === 10 ? 1000 : 1));
    return `timestamp: ${date.getFullYear()}`;
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


/**
 * Insight Guardrails
 * 
 * Soft runtime checks for banned language in insight text.
 * Logs warnings but does not block rendering.
 * 
 * This is a soft fence, not enforcement.
 */

const BANNED_WORDS = [
  'improved',
  'worse',
  'goal',
  'target',
  'performance',
  'productive',
];

/**
 * Assert that insight text does not contain banned language.
 * Logs a dev warning if banned words are detected.
 * Does not block rendering.
 */
export function assertInsightTone(text: string, context?: string): void {
  if (typeof window === 'undefined') {
    // Server-side: skip check
    return;
  }

  const lowerText = text.toLowerCase();
  const foundWords: string[] = [];

  for (const word of BANNED_WORDS) {
    if (lowerText.includes(word)) {
      foundWords.push(word);
    }
  }

  if (foundWords.length > 0) {
    const contextStr = context ? ` [${context}]` : '';
    console.warn(
      `[Insight Guardrails] Banned language detected${contextStr}:`,
      foundWords.join(', '),
      '\nText snippet:',
      text.slice(0, 100)
    );
  }
}


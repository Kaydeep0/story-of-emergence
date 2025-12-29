/**
 * Yearly Wrap template language
 * Calm tone, reflective, not celebratory
 * No superlatives, no advice, no calls to action
 */

export type YearlyWrapTemplates = {
  summary: (narrative: string, density: string, cadence: string) => string;
  dominantPattern: (density: string, cadence: string) => string;
};

/**
 * Generate summary combining narrative, density, and cadence
 * 2-3 sentences max, calm and reflective
 */
export function generateSummary(
  narrative: string,
  density: string,
  cadence: string
): string {
  // Extract key phrases from density and cadence
  const densityPhrase = density.includes('high')
    ? 'intense periods'
    : density.includes('moderate')
    ? 'regular engagement'
    : 'quiet reflection';

  const cadencePhrase = cadence.includes('bursty')
    ? 'concentrated moments'
    : cadence.includes('steady')
    ? 'consistent rhythm'
    : 'sporadic patterns';

  // Combine into 2-3 sentence summary
  return `${narrative} Your reflection showed ${densityPhrase} with ${cadencePhrase} throughout the year.`;
}

/**
 * Generate dominant pattern phrase
 * Short phrase, descriptive not prescriptive
 */
export function generateDominantPattern(density: string, cadence: string): string {
  const densityWord = density.includes('high')
    ? 'intense'
    : density.includes('moderate')
    ? 'steady'
    : 'quiet';

  const cadenceWord = cadence.includes('bursty')
    ? 'focused'
    : cadence.includes('steady')
    ? 'consistent'
    : 'sporadic';

  return `${densityWord.charAt(0).toUpperCase() + densityWord.slice(1)}, ${cadenceWord} reflection`;
}


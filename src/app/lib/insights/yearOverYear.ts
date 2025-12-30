// src/app/lib/insights/yearOverYear.ts
// Pure computation contract for Year over Year insights
// No UI, no database, no side effects

import type { ReflectionEntry } from './types';

/**
 * Year identifier
 */
export type YearIdentifier = number;

/**
 * Theme data extracted from a year's reflections
 */
export interface YearThemeData {
  themes: string[];
  dominantThemes: string[];
  languagePatterns: string[];
}

/**
 * Existing insight outputs computed per year
 * These are inputs from other insight computations
 */
export interface YearInsightOutputs {
  themes: string[];
  clusters?: string[];
  signals?: string[];
  dominantTopics?: string[];
}

/**
 * Input for year-over-year computation
 */
export interface YearOverYearInput {
  year1: YearIdentifier;
  year2: YearIdentifier;
  reflections1: ReflectionEntry[];
  reflections2: ReflectionEntry[];
  insights1: YearInsightOutputs;
  insights2: YearInsightOutputs;
}

/**
 * Theme continuity - appears in both years
 */
export interface ThemeContinuity {
  theme: string;
  presentInYear1: boolean;
  presentInYear2: boolean;
  strength: 'strong' | 'moderate' | 'weak'; // Qualitative only, no numeric score
}

/**
 * Theme disappearance - present in year1, absent in year2
 */
export interface ThemeDisappearance {
  theme: string;
  wasPresentInYear1: boolean;
  absentInYear2: boolean;
}

/**
 * Theme emergence - absent in year1, present in year2
 */
export interface ThemeEmergence {
  theme: string;
  absentInYear1: boolean;
  presentInYear2: boolean;
}

/**
 * Language shift - qualitative descriptor of how language changed
 */
export interface LanguageShift {
  descriptor: string; // e.g., "more introspective", "more concrete", "more questioning"
  evidence: string[]; // Sample phrases or patterns that illustrate the shift
}

/**
 * Notable absence - something previously present is now silent
 */
export interface NotableAbsence {
  what: string; // What was previously present
  previouslySeenIn: YearIdentifier;
  nowAbsentIn: YearIdentifier;
}

/**
 * Output of year-over-year computation
 */
export interface YearOverYearInsights {
  themeContinuities: ThemeContinuity[];
  themeDisappearances: ThemeDisappearance[];
  themeEmergences: ThemeEmergence[];
  languageShifts: LanguageShift[];
  notableAbsences: NotableAbsence[];
}

/**
 * Extract themes from insight outputs
 */
function extractThemes(insights: YearInsightOutputs): Set<string> {
  const themes = new Set<string>();
  
  if (insights.themes) {
    insights.themes.forEach(theme => themes.add(theme.toLowerCase()));
  }
  
  if (insights.dominantTopics) {
    insights.dominantTopics.forEach(topic => themes.add(topic.toLowerCase()));
  }
  
  if (insights.clusters) {
    insights.clusters.forEach(cluster => themes.add(cluster.toLowerCase()));
  }
  
  return themes;
}

/**
 * Determine theme strength qualitatively (no numeric scoring)
 */
function determineThemeStrength(
  theme: string,
  insights1: YearInsightOutputs,
  insights2: YearInsightOutputs
): 'strong' | 'moderate' | 'weak' {
  const themeLower = theme.toLowerCase();
  
  const inYear1Dominant = insights1.dominantTopics?.some(t => t.toLowerCase() === themeLower) ?? false;
  const inYear2Dominant = insights2.dominantTopics?.some(t => t.toLowerCase() === themeLower) ?? false;
  
  if (inYear1Dominant && inYear2Dominant) {
    return 'strong';
  }
  
  if (inYear1Dominant || inYear2Dominant) {
    return 'moderate';
  }
  
  return 'weak';
}

/**
 * Extract language patterns from reflections
 */
function extractLanguagePatterns(reflections: ReflectionEntry[]): string[] {
  const patterns: string[] = [];
  
  // Simple pattern extraction: look for common question words, introspective language
  const questionWords = ['why', 'how', 'what', 'when', 'where'];
  const introspectiveWords = ['feel', 'think', 'believe', 'wonder', 'consider'];
  const concreteWords = ['did', 'made', 'went', 'saw', 'happened'];
  
  for (const reflection of reflections.slice(0, 10)) { // Sample first 10
    const text = (reflection.plaintext || '').toLowerCase();
    
    const hasQuestions = questionWords.some(word => text.includes(word));
    const hasIntrospection = introspectiveWords.some(word => text.includes(word));
    const hasConcrete = concreteWords.some(word => text.includes(word));
    
    if (hasQuestions && hasIntrospection) {
      patterns.push('questioning and introspective');
    } else if (hasIntrospection) {
      patterns.push('introspective');
    } else if (hasConcrete) {
      patterns.push('concrete and action-oriented');
    }
  }
  
  return [...new Set(patterns)]; // Deduplicate
}

/**
 * Compute year-over-year insights
 * Pure function - deterministic, no side effects
 */
export function computeYearOverYearInsights(
  input: YearOverYearInput
): YearOverYearInsights {
  const { year1, year2, insights1, insights2 } = input;
  
  // Extract themes from both years
  const themes1 = extractThemes(insights1);
  const themes2 = extractThemes(insights2);
  
  // Compute continuities
  const themeContinuities: ThemeContinuity[] = [];
  for (const theme of themes1) {
    if (themes2.has(theme)) {
      themeContinuities.push({
        theme,
        presentInYear1: true,
        presentInYear2: true,
        strength: determineThemeStrength(theme, insights1, insights2),
      });
    }
  }
  
  // Compute disappearances
  const themeDisappearances: ThemeDisappearance[] = [];
  for (const theme of themes1) {
    if (!themes2.has(theme)) {
      themeDisappearances.push({
        theme,
        wasPresentInYear1: true,
        absentInYear2: true,
      });
    }
  }
  
  // Compute emergences
  const themeEmergences: ThemeEmergence[] = [];
  for (const theme of themes2) {
    if (!themes1.has(theme)) {
      themeEmergences.push({
        theme,
        absentInYear1: true,
        presentInYear2: true,
      });
    }
  }
  
  // Compute language shifts
  const languagePatterns1 = extractLanguagePatterns(input.reflections1);
  const languagePatterns2 = extractLanguagePatterns(input.reflections2);
  
  const languageShifts: LanguageShift[] = [];
  
  // Compare patterns to identify shifts
  const patterns1Set = new Set(languagePatterns1);
  const patterns2Set = new Set(languagePatterns2);
  
  // New patterns in year2
  for (const pattern of patterns2Set) {
    if (!patterns1Set.has(pattern)) {
      languageShifts.push({
        descriptor: `shifted toward ${pattern}`,
        evidence: languagePatterns2.filter(p => p === pattern).slice(0, 2),
      });
    }
  }
  
  // Patterns that faded in year2
  for (const pattern of patterns1Set) {
    if (!patterns2Set.has(pattern)) {
      languageShifts.push({
        descriptor: `moved away from ${pattern}`,
        evidence: languagePatterns1.filter(p => p === pattern).slice(0, 2),
      });
    }
  }
  
  // Compute notable absences
  // Look for themes or patterns that were prominent in year1 but completely absent in year2
  const notableAbsences: NotableAbsence[] = [];
  
  for (const theme of themes1) {
    if (!themes2.has(theme)) {
      // Check if it was dominant in year1
      const wasDominant = insights1.dominantTopics?.some(t => t.toLowerCase() === theme) ?? false;
      if (wasDominant) {
        notableAbsences.push({
          what: theme,
          previouslySeenIn: year1,
          nowAbsentIn: year2,
        });
      }
    }
  }
  
  return {
    themeContinuities,
    themeDisappearances,
    themeEmergences,
    languageShifts,
    notableAbsences,
  };
}


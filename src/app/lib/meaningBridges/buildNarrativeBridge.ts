/**
 * Narrative bridges reveal latent structure between reflections.
 * They do not prescribe meaning or direction.
 * The user retains full agency over interpretation.
 */

import { ALL_STOPWORDS, MIN_CONCEPT_SCORE } from './stopwords';

export type NarrativeBridgeReason =
  | "sequence"
  | "scale"
  | "systemic"
  | "contrast"
  | "media";

export type NarrativeBridge = {
  from: string;
  to: string;
  weight: number; // 0..1
  reasons: NarrativeBridgeReason[];
  explanation: string;
  isFallback?: boolean; // True if explanation is a generic fallback template
  quality?: number; // 0..1, 0 indicates missing required anchors
  anchorA?: string; // Phrase or keyword (2-6 words) from reflection A
  anchorB?: string; // Phrase or keyword (2-6 words) from reflection B
  signals: {
    scaleHits: string[];
    systemicHits: string[];
    mediaHits: string[];
    contrastHits: string[];
    daysApart: number;
  };
};

type ReflectionLike = {
  id: string;
  createdAt: string;
  text: string;
  sources?: { kind?: string; title?: string }[];
};

const SCALE_PATTERNS: RegExp[] = [
  /\b(crore|lakh|million|billion|trillion)\b/i,
  /\b₹\s?\d[\d,]*\b/i,
  /\b\$\s?\d[\d,]*\b/i,
  /\b\d+(\.\d+)?\s?(%|bps)\b/i,
  /\border(s)? of magnitude\b/i,
  /\bat that scale\b/i,
  /\bsystem level\b/i,
];

const SYSTEMIC_PATTERNS: RegExp[] = [
  /\b(trust|belief|coordination|legitimacy)\b/i,
  /\b(institution|policy|central bank|treasury|inflation|money supply)\b/i,
  /\b(feedback loop|second order|transmission|distort|price signals)\b/i,
  /\b(structural|architecture|layer|control)\b/i,
];

const MEDIA_PATTERNS: RegExp[] = [
  /\b(watching|watched|show|movie|film|series|episode|documentary)\b/i,
  /\b(this show|this film|this movie)\b/i,
];

const CONTRAST_PATTERNS: RegExp[] = [
  /\b(zoomed in|zoomed out|micro|macro|local|global)\b/i,
  /\b(specific|concrete)\b/i,
  /\b(abstract|systemic|structural)\b/i,
  /\b(inside the system|outside the system)\b/i,
  // Belief reversal patterns
  /\b(I believed|I thought|I used to think|I once believed)\b/i,
  /\b(I now believe|I now think|actually|but actually|however|on reflection)\b/i,
  /\b(not|cannot|does not|will not|cannot solve|does not fix)\b/i,
];

function daysBetween(aIso: string, bIso: string) {
  const a = new Date(aIso).getTime();
  const b = new Date(bIso).getTime();
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function collectHits(text: string, patterns: RegExp[]) {
  const hits: string[] = [];
  for (const r of patterns) {
    const m = text.match(r);
    if (m) hits.push(m[0]);
  }
  return Array.from(new Set(hits.map(h => h.trim()))).slice(0, 8);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/**
 * Fallback template strings that indicate generic placeholder explanations
 * These are generic placeholders, not specific interpretations
 */
const FALLBACK_TEMPLATES = [
  "this later reflection builds on the earlier one",
  "this connects to an earlier reflection",
  "this builds on what came before",
  "you viewed this from another angle",
  "you saw this differently the second time",
];

/**
 * Check if an explanation is a fallback template
 */
function isFallbackExplanation(explanation: string): boolean {
  const normalized = explanation.toLowerCase().trim().replace(/\s+/g, ' ');
  return FALLBACK_TEMPLATES.some(template => normalized === template || normalized.includes(template));
}

/**
 * Extract anchor phrase/keyword from text (2-6 words)
 * Returns a meaningful phrase that can serve as evidence anchor for bridge explanations
 */
function extractAnchor(text: string): string | null {
  // Extract sentences or meaningful phrases
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
  
  // Try to find a phrase with 2-6 words that contains meaningful content
  for (const sentence of sentences) {
    const words = sentence.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => {
        // Filter: length >= 3, contains letter, not stopword, not purely numeric
        if (w.length < 3) return false;
        if (!/[a-z]/.test(w)) return false;
        if (ALL_STOPWORDS.has(w)) return false;
        if (/^\d+$/.test(w)) return false;
        return true;
      });
    
    // Look for phrases of 2-6 words
    for (let i = 0; i <= words.length - 2; i++) {
      for (let len = 2; len <= Math.min(6, words.length - i); len++) {
        const phrase = words.slice(i, i + len).join(' ');
        // Ensure phrase has at least one meaningful word (not all stopwords)
        const meaningfulWords = phrase.split(' ').filter(w => 
          w.length >= 4 && !ALL_STOPWORDS.has(w) && /[a-z]/.test(w)
        );
        if (meaningfulWords.length > 0) {
          // Return original case phrase from sentence
          const originalWords = sentence.split(/\s+/).slice(i, i + len);
          return originalWords.join(' ').replace(/[^\w\s]/g, '').trim();
        }
      }
    }
  }
  
  // Fallback: try to extract from pattern hits or capitalized phrases
  const allPatterns = [...SCALE_PATTERNS, ...SYSTEMIC_PATTERNS, ...MEDIA_PATTERNS, ...CONTRAST_PATTERNS];
  const patternHits = collectHits(text, allPatterns);
  if (patternHits.length > 0) {
    const hit = patternHits[0];
    const words = hit.toLowerCase().split(/\s+/).filter(w => 
      w.length >= 3 && !ALL_STOPWORDS.has(w) && /[a-z]/.test(w)
    );
    if (words.length >= 2 && words.length <= 6) {
      return hit.trim();
    }
  }
  
  // Last resort: extract capitalized phrase
  const capitalized = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5}\b/g);
  if (capitalized && capitalized.length > 0) {
    const phrase = capitalized[0];
    const words = phrase.split(/\s+/);
    if (words.length >= 2 && words.length <= 6) {
      return phrase;
    }
  }
  
  return null;
}

/**
 * Extract concrete tokens from text for grounding explanations
 * Returns significant words/phrases that can be used in explanations
 * Enforces strict filtering: lowercase, length >= 4, contains letter, not stopword, not purely numeric
 */
function extractConcreteTokens(text: string, maxTokens: number = 3): string[] {
  // Extract capitalized words (likely entities, names, proper nouns)
  const capitalized = text.match(/\b[A-Z][a-z]+\b/g) || [];
  
  // Extract significant words with strict filtering
  const words = text.toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^\w]/g, ''))
    .filter(w => {
      // Enforce: lowercase (already done), length >= 4, contains letter, not stopword, not purely numeric
      if (w.length < 4) return false;
      if (!/[a-z]/.test(w)) return false; // Must include at least one letter
      if (ALL_STOPWORDS.has(w)) return false; // Not in stopwords
      if (/^\d+$/.test(w)) return false; // Not purely numeric
      return true;
    });
  
  // Extract phrases from pattern hits (scale, systemic, media, contrast)
  const allPatterns = [...SCALE_PATTERNS, ...SYSTEMIC_PATTERNS, ...MEDIA_PATTERNS, ...CONTRAST_PATTERNS];
  const patternHits = collectHits(text, allPatterns);
  
  // Combine and deduplicate, prioritize capitalized and pattern hits
  const tokens = new Set<string>();
  
  // Add capitalized words first (most concrete) - but lowercase them and filter
  for (const cap of capitalized.slice(0, maxTokens * 2)) {
    const lowercased = cap.toLowerCase();
    if (lowercased.length >= 4 && 
        /[a-z]/.test(lowercased) && 
        !ALL_STOPWORDS.has(lowercased) && 
        !/^\d+$/.test(lowercased)) {
      tokens.add(lowercased);
      if (tokens.size >= maxTokens) break;
    }
  }
  
  // Add pattern hits (thematic keywords) - filter strictly
  for (const hit of patternHits.slice(0, maxTokens * 2)) {
    const normalizedHit = hit.toLowerCase().trim().replace(/[^\w]/g, '');
    if (normalizedHit.length >= 4 && 
        /[a-z]/.test(normalizedHit) && 
        !ALL_STOPWORDS.has(normalizedHit) && 
        !/^\d+$/.test(normalizedHit)) {
      tokens.add(normalizedHit);
      if (tokens.size >= maxTokens) break;
    }
  }
  
  // Add significant words if we need more
  for (const word of words) {
    if (tokens.size >= maxTokens) break;
    tokens.add(word);
  }
  
  return Array.from(tokens).slice(0, maxTokens);
}

/**
 * Simple hash function for explanation text (for deduplication)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Check if bridge has minimum evidence requirement
 * Requires at least ONE of:
 * - Shared keyword (overlapping significant words)
 * - Shared entity (overlapping capitalized words/entities)
 * - Shared theme tag (overlapping pattern hits: scale, systemic, media, contrast)
 * - Temporal sequence signal (sequence weight > 0, meaning within time window)
 */
function hasMinimumEvidence(
  aText: string,
  bText: string,
  aScale: string[],
  bScale: string[],
  aSys: string[],
  bSys: string[],
  aMedia: string[],
  bMedia: string[],
  aContrast: string[],
  bContrast: string[],
  sequenceWeight: number
): { hasEvidence: boolean; evidenceType?: string } {
  // 1. Check for shared keywords (overlapping significant words, length > 3)
  const aWords = new Set(
    aText.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 3)
  );
  const bWords = new Set(
    bText.toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 3)
  );
  const sharedKeywords = Array.from(aWords).filter(w => bWords.has(w));
  if (sharedKeywords.length > 0) {
    return { hasEvidence: true, evidenceType: 'shared keyword' };
  }
  
  // 2. Check for shared entities (overlapping capitalized words, length > 2)
  const aEntities = new Set(
    aText.split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 2 && /^[A-Z]/.test(w))
      .map(w => w.toLowerCase())
  );
  const bEntities = new Set(
    bText.split(/\s+/)
      .map(w => w.replace(/[^\w]/g, ''))
      .filter(w => w.length > 2 && /^[A-Z]/.test(w))
      .map(w => w.toLowerCase())
  );
  const sharedEntities = Array.from(aEntities).filter(e => bEntities.has(e));
  if (sharedEntities.length > 0) {
    return { hasEvidence: true, evidenceType: 'shared entity' };
  }
  
  // 3. Check for shared theme tags (overlapping pattern hits)
  const aThemes = new Set([...aScale, ...aSys, ...aMedia, ...aContrast].map(t => t.toLowerCase()));
  const bThemes = new Set([...bScale, ...bSys, ...bMedia, ...bContrast].map(t => t.toLowerCase()));
  const sharedThemes = Array.from(aThemes).filter(t => bThemes.has(t));
  if (sharedThemes.length > 0) {
    return { hasEvidence: true, evidenceType: 'shared theme tag' };
  }
  
  // 4. Check for temporal sequence signal (sequence weight > 0 means within time window)
  if (sequenceWeight > 0) {
    return { hasEvidence: true, evidenceType: 'temporal sequence' };
  }
  
  return { hasEvidence: false };
}

/**
 * Generate deterministic hash of bridge set for verification
 * Hash is based on sorted list of (fromId, toId, primaryType) tuples
 * Same bridges → same hash, regardless of generation order
 */
function hashBridgeSet(bridges: NarrativeBridge[]): string {
  // Sort bridges deterministically by (from, to, primaryType)
  const sorted = [...bridges].sort((a, b) => {
    // First compare fromId
    if (a.from !== b.from) {
      return a.from < b.from ? -1 : 1;
    }
    // Then compare toId
    if (a.to !== b.to) {
      return a.to < b.to ? -1 : 1;
    }
    // Finally compare primary type
    const typeA = getPrimaryBridgeType(a.reasons);
    const typeB = getPrimaryBridgeType(b.reasons);
    if (typeA !== typeB) {
      return typeA < typeB ? -1 : 1;
    }
    return 0;
  });
  
  // Create deterministic string representation
  const tuples = sorted.map(b => {
    const type = getPrimaryBridgeType(b.reasons);
    return `${b.from}:${b.to}:${type}`;
  });
  
  // Hash the sorted tuple list
  return hashString(tuples.join('|'));
}

/**
 * Insight Trust Boundary: Remove prescriptive language and deterministic future claims
 * Ensures insights observe patterns, tensions, forks, and trajectories - not directives
 */
function sanitizeExplanationLanguage(explanation: string): string {
  let sanitized = explanation;
  
  // Remove prescriptive language patterns
  const prescriptivePatterns = [
    /\byou should\b/gi,
    /\byou must\b/gi,
    /\byou need to\b/gi,
    /\byou ought to\b/gi,
    /\byou have to\b/gi,
    /\byou will\b/gi, // Deterministic future claim
    /\byou'll\b/gi,
    /\bthis will\b/gi,
    /\bthis must\b/gi,
    /\bthis should\b/gi,
    /\bit will\b/gi,
    /\bit must\b/gi,
    /\bit should\b/gi,
  ];
  
  // Remove prescriptive patterns (remove the phrase entirely)
  for (const pattern of prescriptivePatterns) {
    sanitized = sanitized.replace(pattern, '');
  }
  
  // Replace deterministic future claims with past/observational framing
  sanitized = sanitized.replace(/\byou will\b/gi, 'you did');
  sanitized = sanitized.replace(/\bthis will\b/gi, 'this did');
  sanitized = sanitized.replace(/\bit will\b/gi, 'it did');
  sanitized = sanitized.replace(/\bwill (lead to|result in|cause|create|bring)\b/gi, 'led to');
  sanitized = sanitized.replace(/\bwill (be|become|happen)\b/gi, 'was');
  sanitized = sanitized.replace(/\bwill\b/gi, 'did');
  
  // Replace future-oriented phrases with past tense
  sanitized = sanitized.replace(/\bwhere it leads\b/gi, 'where it led');
  sanitized = sanitized.replace(/\bleads to\b/gi, 'led to');
  
  // Clean up any double spaces or awkward phrasing from removals
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Remove any remaining prescriptive language that might have been missed
  if (/\b(should|must|need to|ought to|have to|will)\b/i.test(sanitized)) {
    // If still contains prescriptive language, remove it (preserve interpretation, remove directives)
    sanitized = sanitized
      .replace(/\b(should|must|need to|ought to|have to)\b/gi, '')
      .replace(/\bwill\b/gi, 'did');
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
  }
  
  // Final check: if explanation is empty or too short after sanitization, use fallback
  if (sanitized.length < 10) {
    return "This connects to an earlier reflection.";
  }
  
  return sanitized;
}

/**
 * Normalize bridge explanation language to reduce repetition and robotic phrasing
 * Identifies common sentence frames and replaces them with varied alternatives
 * Preserves meaning while reducing sameness
 */
function normalizeBridgeLanguage(explanation: string, aToken: string, bToken: string): string {
  let normalized = explanation;
  
  // Pattern 1: "A different lens on X emerged through Y" → varied alternatives
  const lensPattern = new RegExp(`a different lens on ${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} emerged through ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  if (lensPattern.test(normalized)) {
    const variations = [
      `Your perspective on ${aToken} shifted when you considered ${bToken}.`,
      `You reconsidered ${aToken} in light of ${bToken}.`,
      `Your view of ${aToken} evolved through ${bToken}.`,
      `You reframed ${aToken} by connecting it to ${bToken}.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(lensPattern, variations[index]);
  }
  
  // Pattern 2: "You saw X differently when thinking about Y" → varied alternatives
  const sawDifferentlyPattern = new RegExp(`you saw ${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} differently when thinking about ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  if (sawDifferentlyPattern.test(normalized)) {
    const variations = [
      `Your understanding of ${aToken} deepened when you reflected on ${bToken}.`,
      `You viewed ${aToken} from a new angle after considering ${bToken}.`,
      `Your take on ${aToken} shifted as you explored ${bToken}.`,
      `You reconsidered ${aToken} through the lens of ${bToken}.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(sawDifferentlyPattern, variations[index]);
  }
  
  // Pattern 3: "You kept thinking about X and where Y leads" → varied alternatives
  const keptThinkingPattern = new RegExp(`you kept thinking about ${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} and where ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} leads`, 'i');
  if (keptThinkingPattern.test(normalized)) {
    const variations = [
      `You continued exploring ${aToken} and traced its connection to ${bToken}.`,
      `Your thoughts on ${aToken} extended into ${bToken}.`,
      `You followed ${aToken} into ${bToken}.`,
      `You carried ${aToken} forward into ${bToken}.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(keptThinkingPattern, variations[index]);
  }
  
  // Pattern 4: "Something about X stuck with you when reflecting on Y" → varied alternatives
  const stuckPattern = new RegExp(`something about ${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} stuck with you when reflecting on ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  if (stuckPattern.test(normalized)) {
    const variations = [
      `${aToken} resonated with you as you reflected on ${bToken}.`,
      `You carried ${aToken} with you into your thoughts on ${bToken}.`,
      `${aToken} lingered in your mind when you considered ${bToken}.`,
      `You held onto ${aToken} while exploring ${bToken}.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(stuckPattern, variations[index]);
  }
  
  // Pattern 5: "You moved from X to how Y works as a system" → varied alternatives
  const movedToSystemPattern = new RegExp(`you moved from ${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} to how ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} works as a system`, 'i');
  if (movedToSystemPattern.test(normalized)) {
    const variations = [
      `You shifted from ${aToken} to examining ${bToken} as a system.`,
      `Your focus moved from ${aToken} to the systemic nature of ${bToken}.`,
      `You transitioned from ${aToken} to understanding ${bToken} systematically.`,
      `You expanded from ${aToken} to see ${bToken} as a system.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(movedToSystemPattern, variations[index]);
  }
  
  // Pattern 6: "You zoomed out from X to see Y in a bigger picture" → varied alternatives
  const zoomedOutPattern = new RegExp(`you zoomed out from ${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} to see ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} in a bigger picture`, 'i');
  if (zoomedOutPattern.test(normalized)) {
    const variations = [
      `You stepped back from ${aToken} to see ${bToken} in context.`,
      `You widened your view from ${aToken} to include ${bToken}.`,
      `You expanded your perspective from ${aToken} to encompass ${bToken}.`,
      `You pulled back from ${aToken} to see how ${bToken} fits.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(zoomedOutPattern, variations[index]);
  }
  
  // Pattern 7: "X connects to Y in your thinking" → varied alternatives
  const connectsPattern = new RegExp(`${aToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} connects to ${bToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} in your thinking`, 'i');
  if (connectsPattern.test(normalized)) {
    const variations = [
      `${aToken} links to ${bToken} in your reflections.`,
      `${aToken} relates to ${bToken} in your thoughts.`,
      `${aToken} ties into ${bToken} in your thinking.`,
      `${aToken} bridges to ${bToken} in your mind.`,
    ];
    const hash = hashString(explanation);
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % variations.length;
    normalized = normalized.replace(connectsPattern, variations[index]);
  }
  
  // Clean up any double spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Generate alternate framing when duplicate explanation detected
 * Must include concrete tokens from both reflections for specificity
 */
function generateAlternateFraming(
  explanationParts: string[],
  reasons: NarrativeBridgeReason[],
  signals: {
    hasBeliefReversal: boolean;
    scaleCarry: boolean;
    mediaBridge: boolean;
    systemicLift: number;
    contrast: boolean;
  },
  aToken: string,
  bToken: string
): string {
  // Alternate framings for common explanations (must include concrete tokens)
  const alternates: string[] = [];
  
  if (signals.contrast) {
    if (signals.hasBeliefReversal) {
      alternates.push(`Your perspective on ${aToken} shifted when considering ${bToken}.`);
      alternates.push(`You reconsidered ${aToken} in light of ${bToken}.`);
    } else {
      alternates.push(`You viewed ${aToken} from another angle when thinking about ${bToken}.`);
      // Use normalized variations instead of the robotic "different lens" frame
      const lensVariations = [
        `Your perspective on ${aToken} shifted when you considered ${bToken}.`,
        `You reconsidered ${aToken} in light of ${bToken}.`,
        `Your view of ${aToken} evolved through ${bToken}.`,
      ];
      const hash = hashString(explanationParts.join('|'));
      const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % lensVariations.length;
      alternates.push(lensVariations[index]);
    }
  }
  
  if (signals.scaleCarry) {
    alternates.push(`Scale remained central: ${aToken} and ${bToken} both explore magnitude.`);
    alternates.push(`You continued exploring scale through ${aToken} and ${bToken}.`);
  }
  
  if (signals.mediaBridge) {
    alternates.push(`Media about ${aToken} influenced your reflection on ${bToken}.`);
    alternates.push(`Something from media about ${aToken} resonated when thinking about ${bToken}.`);
  }
  
  if (signals.systemicLift > 0.3 && !signals.contrast) {
    alternates.push(`You shifted from ${aToken} to systemic thinking about ${bToken}.`);
    alternates.push(`The system level of ${bToken} became clearer after ${aToken}.`);
  }
  
  // If we have alternates, pick one deterministically based on hash
  if (alternates.length > 0) {
    const hash = hashString(explanationParts.join('|'));
    const index = Math.abs(parseInt(hash.slice(-2) || '0', 36)) % alternates.length;
    return alternates[index];
  }
  
  // Fallback: add variation to default (must include tokens)
  return `${aToken} builds on what came before with ${bToken}.`;
}

/**
 * Bridge heuristic weights configuration
 * Tuned for cognitive correctness: sequence decay dominates, scale vs abstraction balanced
 */
export type BridgeWeights = {
  /** Sequence weight - decays with time distance (default: 0.40) */
  sequenceWeight: number;
  /** Scale carry weight - when later reflection carries scale signal (default: 0.22) */
  scaleWeight: number;
  /** Systemic lift weight - when later reflection is more abstract/systemic (default: 0.22) */
  systemicWeight: number;
  /** Media bridge weight - when media moment anchors insight (default: 0.10) */
  mediaWeight: number;
  /** Contrast weight - zoom shift micro ↔ macro (default: 0.06) */
  contrastWeight: number;
  /** Sequence decay exponent - higher = more aggressive decay (default: 1.5) */
  sequenceDecayExponent: number;
  /** Minimum weight threshold to include bridge (default: 0.45) */
  minWeightThreshold: number;
};

export const DEFAULT_BRIDGE_WEIGHTS: BridgeWeights = {
  sequenceWeight: 0.42, // Increased - sequence is primary signal
  scaleWeight: 0.22, // Unchanged - scale signals are strong
  systemicWeight: 0.15, // Reduced further - prevent false positives, contrast takes priority
  mediaWeight: 0.10, // Unchanged
  contrastWeight: 0.11, // Increased - contrast signals are decisive, not blended
  sequenceDecayExponent: 1.5, // Exponential decay - more aggressive than linear
  minWeightThreshold: 0.48, // Raised from 0.45 - require stronger signals to bridge
};

export function buildNarrativeBridges(
  reflections: ReflectionLike[],
  opts?: { 
    maxDays?: number; 
    topK?: number;
    weights?: Partial<BridgeWeights>;
  }
): NarrativeBridge[] {
  const maxDays = opts?.maxDays ?? 14; // narrative window
  const topK = opts?.topK ?? 4;
  const weights: BridgeWeights = { ...DEFAULT_BRIDGE_WEIGHTS, ...opts?.weights };

  const sorted = [...reflections].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const bridges: NarrativeBridge[] = [];
  // Track seen explanation hashes to prevent duplicates
  const seenExplanationHashes = new Set<string>();
  // Track bridge type distribution for balance checking
  const typeDistribution = new Map<NarrativeBridgeReason, number>();
  
  // Track evidence enforcement stats
  let pairsEvaluated = 0;
  let pairsDroppedByEvidence = 0;

  // Performance snapshot: bridge generation timing
  const perfStart = performance.now();
  const memoryBefore = typeof performance !== 'undefined' && 'memory' in performance 
    ? (performance as any).memory?.usedJSHeapSize 
    : null;

  for (let i = 0; i < sorted.length; i++) {
    const A = sorted[i];
    const aText = A.text ?? "";

    const candidates: NarrativeBridge[] = [];

    for (let j = i + 1; j < sorted.length; j++) {
      const B = sorted[j];
      const bText = B.text ?? "";

      const d = daysBetween(A.createdAt, B.createdAt);
      if (d > maxDays) break; // only forward + within narrative horizon
      
      pairsEvaluated++;

      const aScale = collectHits(aText, SCALE_PATTERNS);
      const bScale = collectHits(bText, SCALE_PATTERNS);

      const aSys = collectHits(aText, SYSTEMIC_PATTERNS);
      const bSys = collectHits(bText, SYSTEMIC_PATTERNS);

      const aMedia = collectHits(aText, MEDIA_PATTERNS);
      const bMedia = collectHits(bText, MEDIA_PATTERNS);

      const aContrast = collectHits(aText, CONTRAST_PATTERNS);
      const bContrast = collectHits(bText, CONTRAST_PATTERNS);

      // Detect belief reversal: "I believed X" in A, "I now believe not-X" or "actually" in B
      const hasBeliefReversal = 
        (/\b(I believed|I thought|I used to think)\b/i.test(aText) && 
         /\b(I now believe|I now think|actually|but actually)\b/i.test(bText)) ||
        (/\b(will|can|does)\b/i.test(aText) && 
         /\b(will not|cannot|does not|cannot solve|does not fix)\b/i.test(bText));

      const scaleCarry = bScale.length > 0 ? 1 : 0;
      
      // Prevent false positives: if both texts have systemic language but different specific domains,
      // reduce systemic lift score. This catches cases like "government system" vs "code system"
      const specificDomainMarkers = [
        /\b(government|policy|institution|central bank|treasury|economy|economic|monetary|currency)\b/i,
        /\b(code|software|programming|architecture|system design|algorithm|function|variable)\b/i,
        /\b(workout|exercise|fitness|training|routine|gym|muscle)\b/i,
        /\b(internet|network|connection|buffering|bandwidth|wifi|router)\b/i,
      ];
      
      const aDomains = specificDomainMarkers.map((pattern, idx) => pattern.test(aText) ? idx : -1).filter(x => x >= 0);
      const bDomains = specificDomainMarkers.map((pattern, idx) => pattern.test(bText) ? idx : -1).filter(x => x >= 0);
      const domainMismatch = aDomains.length > 0 && bDomains.length > 0 && 
                             !aDomains.some(d => bDomains.includes(d));
      
      // Systemic lift: B is more abstract/systemic than A
      // But penalize if domains mismatch (e.g., government vs code)
      const baseSystemicLift = (bSys.length > aSys.length) ? 1 : 0;
      let systemicLift = domainMismatch ? baseSystemicLift * 0.3 : baseSystemicLift; // 70% penalty for domain mismatch
      
      const mediaBridge = (aMedia.length > 0 || bMedia.length > 0) ? 1 : 0;
      const contrast = (bContrast.length > 0 || hasBeliefReversal) ? 1 : 0;
      
      // Belief reversal is a strong signal - boost contrast weight when detected
      const contrastBoost = hasBeliefReversal ? 0.15 : 0; // Extra weight for belief reversals
      
      // When contrast is detected, suppress systemic lift to make contrast decisive
      // Contrast signals are not blended with similarity signals
      if (contrast && hasBeliefReversal) {
        systemicLift = systemicLift * 0.2; // Strong suppression for belief reversals
      } else if (contrast && bContrast.length > 0) {
        systemicLift = systemicLift * 0.5; // Moderate suppression for other contrast types
      }

      // Sequence weight: exponential decay - closer is much stronger
      // Using exponent for more aggressive decay (e.g., 1.5 means 7 days = ~0.5, 14 days = ~0.0)
      const normalizedDistance = d / maxDays;
      const seq = clamp01(Math.pow(1 - normalizedDistance, weights.sequenceDecayExponent));

      // Check minimum evidence requirement: require at least ONE of:
      // - Shared keyword, Shared entity, Shared theme tag, Temporal sequence signal
      const evidenceCheck = hasMinimumEvidence(
        aText,
        bText,
        aScale,
        bScale,
        aSys,
        bSys,
        aMedia,
        bMedia,
        aContrast,
        bContrast,
        seq
      );
      
      if (!evidenceCheck.hasEvidence) {
        // Drop edges that fail all four evidence checks
        pairsDroppedByEvidence++;
        continue;
      }

      // Score is intentionally "mind-like" with tuned weights
      const weight =
        weights.sequenceWeight * seq +
        weights.scaleWeight * scaleCarry +
        weights.systemicWeight * systemicLift +
        weights.mediaWeight * mediaBridge +
        (weights.contrastWeight + contrastBoost) * contrast;

      if (weight < weights.minWeightThreshold) continue;

      const reasons: NarrativeBridgeReason[] = [];
      reasons.push("sequence");
      if (scaleCarry) reasons.push("scale");
      // Only include systemic if contrast is not the primary signal (suppress when contrast is strong)
      if (systemicLift > 0.3 && !(contrast && hasBeliefReversal)) {
        reasons.push("systemic");
      }
      if (mediaBridge) reasons.push("media");
      if (contrast) reasons.push("contrast");

      // Extract concrete tokens from both reflections for grounding explanations
      const aTokens = extractConcreteTokens(aText, 3);
      const bTokens = extractConcreteTokens(bText, 3);
      
      // Require at least one concrete token from each reflection
      // If we can't find concrete tokens, drop the edge (prevents vague/horoscope-like explanations)
      if (aTokens.length === 0 || bTokens.length === 0) {
        continue;
      }
      
      // Filter tokens by MIN_CONCEPT_SCORE: ensure tokens are meaningful concepts, not stopwords
      // All tokens are filtered by extractConcreteTokens, double-checking for completeness
      const validATokens = aTokens.filter(token => {
        const lowercased = token.toLowerCase();
        return lowercased.length >= 4 && 
               /[a-z]/.test(lowercased) && 
               !ALL_STOPWORDS.has(lowercased) && 
               !/^\d+$/.test(lowercased);
      });
      const validBTokens = bTokens.filter(token => {
        const lowercased = token.toLowerCase();
        return lowercased.length >= 4 && 
               /[a-z]/.test(lowercased) && 
               !ALL_STOPWORDS.has(lowercased) && 
               !/^\d+$/.test(lowercased);
      });
      
      // If filtering removed all tokens, drop the edge
      if (validATokens.length === 0 || validBTokens.length === 0) {
        continue;
      }
      
      // Select representative tokens (prefer capitalized/entities, then pattern hits)
      const aToken = validATokens[0];
      const bToken = validBTokens[0];

      // Extract anchors (phrases/keywords 2-6 words) from both reflections
      // REQUIRED: Both anchors must exist, or bridge quality = 0 and will be dropped
      const anchorA = extractAnchor(aText);
      const anchorB = extractAnchor(bText);
      
      // If either anchor is missing, mark quality = 0 and drop this bridge
      if (!anchorA || !anchorB) {
        continue; // Drop bridge - missing required anchors
      }

      // Build explanation that sounds honest and human, not AI-generated
      // Must include concrete tokens from both reflections for specificity
      // Prioritize contrast/reversal first (most important signal)
      // Then scale, then media, then systemic
      const explanationParts: string[] = [];
      
      if (contrast) {
        if (hasBeliefReversal) {
          explanationParts.push(`You changed your mind about ${aToken}.`);
        } else if (bContrast.some(hit => /zoomed|micro|macro|local|global/i.test(hit))) {
          explanationParts.push(`You zoomed out from ${aToken} to see ${bToken} in a bigger picture.`);
        } else {
          explanationParts.push(`You saw ${aToken} differently when thinking about ${bToken}.`);
        }
      }
      
      if (scaleCarry) {
        explanationParts.push(`You kept thinking about ${aToken} and where ${bToken} leads.`);
      }
      
      if (mediaBridge) {
        explanationParts.push(`Something about ${aToken} stuck with you when reflecting on ${bToken}.`);
      }
      
      // Only include systemic if contrast is not the primary signal
      if (systemicLift > 0.3 && !contrast) {
        explanationParts.push(`You moved from ${aToken} to how ${bToken} works as a system.`);
      }

      // If we have multiple parts, join them naturally
      // If only one part, use it as-is
      // If no parts, use a grounded fallback with tokens
      let explanation: string;
      if (explanationParts.length > 1) {
        explanation = explanationParts.join(" ");
      } else if (explanationParts.length === 1) {
        explanation = explanationParts[0];
      } else {
        // Fallback with concrete tokens (ensures specificity)
        explanation = `${aToken} connects to ${bToken} in your thinking.`;
      }

      // Insight Trust Boundary: Remove prescriptive language and deterministic future claims
      explanation = sanitizeExplanationLanguage(explanation);

      // Language normalization: reduce repetition and robotic phrasing
      explanation = normalizeBridgeLanguage(explanation, aToken, bToken);

      // Narrative de-duplication: hash normalized explanation and check for duplicates
      const normalizedExplanation = explanation.toLowerCase().trim().replace(/\s+/g, ' ');
      const explanationHash = hashString(normalizedExplanation);
      
      // If duplicate found, regenerate with alternate framing (must include tokens)
      if (seenExplanationHashes.has(explanationHash)) {
        explanation = generateAlternateFraming(explanationParts, reasons, {
          hasBeliefReversal,
          scaleCarry: scaleCarry === 1,
          mediaBridge: mediaBridge === 1,
          systemicLift,
          contrast: contrast === 1,
        }, aToken, bToken);
        // Sanitize and normalize alternate explanation too
        explanation = sanitizeExplanationLanguage(explanation);
        explanation = normalizeBridgeLanguage(explanation, aToken, bToken);
        // Re-hash the alternate explanation
        const altNormalized = explanation.toLowerCase().trim().replace(/\s+/g, ' ');
        const altHash = hashString(altNormalized);
        seenExplanationHashes.add(altHash);
      } else {
        seenExplanationHashes.add(explanationHash);
      }

      // Mark fallback explanations
      const isFallback = isFallbackExplanation(explanation);

      candidates.push({
        from: A.id,
        to: B.id,
        weight: clamp01(weight),
        reasons,
        explanation,
        isFallback,
        quality: 1.0, // Quality = 1.0 means both anchors present (required)
        anchorA, // Phrase/keyword from reflection A (2-6 words)
        anchorB, // Phrase/keyword from reflection B (2-6 words)
        signals: {
          scaleHits: Array.from(new Set([...aScale, ...bScale])).slice(0, 8),
          systemicHits: Array.from(new Set([...aSys, ...bSys])).slice(0, 8),
          mediaHits: Array.from(new Set([...aMedia, ...bMedia])).slice(0, 8),
          contrastHits: Array.from(new Set([...aContrast, ...bContrast])).slice(0, 8),
          daysApart: d,
        },
      });
    }

    candidates.sort((x, y) => y.weight - x.weight);
    
    // Apply bridge type balance check before adding to bridges
    const balancedCandidates = applyTypeBalance(candidates.slice(0, topK), typeDistribution, bridges.length);
    
    // Update type distribution
    for (const bridge of balancedCandidates) {
      for (const reason of bridge.reasons) {
        typeDistribution.set(reason, (typeDistribution.get(reason) || 0) + 1);
      }
    }
    
    bridges.push(...balancedCandidates);
  }

  // Quality guardrails: prevent over-generation and semantic dilution
  const qualityFiltered = applyQualityGuardrails(bridges);
  
  // Cap outgoing edges per reflection to prevent spaghetti graphs
  // Max 5 bridges per bridge type per reflection, keep highest scoring only
  const MAX_EDGES_PER_TYPE_PER_REFLECTION = 5;
  
  // Group bridges by source reflection (from)
  const bridgesBySource = new Map<string, NarrativeBridge[]>();
  for (const bridge of qualityFiltered) {
    if (!bridgesBySource.has(bridge.from)) {
      bridgesBySource.set(bridge.from, []);
    }
    bridgesBySource.get(bridge.from)!.push(bridge);
  }
  
  // For each source reflection, cap edges per bridge type
  const cappedBridges: NarrativeBridge[] = [];
  const droppedByCap: Array<{ bridge: NarrativeBridge; reason: string }> = [];
  
  for (const [sourceId, sourceBridges] of bridgesBySource.entries()) {
    // Group by bridge type (primary type)
    const bridgesByType = new Map<NarrativeBridgeReason, NarrativeBridge[]>();
    for (const bridge of sourceBridges) {
      const primaryType = getPrimaryBridgeType(bridge.reasons);
      if (!bridgesByType.has(primaryType)) {
        bridgesByType.set(primaryType, []);
      }
      bridgesByType.get(primaryType)!.push(bridge);
    }
    
    // For each type, keep top N highest scoring bridges
    for (const [bridgeType, typeBridges] of bridgesByType.entries()) {
      // Sort by weight descending
      const sorted = [...typeBridges].sort((a, b) => b.weight - a.weight);
      
      // Keep top N per type
      const kept = sorted.slice(0, MAX_EDGES_PER_TYPE_PER_REFLECTION);
      const dropped = sorted.slice(MAX_EDGES_PER_TYPE_PER_REFLECTION);
      
      cappedBridges.push(...kept);
      
      // Track dropped bridges for logging
      for (const droppedBridge of dropped) {
        droppedByCap.push({
          bridge: droppedBridge,
          reason: `exceeds cap (max ${MAX_EDGES_PER_TYPE_PER_REFLECTION} ${bridgeType} bridges per reflection)`,
        });
      }
    }
  }
  
  if (process.env.NODE_ENV === 'development' && droppedByCap.length > 0) {
    console.log(`[bridge-cap] Dropped ${droppedByCap.length} bridge(s) due to per-reflection edge cap:`);
    const reasonsCount = new Map<string, number>();
    for (const d of droppedByCap) {
      reasonsCount.set(d.reason, (reasonsCount.get(d.reason) || 0) + 1);
    }
    for (const [reason, count] of reasonsCount.entries()) {
      console.log(`  - ${reason}: ${count} bridges`);
    }
    console.log(`[bridge-cap] Kept ${cappedBridges.length} bridges after edge capping (from ${qualityFiltered.length} before cap)`);
  }
  
  // Filter out fallback bridges and bridges with quality = 0 (missing anchors)
  const fallbackBridges = cappedBridges.filter(b => b.isFallback === true);
  const lowQualityBridges = cappedBridges.filter(b => b.quality === 0 || !b.anchorA || !b.anchorB);
  const finalBridges = cappedBridges.filter(b => 
    b.isFallback !== true && 
    b.quality !== 0 && 
    b.anchorA && 
    b.anchorB
  );
  
  const fallbackRate = cappedBridges.length > 0 
    ? (fallbackBridges.length / cappedBridges.length) * 100 
    : 0;
  
  if (process.env.NODE_ENV === 'development') {
    // Log evidence enforcement stats
    const evidenceDropRate = pairsEvaluated > 0 
      ? (pairsDroppedByEvidence / pairsEvaluated) * 100 
      : 0;
    console.log(`[bridge-evidence] Evidence enforcement: ${pairsEvaluated} pairs evaluated, ${pairsDroppedByEvidence} dropped (${evidenceDropRate.toFixed(1)}%)`);
    console.log(`[bridge-evidence] Bridges passed evidence requirement: ${bridges.length} (before quality guardrails)`);
    
    console.log(`[bridge-quality] Fallback rate: ${fallbackRate.toFixed(1)}% (${fallbackBridges.length} fallback bridges filtered out of ${cappedBridges.length} total)`);
    if (fallbackBridges.length > 0) {
      console.log(`[bridge-quality] Filtered fallback explanations:`);
      fallbackBridges.slice(0, 5).forEach(b => {
        console.log(`  - "${b.explanation}" (weight: ${b.weight.toFixed(2)})`);
      });
      if (fallbackBridges.length > 5) {
        console.log(`  ... and ${fallbackBridges.length - 5} more`);
      }
    }
    
    // Log bridges dropped due to missing anchors
    if (lowQualityBridges.length > 0) {
      console.log(`[bridge-anchors] Dropped ${lowQualityBridges.length} bridge(s) due to missing anchors (quality = 0)`);
      lowQualityBridges.slice(0, 5).forEach(b => {
        console.log(`  - Bridge ${b.from.slice(0, 8)}... → ${b.to.slice(0, 8)}... (anchorA: ${b.anchorA ? 'present' : 'missing'}, anchorB: ${b.anchorB ? 'present' : 'missing'})`);
      });
      if (lowQualityBridges.length > 5) {
        console.log(`  ... and ${lowQualityBridges.length - 5} more`);
      }
    }
    
    console.log(`[bridge-anchors] Final bridges with both anchors: ${finalBridges.length} (from ${cappedBridges.length} before anchor filtering)`);
  }
  
  // Warn if fallback rate is too high
  if (fallbackRate >= 5) {
    console.warn(`[bridge-quality] High fallback rate: ${fallbackRate.toFixed(1)}% (target: <5%)`);
  }
  
  // Deterministic hash for verification: same input → same output
  const bridgeSetHash = hashBridgeSet(finalBridges);
  if (process.env.NODE_ENV === 'development') {
    console.log(`[bridge-determinism] Bridge set hash: ${bridgeSetHash} (${finalBridges.length} bridges)`);
    console.log(`[bridge-determinism] Hash is based on sorted (fromId, toId, primaryType) tuples`);
  }
  
  return finalBridges;
}

/**
 * Get primary bridge type (non-sequence reason, or sequence if none)
 */
function getPrimaryBridgeType(reasons: NarrativeBridgeReason[]): NarrativeBridgeReason {
  // Find first non-sequence reason, or return sequence if it's the only one
  const nonSequence = reasons.find(r => r !== 'sequence');
  return nonSequence || 'sequence';
}

/**
 * Apply bridge type balance: ensure no single subtype > 40%
 * Bias underrepresented types during generation
 */
function applyTypeBalance(
  candidates: NarrativeBridge[],
  currentDistribution: Map<NarrativeBridgeReason, number>,
  currentBridgeCount: number
): NarrativeBridge[] {
  const MAX_TYPE_PERCENTAGE = 0.40; // 40% max per type
  const BALANCE_BIAS = 0.05; // Small boost for underrepresented types
  
  if (candidates.length === 0) return candidates;
  
  // Calculate current percentages
  const totalBridges = currentBridgeCount;
  const typePercentages = new Map<NarrativeBridgeReason, number>();
  const allTypes: NarrativeBridgeReason[] = ['sequence', 'scale', 'systemic', 'contrast', 'media'];
  
  for (const type of allTypes) {
    const count = currentDistribution.get(type) || 0;
    typePercentages.set(type, totalBridges > 0 ? count / totalBridges : 0);
  }
  
  // Find overrepresented types (> 40%)
  const overrepresented = Array.from(typePercentages.entries())
    .filter(([_, pct]) => pct > MAX_TYPE_PERCENTAGE)
    .map(([type, _]) => type);
  
  // Find underrepresented types (< 20% or missing)
  const underrepresented = Array.from(typePercentages.entries())
    .filter(([_, pct]) => pct < 0.20)
    .map(([type, _]) => type);
  
  // If no overrepresentation, return candidates as-is
  if (overrepresented.length === 0) {
    return candidates;
  }
  
  // Score candidates: penalize overrepresented types, boost underrepresented types
  const scored = candidates.map(bridge => {
    const primaryType = getPrimaryBridgeType(bridge.reasons);
    let score = bridge.weight;
    
    // Penalize if primary type is overrepresented
    if (overrepresented.includes(primaryType)) {
      score = score * 0.7; // 30% penalty
    }
    
    // Boost if primary type is underrepresented
    if (underrepresented.includes(primaryType)) {
      score = score * (1 + BALANCE_BIAS); // Small boost
    }
    
    return { bridge, score, primaryType };
  });
  
  // Sort by adjusted score
  scored.sort((a, b) => b.score - a.score);
  
  // Take top candidates, but ensure we don't exceed 40% for any type
  const balanced: NarrativeBridge[] = [];
  const newDistribution = new Map(currentDistribution);
  
  for (const { bridge, primaryType } of scored) {
    // Check if adding this bridge would exceed 40% for its primary type
    const currentCount = newDistribution.get(primaryType) || 0;
    const newTotal = totalBridges + balanced.length + 1;
    const newPercentage = (currentCount + 1) / newTotal;
    
    if (newPercentage <= MAX_TYPE_PERCENTAGE || balanced.length < candidates.length * 0.5) {
      // Allow if under limit, or if we're keeping at least 50% of candidates
      balanced.push(bridge);
      newDistribution.set(primaryType, currentCount + 1);
    }
  }
  
  // Log balance adjustments
  if (balanced.length < candidates.length) {
    const dropped = candidates.length - balanced.length;
    console.log(`[bridge-balance] Adjusted type distribution: dropped ${dropped} bridge(s) to maintain balance`);
    console.log(`[bridge-balance] Overrepresented: ${overrepresented.join(', ')}`);
    console.log(`[bridge-balance] Underrepresented: ${underrepresented.join(', ')}`);
  }
  
  return balanced;
}

/**
 * Calculate semantic similarity between two explanations using simple word overlap
 * Returns a score 0-1 where 1 = identical, 0 = completely different
 */
function explanationSimilarity(explanation1: string, explanation2: string): number {
  const words1 = new Set(explanation1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(explanation2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  // Jaccard similarity
  return intersection.size / union.size;
}

/**
 * Apply quality guardrails to prevent over-generation and semantic dilution
 * - Hard cap: max 3 bridges per reflection pair
 * - Semantic delta: require minimum difference between bridge explanations
 * - Log dropped bridges with reasons
 */
function applyQualityGuardrails(bridges: NarrativeBridge[]): NarrativeBridge[] {
  const MAX_BRIDGES_PER_PAIR = 3;
  const MIN_SEMANTIC_DELTA = 0.3; // Explanations must differ by at least 30%
  // Use a slightly higher threshold than minWeightThreshold to ensure quality
  // Bridges already passed minWeightThreshold, but we want even higher quality here
  const MIN_CONFIDENCE = 0.40; // Minimum weight threshold for quality guardrails
  
  const dropped: Array<{ bridge: NarrativeBridge; reason: string }> = [];
  const kept: NarrativeBridge[] = [];
  
  // Group bridges by canonical edge key: `${min(fromId,toId)}:${max(fromId,toId)}:${bridgeType}`
  const bridgesByEdgeKey = new Map<string, NarrativeBridge[]>();
  
  for (const bridge of bridges) {
    // Create canonical edge key with bridge type
    const minId = bridge.from < bridge.to ? bridge.from : bridge.to;
    const maxId = bridge.from < bridge.to ? bridge.to : bridge.from;
    const bridgeType = getPrimaryBridgeType(bridge.reasons);
    const edgeKey = `${minId}:${maxId}:${bridgeType}`;
    
    if (!bridgesByEdgeKey.has(edgeKey)) {
      bridgesByEdgeKey.set(edgeKey, []);
    }
    bridgesByEdgeKey.get(edgeKey)!.push(bridge);
  }
  
  // Process each canonical edge key
  for (const [edgeKey, edgeBridges] of bridgesByEdgeKey.entries()) {
    // Sort by weight (highest first)
    const sorted = [...edgeBridges].sort((a, b) => b.weight - a.weight);
    
    // Apply hard cap: max 3 bridges per canonical edge key
    const candidates = sorted.slice(0, MAX_BRIDGES_PER_PAIR);
    
    // Drop bridges below minimum confidence
    const aboveThreshold = candidates.filter(b => {
      if (b.weight < MIN_CONFIDENCE) {
        dropped.push({ bridge: b, reason: `confidence too low (${b.weight.toFixed(2)} < ${MIN_CONFIDENCE})` });
        return false;
      }
      return true;
    });
    
    // Apply semantic delta check: remove bridges with too-similar explanations
    const semanticallyDistinct: NarrativeBridge[] = [];
    
    for (const candidate of aboveThreshold) {
      let isDistinct = true;
      
      for (const keptBridge of semanticallyDistinct) {
        const similarity = explanationSimilarity(candidate.explanation, keptBridge.explanation);
        
        if (similarity > (1 - MIN_SEMANTIC_DELTA)) {
          // Too similar - drop the lower-weight one
          if (candidate.weight < keptBridge.weight) {
            dropped.push({ 
              bridge: candidate, 
              reason: `similarity too high (${(similarity * 100).toFixed(0)}% overlap with higher-weight bridge)` 
            });
            isDistinct = false;
            break;
          } else {
            // Replace the lower-weight one
            dropped.push({ 
              bridge: keptBridge, 
              reason: `similarity too high (${(similarity * 100).toFixed(0)}% overlap with higher-weight bridge)` 
            });
            semanticallyDistinct.splice(semanticallyDistinct.indexOf(keptBridge), 1);
            break;
          }
        }
      }
      
      if (isDistinct) {
        semanticallyDistinct.push(candidate);
      }
    }
    
    kept.push(...semanticallyDistinct);
    
    // Log any bridges dropped due to hard cap
    if (sorted.length > MAX_BRIDGES_PER_PAIR) {
      for (const droppedBridge of sorted.slice(MAX_BRIDGES_PER_PAIR)) {
        if (!dropped.some(d => d.bridge === droppedBridge)) {
          dropped.push({ bridge: droppedBridge, reason: `exceeds hard cap (max ${MAX_BRIDGES_PER_PAIR} per edge key)` });
        }
      }
    }
  }
  
  // Log dropped bridges summary
  if (dropped.length > 0) {
    console.log(`[bridge-quality] Dropped ${dropped.length} bridge(s) due to quality guardrails:`);
    const reasons = new Map<string, number>();
    for (const { reason } of dropped) {
      const key = reason.split('(')[0].trim();
      reasons.set(key, (reasons.get(key) || 0) + 1);
    }
    for (const [reason, count] of reasons.entries()) {
      console.log(`  - ${reason}: ${count}`);
    }
  }
  
  console.log(`[bridge-quality] Kept ${kept.length} bridge(s) after quality guardrails (from ${bridges.length} generated)`);
  
  return kept;
}

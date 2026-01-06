/**
 * Stopwords and junk tokens to exclude from concept extraction
 * Prevents generic words, micro tokens, and common junk from being used as "concepts" in explanations
 */

// English stopwords (common function words that don't carry semantic meaning)
export const ENGLISH_STOPWORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Pronouns
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'this', 'that', 'these', 'those',
  // Prepositions
  'at', 'by', 'for', 'from', 'in', 'of', 'on', 'to', 'with', 'about', 'above', 'across', 'after',
  'against', 'along', 'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between',
  'beyond', 'during', 'except', 'inside', 'into', 'near', 'off', 'outside', 'over', 'through',
  'throughout', 'under', 'until', 'up', 'upon', 'within', 'without',
  // Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet', 'because', 'if', 'than', 'though', 'unless', 'until',
  'when', 'where', 'while', 'whether',
  // Auxiliary verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'can', 'could', 'ought',
  // Common verbs
  'get', 'got', 'go', 'goes', 'went', 'gone', 'come', 'comes', 'came', 'see', 'saw', 'seen',
  'know', 'knew', 'known', 'think', 'thought', 'take', 'took', 'taken', 'give', 'gave', 'given',
  'make', 'made', 'say', 'said', 'tell', 'told', 'ask', 'asked', 'find', 'found', 'try', 'tried',
  'use', 'used', 'work', 'worked', 'call', 'called', 'need', 'needed', 'want', 'wanted',
  'seem', 'seemed', 'feel', 'felt', 'become', 'became', 'leave', 'left', 'put', 'let', 'help',
  'keep', 'turn', 'turned', 'move', 'moved', 'live', 'lived', 'believe', 'believed',
  'bring', 'brought', 'happen', 'happened', 'write', 'wrote', 'written', 'sit', 'sat', 'stand',
  'stood', 'lose', 'lost', 'pay', 'paid', 'meet', 'met', 'include', 'included', 'continue', 'continued',
  'set', 'learn', 'learned', 'change', 'changed', 'lead', 'led', 'understand', 'understood',
  'watch', 'watched', 'follow', 'followed', 'stop', 'stopped', 'create', 'created', 'speak', 'spoke',
  'spoken', 'read', 'allow', 'allowed', 'add', 'added', 'spend', 'spent', 'grow', 'grew',
  'grown', 'open', 'opened', 'walk', 'walked', 'win', 'won', 'offer', 'offered', 'remember',
  'remembered', 'love', 'loved', 'consider', 'considered', 'appear', 'appeared', 'buy', 'bought',
  'wait', 'waited', 'serve', 'served', 'die', 'died', 'send', 'sent', 'build', 'built', 'stay',
  'stayed', 'fall', 'fell', 'fallen', 'cut', 'reach', 'reached', 'kill', 'killed', 'raise',
  'raised', 'pass', 'passed', 'sell', 'sold', 'decide', 'decided', 'return', 'returned', 'explain',
  'explained', 'develop', 'developed', 'carry', 'carried', 'break', 'broke', 'broken', 'receive',
  'received', 'agree', 'agreed', 'support', 'supported', 'hit', 'produce', 'produced', 'eat',
  'ate', 'eaten', 'cover', 'covered', 'catch', 'caught', 'draw', 'drew', 'drawn', 'choose', 'chose',
  'chosen',
  // Adverbs
  'not', 'no', 'very', 'just', 'only', 'also', 'well', 'too', 'so', 'more', 'most', 'much', 'many',
  'how', 'now', 'then', 'here', 'there', 'where', 'when', 'why', 'what', 'who', 'which', 'whose',
  'all', 'each', 'every', 'both', 'few', 'little', 'other', 'some', 'such', 'own', 'same', 'different',
  'another', 'enough', 'less', 'least', 'quite', 'rather', 'really', 'still', 'always', 'often',
  'sometimes', 'usually', 'never', 'ever', 'already', 'yet', 'again', 'once', 'twice',
  // Common adjectives
  'good', 'bad', 'big', 'small', 'large', 'little', 'long', 'short', 'high', 'low', 'new', 'old',
  'young', 'early', 'late', 'right', 'wrong', 'true', 'false', 'real', 'sure', 'clear', 'easy',
  'hard', 'strong', 'weak', 'free', 'full', 'empty', 'open', 'closed', 'hot', 'cold', 'warm',
  'cool', 'fast', 'slow', 'quick', 'quiet', 'loud', 'bright', 'dark', 'light', 'heavy', 'thick',
  'thin', 'wide', 'narrow', 'deep', 'shallow', 'tall', 'round', 'square', 'flat', 'sharp',
  'smooth', 'rough', 'soft', 'wet', 'dry', 'clean', 'dirty', 'fresh', 'sweet', 'sour', 'bitter',
  'salty', 'spicy', 'mild', 'rich', 'poor', 'expensive', 'cheap', 'important', 'necessary',
  'possible', 'impossible', 'likely', 'unlikely', 'certain', 'sure', 'clear', 'obvious', 'simple',
  'complex', 'easy', 'difficult', 'common', 'rare', 'usual', 'normal', 'regular', 'standard',
  'typical', 'ordinary', 'special', 'general', 'public', 'private', 'personal', 'individual',
  'single', 'multiple', 'double', 'triple', 'several', 'first', 'second', 'third', 'last', 'next',
  'previous', 'current', 'past', 'present', 'future', 'recent', 'ancient', 'modern', 'traditional',
  'popular', 'famous', 'known', 'unknown', 'familiar', 'strange', 'weird', 'natural', 'artificial',
  'actual', 'virtual', 'correct', 'right', 'wrong', 'accurate', 'precise', 'exact', 'perfect',
  'complete', 'whole', 'partial', 'entire', 'total',
]);

// Custom junk tokens specific to this domain
export const CUSTOM_JUNK_TOKENS = new Set([
  'story',
  'that',
  'this',
  'now',
  'the',
  'a',
  'an',
  'to',
  'of',
  'and',
  'or',
  'but',
  'not',
  'what',
  'show',
  'building',
  'humans',
]);

// Combined stopwords set
export const ALL_STOPWORDS = new Set([
  ...ENGLISH_STOPWORDS,
  ...CUSTOM_JUNK_TOKENS,
]);

// Minimum concept score threshold (not currently used in filtering, but available for future use)
export const MIN_CONCEPT_SCORE = 0.7;

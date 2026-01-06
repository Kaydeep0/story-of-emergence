import type { BridgeSignal } from "./types";

const SCALE_WORDS = ["billion", "crore", "million", "scale", "orders", "magnitude", "trillion", "intuition"];
const SYSTEMS_WORDS = ["system", "networks", "feedback", "loop", "incentive", "oversight", "coordination", "institution"];
const TRUST_WORDS = ["trust", "belief", "legitimacy", "confidence", "integrity"];
const POLICY_WORDS = ["policy", "inflation", "transmission", "central", "treasury", "bank", "measured"];
const MONEY_WORDS = ["currency", "money", "liquidity", "pricing", "price signals", "counterfeit"];

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 3);
}

function countHits(tokens: string[], lexicon: string[]) {
  const hits: string[] = [];
  const joined = " " + tokens.join(" ") + " ";
  for (const w of lexicon) {
    const key = w.toLowerCase();
    if (joined.includes(" " + key + " ")) hits.push(w);
  }
  return hits;
}

function detectNumbers(text: string): string[] {
  const hits: string[] = [];
  const m = text.match(/₹|rs\.?|usd|\$|\b\d{1,3}(,\d{3})+|\b\d+(\.\d+)?\b|crore|lakh|billion|million/gi);
  if (!m) return hits;
  const uniq = Array.from(new Set(m.map(x => x.trim()))).slice(0, 12);
  return uniq;
}

export function buildBridgeSignals(aText: string, bText: string): BridgeSignal[] {
  const aTok = tokenize(aText);
  const bTok = tokenize(bText);
  const both = [...aTok, ...bTok];

  const out: BridgeSignal[] = [];

  const scaleHits = countHits(both, SCALE_WORDS);
  if (scaleHits.length) out.push({ kind: "scale", score: Math.min(1, 0.15 * scaleHits.length), hits: scaleHits });

  const sysHits = countHits(both, SYSTEMS_WORDS);
  if (sysHits.length) out.push({ kind: "systems", score: Math.min(1, 0.12 * sysHits.length), hits: sysHits });

  const trustHits = countHits(both, TRUST_WORDS);
  if (trustHits.length) out.push({ kind: "trust", score: Math.min(1, 0.18 * trustHits.length), hits: trustHits });

  const polHits = countHits(both, POLICY_WORDS);
  if (polHits.length) out.push({ kind: "policy", score: Math.min(1, 0.14 * polHits.length), hits: polHits });

  const moneyHits = countHits(both, MONEY_WORDS);
  if (moneyHits.length) out.push({ kind: "systems", score: Math.min(1, 0.10 * moneyHits.length), hits: moneyHits });

  const nums = [...detectNumbers(aText), ...detectNumbers(bText)];
  const uniqNums = Array.from(new Set(nums)).slice(0, 12);
  if (uniqNums.length) out.push({ kind: "numbers", score: Math.min(1, 0.1 + 0.05 * uniqNums.length), hits: uniqNums });

  out.sort((x, y) => y.score - x.score);
  return out;
}


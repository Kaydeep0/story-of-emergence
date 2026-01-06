import type { MeaningBridge } from "./types";
import { buildBridgeSignals } from "./buildSignals";

function firstSentence(text: string) {
  const t = text.trim();
  const i = t.search(/[.!?]\s/);
  if (i === -1) return t.slice(0, 140);
  return t.slice(0, i + 1).slice(0, 180);
}

function pickTitle(signals: ReturnType<typeof buildBridgeSignals>) {
  const kinds = signals.map(s => s.kind);
  if (kinds.includes("numbers") && kinds.includes("scale")) return "Scale breaks intuition";
  if (kinds.includes("trust") && kinds.includes("systems")) return "Trust is a system output";
  if (kinds.includes("policy") && kinds.includes("systems")) return "Policy reacts to symptoms";
  return "A shared pattern";
}

export function buildMeaningBridge(aText: string, bText: string): MeaningBridge {
  const signals = buildBridgeSignals(aText, bText);
  const title = pickTitle(signals);

  const aLead = firstSentence(aText);
  const bLead = firstSentence(bText);

  const numbers = signals.find(s => s.kind === "numbers")?.hits ?? [];
  const translation = numbers.length ? `Key numbers and units detected: ${numbers.slice(0, 6).join(", ")}.` : undefined;

  const consequences: string[] = [];
  if (signals.some(s => s.kind === "policy")) consequences.push("Large flows can distort measurement and policy transmission.");
  if (signals.some(s => s.kind === "trust")) consequences.push("Trust degrades at the edges where oversight and incentives stop aligning.");
  if (signals.some(s => s.kind === "scale")) consequences.push("Billion level scale changes behavior from incremental to structural.");

  const frame =
    "This bridge links a concrete trigger to a system level frame. The connection is not just shared words, it is shared causality.";

  const claim =
    "These reflections connect through a chain: a trigger, a translation into scale, then second order effects on systems, policy, and trust.";

  const echoes = [
    `From A: ${aLead}`,
    `From B: ${bLead}`
  ];

  return {
    title,
    claim,
    translation,
    consequences,
    frame,
    echoes,
    signals,
    createdAtIso: new Date().toISOString(),
    version: 1
  };
}


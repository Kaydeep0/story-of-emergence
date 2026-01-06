export type BridgeSignal = {
  kind: "scale" | "systems" | "trust" | "policy" | "incentives" | "time" | "source" | "numbers";
  score: number;
  hits: string[];
};

// Reason edges live here. Similarity edges are candidates only.
export type MeaningBridge = {
  title: string;
  claim: string;
  translation?: string;
  consequences: string[];
  frame: string;
  echoes: string[];
  signals: BridgeSignal[];
  createdAtIso: string;
  version: number;
};


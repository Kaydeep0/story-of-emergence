import { getSupabaseForWallet } from "@/app/lib/supabase";
import { encryptText } from "@/lib/crypto";
import type { NarrativeBridge } from "./buildNarrativeBridge";

// Helper to safely stringify JSON (handles circular refs)
function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(
    obj,
    (_key, value) => {
      if (typeof value === "function") return undefined;
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return undefined;
        seen.add(value);
      }
      return value;
    }
  );
}

export async function upsertNarrativeBridges(params: {
  wallet: string;
  aesKey: CryptoKey;
  bridges: NarrativeBridge[];
}) {
  const { wallet, aesKey, bridges } = params;
  const supabase = getSupabaseForWallet(wallet);

  for (const b of bridges) {
    const payload = {
      kind: "narrative_bridge_v1",
      weight: b.weight,
      reasons: b.reasons,
      explanation: b.explanation,
      signals: b.signals,
      computedAt: new Date().toISOString(),
      version: 1,
    };

    const plaintext = safeStringify(payload);
    const envelope = await encryptText(aesKey, plaintext);
    
    // Extract version number from "v1" format
    const versionNum = parseInt(envelope.version.replace("v", "")) || 1;

    const { error } = await supabase.rpc("upsert_reflection_link_bridge", {
      w: wallet,
      from_id: b.from,
      to_id: b.to,
      p_ciphertext: envelope.ciphertext,
      p_iv: envelope.iv,
      p_version: versionNum,
    });

    if (error) {
      console.error("[narrativeBridges] upsert error", error);
      throw error;
    }
  }
}


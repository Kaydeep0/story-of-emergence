"use client";

import { useCallback, useMemo, useState } from "react";
import { buildNarrativeBridges } from "./buildNarrativeBridge";
import { upsertNarrativeBridges } from "./narrativeBridgeStorage";

type ReflectionLike = { id: string; createdAt: string; text: string; sources?: any[] };

export function useNarrativeBridges(args: {
  wallet?: string;
  aesKey?: CryptoKey | null;
  reflections: ReflectionLike[];
}) {
  const { wallet, aesKey, reflections } = args;
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const build = useCallback(async () => {
    if (!wallet || !aesKey) return;
    setIsBuilding(true);
    setError(null);
    try {
      const bridges = buildNarrativeBridges(reflections, { maxDays: 14, topK: 4 });
      await upsertNarrativeBridges({ wallet, aesKey, bridges });
    } catch (e: any) {
      setError(e?.message ?? "Failed to build narrative bridges");
    } finally {
      setIsBuilding(false);
    }
  }, [wallet, aesKey, reflections]);

  return useMemo(() => ({ build, isBuilding, error }), [build, isBuilding, error]);
}


"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { getSupabaseForWallet } from "@/app/lib/supabase";

type Health = {
  addressShort: string | null;
  chainId: number | null;
  entriesCount: number | null;
  keyOk: boolean;
  loading: boolean;
};

export function useHealth(showDeleted: boolean): Health {
  const { address } = useAccount();
  const chainId = useChainId();

  const addressShort = useMemo(() => {
    if (!address) return null;
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
  }, [address]);

  const [entriesCount, setEntriesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const keyOk = (() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = sessionStorage.getItem("soe-encryption-session");
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      // Check if it has the required fields and wallet matches
      if (
        parsed.signature &&
        parsed.consentTimestamp &&
        parsed.walletAddress &&
        parsed.walletAddress.toLowerCase() === address?.toLowerCase()
      ) {
        // Check if consent is not expired (12 hours)
        const consentDate = new Date(parsed.consentTimestamp);
        const now = new Date();
        const hoursSinceConsent = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60);
        return hoursSinceConsent < 12;
      }
      return false;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!address) {
        setEntriesCount(null);
        return;
      }

      setLoading(true);
      try {
        const sb = getSupabaseForWallet(address);
        const { data, error } = await sb.rpc("entry_count_for_wallet", {
          w: address.toLowerCase(),
        });

        if (!cancelled) {
          if (error) throw error;
          setEntriesCount(typeof data === "number" ? data : 0);
        }
      } catch {
        if (!cancelled) setEntriesCount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [address]); // only depends on wallet now

  return {
    addressShort,
    chainId: chainId ?? null,
    entriesCount,
    keyOk,
    loading,
  };
}

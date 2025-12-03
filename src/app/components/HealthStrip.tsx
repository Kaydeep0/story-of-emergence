"use client";

import { useHealth } from "@/app/lib/useHealth";

type Props = {
  showDeleted: boolean;
  onToggleDeleted: (v: boolean) => void;
};

export default function HealthStrip({ showDeleted, onToggleDeleted }: Props) {
  const { addressShort, chainId, entriesCount, keyOk, loading } = useHealth(showDeleted);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
      <Chip label="Wallet" value={addressShort || "not connected"} />
      <Chip label="Network" value={chainId ? String(chainId) : "—"} />
      <Chip label="Entries" value={loading ? "…" : String(entriesCount ?? 0)} />
      <Chip label="Key" value={keyOk ? "ready" : "missing"} tone={keyOk ? "ok" : "warn"} />

      <div className="ml-auto flex items-center gap-2">
        <label className="select-none text-xs opacity-80">Show Trash</label>
        <button
          type="button"
          onClick={() => onToggleDeleted(!showDeleted)}
          className={[
            "relative h-6 w-10 rounded-full transition-colors",
            showDeleted ? "bg-rose-500/80" : "bg-white/20",
          ].join(" ")}
          aria-pressed={showDeleted}
          aria-label="Toggle Trash"
        >
          <span
            className={[
              "absolute top-[2px] h-5 w-5 rounded-full bg-white transition-transform",
              showDeleted ? "translate-x-[18px]" : "translate-x-[2px]",
            ].join(" ")}
          />
        </button>
      </div>
    </div>
  );
}

function Chip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "ok"
      ? "bg-emerald-500/20 text-emerald-200"
      : tone === "warn"
      ? "bg-amber-500/20 text-amber-200"
      : "bg-white/10 text-white/80";

  return (
    <div className={`flex items-center gap-2 rounded-xl ${color} px-2 py-1`}>
      <span className="text-[11px] uppercase tracking-wide opacity-80">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

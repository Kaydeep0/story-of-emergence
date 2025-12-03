"use client";

import { useMemo, useState } from "react";

type ExportItem = {
  id: string;
  ts: string;
  note: string;
  deleted_at: string | null;
};

type ExportScope = "visible" | "active" | "trash" | "all";

type Props = {
  walletAddress: string;
  visibleItems: ExportItem[];
  allItems: ExportItem[];
};

export default function ExportButton({
  walletAddress,
  visibleItems,
  allItems,
}: Props) {
  const [scope, setScope] = useState<ExportScope>("visible");
  const [exporting, setExporting] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const dataToExport = useMemo(() => {
    let base: ExportItem[];

    switch (scope) {
      case "visible":
        base = visibleItems;
        break;
      case "active":
        base = allItems.filter((it) => !it.deleted_at);
        break;
      case "trash":
        base = allItems.filter((it) => !!it.deleted_at);
        break;
      case "all":
      default:
        base = allItems;
        break;
    }

    return base;
  }, [scope, visibleItems, allItems]);

  function handleExport() {
    if (dataToExport.length === 0) {
      // simple guard
      alert("Nothing to export for this selection.");
      return;
    }

    try {
      setExporting(true);

      const exportedAt = new Date().toISOString();
      const payload = {
        version: 1,
        exportedAt,
        walletAddress: walletAddress || "unknown",
        reflections: dataToExport.map((it) => ({
          id: it.id,
          created_at: it.ts,
          note: it.note,
          deleted_at: it.deleted_at,
        })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const dateStr = exportedAt.slice(0, 10);
      const addr = walletAddress ? walletAddress.slice(0, 10) : "wallet";
      const scopeLabel = scope;

      a.href = url;
      a.download = `soe-reflections-${scopeLabel}-${addr}-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value as ExportScope)}
        className="rounded-xl border border-white/20 bg-black px-2 py-1 text-xs text-white/80"
        aria-label="Export scope"
      >
        <option value="visible">Visible only</option>
        <option value="active">All active</option>
        <option value="trash">Trash only</option>
        <option value="all">All entries</option>
      </select>

      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || dataToExport.length === 0}
          className="rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50 flex items-center gap-1.5"
          aria-describedby="export-tooltip"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-70"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exporting ? "Exporting…" : "Export as JSON"}
        </button>

        {/* Tooltip */}
        {showTooltip && (
          <div
            id="export-tooltip"
            role="tooltip"
            className="absolute right-0 top-full mt-2 z-50 w-64 rounded-lg border border-white/10 bg-black/95 p-3 text-xs text-white/70 shadow-lg backdrop-blur"
          >
            <p className="font-medium text-white/90 mb-1">Client-side export</p>
            <p>
              Export is created locally in your browser. No data is sent to any
              server. The file contains your decrypted reflections for backup or
              processing.
            </p>
            <div className="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-white/10 bg-black/95" />
          </div>
        )}
      </div>
    </div>
  );
}

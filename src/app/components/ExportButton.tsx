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

      const payload = dataToExport.map((it) => ({
        id: it.id,
        created_at: it.ts,
        note: it.note,
        deleted_at: it.deleted_at,
      }));

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      const addr = walletAddress || "wallet";
      const scopeLabel = scope;

      a.href = url;
      a.download = `${addr}-reflections-${scopeLabel}-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value as ExportScope)}
        className="rounded-xl border border-white/20 bg-black px-2 py-1 text-xs text-white/80"
      >
        <option value="visible">Visible only</option>
        <option value="active">All active</option>
        <option value="trash">Trash only</option>
        <option value="all">All entries</option>
      </select>

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="rounded-xl border border-white/20 px-3 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
      >
        {exporting ? "Exporting…" : "Export JSON"}
      </button>
    </div>
  );
}

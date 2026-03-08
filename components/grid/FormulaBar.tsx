"use client";

import type { CellId, CellData } from "@/types";

type Props = {
  selectedCellId: CellId | null;
  cellData: CellData | undefined;
  isEditing: boolean;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onCommit: () => void;
  onAbort: () => void;
};

export function FormulaBar({
  selectedCellId,
  cellData,
  isEditing,
  editValue,
  onEditValueChange,
  onCommit,
  onAbort,
}: Props) {
  const displayVal = isEditing
    ? editValue
    : (cellData?.raw ?? "");

  return (
    <div className="flex items-center h-8 border-b border-surface-3 bg-surface-1 px-2 gap-2 shrink-0">
      {/* Cell address box */}
      <div className="w-16 h-6 flex items-center justify-center rounded bg-surface-2 border border-surface-3
        text-xs font-mono text-ink-muted shrink-0">
        {selectedCellId ?? ""}
      </div>

      {/* fx label */}
      <span className="text-ink-faint text-xs font-mono shrink-0 italic">fx</span>

      {/* Input */}
      <input
        readOnly={!isEditing}
        value={displayVal}
        onChange={(e) => onEditValueChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onCommit(); }
          if (e.key === "Escape") { e.preventDefault(); onAbort(); }
        }}
        className="flex-1 h-6 px-2 bg-surface-2 border border-surface-3 rounded
          text-xs font-mono text-ink outline-none
          focus:border-accent/40 focus:ring-1 focus:ring-accent/20
          read-only:cursor-default transition-all"
        spellCheck={false}
        placeholder={selectedCellId ? "Enter value or formula…" : ""}
      />
    </div>
  );
}

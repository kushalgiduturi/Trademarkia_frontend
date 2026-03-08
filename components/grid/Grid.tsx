"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  DocumentData,
  CellData,
  CellId,
  CellFormat,
  PresenceEntry,
  AppUser,
  WriteState,
} from "@/types";
import { cellId, colIndexToLetter, parseCellId } from "@/types";
import { computeCell } from "@/lib/formula";
import { Cell } from "./Cell";
import { FormulaBar } from "./FormulaBar";
import { FormatToolbar } from "./FormatToolbar";

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 24;
const ROW_HEADER_WIDTH = 48;
const INITIAL_ROWS = 50;
const INITIAL_COLS = 26;
const RESIZE_HANDLE_PX = 4;

type Props = {
  doc: DocumentData;
  user: AppUser | null;
  peers: PresenceEntry[];
  writeState: WriteState;
  onCellChange: (id: CellId, data: CellData) => void;
  onColWidthChange: (col: number, width: number) => void;
  onRowHeightChange: (row: number, height: number) => void;
  onSelectedCellChange: (id: CellId | null) => void;
};

export function Grid({
  doc,
  user: _user,
  peers,
  writeState: _writeState,
  onCellChange,
  onColWidthChange,
  onRowHeightChange,
  onSelectedCellChange,
}: Props) {
  const [selectedCell, setSelectedCell] = useState<CellId>("A1");
  const [editingCell, setEditingCell] = useState<CellId | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Column reorder state
  const [colOrder, setColOrder] = useState<number[]>(() =>
    Array.from({ length: INITIAL_COLS }, (_, i) => i)
  );
  const dragColRef = useRef<number | null>(null);
  const dragOverColRef = useRef<number | null>(null);

  // Resize state
  const resizingCol = useRef<{ index: number; startX: number; startW: number } | null>(null);
  const resizingRow = useRef<{ index: number; startY: number; startH: number } | null>(null);

  // Build a peer map: cellId → PresenceEntry
  const peerCellMap = new Map<CellId, PresenceEntry>();
  for (const peer of peers) {
    if (peer.selectedCell) peerCellMap.set(peer.selectedCell, peer);
  }

  function getColWidth(col: number) {
    return (doc.colWidths?.[col] as number) || DEFAULT_COL_WIDTH;
  }
  function getRowHeight(row: number) {
    return (doc.rowHeights?.[row] as number) || DEFAULT_ROW_HEIGHT;
  }

  const selectCell = useCallback((id: CellId) => {
    setSelectedCell(id);
    setEditingCell(null);
    onSelectedCellChange(id);
    const cell = doc.cells?.[id];
    setFormulaBarValue(cell?.raw ?? "");
  }, [doc.cells, onSelectedCellChange]);

  const startEdit = useCallback((id: CellId) => {
    setSelectedCell(id);
    setEditingCell(id);
    onSelectedCellChange(id);
    const cell = doc.cells?.[id];
    setFormulaBarValue(cell?.raw ?? "");
  }, [doc.cells, onSelectedCellChange]);

  const commitCell = useCallback((id: CellId, raw: string) => {
    setEditingCell(null);
    const trimmed = raw.trim();
    const computed = trimmed.startsWith("=")
      ? computeCell(trimmed, doc.cells ?? {})
      : undefined;
    onCellChange(id, { raw: trimmed, computed, format: doc.cells?.[id]?.format });
    setFormulaBarValue(trimmed);
  }, [doc.cells, onCellChange]);

  const abortEdit = useCallback(() => {
    setEditingCell(null);
    const cell = doc.cells?.[selectedCell];
    setFormulaBarValue(cell?.raw ?? "");
  }, [doc.cells, selectedCell]);

  const navigate = useCallback((from: CellId, direction: "up" | "down" | "left" | "right" | "tab" | "shift-tab") => {
    const parsed = parseCellId(from);
    if (!parsed) return;
    let { row, col } = parsed;

    switch (direction) {
      case "up": row = Math.max(0, row - 1); break;
      case "down": row = Math.min(INITIAL_ROWS - 1, row + 1); break;
      case "left": col = Math.max(0, col - 1); break;
      case "right": col = Math.min(INITIAL_COLS - 1, col + 1); break;
      case "tab": col = Math.min(INITIAL_COLS - 1, col + 1); break;
      case "shift-tab": col = Math.max(0, col - 1); break;
    }

    const next = cellId(row, col);
    selectCell(next);

    // Scroll to cell
    const el = document.querySelector(`[data-cell-id="${next}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selectCell]);

  function applyFormat(patch: Partial<CellFormat>) {
    if (!selectedCell) return;
    const existing = doc.cells?.[selectedCell];
    const newFmt = { ...(existing?.format ?? {}), ...patch };
    onCellChange(selectedCell, {
      raw: existing?.raw ?? "",
      computed: existing?.computed,
      format: newFmt,
    });
  }

  // ─── Column resize ────────────────────────────────────────────────────────

  function handleColResizeStart(e: React.MouseEvent, colIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      index: colIndex,
      startX: e.clientX,
      startW: getColWidth(colIndex),
    };

    function onMove(me: MouseEvent) {
      if (!resizingCol.current) return;
      const delta = me.clientX - resizingCol.current.startX;
      const newW = Math.max(40, resizingCol.current.startW + delta);
      onColWidthChange(resizingCol.current.index, newW);
    }

    function onUp() {
      resizingCol.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ─── Row resize ───────────────────────────────────────────────────────────

  function handleRowResizeStart(e: React.MouseEvent, rowIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    resizingRow.current = {
      index: rowIndex,
      startY: e.clientY,
      startH: getRowHeight(rowIndex),
    };

    function onMove(me: MouseEvent) {
      if (!resizingRow.current) return;
      const delta = me.clientY - resizingRow.current.startY;
      const newH = Math.max(18, resizingRow.current.startH + delta);
      onRowHeightChange(resizingRow.current.index, newH);
    }

    function onUp() {
      resizingRow.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ─── Column reorder (drag) ────────────────────────────────────────────────

  function handleColDragStart(e: React.DragEvent, displayIndex: number) {
    dragColRef.current = displayIndex;
    e.dataTransfer.effectAllowed = "move";
  }

  function handleColDragOver(e: React.DragEvent, displayIndex: number) {
    e.preventDefault();
    dragOverColRef.current = displayIndex;
  }

  function handleColDrop(e: React.DragEvent, displayIndex: number) {
    e.preventDefault();
    const from = dragColRef.current;
    const to = displayIndex;
    if (from === null || from === to) return;

    setColOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

    dragColRef.current = null;
    dragOverColRef.current = null;
  }

  // ─── Formula bar sync ─────────────────────────────────────────────────────

  useEffect(() => {
    const cell = doc.cells?.[selectedCell];
    if (editingCell !== selectedCell) {
      setFormulaBarValue(cell?.raw ?? "");
    }
  }, [doc.cells, selectedCell, editingCell]);

  // ─── Global keyboard shortcuts ────────────────────────────────────────────

  function handleGridKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (editingCell) return;

    // Formatting shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      applyFormat({ bold: !(doc.cells?.[selectedCell]?.format?.bold) });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      applyFormat({ italic: !(doc.cells?.[selectedCell]?.format?.italic) });
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const selectedFmt = doc.cells?.[selectedCell]?.format ?? {};

  return (
    <div className="flex flex-col flex-1 min-h-0 outline-none" onKeyDown={handleGridKeyDown} tabIndex={0}>
      <FormatToolbar format={selectedFmt} onChange={applyFormat} />
      <FormulaBar
        selectedCellId={selectedCell}
        cellData={doc.cells?.[selectedCell]}
        isEditing={editingCell === selectedCell}
        editValue={formulaBarValue}
        onEditValueChange={setFormulaBarValue}
        onCommit={() => { if (editingCell) commitCell(editingCell, formulaBarValue); }}
        onAbort={abortEdit}
      />

      {/* Scrollable grid */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative"
        style={{ scrollbarGutter: "stable" }}
      >
        <table
          className="border-collapse"
          style={{ tableLayout: "fixed" }}
        >
          {/* Column headers */}
          <thead className="sticky top-0 z-30">
            <tr>
              {/* Corner cell */}
              <th
                className="sticky left-0 z-40 bg-surface-2 border-b border-r border-surface-3"
                style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH }}
              />
              {colOrder.map((actualCol, displayIdx) => {
                const w = getColWidth(actualCol);
                return (
                  <th
                    key={actualCol}
                    draggable
                    onDragStart={(e) => handleColDragStart(e, displayIdx)}
                    onDragOver={(e) => handleColDragOver(e, displayIdx)}
                    onDrop={(e) => handleColDrop(e, displayIdx)}
                    className="relative bg-surface-2 border-b border-r border-surface-3
                      text-ink-faint text-[11px] font-mono font-normal text-center
                      select-none cursor-grab active:cursor-grabbing hover:bg-surface-3 transition-colors"
                    style={{ width: w, minWidth: w, height: DEFAULT_ROW_HEIGHT }}
                  >
                    {colIndexToLetter(actualCol)}
                    {/* Resize handle */}
                    <div
                      className="absolute top-0 right-0 h-full cursor-col-resize hover:bg-accent/40 transition-colors"
                      style={{ width: RESIZE_HANDLE_PX }}
                      onMouseDown={(e) => handleColResizeStart(e, actualCol)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {Array.from({ length: INITIAL_ROWS }, (_, rowIdx) => {
              const rh = getRowHeight(rowIdx);
              return (
                <tr key={rowIdx}>
                  {/* Row header */}
                  <td
                    className="sticky left-0 z-20 bg-surface-2 border-b border-r border-surface-3
                      text-ink-faint text-[11px] font-mono text-right pr-2 select-none relative"
                    style={{ width: ROW_HEADER_WIDTH, minWidth: ROW_HEADER_WIDTH, height: rh }}
                  >
                    {rowIdx + 1}
                    {/* Row resize handle */}
                    <div
                      className="absolute bottom-0 left-0 w-full cursor-row-resize hover:bg-accent/40 transition-colors"
                      style={{ height: RESIZE_HANDLE_PX }}
                      onMouseDown={(e) => handleRowResizeStart(e, rowIdx)}
                    />
                  </td>

                  {colOrder.map((actualCol) => {
                    const id = cellId(rowIdx, actualCol);
                    return (
                      <td
                        key={actualCol}
                        data-cell-id={id}
                        className="p-0"
                        style={{ width: getColWidth(actualCol), height: rh }}
                      >
                        <Cell
                          id={id}
                          data={doc.cells?.[id]}
                          isSelected={selectedCell === id}
                          isEditing={editingCell === id}
                          peerOn={peerCellMap.get(id)}
                          colWidth={getColWidth(actualCol)}
                          rowHeight={rh}
                          onSelect={selectCell}
                          onStartEdit={startEdit}
                          onCommit={commitCell}
                          onAbort={abortEdit}
                          onNavigate={navigate}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

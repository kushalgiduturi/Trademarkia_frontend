"use client";

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import type { CellData, CellFormat, PresenceEntry, CellId } from "@/types";
import clsx from "clsx";

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 24;

type CellProps = {
  id: CellId;
  data: CellData | undefined;
  isSelected: boolean;
  isEditing: boolean;
  peerOn: PresenceEntry | undefined;
  colWidth: number;
  rowHeight: number;
  onSelect: (id: CellId) => void;
  onStartEdit: (id: CellId) => void;
  onCommit: (id: CellId, raw: string) => void;
  onAbort: () => void;
  onNavigate: (id: CellId, direction: "up" | "down" | "left" | "right" | "tab" | "shift-tab") => void;
};

export function Cell({
  id,
  data,
  isSelected,
  isEditing,
  peerOn,
  colWidth,
  rowHeight,
  onSelect,
  onStartEdit,
  onCommit,
  onAbort,
  onNavigate,
}: CellProps) {
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(data?.raw ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isEditing, data?.raw]);

  const displayValue = data
    ? (data.computed !== undefined ? data.computed : data.raw)
    : "";

  const fmt: CellFormat = data?.format ?? {};

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit(id, editValue);
      onNavigate(id, "down");
    } else if (e.key === "Tab") {
      e.preventDefault();
      onCommit(id, editValue);
      onNavigate(id, e.shiftKey ? "shift-tab" : "tab");
    } else if (e.key === "Escape") {
      onAbort();
    } else if (e.key === "ArrowUp" && !editValue.startsWith("=")) {
      e.preventDefault();
      onCommit(id, editValue);
      onNavigate(id, "up");
    } else if (e.key === "ArrowDown" && !editValue.startsWith("=")) {
      e.preventDefault();
      onCommit(id, editValue);
      onNavigate(id, "down");
    }
  }

  function handleCellKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!isEditing) {
      if (e.key === "ArrowUp") { e.preventDefault(); onNavigate(id, "up"); }
      else if (e.key === "ArrowDown") { e.preventDefault(); onNavigate(id, "down"); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); onNavigate(id, "left"); }
      else if (e.key === "ArrowRight") { e.preventDefault(); onNavigate(id, "right"); }
      else if (e.key === "Tab") { e.preventDefault(); onNavigate(id, e.shiftKey ? "shift-tab" : "tab"); }
      else if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); onStartEdit(id); }
      else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onCommit(id, "");
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        // Start editing immediately with the typed character
        setEditValue(e.key);
        onStartEdit(id);
      }
    }
  }

  function handleDoubleClick() {
    onStartEdit(id);
  }

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    onSelect(id);
  }

  const w = colWidth ?? DEFAULT_COL_WIDTH;
  const h = rowHeight ?? DEFAULT_ROW_HEIGHT;

  return (
    <div
      tabIndex={isSelected ? 0 : -1}
      role="gridcell"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      className={clsx(
        "relative border-b border-r border-surface-3 overflow-hidden outline-none",
        "flex items-center",
        isSelected && !peerOn && "ring-1 ring-inset ring-accent z-10",
        peerOn && "ring-1 ring-inset z-10"
      )}
      style={{
        width: w,
        minWidth: w,
        maxWidth: w,
        height: h,
        minHeight: h,
        ringColor: peerOn?.color,
        ...(peerOn ? { boxShadow: `inset 0 0 0 1px ${peerOn.color}` } : {}),
        backgroundColor: fmt.bgColor ?? undefined,
      }}
    >
      {/* Peer indicator dot */}
      {peerOn && (
        <div
          className="absolute top-0 left-0 w-2 h-2 z-20"
          style={{ backgroundColor: peerOn.color }}
          title={peerOn.displayName}
        />
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommit(id, editValue)}
          className="absolute inset-0 w-full h-full px-1.5 bg-surface-2
            text-ink text-xs font-mono outline-none border border-accent/70 z-20"
          style={{ boxSizing: "border-box" }}
          spellCheck={false}
        />
      ) : (
        <span
          className={clsx(
            "px-1.5 text-xs truncate select-none w-full",
            fmt.bold && "font-bold",
            fmt.italic && "italic",
            fmt.align === "center" && "text-center",
            fmt.align === "right" && "text-right",
            !fmt.align && "text-left"
          )}
          style={{
            fontFamily: "var(--font-mono)",
            color: fmt.color ?? (displayValue.startsWith("#") ? "#f87171" : "#e2e8f0"),
          }}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}

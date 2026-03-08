"use client";

import type { CellFormat } from "@/types";
import clsx from "clsx";

type Props = {
  format: CellFormat;
  onChange: (patch: Partial<CellFormat>) => void;
};

const PRESET_COLORS = [
  "#e2e8f0", "#f87171", "#fbbf24", "#4ade80",
  "#60a5fa", "#a78bfa", "#f472b6", "#6ee7b7",
];

const PRESET_BG = [
  "transparent", "#1a1a24", "#2d1515", "#1a2a15",
  "#15202d", "#1e1530", "#2d1525", "#152d25",
];

export function FormatToolbar({ format, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 px-2 h-9 border-b border-surface-3 bg-surface-1 overflow-x-auto shrink-0">
      <ToolbarButton
        active={format.bold}
        onClick={() => onChange({ bold: !format.bold })}
        title="Bold (Ctrl+B)"
      >
        <span className="font-bold font-mono text-xs">B</span>
      </ToolbarButton>

      <ToolbarButton
        active={format.italic}
        onClick={() => onChange({ italic: !format.italic })}
        title="Italic (Ctrl+I)"
      >
        <span className="italic font-mono text-xs">I</span>
      </ToolbarButton>

      <div className="w-px h-5 bg-surface-4 mx-1" />

      {/* Text align */}
      <ToolbarButton
        active={!format.align || format.align === "left"}
        onClick={() => onChange({ align: "left" })}
        title="Align left"
      >
        <AlignLeftIcon />
      </ToolbarButton>
      <ToolbarButton
        active={format.align === "center"}
        onClick={() => onChange({ align: "center" })}
        title="Align center"
      >
        <AlignCenterIcon />
      </ToolbarButton>
      <ToolbarButton
        active={format.align === "right"}
        onClick={() => onChange({ align: "right" })}
        title="Align right"
      >
        <AlignRightIcon />
      </ToolbarButton>

      <div className="w-px h-5 bg-surface-4 mx-1" />

      {/* Text color swatches */}
      <span className="text-ink-faint text-[10px] font-mono mr-1">text</span>
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          title={`Text color ${c}`}
          onClick={() => onChange({ color: c })}
          className={clsx(
            "w-4 h-4 rounded-sm border transition-transform hover:scale-110",
            format.color === c ? "border-accent" : "border-surface-4"
          )}
          style={{ backgroundColor: c }}
        />
      ))}

      <div className="w-px h-5 bg-surface-4 mx-1" />

      {/* BG color swatches */}
      <span className="text-ink-faint text-[10px] font-mono mr-1">fill</span>
      {PRESET_BG.map((c) => (
        <button
          key={c}
          title={`Background ${c}`}
          onClick={() => onChange({ bgColor: c === "transparent" ? undefined : c })}
          className={clsx(
            "w-4 h-4 rounded-sm border transition-transform hover:scale-110",
            (c === "transparent" ? !format.bgColor : format.bgColor === c)
              ? "border-accent"
              : "border-surface-4"
          )}
          style={{ backgroundColor: c === "transparent" ? "#0a0a0f" : c }}
        />
      ))}
    </div>
  );
}

function ToolbarButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        "w-7 h-7 flex items-center justify-center rounded text-xs transition-all",
        active
          ? "bg-accent/20 text-accent border border-accent/30"
          : "text-ink-muted hover:bg-surface-3 hover:text-ink border border-transparent"
      )}
    >
      {children}
    </button>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="1" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="6" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AlignCenterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="1" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
function AlignRightIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <line x1="1" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

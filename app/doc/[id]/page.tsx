"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useDocument";
import { usePresence } from "@/hooks/usePresence";
import AuthScreen from "@/components/AuthScreen";
import { Grid } from "@/components/grid/Grid";
import { WriteStateIndicator } from "@/components/ui/WriteStateIndicator";
import { PresenceAvatars } from "@/components/presence/PresenceAvatars";
import { exportAndDownloadCsv, exportAndDownloadJson } from "@/lib/export";
import type { CellId } from "@/types";

type Params = { id: string };

export default function DocPage({ params }: { params: Params }) {
  const { id: docId } = params;
  const { user, loading: authLoading } = useAuth();
  const { doc, loading, writeState, updateCell, updateTitle, updateColWidth, updateRowHeight } = useDocument(docId);
  const { peers, setSelectedCell } = usePresence(docId, user);
  const router = useRouter();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [showExport, setShowExport] = useState(false);

  if (authLoading || loading) {
    return (
      <div className="h-screen bg-surface-0 flex items-center justify-center">
        <div className="font-mono text-ink-faint text-sm animate-pulse">loading…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (!doc) {
    return (
      <div className="h-screen bg-surface-0 flex flex-col items-center justify-center gap-4">
        <p className="text-ink-muted font-sans">Document not found.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-accent font-mono hover:underline"
        >
          ← back to dashboard
        </button>
      </div>
    );
  }

  function handleTitleBlur() {
    if (!editingTitle) return;
    setEditingTitle(false);
    const trimmed = titleValue.trim() || "Untitled Spreadsheet";
    if (trimmed !== doc?.title) updateTitle(trimmed);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditingTitle(false);
      setTitleValue(doc?.title ?? "");
    }
  }

  return (
    <div className="h-screen flex flex-col bg-surface-0 overflow-hidden">
      {/* Top bar */}
      <header className="shrink-0 h-12 border-b border-surface-3 bg-surface-1 flex items-center px-3 gap-3 z-50">
        {/* Back + Logo */}
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-ink-faint hover:text-ink-muted transition-colors group"
          title="Back to dashboard"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.7" />
            <rect x="10" y="1" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="1" y="10" width="5" height="5" rx="1" fill="currentColor" opacity="0.5" />
            <rect x="10" y="10" width="5" height="5" rx="1" fill="currentColor" opacity="0.3" />
          </svg>
          <span className="font-mono text-xs">gridfire</span>
        </button>

        <div className="w-px h-5 bg-surface-4" />

        {/* Title */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="text-sm font-sans font-medium text-ink bg-surface-2 border border-accent/40
              rounded px-2 py-0.5 outline-none focus:border-accent/70 min-w-0 max-w-xs"
          />
        ) : (
          <button
            onClick={() => {
              setTitleValue(doc.title);
              setEditingTitle(true);
            }}
            className="text-sm font-sans font-medium text-ink hover:text-ink/80 transition-colors
              truncate max-w-xs"
            title="Click to rename"
          >
            {doc.title}
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Write state */}
        <WriteStateIndicator state={writeState} />

        {/* Export */}
        <div className="relative">
          <button
            onClick={() => setShowExport((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-ink-muted
              hover:bg-surface-3 hover:text-ink transition-all text-xs font-mono"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v7M3 5l3 3 3-3M1 9.5V11h10V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            export
          </button>

          {showExport && (
            <div className="absolute right-0 top-full mt-1 w-36 rounded-lg bg-surface-2 border border-surface-4 shadow-xl z-50 overflow-hidden animate-slide-in">
              <button
                onClick={() => { exportAndDownloadCsv(doc); setShowExport(false); }}
                className="w-full px-4 py-2.5 text-left text-xs font-mono text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
              >
                Export as CSV
              </button>
              <button
                onClick={() => { exportAndDownloadJson(doc); setShowExport(false); }}
                className="w-full px-4 py-2.5 text-left text-xs font-mono text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
              >
                Export as JSON
              </button>
            </div>
          )}
        </div>

        {/* Presence */}
        <PresenceAvatars user={user} peers={peers} />
      </header>

      {/* Grid */}
      <div className="flex-1 min-h-0">
        <Grid
          doc={doc}
          user={user}
          peers={peers}
          writeState={writeState}
          onCellChange={(id, data) => updateCell(id, data)}
          onColWidthChange={updateColWidth}
          onRowHeightChange={updateRowHeight}
          onSelectedCellChange={(id: CellId | null) => setSelectedCell(id)}
        />
      </div>
    </div>
  );
}

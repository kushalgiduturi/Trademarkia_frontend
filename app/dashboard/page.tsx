"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AuthScreen from "@/components/AuthScreen";
import { subscribeToDocumentList, createDocument, deleteDocument } from "@/lib/db";
import { signOut } from "@/lib/auth";
import type { DocumentMeta } from "@/types";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToDocumentList(setDocs);
    return unsub;
  }, [user]);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    try {
      const id = await createDocument(user.uid, user.displayName);
      router.push(`/doc/${id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, docId: string) {
    e.stopPropagation();
    if (!confirm("Delete this document?")) return;
    await deleteDocument(docId);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="font-mono text-ink-faint text-sm animate-pulse">loading…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#6ee7b7 1px, transparent 1px), linear-gradient(90deg, #6ee7b7 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-surface-3 bg-surface-1/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-accent/20 border border-accent/30 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="#6ee7b7" />
                <rect x="10" y="1" width="5" height="5" rx="1" fill="#6ee7b7" opacity="0.6" />
                <rect x="1" y="10" width="5" height="5" rx="1" fill="#6ee7b7" opacity="0.6" />
                <rect x="10" y="10" width="5" height="5" rx="1" fill="#6ee7b7" opacity="0.3" />
              </svg>
            </div>
            <span className="font-mono text-base font-bold text-ink tracking-tight">gridfire</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold text-surface-0"
                style={{ backgroundColor: user.color }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-ink-muted text-sm font-sans">{user.displayName}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs text-ink-faint hover:text-ink-muted font-mono transition-colors"
            >
              sign out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-sans font-semibold text-ink">Documents</h1>
            <p className="text-ink-muted text-sm font-sans mt-1">
              {docs.length === 0 ? "No documents yet" : `${docs.length} document${docs.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-surface-0
              text-sm font-sans font-medium hover:bg-accent/90 transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            {creating ? "Creating…" : "New spreadsheet"}
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="border border-dashed border-surface-4 rounded-xl p-16 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-surface-3 flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#475569" />
                <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#475569" opacity="0.6" />
                <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#475569" opacity="0.6" />
                <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#475569" opacity="0.3" />
              </svg>
            </div>
            <p className="text-ink-muted text-sm font-sans">Create your first spreadsheet to get started</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                currentUserId={user.uid}
                onOpen={() => router.push(`/doc/${doc.id}`)}
                onDelete={(e) => handleDelete(e, doc.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DocCard({
  doc,
  currentUserId,
  onOpen,
  onDelete,
}: {
  doc: DocumentMeta;
  currentUserId: string;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center justify-between px-5 py-4 rounded-xl
        bg-surface-1 border border-surface-3 cursor-pointer
        hover:bg-surface-2 hover:border-surface-4 transition-all duration-150
        group animate-fade-in"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-lg bg-surface-2 border border-surface-3 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="4" height="4" rx="0.5" fill="#475569" />
            <rect x="7" y="1" width="4" height="4" rx="0.5" fill="#475569" opacity="0.7" />
            <rect x="1" y="7" width="4" height="4" rx="0.5" fill="#475569" opacity="0.7" />
            <rect x="7" y="7" width="4" height="4" rx="0.5" fill="#475569" opacity="0.4" />
            <rect x="1" y="13" width="4" height="1.5" rx="0.5" fill="#475569" opacity="0.4" />
            <rect x="7" y="13" width="4" height="1.5" rx="0.5" fill="#475569" opacity="0.3" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-sans font-medium text-ink leading-tight">{doc.title}</p>
          <p className="text-xs font-sans text-ink-faint mt-0.5">
            {doc.ownerName}{doc.ownerId !== currentUserId ? "" : " (you)"}
            {" · "}
            {formatRelativeTime(doc.updatedAt)}
          </p>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-ink-faint
          hover:text-accent-red hover:bg-accent-red/10 transition-all duration-150"
        title="Delete document"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5.5 3.5V2.5h3V3.5M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

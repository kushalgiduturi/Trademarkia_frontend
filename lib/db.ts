import {
  ref,
  set,
  get,
  update,
  push,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { db } from "./firebase";
import type {
  DocumentMeta,
  DocumentData,
  CellData,
  CellId,
  PresenceEntry,
} from "@/types";
import { recomputeAll } from "./formula";

// ─── Documents ────────────────────────────────────────────────────────────────

export async function createDocument(
  userId: string,
  userName: string,
  title = "Untitled Spreadsheet"
): Promise<string> {
  const docRef = push(ref(db, "documents"));
  const id = docRef.key!;

  const now = Date.now();
  const data: DocumentData = {
    id,
    title,
    ownerId: userId,
    ownerName: userName,
    createdAt: now,
    updatedAt: now,
    cells: {},
    colWidths: {},
    rowHeights: {},
  };

  await set(docRef, data);
  return id;
}

export async function listDocuments(): Promise<DocumentMeta[]> {
  const snap = await get(ref(db, "documents"));
  if (!snap.exists()) return [];

  const docs: DocumentMeta[] = [];
  snap.forEach((child) => {
    const d = child.val() as DocumentData;
    docs.push({
      id: d.id,
      title: d.title,
      ownerId: d.ownerId,
      ownerName: d.ownerName,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    });
  });

  return docs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function subscribeToDocument(
  docId: string,
  callback: (data: DocumentData | null) => void
): Unsubscribe {
  return onValue(ref(db, `documents/${docId}`), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const raw = snap.val() as DocumentData;
    // Recompute formula cells on every sync
    const computed = { ...raw, cells: recomputeAll(raw.cells ?? {}) };
    callback(computed);
  });
}

export function subscribeToDocumentList(
  callback: (docs: DocumentMeta[]) => void
): Unsubscribe {
  return onValue(ref(db, "documents"), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const docs: DocumentMeta[] = [];
    snap.forEach((child) => {
      const d = child.val() as DocumentData;
      docs.push({
        id: d.id,
        title: d.title,
        ownerId: d.ownerId,
        ownerName: d.ownerName,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      });
    });
    callback(docs.sort((a, b) => b.updatedAt - a.updatedAt));
  });
}

export async function updateDocumentTitle(
  docId: string,
  title: string
): Promise<void> {
  await update(ref(db, `documents/${docId}`), {
    title,
    updatedAt: Date.now(),
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  await remove(ref(db, `documents/${docId}`));
  // Also remove presence data
  await remove(ref(db, `presence/${docId}`));
}

// ─── Cells ────────────────────────────────────────────────────────────────────

/**
 * Write a single cell. We write to the raw path — Firebase RTDB uses last-write-wins.
 * This is intentional: for a spreadsheet, the last keystroke wins is the right
 * semantic. If we wanted OT we'd use a different structure, but that's out of scope.
 */
export async function updateCell(
  docId: string,
  cellId: CellId,
  data: CellData
): Promise<void> {
  await set(ref(db, `documents/${docId}/cells/${cellId}`), data);
  await update(ref(db, `documents/${docId}`), { updatedAt: Date.now() });
}

export async function updateColWidth(
  docId: string,
  colIndex: number,
  width: number
): Promise<void> {
  await set(ref(db, `documents/${docId}/colWidths/${colIndex}`), width);
}

export async function updateRowHeight(
  docId: string,
  rowIndex: number,
  height: number
): Promise<void> {
  await set(ref(db, `documents/${docId}/rowHeights/${rowIndex}`), height);
}

// ─── Presence ─────────────────────────────────────────────────────────────────

/**
 * Presence uses onDisconnect to clean up automatically when a user disconnects.
 * We write ephemeral data to presence/{docId}/{uid} and register onDisconnect
 * to remove it. This means presence is always accurate within a few seconds.
 */
export async function joinDocument(
  docId: string,
  entry: PresenceEntry
): Promise<() => void> {
  const presRef = ref(db, `presence/${docId}/${entry.uid}`);

  await set(presRef, { ...entry, lastSeen: serverTimestamp() });
  // Auto-remove on disconnect
  await onDisconnect(presRef).remove();

  return async () => {
    await remove(presRef);
  };
}

export async function updatePresence(
  docId: string,
  uid: string,
  partial: Partial<PresenceEntry>
): Promise<void> {
  await update(ref(db, `presence/${docId}/${uid}`), {
    ...partial,
    lastSeen: serverTimestamp(),
  });
}

export function subscribeToPresence(
  docId: string,
  callback: (entries: PresenceEntry[]) => void
): Unsubscribe {
  return onValue(ref(db, `presence/${docId}`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const now = Date.now();
    const entries: PresenceEntry[] = [];
    snap.forEach((child) => {
      const e = child.val() as PresenceEntry & { lastSeen: number };
      // Filter out stale entries (> 30 s since last heartbeat)
      if (now - (e.lastSeen ?? 0) < 30_000) {
        entries.push(e);
      }
    });
    callback(entries);
  });
}

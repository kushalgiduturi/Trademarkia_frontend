"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DocumentData, CellData, CellId, WriteState } from "@/types";
import {
  subscribeToDocument,
  updateCell as dbUpdateCell,
  updateDocumentTitle,
  updateColWidth as dbUpdateColWidth,
  updateRowHeight as dbUpdateRowHeight,
} from "@/lib/db";

const DEBOUNCE_MS = 400;

export function useDocument(docId: string) {
  const [doc, setDoc] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [writeState, setWriteState] = useState<WriteState>("idle");
  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = subscribeToDocument(docId, (data) => {
      setDoc(data);
      setLoading(false);
    });
    return unsub;
  }, [docId]);

  const markSaved = useCallback(() => {
    setWriteState("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setWriteState("idle"), 2000);
  }, []);

  /**
   * Debounced cell update.
   *
   * Design: we debounce per cell-id so rapid keystrokes don't flood Firebase.
   * Debounce window is 400 ms — fast enough to feel real-time, slow enough to
   * batch rapid edits. During the window the local doc state updates
   * optimistically via the subscribeToDocument callback (Firebase RTDB echoes
   * the write back to the same client).
   */
  const updateCell = useCallback(
    (cellId: CellId, data: CellData) => {
      setWriteState("saving");

      const key = `cell:${cellId}`;
      const existing = pendingTimers.current.get(key);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        pendingTimers.current.delete(key);
        try {
          await dbUpdateCell(docId, cellId, data);
          if (pendingTimers.current.size === 0) markSaved();
        } catch {
          setWriteState("error");
        }
      }, DEBOUNCE_MS);

      pendingTimers.current.set(key, timer);
    },
    [docId, markSaved]
  );

  const updateTitle = useCallback(
    async (title: string) => {
      setWriteState("saving");
      try {
        await updateDocumentTitle(docId, title);
        markSaved();
      } catch {
        setWriteState("error");
      }
    },
    [docId, markSaved]
  );

  const updateColWidth = useCallback(
    async (colIndex: number, width: number) => {
      await dbUpdateColWidth(docId, colIndex, width);
    },
    [docId]
  );

  const updateRowHeight = useCallback(
    async (rowIndex: number, height: number) => {
      await dbUpdateRowHeight(docId, rowIndex, height);
    },
    [docId]
  );

  return { doc, loading, writeState, updateCell, updateTitle, updateColWidth, updateRowHeight };
}

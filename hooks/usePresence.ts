"use client";

import { useEffect, useRef, useCallback } from "react";
import type { AppUser, PresenceEntry } from "@/types";
import type { CellId } from "@/types";
import {
  joinDocument,
  updatePresence,
  subscribeToPresence,
} from "@/lib/db";
import { useState } from "react";

const HEARTBEAT_INTERVAL = 10_000;

export function usePresence(docId: string, user: AppUser | null) {
  const [peers, setPeers] = useState<PresenceEntry[]>([]);
  const leaveRef = useRef<(() => void) | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;

    const entry: PresenceEntry = {
      uid: user.uid,
      displayName: user.displayName,
      color: user.color,
      selectedCell: null,
      lastSeen: Date.now(),
    };

    let active = true;

    joinDocument(docId, entry).then((leave) => {
      if (!active) { void leave(); return; }
      leaveRef.current = leave;
    });

    // Heartbeat keeps lastSeen fresh so stale detection works
    heartbeatRef.current = setInterval(() => {
      if (!active) return;
      void updatePresence(docId, user.uid, { lastSeen: Date.now() });
    }, HEARTBEAT_INTERVAL);

    return () => {
      active = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (leaveRef.current) void leaveRef.current();
    };
  }, [docId, user]);

  useEffect(() => {
    const unsub = subscribeToPresence(docId, (entries) => {
      // Filter out our own presence from peers list (we know we're here)
      setPeers(entries.filter((e) => e.uid !== user?.uid));
    });
    return unsub;
  }, [docId, user?.uid]);

  const setSelectedCell = useCallback(
    (cellId: CellId | null) => {
      if (!user) return;
      void updatePresence(docId, user.uid, { selectedCell: cellId });
    },
    [docId, user]
  );

  return { peers, setSelectedCell };
}

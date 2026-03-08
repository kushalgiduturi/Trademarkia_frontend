"use client";

import type { PresenceEntry } from "@/types";
import type { AppUser } from "@/types";

type Props = {
  user: AppUser | null;
  peers: PresenceEntry[];
};

export function PresenceAvatars({ user, peers }: Props) {
  const all = [
    ...(user ? [{ uid: user.uid, displayName: user.displayName, color: user.color, isSelf: true }] : []),
    ...peers.map((p) => ({ ...p, isSelf: false })),
  ];

  return (
    <div className="flex items-center gap-1">
      {all.map((entry, i) => (
        <div
          key={entry.uid}
          title={`${entry.displayName}${entry.isSelf ? " (you)" : ""}`}
          className="relative"
          style={{ zIndex: all.length - i }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold text-surface-0 border-2 border-surface-1 select-none cursor-default"
            style={{ backgroundColor: entry.color }}
          >
            {entry.displayName.charAt(0).toUpperCase()}
          </div>
          {entry.isSelf && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border border-surface-1" />
          )}
        </div>
      ))}
      {all.length > 1 && (
        <span className="text-ink-faint text-xs font-mono ml-1">
          {all.length} online
        </span>
      )}
    </div>
  );
}

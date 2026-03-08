"use client";

import type { WriteState } from "@/types";
import clsx from "clsx";

export function WriteStateIndicator({ state }: { state: WriteState }) {
  if (state === "idle") return null;

  return (
    <div className={clsx(
      "flex items-center gap-1.5 text-xs font-mono animate-fade-in",
      state === "saving" && "text-ink-muted",
      state === "saved" && "text-accent",
      state === "error" && "text-accent-red"
    )}>
      {state === "saving" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-pulse-dot" />
          saving
        </>
      )}
      {state === "saved" && (
        <>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          saved
        </>
      )}
      {state === "error" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-red" />
          save failed
        </>
      )}
    </div>
  );
}

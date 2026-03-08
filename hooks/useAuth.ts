"use client";

import { useState, useEffect } from "react";
import type { AppUser } from "@/types";
import { onUser } from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onUser((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}

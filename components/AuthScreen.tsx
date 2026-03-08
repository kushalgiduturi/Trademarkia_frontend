"use client";

import { useState } from "react";
import { signInWithGoogle, signInAnon } from "@/lib/auth";

export default function AuthScreen() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"pick" | "name">("pick");

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch {
      setError("Google sign-in failed. Try guest mode.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGuest() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter a display name."); return; }
    setLoading(true);
    setError("");
    try {
      await signInAnon(trimmed);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      {/* Background grid texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#6ee7b7 1px, transparent 1px), linear-gradient(90deg, #6ee7b7 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo / Brand */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded bg-accent/20 border border-accent/40 flex items-center justify-center">
              <GridIcon />
            </div>
            <span className="font-mono text-xl text-ink font-bold tracking-tight">
              gridfire
            </span>
          </div>
          <p className="text-ink-muted text-sm font-sans">
            Real-time collaborative spreadsheets
          </p>
        </div>

        {mode === "pick" ? (
          <div className="space-y-3">
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                bg-surface-3 border border-surface-4 text-ink text-sm font-sans font-medium
                hover:bg-surface-4 hover:border-ink/20 transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              onClick={() => setMode("name")}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg
                bg-accent/10 border border-accent/30 text-accent text-sm font-sans font-medium
                hover:bg-accent/20 hover:border-accent/50 transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue as guest
            </button>

            {error && (
              <p className="text-accent-red text-xs text-center animate-slide-in">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 animate-slide-in">
            <input
              autoFocus
              type="text"
              placeholder="Your display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGuest(); }}
              className="w-full px-4 py-3 rounded-lg bg-surface-2 border border-surface-4
                text-ink text-sm font-sans placeholder-ink-faint
                focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20
                transition-all duration-150"
            />

            <div className="flex gap-2">
              <button
                onClick={() => { setMode("pick"); setError(""); }}
                className="flex-1 px-4 py-3 rounded-lg bg-surface-2 border border-surface-4
                  text-ink-muted text-sm font-sans hover:bg-surface-3 transition-all duration-150"
              >
                Back
              </button>
              <button
                onClick={handleGuest}
                disabled={loading || !name.trim()}
                className="flex-1 px-4 py-3 rounded-lg bg-accent text-surface-0
                  text-sm font-sans font-medium hover:bg-accent/90 transition-all duration-150
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? "…" : "Join"}
              </button>
            </div>

            {error && (
              <p className="text-accent-red text-xs text-center animate-slide-in">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill="#6ee7b7" />
      <rect x="10" y="1" width="5" height="5" rx="1" fill="#6ee7b7" opacity="0.6" />
      <rect x="1" y="10" width="5" height="5" rx="1" fill="#6ee7b7" opacity="0.6" />
      <rect x="10" y="10" width="5" height="5" rx="1" fill="#6ee7b7" opacity="0.3" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

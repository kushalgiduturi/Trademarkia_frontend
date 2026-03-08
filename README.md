# Gridfire

A lightweight, real-time collaborative spreadsheet built with Next.js 14 (App Router), Firebase Realtime Database, and TypeScript.

Live demo: _deploy to Vercel and add URL here_

---

## Architecture decisions

### Where state lives

State is split into three layers:

| Layer | Location | Rationale |
|-------|----------|-----------|
| Document data | Firebase RTDB | Single source of truth; all clients subscribe to `documents/{id}` |
| Cell edits (in-flight) | React component state | Local-only until debounce fires; avoids flooding RTDB on every keystroke |
| Presence | Firebase RTDB `presence/{docId}/{uid}` | Ephemeral; uses `onDisconnect().remove()` for automatic cleanup |

### Contention handling

Firebase RTDB uses a **last-write-wins** model at the path level. For a spreadsheet this is the correct semantic: if two users edit the same cell, the last commit wins, just like Google Sheets. We write at the granularity of a single cell (`documents/{id}/cells/{cellId}`) so concurrent edits to *different* cells never conflict.

A more sophisticated approach would be OT (operational transformation) or CRDTs per cell. That's out of scope here; the tradeoff is documented and deliberate.

**Debounce strategy**: Cell writes are debounced per cell-id at 400 ms. This means:
- Rapid keystrokes batch into a single write
- The write-state indicator ("saving" / "saved") gives the user clear feedback
- On disconnect mid-debounce, the last local state is lost — acceptable for this scope

### Real-time sync

`subscribeToDocument` wraps Firebase `onValue` which provides **real-time push** semantics. Every mutation (cell edit, title change, resize) echoes back to all connected clients within ~100 ms on a stable connection.

Formula cells are re-evaluated on every sync event client-side. This is intentional: the raw formula string is stored in RTDB; the computed value is derived state. Storing computed values in RTDB would create eventual-consistency bugs where a change to cell A1 would need to know which formulas reference it.

### Formula engine

We implement a **recursive-descent parser** rather than using `eval()` (XSS risk) or a third-party library (dependency bloat for a lightweight tool).

Supported:
- Arithmetic with correct precedence: `+`, `-`, `*`, `/`
- Cell references: `A1`, `B3`
- Ranges: `A1:C5`
- Functions: `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `IF`, `ROUND`, `ABS`, `SQRT`, `CONCAT`, `LEN`, `UPPER`, `LOWER`
- Comparison operators: `=`, `<>`, `<`, `<=`, `>`, `>=`
- Nested formulas up to depth 30 (circular reference guard)

Deliberately omitted: volatile functions (`NOW`, `RAND`), array formulas, named ranges. These require a scheduler and dependency graph that are out of scope.

### Presence

Presence is built on RTDB's `onDisconnect` primitive:
1. On join: write `presence/{docId}/{uid}` with the user's name, color, and selected cell
2. Register `onDisconnect().remove()` — Firebase server removes the entry if the WebSocket drops
3. Heartbeat every 10 s refreshes `lastSeen`; clients filter out entries older than 30 s
4. On clean navigation away: explicitly `remove()` the presence entry

This gives sub-second presence updates and self-healing on network failure.

### What we chose NOT to build

- **Undo/redo**: Requires an action log. The debounce model makes this tricky without a full event-sourced architecture.
- **Collaborative cursor OT**: Peer cursors show which cell a collaborator has selected, not a live caret within a cell. Full OT is a significant scope increase.
- **Virtual scrolling**: The grid renders all 50×26 cells. For a production app with 1000+ rows, react-virtual would be appropriate.
- **Offline support**: Firebase provides offline caching via `enablePersistence()` but enabling it in Next.js SSR requires careful initialization guards. Left out to keep the scope clean.

---

## Features

### Core
- ✅ Real-time sync across all open sessions of the same document
- ✅ Write-state indicator (saving / saved / error)
- ✅ Formula support: `=SUM(A1:B3)`, `=A1*B1+C1`, `=IF(A1>5,"yes","no")`, and more
- ✅ Document dashboard with title, last modified, and author
- ✅ Identity: Google Sign-In or guest display name; persistent color per user

### Presence
- ✅ Active users shown as avatars in the editor header
- ✅ Peer's currently selected cell highlighted with their color

### Bonus
- ✅ Cell formatting: bold, italic, text color, fill color, text alignment
- ✅ Column resize: drag the right edge of any column header
- ✅ Row resize: drag the bottom edge of any row header
- ✅ Column reorder: drag column headers to reorder
- ✅ Keyboard navigation: arrow keys, Tab, Shift+Tab, Enter, F2, Delete
- ✅ Export: CSV and JSON download

---

## Tech stack

| Concern | Choice | Why |
|---------|--------|-----|
| Framework | Next.js 14 App Router | Server components where possible; clean routing |
| Database | Firebase RTDB | Push-based sync, `onDisconnect` presence, generous free tier |
| Auth | Firebase Auth | Google + anonymous in one SDK |
| Styling | Tailwind CSS | Utility-first; no runtime |
| Types | TypeScript strict | Required by brief; catches shape mismatches at the DB boundary |

---

## Setup

### 1. Firebase project

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Realtime Database** (start in test mode for development)
3. Enable **Authentication** → Google and Anonymous providers
4. Copy your web app config

### 2. Environment

```bash
cp .env.local.example .env.local
# Fill in your Firebase config values
```

### 3. Firebase Realtime Database rules

```json
{
  "rules": {
    "documents": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "presence": {
      ".read": "auth != null",
      "$docId": {
        "$uid": {
          ".write": "auth != null && (auth.uid == $uid || !data.exists())"
        }
      }
    }
  }
}
```

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

```bash
vercel
# Set the NEXT_PUBLIC_FIREBASE_* env vars in the Vercel dashboard
```

Or connect your GitHub repo in the Vercel UI — it will auto-detect Next.js.

---

## Project structure

```
gridfire/
├── app/
│   ├── layout.tsx          # Root layout, font loading
│   ├── page.tsx            # Redirects → /dashboard
│   ├── dashboard/
│   │   └── page.tsx        # Document list
│   └── doc/[id]/
│       └── page.tsx        # Editor
├── components/
│   ├── AuthScreen.tsx      # Login / guest name entry
│   ├── grid/
│   │   ├── Grid.tsx        # Main grid, resize & reorder logic
│   │   ├── Cell.tsx        # Individual cell (edit/display)
│   │   ├── FormulaBar.tsx  # Address box + formula input
│   │   └── FormatToolbar.tsx
│   ├── presence/
│   │   └── PresenceAvatars.tsx
│   └── ui/
│       └── WriteStateIndicator.tsx
├── hooks/
│   ├── useAuth.ts          # Firebase auth state
│   ├── useDocument.ts      # Doc subscription + debounced writes
│   └── usePresence.ts      # Presence join/leave/heartbeat
├── lib/
│   ├── firebase.ts         # App init
│   ├── auth.ts             # Sign-in helpers, color assignment
│   ├── db.ts               # All RTDB operations
│   ├── formula.ts          # Recursive-descent formula parser
│   └── export.ts           # CSV / JSON export
└── types/
    └── index.ts            # Shared types + cell ID utilities
```

---

## Tradeoffs summary

**Last-write-wins vs OT**: LWW is correct for single-cell granularity. Two users editing *the same cell simultaneously* will have one change overwritten — this is visible behavior and acceptable at this scale. Google Sheets uses OT within a cell for character-level merging; that's a significant engineering investment.

**Client-side formula evaluation**: Formulas recompute on every sync. For large sheets with many formulas this creates redundant CPU work. A server-side compute step (Cloud Function) would be the right call at scale, but adds latency and complexity.

**50×26 grid**: Fixed dimensions keep the implementation simple. Extending to infinite scroll would use `react-virtual` or a canvas renderer (as Google Sheets does for performance).

// ─── Cell ─────────────────────────────────────────────────────────────────────

export type CellFormat = {
  bold?: boolean;
  italic?: boolean;
  color?: string; // hex
  bgColor?: string; // hex
  align?: "left" | "center" | "right";
};

export type CellData = {
  /** Raw value as entered (may be formula like "=SUM(A1:B3)") */
  raw: string;
  /** Computed display value */
  computed?: string;
  format?: CellFormat;
};

/** CellId is "A1", "B3", etc. */
export type CellId = string;

/** column index (0-based) → letter(s): 0→A, 25→Z, 26→AA */
export function colIndexToLetter(n: number): string {
  let s = "";
  let i = n;
  while (i >= 0) {
    s = String.fromCharCode((i % 26) + 65) + s;
    i = Math.floor(i / 26) - 1;
  }
  return s;
}

export function letterToColIndex(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function cellId(row: number, col: number): CellId {
  return `${colIndexToLetter(col)}${row + 1}`;
}

export function parseCellId(id: CellId): { row: number; col: number } | null {
  const match = id.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    col: letterToColIndex(match[1]),
    row: parseInt(match[2], 10) - 1,
  };
}

// ─── Document ─────────────────────────────────────────────────────────────────

export type DocumentMeta = {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  updatedAt: number;
};

export type DocumentData = DocumentMeta & {
  cells: Record<CellId, CellData>;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
};

// ─── Presence ─────────────────────────────────────────────────────────────────

export type PresenceEntry = {
  uid: string;
  displayName: string;
  color: string;
  selectedCell: CellId | null;
  lastSeen: number;
};

// ─── Write State ──────────────────────────────────────────────────────────────

export type WriteState = "idle" | "saving" | "saved" | "error";

// ─── User ─────────────────────────────────────────────────────────────────────

export type AppUser = {
  uid: string;
  displayName: string;
  email: string | null;
  color: string;
  isAnonymous: boolean;
};

import type { DocumentData } from "@/types";
import { colIndexToLetter } from "@/types";

/**
 * Export the document cells as a CSV string.
 * We find the bounding box of used cells and fill in the grid.
 */
export function exportToCsv(doc: DocumentData): string {
  const cells = doc.cells;
  const ids = Object.keys(cells);
  if (ids.length === 0) return "";

  let maxRow = 0;
  let maxCol = 0;

  for (const id of ids) {
    const match = id.match(/^([A-Z]+)(\d+)$/);
    if (!match) continue;
    const col = letterToColIndex(match[1]);
    const row = parseInt(match[2], 10) - 1;
    if (row > maxRow) maxRow = row;
    if (col > maxCol) maxCol = col;
  }

  const rows: string[] = [];
  for (let r = 0; r <= maxRow; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const id = `${colIndexToLetter(c)}${r + 1}`;
      const cell = cells[id];
      const val = cell ? (cell.computed ?? cell.raw) : "";
      // Escape commas and quotes
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        row.push(`"${val.replace(/"/g, '""')}"`);
      } else {
        row.push(val);
      }
    }
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function letterToColIndex(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64);
  }
  return n - 1;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAndDownloadCsv(doc: DocumentData): void {
  const csv = exportToCsv(doc);
  downloadFile(csv, `${doc.title}.csv`, "text/csv;charset=utf-8;");
}

export function exportAndDownloadJson(doc: DocumentData): void {
  const json = JSON.stringify(
    { title: doc.title, cells: doc.cells },
    null,
    2
  );
  downloadFile(json, `${doc.title}.json`, "application/json");
}

import type { CellData, CellId } from "@/types";
import { parseCellId, cellId } from "@/types";

type CellStore = Record<CellId, CellData>;
type Value = number | string | Array<number | string>;

type TokenType =
  | "NUMBER"
  | "STRING"
  | "IDENT"
  | "COLON"
  | "COMMA"
  | "LPAREN"
  | "RPAREN"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "EQ"
  | "NEQ"
  | "LT"
  | "LTE"
  | "GT"
  | "GTE"
  | "EOF";

type Token = { type: TokenType; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) { i++; continue; }

    if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] ?? ""))) {
      let num = "";
      while (i < expr.length && /[\d.]/.test(expr[i])) num += expr[i++];
      tokens.push({ type: "NUMBER", value: num });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let id = "";
      while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) id += expr[i++];
      tokens.push({ type: "IDENT", value: id.toUpperCase() });
      continue;
    }

    if (ch === '"') {
      let s = "";
      i++;
      while (i < expr.length && expr[i] !== '"') s += expr[i++];
      i++;
      tokens.push({ type: "STRING", value: s });
      continue;
    }

    const simple: Record<string, TokenType> = {
      "+": "PLUS", "-": "MINUS", "*": "STAR", "/": "SLASH",
      "(": "LPAREN", ")": "RPAREN", ":": "COLON", ",": "COMMA",
    };

    if (ch in simple) {
      tokens.push({ type: simple[ch], value: ch });
      i++;
      continue;
    }

    if (ch === "<") {
      if (expr[i + 1] === "=") { tokens.push({ type: "LTE", value: "<=" }); i += 2; }
      else if (expr[i + 1] === ">") { tokens.push({ type: "NEQ", value: "<>" }); i += 2; }
      else { tokens.push({ type: "LT", value: "<" }); i++; }
      continue;
    }
    if (ch === ">") {
      if (expr[i + 1] === "=") { tokens.push({ type: "GTE", value: ">=" }); i += 2; }
      else { tokens.push({ type: "GT", value: ">" }); i++; }
      continue;
    }
    if (ch === "=") {
      tokens.push({ type: "EQ", value: "=" });
      i++;
      continue;
    }

    i++;
  }

  tokens.push({ type: "EOF", value: "" });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private cells: CellStore;
  private depth: number;

  constructor(tokens: Token[], cells: CellStore, depth: number) {
    this.tokens = tokens;
    this.cells = cells;
    this.depth = depth;
  }

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }
  private match(...types: TokenType[]): boolean {
    return types.includes(this.peek().type);
  }

  parseExpr(): number | string {
    const result = this.parseComparison();
    if (Array.isArray(result)) return toNum(result[0]);
    return result;
  }

  private parseComparison(): Value {
    let left = this.parseAddSub();
    while (this.match("EQ", "NEQ", "LT", "LTE", "GT", "GTE")) {
      const op = this.consume().type;
      const right = this.parseAddSub();
      const l = toNum(Array.isArray(left) ? left[0] : left);
      const r = toNum(Array.isArray(right) ? right[0] : right);
      switch (op) {
        case "EQ": left = l === r ? 1 : 0; break;
        case "NEQ": left = l !== r ? 1 : 0; break;
        case "LT": left = l < r ? 1 : 0; break;
        case "LTE": left = l <= r ? 1 : 0; break;
        case "GT": left = l > r ? 1 : 0; break;
        case "GTE": left = l >= r ? 1 : 0; break;
      }
    }
    return left;
  }

  private parseAddSub(): Value {
    let left = this.parseMulDiv();
    while (this.match("PLUS", "MINUS")) {
      const op = this.consume().type;
      const right = this.parseMulDiv();
      const l = toNum(Array.isArray(left) ? left[0] : left);
      const r = toNum(Array.isArray(right) ? right[0] : right);
      left = op === "PLUS" ? l + r : l - r;
    }
    return left;
  }

  private parseMulDiv(): Value {
    let left = this.parseUnary();
    while (this.match("STAR", "SLASH")) {
      const op = this.consume().type;
      const right = this.parseUnary();
      const l = toNum(Array.isArray(left) ? left[0] : left);
      const r = toNum(Array.isArray(right) ? right[0] : right);
      if (op === "SLASH" && r === 0) return "#DIV/0!";
      left = op === "STAR" ? l * r : l / r;
    }
    return left;
  }

  private parseUnary(): Value {
    if (this.match("MINUS")) {
      this.consume();
      const val = this.parsePrimary();
      return -toNum(Array.isArray(val) ? val[0] : val);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Value {
    const tok = this.peek();

    if (tok.type === "NUMBER") {
      this.consume();
      return parseFloat(tok.value);
    }

    if (tok.type === "STRING") {
      this.consume();
      return tok.value;
    }

    if (tok.type === "LPAREN") {
      this.consume();
      const val = this.parseExpr();
      if (this.match("RPAREN")) this.consume();
      return val;
    }

    if (tok.type === "IDENT") {
      const nextTok = this.tokens[this.pos + 1];

      if (nextTok?.type === "LPAREN") {
        this.consume();
        this.consume();
        const args = this.parseArgList();
        if (this.match("RPAREN")) this.consume();
        return this.callFunction(tok.value, args);
      }

      const cellMatch = tok.value.match(/^([A-Z]+)(\d+)$/);
      if (cellMatch) {
        this.consume();
        if (this.match("COLON")) {
          this.consume();
          const endTok = this.peek();
          if (endTok.type === "IDENT") {
            this.consume();
            return this.expandRange(tok.value, endTok.value);
          }
        }
        return this.getCellValue(tok.value);
      }

      this.consume();
      return 0;
    }

    return 0;
  }

  private parseArgList(): Array<number | string | Array<number | string>> {
    const args: Array<number | string | Array<number | string>> = [];
    while (!this.match("RPAREN", "EOF")) {
      if (
        this.peek().type === "IDENT" &&
        this.tokens[this.pos + 1]?.type === "COLON"
      ) {
        const start = this.consume().value;
        this.consume();
        const end = this.consume().value;
        args.push(this.expandRange(start, end));
      } else {
        args.push(this.parseExpr());
      }
      if (this.match("COMMA")) this.consume();
    }
    return args;
  }

  private expandRange(startId: string, endId: string): Array<number | string> {
    const start = parseCellId(startId);
    const end = parseCellId(endId);
    if (!start || !end) return [];

    const vals: Array<number | string> = [];
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        vals.push(this.getCellValue(cellId(r, c)));
      }
    }
    return vals;
  }

  private getCellValue(id: CellId): number | string {
    if (this.depth > 30) return "#CIRC!";
    const cell = this.cells[id];
    if (!cell) return 0;
    if (cell.raw.startsWith("=")) {
      return evaluateFormula(cell.raw.slice(1), this.cells, this.depth + 1);
    }
    const num = parseFloat(cell.raw);
    return isNaN(num) ? cell.raw : num;
  }

  private callFunction(
    name: string,
    args: Array<number | string | Array<number | string>>
  ): number | string {
    const flat = args.flatMap((a) => (Array.isArray(a) ? a : [a]));
    const nums = flat.map(toNum).filter((n) => !isNaN(n));

    switch (name) {
      case "SUM":
        return nums.reduce((a, b) => a + b, 0);
      case "AVERAGE":
        return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
      case "MIN":
        return nums.length === 0 ? 0 : Math.min(...nums);
      case "MAX":
        return nums.length === 0 ? 0 : Math.max(...nums);
      case "COUNT":
        return nums.length;
      case "IF": {
        const cond = toNum(args[0] as number | string);
        return cond !== 0 ? (args[1] as number | string ?? 0) : (args[2] as number | string ?? 0);
      }
      case "ROUND": {
        const [val, decimals] = args as [number | string, number | string];
        return parseFloat(toNum(val).toFixed(toNum(decimals ?? 0)));
      }
      case "ABS":
        return Math.abs(toNum(args[0] as number | string));
      case "SQRT": {
        const v = toNum(args[0] as number | string);
        return v < 0 ? "#NUM!" : Math.sqrt(v);
      }
      case "CONCATENATE":
      case "CONCAT":
        return flat.map(String).join("");
      case "LEN":
        return String(args[0] ?? "").length;
      case "UPPER":
        return String(args[0] ?? "").toUpperCase();
      case "LOWER":
        return String(args[0] ?? "").toLowerCase();
      default:
        return "#NAME?";
    }
  }
}

function toNum(v: number | string | undefined): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

export function evaluateFormula(
  expr: string,
  cells: CellStore,
  depth = 0
): number | string {
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens, cells, depth);
    const result = parser.parseExpr();
    if (typeof result === "number") {
      return parseFloat(result.toPrecision(12));
    }
    return result;
  } catch {
    return "#ERR!";
  }
}

export function computeCell(raw: string, cells: CellStore): string {
  if (!raw.startsWith("=")) return raw;
  const result = evaluateFormula(raw.slice(1), cells);
  return String(result);
}

export function recomputeAll(
  cells: Record<CellId, CellData>
): Record<CellId, CellData> {
  const result: Record<CellId, CellData> = {};
  for (const [id, cell] of Object.entries(cells)) {
    if (cell.raw.startsWith("=")) {
      result[id] = { ...cell, computed: computeCell(cell.raw, cells) };
    } else {
      result[id] = cell;
    }
  }
  return result;
}
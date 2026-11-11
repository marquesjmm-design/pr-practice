import { toDay } from "../lib/dates";
import { resolveGranularity, timeBuckets, type Category, type Granularity, type QueryResult } from "./query";

export type ColType = "date" | "number" | "text";

export interface CustomDataset {
  id: string;
  name: string;
  createdAt: string;
  source: string;
  columns: { name: string; type: ColType }[];
  /** datas guardadas como dia UTC (número), números como number, texto como string */
  rows: (number | string | null)[][];
}

export const MAX_CSV_BYTES = 3_000_000;
export const MAX_CSV_ROWS = 50_000;

export function detectDelimiter(firstLine: string): string {
  const counts = [";", ",", "\t"].map((d) => {
    let n = 0;
    let q = false;
    for (const ch of firstLine) {
      if (ch === '"') q = !q;
      else if (!q && ch === d) n++;
    }
    return [d, n] as const;
  });
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsv(text: string): { headers: string[]; rows: string[][]; delimiter: string } {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  const headers = (rows.shift() ?? []).map((h, i) => h.trim() || `Coluna ${i + 1}`);
  return { headers, rows, delimiter };
}

/** Converte números em formato português (1.234,56) ou internacional (1,234.56). */
export function parseNumber(raw: string): number | null {
  let s = raw.trim().replace(/[€%\s ]/g, "");
  if (!s) return null;
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  } else if (hasDot && (s.match(/\./g) ?? []).length > 1) {
    s = s.replace(/\./g, "");
  }
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export function parseDate(raw: string): number | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return valid(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return valid(+m[3], +m[2], +m[1]);
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return valid(+m[1], +m[2], 1);
  return null;
}

function valid(y: number, mo: number, d: number): number | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return toDay(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

export function inferTypes(headers: string[], rows: string[][]): ColType[] {
  return headers.map((_, ci) => {
    const vals = rows.slice(0, 500).map((r) => (r[ci] ?? "").trim()).filter(Boolean);
    if (!vals.length) return "text";
    const dates = vals.filter((v) => parseDate(v) !== null).length;
    if (dates / vals.length >= 0.8) return "date";
    const nums = vals.filter((v) => parseNumber(v) !== null).length;
    if (nums / vals.length >= 0.8) return "number";
    return "text";
  });
}

export function buildDataset(name: string, source: string, text: string, id: string): CustomDataset {
  const { headers, rows } = parseCsv(text);
  if (!headers.length || !rows.length) throw new Error("O ficheiro não tem linhas de dados.");
  if (rows.length > MAX_CSV_ROWS) throw new Error(`O ficheiro tem ${rows.length} linhas; o máximo suportado é ${MAX_CSV_ROWS}.`);
  const types = inferTypes(headers, rows);
  return {
    id,
    name,
    source,
    createdAt: new Date().toISOString(),
    columns: headers.map((h, i) => ({ name: h, type: types[i] })),
    rows: rows.map((r) =>
      headers.map((_, i) => {
        const v = r[i] ?? "";
        if (types[i] === "date") return parseDate(v);
        if (types[i] === "number") return parseNumber(v);
        return v.trim() || null;
      }),
    ),
  };
}

export function datasetRange(ds: CustomDataset, dateCol?: string): { firstDay: number; lastDay: number } | null {
  const ci = ds.columns.findIndex((c) => (dateCol ? c.name === dateCol : c.type === "date"));
  if (ci < 0) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of ds.rows) {
    const v = r[ci];
    if (typeof v === "number") {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  return Number.isFinite(lo) ? { firstDay: lo, lastDay: hi } : null;
}

export type Agg = "sum" | "avg" | "min" | "max" | "count";
export const AGG_LABELS: Record<Agg, string> = { sum: "Soma", avg: "Média", min: "Mínimo", max: "Máximo", count: "Contagem" };

export interface CustomQuery {
  valueCol: string;
  agg: Agg;
  dateCol?: string;
  /** "time", "none" ou nome de coluna de texto */
  x: string;
  breakdown: string;
  granularity: Granularity;
  from?: number;
  to?: number;
}

export function runCustomQuery(ds: CustomDataset, q: CustomQuery): QueryResult {
  const warnings: string[] = [];
  const col = (n?: string) => (n ? ds.columns.findIndex((c) => c.name === n) : -1);
  const vi = col(q.valueCol);
  const di = q.dateCol ? col(q.dateCol) : ds.columns.findIndex((c) => c.type === "date");
  const xi = q.x !== "time" && q.x !== "none" ? col(q.x) : -1;
  const bi = q.breakdown !== "none" ? col(q.breakdown) : -1;
  const range = datasetRange(ds, di >= 0 ? ds.columns[di].name : undefined);
  const from = q.from ?? range?.firstDay ?? 0;
  const to = q.to ?? range?.lastDay ?? 0;
  const g = resolveGranularity(q.granularity, from, to);
  if (vi < 0 && q.agg !== "count") warnings.push("Escolha uma coluna numérica.");
  if (q.x === "time" && di < 0) warnings.push("O ficheiro não tem coluna de data.");

  type A = { sum: number; n: number; min: number; max: number };
  const cells = new Map<string, Map<string, A>>();
  const tot: A = { sum: 0, n: 0, min: Infinity, max: -Infinity };
  const bucketOf = (day: number) => {
    const b = timeBuckets(day, day, g)[0];
    return b.key;
  };
  for (const r of ds.rows) {
    const day = di >= 0 ? r[di] : null;
    if (di >= 0 && (typeof day !== "number" || day < from || day > to)) continue;
    const v = vi >= 0 ? r[vi] : 1;
    if (q.agg !== "count" && typeof v !== "number") continue;
    const xk = q.x === "time" ? (typeof day === "number" ? bucketOf(day) : "_") : xi >= 0 ? String(r[xi] ?? "—") : "_";
    const bk = bi >= 0 ? String(r[bi] ?? "—") : "_";
    let row = cells.get(xk);
    if (!row) cells.set(xk, (row = new Map()));
    let a = row.get(bk);
    if (!a) row.set(bk, (a = { sum: 0, n: 0, min: Infinity, max: -Infinity }));
    const num = typeof v === "number" ? v : 1;
    for (const acc of [a, tot]) {
      acc.sum += num;
      acc.n += 1;
      acc.min = Math.min(acc.min, num);
      acc.max = Math.max(acc.max, num);
    }
  }
  const val = (a?: A) => {
    if (!a || a.n === 0) return null;
    switch (q.agg) {
      case "sum": return a.sum;
      case "avg": return a.sum / a.n;
      case "min": return a.min;
      case "max": return a.max;
      case "count": return a.n;
    }
  };
  let categories: Category[];
  if (q.x === "time") categories = timeBuckets(from, to, g);
  else if (q.x === "none") categories = [{ key: "_", label: "Total" }];
  else categories = [...cells.keys()].sort((a, b) => a.localeCompare(b, "pt")).map((k) => ({ key: k, label: k }));

  const bKeys = new Set<string>();
  cells.forEach((row) => row.forEach((_, k) => bKeys.add(k)));
  let keys = [...bKeys].sort((a, b) => a.localeCompare(b, "pt"));
  if (keys.length > 8) {
    warnings.push(`Mostradas 8 de ${keys.length} séries (máximo de cores distintas).`);
    keys = keys.slice(0, 8);
  }
  const series = keys.map((k, i) => ({
    key: k,
    name: k === "_" ? `${AGG_LABELS[q.agg]} de ${q.valueCol || "linhas"}` : k,
    slot: i + 1,
    values: categories.map((c) => val(cells.get(c.key)?.get(k))),
  }));
  return { x: q.x === "time" ? "time" : q.x === "none" ? "none" : "station", granularity: g, categories, series, total: val(tot), warnings, from, to };
}

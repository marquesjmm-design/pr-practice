import { addMonths, dayParts, fromDay, mondayOf, MONTHS_PT, shortDayPt, toDay, weekday, WEEKDAYS_PT } from "../lib/dates";
import { PRODUCTS, REGIONS, STATION_TYPES, STATIONS } from "./catalog";
import { ADDITIVE_FIELDS, ALL_FIELDS, emptyAcc, getMetric, mergeAcc, type Acc, type AccField } from "./metrics";
import { HOURLY_PROFILE } from "./simulate";
import type { Dataset, ProductId, RegionId, StationType } from "./types";

export type Dim = "time" | "station" | "product" | "region" | "type" | "weekday" | "hour" | "none";
export type Granularity = "auto" | "day" | "week" | "month" | "quarter";
export type PeriodPreset = "7d" | "30d" | "90d" | "mtd" | "qtd" | "ytd" | "12m" | "all" | "custom";
export type CompareMode = "none" | "previous" | "yoy";

export interface Filters {
  stations?: string[];
  products?: ProductId[];
  regions?: RegionId[];
  types?: StationType[];
}

export interface Period {
  preset: PeriodPreset;
  from?: string;
  to?: string;
}

export interface QuerySpec {
  metric: string;
  x: Dim;
  breakdown: Dim;
  granularity: Granularity;
  from: number;
  to: number;
  filters: Filters;
  /** Número máximo de séries antes de agrupar em "Outros" (máx. 8 cores). */
  topN?: number;
  sort?: "none" | "asc" | "desc";
}

export interface Category {
  key: string;
  label: string;
  /** dia inicial do intervalo (só para eixo temporal) */
  day?: number;
  /** slot de cor da categoria (dimensões não temporais) */
  slot?: number;
  /** intervalo temporal incompleto (o período começa/acaba a meio) */
  partial?: boolean;
}

export interface SeriesOut {
  key: string;
  name: string;
  /** 1..8 = slot categórico; 0 = cinzento neutro ("Outros"/comparação) */
  slot: number;
  values: (number | null)[];
  role?: "comparison" | "other";
}

export interface QueryResult {
  x: Dim;
  granularity: Exclude<Granularity, "auto">;
  categories: Category[];
  series: SeriesOut[];
  total: number | null;
  warnings: string[];
  from: number;
  to: number;
}

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
  mtd: "Mês atual",
  qtd: "Trimestre atual",
  ytd: "Ano atual",
  "12m": "12 meses",
  all: "Tudo",
  custom: "Personalizado",
};

export const DIM_LABELS: Record<Dim, string> = {
  time: "Tempo",
  station: "Posto",
  product: "Produto",
  region: "Região",
  type: "Tipologia",
  weekday: "Dia da semana",
  hour: "Hora do dia",
  none: "Nenhuma",
};

export function resolvePeriod(p: Period, ds: Pick<Dataset, "firstDay" | "lastDay">): { from: number; to: number } {
  const last = ds.lastDay;
  const clamp = (r: { from: number; to: number }) => ({ from: Math.max(ds.firstDay, Math.min(r.from, last)), to: Math.max(ds.firstDay, Math.min(r.to, last)) });
  const { y, m } = dayParts(last);
  switch (p.preset) {
    case "7d": return clamp({ from: last - 6, to: last });
    case "30d": return clamp({ from: last - 29, to: last });
    case "90d": return clamp({ from: last - 89, to: last });
    case "mtd": return clamp({ from: toDay(`${y}-${String(m).padStart(2, "0")}-01`), to: last });
    case "qtd": {
      const qm = Math.floor((m - 1) / 3) * 3 + 1;
      return clamp({ from: toDay(`${y}-${String(qm).padStart(2, "0")}-01`), to: last });
    }
    case "ytd": return clamp({ from: toDay(`${y}-01-01`), to: last });
    case "12m": return clamp({ from: addMonths(last, -12) + 1, to: last });
    case "all": return { from: ds.firstDay, to: last };
    case "custom": {
      const from = p.from ? toDay(p.from) : last - 29;
      const to = p.to ? toDay(p.to) : last;
      return clamp(from <= to ? { from, to } : { from: to, to: from });
    }
  }
}

export function comparisonRange(from: number, to: number, mode: CompareMode): { from: number; to: number } | null {
  if (mode === "none") return null;
  if (mode === "previous") {
    const len = to - from + 1;
    return { from: from - len, to: from - 1 };
  }
  return { from: addMonths(from, -12), to: addMonths(to, -12) };
}

export function resolveGranularity(g: Granularity, from: number, to: number): Exclude<Granularity, "auto"> {
  if (g !== "auto") return g;
  const span = to - from + 1;
  if (span <= 45) return "day";
  if (span <= 190) return "week";
  return "month";
}

function bucketStart(day: number, g: Exclude<Granularity, "auto">): number {
  if (g === "day") return day;
  if (g === "week") return mondayOf(day);
  const { y, m } = dayParts(day);
  if (g === "month") return toDay(`${y}-${String(m).padStart(2, "0")}-01`);
  const qm = Math.floor((m - 1) / 3) * 3 + 1;
  return toDay(`${y}-${String(qm).padStart(2, "0")}-01`);
}

function bucketLabel(start: number, g: Exclude<Granularity, "auto">): string {
  const { y, m } = dayParts(start);
  const yy = String(y).slice(2);
  if (g === "day") return shortDayPt(start);
  if (g === "week") return shortDayPt(start);
  if (g === "month") return `${MONTHS_PT[m - 1]} ${yy}`;
  return `T${Math.floor((m - 1) / 3) + 1} ${yy}`;
}

export function timeBuckets(from: number, to: number, g: Exclude<Granularity, "auto">): Category[] {
  const out: Category[] = [];
  let cur = bucketStart(from, g);
  while (cur <= to) {
    const next = g === "day" ? cur + 1 : g === "week" ? cur + 7 : g === "month" ? addMonths(cur, 1) : addMonths(cur, 3);
    const partial = cur < from || next - 1 > to;
    out.push({ key: String(cur), label: bucketLabel(cur, g) + (partial ? "*" : ""), day: cur, partial: partial || undefined });
    cur = next;
  }
  return out;
}

interface DimMeta {
  keys: string[];
  label: (k: string) => string;
  slot: (k: string, displayed: string[]) => number;
}

function dimMeta(d: Dim): DimMeta | null {
  switch (d) {
    case "station":
      return { keys: STATIONS.map((s) => s.id), label: (k) => STATIONS.find((s) => s.id === k)?.name ?? k, slot: (k, shown) => Math.min(8, shown.indexOf(k) + 1) };
    case "product":
      return { keys: PRODUCTS.map((p) => p.id), label: (k) => PRODUCTS.find((p) => p.id === k)?.short ?? k, slot: (k) => PRODUCTS.find((p) => p.id === k)?.slot ?? 1 };
    case "region":
      return { keys: REGIONS.map((r) => r.id), label: (k) => REGIONS.find((r) => r.id === k)?.name ?? k, slot: (k) => REGIONS.find((r) => r.id === k)?.slot ?? 1 };
    case "type":
      return { keys: STATION_TYPES.map((t) => t.id), label: (k) => STATION_TYPES.find((t) => t.id === k)?.name ?? k, slot: (k) => STATION_TYPES.find((t) => t.id === k)?.slot ?? 1 };
    case "weekday":
      return { keys: ["0", "1", "2", "3", "4", "5", "6"], label: (k) => WEEKDAYS_PT[Number(k)], slot: (k) => (Number(k) % 8) + 1 };
    case "hour":
      return { keys: Array.from({ length: 24 }, (_, h) => String(h)), label: (k) => `${k}h`, slot: () => 1 };
    default:
      return null;
  }
}

/** Indica se a combinação métrica × dimensão faz sentido. */
export function dimAllowed(metricId: string, d: Dim): boolean {
  const m = getMetric(metricId);
  if (d === "product" && m.level === "station") return false;
  if (d === "hour" && !m.additive) return false;
  return true;
}

export function stationScope(filters: Filters): Set<number> {
  const out = new Set<number>();
  STATIONS.forEach((s, i) => {
    if (filters.stations && filters.stations.length && !filters.stations.includes(s.id)) return;
    if (filters.regions && filters.regions.length && !filters.regions.includes(s.region)) return;
    if (filters.types && filters.types.length && !filters.types.includes(s.type)) return;
    out.add(i);
  });
  return out;
}

export function runQuery(ds: Dataset, spec: QuerySpec): QueryResult {
  const metric = getMetric(spec.metric);
  const warnings: string[] = [];
  const g = resolveGranularity(spec.granularity, spec.from, spec.to);
  let x = spec.x;
  let breakdown = spec.breakdown === spec.x ? "none" : spec.breakdown;
  if (!dimAllowed(metric.id, x)) {
    warnings.push(`«${metric.label}» não se pode desagregar por ${DIM_LABELS[x].toLowerCase()}.`);
    x = "time";
  }
  if (breakdown !== "none" && !dimAllowed(metric.id, breakdown)) {
    warnings.push(`«${metric.label}» não se pode desagregar por ${DIM_LABELS[breakdown].toLowerCase()}.`);
    breakdown = "none";
  }
  const useHours = x === "hour" || breakdown === "hour";
  const scope = stationScope(spec.filters);
  const productFilter = spec.filters.products && spec.filters.products.length ? new Set(spec.filters.products.map((p) => PRODUCTS.findIndex((x) => x.id === p))) : null;
  if (productFilter && metric.level === "station") warnings.push("O filtro de produto não se aplica a métricas de loja/equipamentos.");
  if (spec.from < ds.firstDay) warnings.push("Parte do período não tem dados.");

  const keyOf = (d: Dim, day: number, st: number, pr: number, hour: number): string => {
    switch (d) {
      case "time": return String(bucketStart(day, g));
      case "station": return STATIONS[st].id;
      case "product": return PRODUCTS[pr]?.id ?? "_";
      case "region": return STATIONS[st].region;
      case "type": return STATIONS[st].type;
      case "weekday": return String(weekday(day));
      case "hour": return String(hour);
      default: return "_";
    }
  };

  const cells = new Map<string, Map<string, Acc>>();
  const seriesTotals = new Map<string, Acc>();
  const total = emptyAcc();

  const add = (xk: string, bk: string, fields: Partial<Record<AccField, number>>, scale: number) => {
    let row = cells.get(xk);
    if (!row) cells.set(xk, (row = new Map()));
    let acc = row.get(bk);
    if (!acc) row.set(bk, (acc = emptyAcc()));
    let st = seriesTotals.get(bk);
    if (!st) seriesTotals.set(bk, (st = emptyAcc()));
    for (const f in fields) {
      const key = f as AccField;
      const raw = fields[key]!;
      const v = useHours && ADDITIVE_FIELDS.has(key) ? raw * scale : raw;
      acc[key] += v;
      st[key] += v;
      total[key] += v;
    }
  };

  const visit = (day: number, st: number, pr: number, fields: Partial<Record<AccField, number>>) => {
    if (useHours) {
      const prof = HOURLY_PROFILE[STATIONS[st].type];
      for (let h = 0; h < 24; h++) add(keyOf(x, day, st, pr, h), keyOf(breakdown, day, st, pr, h), fields, prof[h]);
    } else {
      add(keyOf(x, day, st, pr, 0), keyOf(breakdown, day, st, pr, 0), fields, 1);
    }
  };

  const needsFuel = metric.level === "fuel" || metric.id === "totalGm";
  const needsStation = metric.level === "station";
  if (needsFuel) {
    for (const r of ds.fuel) {
      if (r.day < spec.from || r.day > spec.to || !scope.has(r.station)) continue;
      if (metric.level === "fuel" && productFilter && !productFilter.has(r.product)) continue;
      visit(r.day, r.station, r.product, { vol: r.vol, rev: r.rev, gm: r.gm, tx: r.tx, refVol: r.ref * r.vol, stockL: r.stockL, capL: r.capL, deliveries: r.deliveries, variance: r.variance, cover: r.cover, n: 1 });
    }
  }
  if (needsStation) {
    for (const r of ds.station) {
      if (r.day < spec.from || r.day > spec.to || !scope.has(r.station)) continue;
      visit(r.day, r.station, -1, { shopSales: r.shopSales, shopGm: r.shopGm, shopTx: r.shopTx, fuelTx: r.fuelTx, uptime: r.uptime, sn: 1, alarms: r.alarms });
    }
  }

  // Categorias do eixo X
  let categories: Category[];
  if (x === "time") categories = timeBuckets(spec.from, spec.to, g);
  else if (x === "none") categories = [{ key: "_", label: "Total" }];
  else {
    const meta = dimMeta(x)!;
    const shown = meta.keys.filter((k) => cells.has(k));
    categories = shown.map((k) => ({ key: k, label: meta.label(k), slot: meta.slot(k, shown) }));
  }

  // Séries
  let seriesKeys: string[];
  const bMeta = breakdown === "none" ? null : dimMeta(breakdown);
  if (!bMeta) seriesKeys = ["_"];
  else seriesKeys = bMeta.keys.filter((k) => seriesTotals.has(k));

  const topN = Math.max(1, Math.min(spec.topN ?? 7, 7));
  let otherKeys: string[] = [];
  if (bMeta && seriesKeys.length > topN + 1) {
    const rankVal = (k: string) => {
      const a = seriesTotals.get(k)!;
      return metric.additive ? Math.abs(metric.compute(a) ?? 0) : a.vol + a.shopSales;
    };
    const ranked = [...seriesKeys].sort((a, b) => rankVal(b) - rankVal(a));
    const keep = new Set(ranked.slice(0, topN));
    otherKeys = seriesKeys.filter((k) => !keep.has(k));
    seriesKeys = seriesKeys.filter((k) => keep.has(k));
  }

  const series: SeriesOut[] = seriesKeys.map((k) => ({
    key: k,
    name: bMeta ? bMeta.label(k) : metric.label,
    slot: bMeta ? bMeta.slot(k, seriesKeys) : 1,
    values: categories.map((c) => {
      const acc = cells.get(c.key)?.get(k);
      return acc ? metric.compute(acc) : null;
    }),
  }));
  if (otherKeys.length) {
    series.push({
      key: "__other",
      name: `Outros (${otherKeys.length})`,
      slot: 0,
      role: "other",
      values: categories.map((c) => {
        const row = cells.get(c.key);
        if (!row) return null;
        const acc = emptyAcc();
        let any = false;
        for (const k of otherKeys) {
          const a = row.get(k);
          if (a) {
            mergeAcc(acc, a);
            any = true;
          }
        }
        return any ? metric.compute(acc) : null;
      }),
    });
  }

  // Ordenação das categorias (não temporais)
  if (x !== "time" && spec.sort && spec.sort !== "none" && categories.length > 1) {
    const idx = categories.map((_, i) => i);
    const val = (i: number) => {
      const row = cells.get(categories[i].key);
      if (!row) return -Infinity;
      const acc = emptyAcc();
      row.forEach((a) => mergeAcc(acc, a));
      return metric.compute(acc) ?? -Infinity;
    };
    idx.sort((a, b) => (spec.sort === "desc" ? val(b) - val(a) : val(a) - val(b)));
    categories = idx.map((i) => categories[i]);
    for (const s of series) s.values = idx.map((i) => s.values[i]);
  }

  const any = ALL_FIELDS.some((f) => total[f] !== 0);
  return { x, granularity: g, categories, series, total: any ? metric.compute(total) : null, warnings, from: spec.from, to: spec.to };
}

/** Executa a consulta e, se pedido, junta a série do período de comparação. */
export function runWithComparison(ds: Dataset, spec: QuerySpec, compare: CompareMode): QueryResult & { compareTotal: number | null; compareRange: { from: number; to: number } | null } {
  const res = runQuery(ds, spec);
  const range = comparisonRange(spec.from, spec.to, compare);
  if (!range) return { ...res, compareTotal: null, compareRange: null };
  const cmp = runQuery(ds, { ...spec, from: range.from, to: range.to, breakdown: "none", granularity: res.granularity });
  if (range.from < ds.firstDay) res.warnings.push("O período de comparação não tem dados completos.");
  if (res.series.length === 1 && cmp.series.length >= 1 && res.x !== "hour") {
    const base = cmp.series[0];
    let values: (number | null)[];
    if (res.x === "time") values = res.categories.map((_, i) => base.values[i] ?? null);
    else {
      const map = new Map(cmp.categories.map((c, i) => [c.key, base.values[i]]));
      values = res.categories.map((c) => map.get(c.key) ?? null);
    }
    res.series.push({ key: "__cmp", name: compare === "yoy" ? "Ano anterior" : "Período anterior", slot: 0, role: "comparison", values });
  } else if (res.x === "hour" && cmp.series.length >= 1 && res.series.length === 1) {
    res.series.push({ key: "__cmp", name: compare === "yoy" ? "Ano anterior" : "Período anterior", slot: 0, role: "comparison", values: cmp.series[0].values });
  }
  return { ...res, compareTotal: cmp.total, compareRange: range };
}

export function describeRange(from: number, to: number): string {
  return `${fromDay(from).split("-").reverse().join("/")} – ${fromDay(to).split("-").reverse().join("/")}`;
}

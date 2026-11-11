import { useMemo } from "react";
import { datasetRange, runCustomQuery, type CustomDataset } from "../data/csv";
import { getMetric, type Unit } from "../data/metrics";
import { resolvePeriod, runQuery, runWithComparison, type Filters, type Period, type QueryResult } from "../data/query";
import type { Dataset } from "../data/types";
import type { WidgetConfig } from "./types";

export interface WidgetData {
  result: QueryResult;
  unit: Unit;
  additive: boolean;
  upIsGood: boolean | null;
  compareTotal: number | null;
  scatter?: { name: string; x: number | null; y: number | null }[];
  unitY?: Unit;
  error?: string;
}

function mergeFilters(global: Filters, own: Filters, ownOnly: boolean, scopeRegions: string[]): Filters {
  const pick = <K extends keyof Filters>(k: K) => (own[k] && own[k]!.length ? own[k] : ownOnly ? undefined : global[k]);
  const f: Filters = { stations: pick("stations"), products: pick("products"), regions: pick("regions"), types: pick("types") };
  if (scopeRegions.length) {
    const r = (f.regions ?? []).filter((x) => scopeRegions.includes(x));
    f.regions = (r.length ? r : scopeRegions) as Filters["regions"];
  }
  return f;
}

export function computeWidget(
  w: WidgetConfig,
  ctx: { ds: Dataset; custom: CustomDataset[]; globalPeriod: Period; globalFilters: Filters; scopeRegions: string[] },
): WidgetData {
  const period = w.period.inherit ? ctx.globalPeriod : w.period;

  if (w.source.startsWith("csv:")) {
    const cds = ctx.custom.find((d) => `csv:${d.id}` === w.source);
    const empty: QueryResult = { x: "time", granularity: "day", categories: [], series: [], total: null, warnings: [], from: 0, to: 0 };
    if (!cds || !w.csv) return { result: empty, unit: "COUNT", additive: true, upIsGood: null, compareTotal: null, error: "Conjunto de dados importado não encontrado." };
    const range = datasetRange(cds, w.csv.dateCol);
    const r = range ? resolvePeriod(period, range) : undefined;
    const result = runCustomQuery(cds, { ...w.csv, granularity: w.granularity, from: r?.from, to: r?.to });
    return { result, unit: w.csv.agg === "count" ? "COUNT" : "NUM", additive: w.csv.agg === "sum" || w.csv.agg === "count", upIsGood: null, compareTotal: null };
  }

  const metric = getMetric(w.metric);
  const { from, to } = resolvePeriod(period, ctx.ds);
  const filters = mergeFilters(ctx.globalFilters, w.filters, !!w.ownFilters, ctx.scopeRegions);
  const base = { metric: w.metric, x: w.x, breakdown: w.breakdown, granularity: w.granularity, from, to, filters, topN: w.options.topN, sort: w.options.sort };

  if (w.type === "scatter") {
    const my = getMetric(w.metricY ?? "conversion");
    const rx = runQuery(ctx.ds, { ...base, x: "station", breakdown: "none" });
    const ry = runQuery(ctx.ds, { ...base, metric: my.id, x: "station", breakdown: "none" });
    const mapY = new Map(ry.categories.map((c, i) => [c.key, ry.series[0]?.values[i] ?? null]));
    const scatter = rx.categories.map((c, i) => ({ name: c.label, x: rx.series[0]?.values[i] ?? null, y: mapY.get(c.key) ?? null }));
    return { result: rx, unit: metric.unit, unitY: my.unit, additive: metric.additive, upIsGood: metric.upIsGood, compareTotal: null, scatter };
  }

  if (w.type === "kpi" || w.type === "gauge") {
    const r = runWithComparison(ctx.ds, { ...base, x: "time", breakdown: "none", granularity: "auto" }, w.type === "kpi" && w.compare === "none" ? "previous" : w.compare);
    return { result: r, unit: metric.unit, additive: metric.additive, upIsGood: metric.upIsGood, compareTotal: r.compareTotal };
  }

  const r = runWithComparison(ctx.ds, base, w.compare);
  return { result: r, unit: metric.unit, additive: metric.additive, upIsGood: metric.upIsGood, compareTotal: r.compareTotal };
}

export function useWidgetData(w: WidgetConfig, ctx: Parameters<typeof computeWidget>[1]): WidgetData {
  const { ds, custom, globalPeriod, globalFilters, scopeRegions } = ctx;
  return useMemo(() => computeWidget(w, { ds, custom, globalPeriod, globalFilters, scopeRegions }), [w, ds, custom, globalPeriod, globalFilters, scopeRegions]);
}

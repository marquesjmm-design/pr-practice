import { describe, expect, it } from "vitest";
import { simulate } from "../src/data/simulate";
import { comparisonRange, resolvePeriod, runQuery, runWithComparison, timeBuckets, type QuerySpec } from "../src/data/query";
import { referencePrice } from "../src/data/referencePrices";
import { toDay } from "../src/lib/dates";
import { STATIONS } from "../src/data/catalog";

const ds = simulate();
const base = (over: Partial<QuerySpec> = {}): QuerySpec => ({
  metric: "vol",
  x: "time",
  breakdown: "none",
  granularity: "month",
  from: ds.firstDay,
  to: ds.lastDay,
  filters: {},
  ...over,
});

describe("simulador", () => {
  it("é determinístico", () => {
    const again = simulate();
    expect(again.fuel.length).toBe(ds.fuel.length);
    expect(again.fuel[1234].vol).toBe(ds.fuel[1234].vol);
  });

  it("gera valores plausíveis (volume diário da rede, peso do gasóleo)", () => {
    const r = runQuery(ds, base({ x: "none", breakdown: "product", from: ds.lastDay - 364, to: ds.lastDay }));
    const totalVol = r.series.reduce((a, s) => a + (s.values[0] ?? 0), 0);
    const perStationDay = totalVol / 365 / STATIONS.length;
    expect(perStationDay).toBeGreaterThan(5000);
    expect(perStationDay).toBeLessThan(12000);
    const diesel = r.series.find((s) => s.key === "gasoleo")!.values[0]!;
    expect(diesel / totalVol).toBeGreaterThan(0.6);
    expect(diesel / totalVol).toBeLessThan(0.8);
  });

  it("nunca deixa stock negativo e a disponibilidade fica entre 0 e 1", () => {
    expect(ds.fuel.every((r) => r.stockL >= 0 && r.stockL <= r.capL * 1.0001)).toBe(true);
    expect(ds.station.every((r) => r.uptime >= 0 && r.uptime <= 1)).toBe(true);
  });
});

describe("preços de referência", () => {
  it("respeita os pontos publicados (média semanal perto do ponto)", () => {
    expect(referencePrice("gasoleo", toDay("2026-09-16"))).toBeCloseTo(2.135, 1);
    expect(referencePrice("g95", toDay("2025-05-14"))).toBeCloseTo(1.677, 2);
  });
  it("é constante dentro da mesma semana", () => {
    const mon = toDay("2026-06-08");
    for (let i = 1; i < 7; i++) expect(referencePrice("g95", mon + i)).toBe(referencePrice("g95", mon));
  });
});

describe("motor de consulta", () => {
  it("métricas de rácio são rácio de somas (não média de rácios)", () => {
    const r = runQuery(ds, base({ metric: "marginL", x: "none" }));
    let gm = 0;
    let vol = 0;
    for (const f of ds.fuel) {
      gm += f.gm;
      vol += f.vol;
    }
    expect(r.total).toBeCloseTo(gm / vol, 10);
  });

  it("a soma por produto bate com o total", () => {
    const tot = runQuery(ds, base({ x: "none" })).total!;
    const byProd = runQuery(ds, base({ x: "none", breakdown: "product" }));
    const sum = byProd.series.reduce((a, s) => a + (s.values[0] ?? 0), 0);
    expect(sum).toBeCloseTo(tot, 3);
  });

  it("agrupa postos além do topN em «Outros» e preserva o total", () => {
    const r = runQuery(ds, base({ x: "none", breakdown: "station", topN: 5 }));
    expect(r.series.length).toBe(6);
    expect(r.series.at(-1)!.role).toBe("other");
    const sum = r.series.reduce((a, s) => a + (s.values[0] ?? 0), 0);
    expect(sum).toBeCloseTo(runQuery(ds, base({ x: "none" })).total!, 3);
  });

  it("filtra por região e por posto", () => {
    const norte = runQuery(ds, base({ x: "station", filters: { regions: ["norte"] } }));
    expect(norte.categories.map((c) => c.key).sort()).toEqual(["braga", "guimaraes", "porto"]);
    const one = runQuery(ds, base({ x: "station", filters: { stations: ["faro"] } }));
    expect(one.categories.map((c) => c.key)).toEqual(["faro"]);
  });

  it("recusa produto como dimensão de métricas de loja", () => {
    const r = runQuery(ds, base({ metric: "shopSales", x: "product" }));
    expect(r.x).toBe("time");
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("distribuição horária preserva o total diário", () => {
    const spec = base({ x: "hour", from: ds.lastDay - 6, to: ds.lastDay });
    const byHour = runQuery(ds, spec);
    const sum = byHour.series[0].values.reduce((a: number, v) => a + (v ?? 0), 0);
    const total = runQuery(ds, { ...spec, x: "none" }).total!;
    expect(sum).toBeCloseTo(total, 3);
  });

  it("buckets mensais cobrem o período sem falhas", () => {
    const b = timeBuckets(toDay("2026-01-15"), toDay("2026-04-02"), "month");
    expect(b.map((c) => c.label)).toEqual(["jan 26*", "fev 26", "mar 26", "abr 26*"]);
    expect(b.map((c) => !!c.partial)).toEqual([true, false, false, true]);
  });

  it("períodos predefinidos relativos ao último dia", () => {
    const p = resolvePeriod({ preset: "30d" }, ds);
    expect(p.to - p.from + 1).toBe(30);
    const ytd = resolvePeriod({ preset: "ytd" }, ds);
    expect(ytd.from).toBe(toDay("2026-01-01"));
  });

  it("comparação com ano anterior acrescenta série neutra", () => {
    const { from, to } = resolvePeriod({ preset: "90d" }, ds);
    const r = runWithComparison(ds, base({ from, to, granularity: "week" }), "yoy");
    expect(r.series.at(-1)!.role).toBe("comparison");
    expect(comparisonRange(from, to, "previous")!.to).toBe(from - 1);
  });

  it("detecta a deriva de wetstock simulada em Leiria", () => {
    const from = toDay("2026-09-15");
    const r = runQuery(ds, base({ metric: "variancePct", x: "station", from, to: ds.lastDay }));
    const leiria = r.series[0].values[r.categories.findIndex((c) => c.key === "leiria")]!;
    const braga = r.series[0].values[r.categories.findIndex((c) => c.key === "braga")]!;
    expect(leiria).toBeLessThan(-0.001);
    expect(Math.abs(braga)).toBeLessThan(0.001);
  });

  it("é rápido o suficiente para um telemóvel (consulta completa < 150 ms aqui)", () => {
    const t0 = performance.now();
    runQuery(ds, base({ breakdown: "station", granularity: "day" }));
    expect(performance.now() - t0).toBeLessThan(150);
  });
});

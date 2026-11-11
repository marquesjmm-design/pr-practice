import { describe, expect, it } from "vitest";
import { applyScale, buildOption } from "../src/dashboard/chartOption";
import { adaptToType } from "../src/dashboard/WidgetEditor";
import { newWidget, packLayout, presetDashboards } from "../src/dashboard/presets";
import { COLS } from "../src/dashboard/types";
import type { QueryResult } from "../src/data/query";
import type { Palette } from "../src/lib/theme";

const result: QueryResult = {
  x: "time",
  granularity: "month",
  categories: [{ key: "a", label: "a" }, { key: "b", label: "b" }],
  series: [
    { key: "s1", name: "S1", slot: 1, values: [10, 30] },
    { key: "s2", name: "S2", slot: 2, values: [30, 0] },
  ],
  total: 70,
  warnings: [],
  from: 0,
  to: 1,
};
const palette: Palette = {
  dark: false, series: Array.from({ length: 9 }, (_, i) => `#00000${i}`), ink: "#000", ink2: "#111", muted: "#888", grid: "#eee", axis: "#ccc",
  surface: "#fff", surface2: "#f5f5f5", border: "#ddd", seq: ["#1", "#2", "#3", "#4", "#5"], good: "g", warning: "w", serious: "s", critical: "c",
};

describe("transformações de escala", () => {
  it("índice base 100 parte do primeiro valor de cada série", () => {
    const p = applyScale(result, newWidget({ scale: { type: "index", min: "auto", max: "auto" } }), "L", true);
    expect(p.result.series[0].values).toEqual([100, 300]);
    expect(p.displayUnit).toBe("INDEX");
  });

  it("% do total soma 1 em cada categoria", () => {
    const p = applyScale(result, newWidget({ scale: { type: "percent", min: "auto", max: "auto" } }), "L", true);
    expect(p.result.series[0].values[0]! + p.result.series[1].values[0]!).toBeCloseTo(1);
  });

  it("logarítmica omite valores ≤ 0 e avisa", () => {
    const p = applyScale(result, newWidget({ scale: { type: "log", min: "auto", max: "auto" } }), "L", true);
    expect(p.result.series[1].values).toEqual([30, null]);
    expect(p.warnings.length).toBe(1);
  });

  it("colunas incluem sempre o zero sem cortar valores negativos", () => {
    const w = newWidget({ type: "bar" });
    const opt = buildOption(applyScale(result, w, "L", true), w, palette, 400) as { yAxis: { min?: number; scale?: boolean } };
    expect(opt.yAxis.scale).toBe(false);
    expect(opt.yAxis.min).toBeUndefined();
    const line = newWidget({ type: "line" });
    const lo = buildOption(applyScale(result, line, "L", true), line, palette, 400) as { yAxis: { scale?: boolean } };
    expect(lo.yAxis.scale).toBe(true);
  });
});

describe("construtor", () => {
  it("adapta dimensões ao mudar para mapa de calor e circular", () => {
    const heat = adaptToType(newWidget({ metric: "tx" }), "heatmap");
    expect([heat.x, heat.breakdown]).toEqual(["hour", "weekday"]);
    const pie = adaptToType(newWidget({ metric: "shopSales" }), "pie");
    expect(pie.x).toBe("region");
  });

  it("os layouts predefinidos não têm sobreposições e cabem nas colunas", () => {
    for (const d of presetDashboards()) {
      for (const bp of Object.keys(COLS) as (keyof typeof COLS)[]) {
        const items = packLayout(d.widgets, bp);
        for (const a of items) {
          expect(a.x + a.w).toBeLessThanOrEqual(COLS[bp]);
          for (const b of items) {
            if (a === b) continue;
            const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
            expect(overlap).toBe(false);
          }
        }
      }
    }
  });
});

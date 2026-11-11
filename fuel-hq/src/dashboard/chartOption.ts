import type { EChartsCoreOption } from "echarts/core";
import { formatAxis, formatValue, type Unit } from "../data/metrics";
import type { QueryResult, SeriesOut } from "../data/query";
import type { Palette } from "../lib/theme";
import type { WidgetConfig } from "./types";

export interface Prepared {
  result: QueryResult;
  unit: Unit;
  /** unidade efetiva depois da transformação de escala */
  displayUnit: Unit | "INDEX";
  warnings: string[];
}

/** Aplica a transformação de escala (índice, % do total, log) aos valores. */
export function applyScale(result: QueryResult, w: WidgetConfig, unit: Unit, additive: boolean): Prepared {
  const warnings = [...result.warnings];
  const scale = w.scale.type;
  let series: SeriesOut[] = result.series.map((s) => ({ ...s, values: [...s.values] }));
  let displayUnit: Prepared["displayUnit"] = unit;

  if (scale === "index") {
    series = series.map((s) => {
      const base = s.values.find((v) => v !== null && v !== 0);
      return { ...s, values: s.values.map((v) => (v === null || !base ? null : (v / base) * 100)) };
    });
    displayUnit = "INDEX";
  } else if (scale === "percent") {
    if (!additive) warnings.push("«% do total» só se aplica a métricas somáveis; a mostrar escala linear.");
    else {
      const main = series.filter((s) => s.role !== "comparison");
      const totals = result.categories.map((_, i) => main.reduce((a, s) => a + Math.abs(s.values[i] ?? 0), 0));
      series = main.map((s) => ({ ...s, values: s.values.map((v, i) => (v === null || !totals[i] ? null : v / totals[i])) }));
      displayUnit = "PCT";
    }
  } else if (scale === "log") {
    let dropped = 0;
    series = series.map((s) => ({
      ...s,
      values: s.values.map((v) => {
        if (v !== null && v <= 0) {
          dropped++;
          return null;
        }
        return v;
      }),
    }));
    if (dropped) warnings.push(`${dropped} valores ≤ 0 omitidos (a escala logarítmica não os representa).`);
  }
  return { result: { ...result, series }, unit, displayUnit, warnings };
}

export function fmt(v: number | null | undefined, u: Prepared["displayUnit"]) {
  if (u === "INDEX") return v === null || v === undefined ? "—" : new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(v);
  return formatValue(v ?? null, u);
}

function fmtAxis(v: number, u: Prepared["displayUnit"]) {
  if (u === "INDEX") return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 }).format(v);
  return formatAxis(v, u);
}

function color(p: Palette, slot: number) {
  return p.series[Math.max(0, Math.min(8, slot))] || p.series[1];
}

function baseTooltip(p: Palette) {
  return {
    confine: true,
    backgroundColor: p.surface,
    borderColor: p.border,
    borderWidth: 1,
    textStyle: { color: p.ink, fontSize: 12 },
    extraCssText: "border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);",
  };
}

function legend(p: Palette, show: boolean) {
  return show
    ? { show: true, type: "scroll", top: 0, left: 0, icon: "roundRect", itemWidth: 10, itemHeight: 10, itemGap: 12, textStyle: { color: p.ink2, fontSize: 11 }, pageIconColor: p.ink2, pageTextStyle: { color: p.muted } }
    : { show: false };
}

/** includeZero: o eixo inclui sempre o zero (barras), mas mantém valores negativos visíveis. */
function valueAxis(p: Palette, w: WidgetConfig, prep: Prepared, includeZero: boolean) {
  const min = w.scale.min === "zero" ? 0 : typeof w.scale.min === "number" ? w.scale.min : undefined;
  const max = typeof w.scale.max === "number" ? w.scale.max : prep.displayUnit === "PCT" && w.scale.type === "percent" ? 1 : undefined;
  return {
    type: w.scale.type === "log" ? "log" : "value",
    logBase: 10,
    scale: !includeZero && w.scale.min === "auto",
    min: w.scale.type === "log" && min === 0 ? undefined : min,
    max,
    axisLabel: { color: p.muted, fontSize: 11, formatter: (v: number) => fmtAxis(v, prep.displayUnit) },
    splitLine: { lineStyle: { color: p.grid, width: 1 } },
    axisLine: { show: false },
    axisTick: { show: false },
  };
}

function categoryAxis(p: Palette, labels: string[]) {
  return {
    type: "category",
    data: labels,
    axisLabel: { color: p.muted, fontSize: 11, hideOverlap: true },
    axisLine: { lineStyle: { color: p.axis } },
    axisTick: { show: false },
  };
}

export function buildOption(prep: Prepared, w: WidgetConfig, p: Palette, width: number): EChartsCoreOption {
  const { result } = prep;
  const labels = result.categories.map((c) => c.label);
  const series = result.series;
  const multi = series.length > 1;
  const isTime = result.x === "time";
  const narrow = width < 380;
  const zoom = w.options.zoom && isTime && labels.length > 6;
  const grid = { left: 8, right: 14, top: multi ? 30 : 12, bottom: zoom ? 34 : 6, outerBoundsMode: "same", outerBoundsContain: "axisLabel" };
  const tooltipFmt = (v: unknown) => fmt(typeof v === "number" ? v : null, prep.displayUnit);
  const dataZoom = zoom
    ? [
        { type: "inside", throttle: 50 },
        { type: "slider", height: 16, bottom: 6, borderColor: p.grid, fillerColor: "rgba(57,135,229,0.15)", handleSize: "120%", textStyle: { color: p.muted, fontSize: 10 }, dataBackground: { lineStyle: { color: p.axis }, areaStyle: { color: p.surface2 } } },
      ]
    : undefined;

  switch (w.type) {
    case "line":
    case "area": {
      return {
        animationDuration: 300,
        grid: { ...grid, right: w.options.labels && series.length <= 4 ? 70 : 14 },
        legend: legend(p, multi),
        tooltip: { ...baseTooltip(p), trigger: "axis", axisPointer: { type: "line", lineStyle: { color: p.axis } }, valueFormatter: tooltipFmt },
        xAxis: { ...categoryAxis(p, labels), boundaryGap: false },
        yAxis: valueAxis(p, w, prep, false),
        dataZoom,
        series: series.map((s) => ({
          name: s.name,
          type: "line",
          data: s.values,
          smooth: w.options.smooth,
          showSymbol: labels.length <= 14,
          symbol: "circle",
          symbolSize: 8,
          connectNulls: w.source !== "network",
          lineStyle: { width: 2, cap: "round", join: "round" },
          itemStyle: { color: color(p, s.slot), borderColor: p.surface, borderWidth: 2 },
          areaStyle: w.type === "area" ? { opacity: 0.1 } : undefined,
          stack: w.type === "area" && w.scale.type === "percent" ? "total" : undefined,
          z: s.role === "comparison" ? 1 : 2,
          endLabel: w.options.labels && series.length <= 4 ? { show: true, color: p.ink2, fontSize: 11, formatter: (o: { value: number }) => fmt(o.value, prep.displayUnit) } : undefined,
          emphasis: { focus: "series" },
        })),
      };
    }
    case "bar":
    case "stacked": {
      const stacked = w.type === "stacked";
      const showLabels = w.options.labels && labels.length <= (narrow ? 8 : 14) && !stacked;
      return {
        animationDuration: 300,
        grid,
        legend: legend(p, multi),
        tooltip: { ...baseTooltip(p), trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(127,127,127,0.08)" } }, valueFormatter: tooltipFmt },
        xAxis: categoryAxis(p, labels),
        yAxis: valueAxis(p, w, prep, w.scale.type !== "log"),
        dataZoom,
        series: series.map((s) => ({
          name: s.name,
          type: "bar",
          data: s.values.map((v, i) => (result.categories[i]?.partial ? { value: v, itemStyle: { opacity: 0.45 } } : v)),
          stack: stacked && s.role !== "comparison" ? "total" : undefined,
          barMaxWidth: 24,
          barGap: "15%",
          itemStyle: {
            color: color(p, s.slot),
            borderRadius: stacked ? 0 : [4, 4, 0, 0],
            borderColor: stacked ? p.surface : undefined,
            borderWidth: stacked ? 1 : 0,
          },
          label: showLabels ? { show: true, position: "top", color: p.ink2, fontSize: 10, formatter: (o: { value: number }) => fmt(o.value, prep.displayUnit) } : undefined,
          emphasis: { focus: "series" },
        })),
      };
    }
    case "hbar": {
      const showLabels = w.options.labels;
      return {
        animationDuration: 300,
        grid: { ...grid, right: showLabels ? 64 : 14 },
        legend: legend(p, multi),
        tooltip: { ...baseTooltip(p), trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: "rgba(127,127,127,0.08)" } }, valueFormatter: tooltipFmt },
        yAxis: { ...categoryAxis(p, labels), inverse: true, axisLabel: { color: p.ink2, fontSize: 11, width: narrow ? 90 : 130, overflow: "truncate" } },
        xAxis: { ...valueAxis(p, w, prep, w.scale.type !== "log"), axisLabel: { color: p.muted, fontSize: 10, hideOverlap: true, formatter: (v: number) => fmtAxis(v, prep.displayUnit) } },
        series: series.map((s) => ({
          name: s.name,
          type: "bar",
          data: s.values,
          barMaxWidth: 18,
          itemStyle: { color: color(p, s.slot), borderRadius: [0, 4, 4, 0] },
          label: showLabels ? { show: true, position: "right", color: p.ink2, fontSize: 10, formatter: (o: { value: number }) => fmt(o.value, prep.displayUnit) } : undefined,
        })),
      };
    }
    case "pie":
    case "donut": {
      let slices: { name: string; value: number; slot: number }[];
      if (result.x === "time" || result.x === "none") {
        slices = series.filter((s) => s.role !== "comparison").map((s) => ({ name: s.name, value: s.values.reduce<number>((a, v) => a + (v ?? 0), 0), slot: s.slot }));
      } else {
        const s = series[0];
        slices = result.categories.map((c, i) => ({ name: c.label, value: s?.values[i] ?? 0, slot: c.slot ?? i + 1 }));
      }
      slices = slices.filter((s) => s.value > 0);
      if (slices.length > 8) {
        const sorted = [...slices].sort((a, b) => b.value - a.value);
        const rest = sorted.slice(7).reduce((a, s) => a + s.value, 0);
        slices = [...sorted.slice(0, 7), { name: "Outros", value: rest, slot: 0 }];
      }
      const total = slices.reduce((a, s) => a + s.value, 0);
      const donut = w.type === "donut";
      return {
        animationDuration: 300,
        legend: { ...legend(p, true), top: undefined, bottom: 0 },
        tooltip: { ...baseTooltip(p), trigger: "item", formatter: (o: { name: string; value: number; percent: number }) => `${o.name}<br/><b>${fmt(o.value, prep.displayUnit)}</b> · ${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(o.percent)} %` },
        title: donut ? { text: fmt(total, prep.displayUnit), subtext: "total", left: "center", top: "38%", textStyle: { color: p.ink, fontSize: narrow ? 14 : 16, fontWeight: 600 }, subtextStyle: { color: p.muted, fontSize: 11 } } : undefined,
        series: [
          {
            type: "pie",
            radius: donut ? ["50%", "72%"] : [0, "72%"],
            center: ["50%", "46%"],
            padAngle: 1,
            itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 4 },
            label: { show: !narrow && w.options.labels, color: p.ink2, fontSize: 11, formatter: "{d}%" },
            labelLine: { lineStyle: { color: p.axis } },
            data: slices.map((s) => ({ name: s.name, value: s.value, itemStyle: { color: color(p, s.slot) } })),
          },
        ],
      };
    }
    case "heatmap": {
      const data: [number, number, number | null][] = [];
      let lo = Infinity;
      let hi = -Infinity;
      series.forEach((s, yi) =>
        s.values.forEach((v, xi) => {
          data.push([xi, yi, v]);
          if (v !== null) {
            lo = Math.min(lo, v);
            hi = Math.max(hi, v);
          }
        }),
      );
      return {
        animationDuration: 300,
        grid: { ...grid, top: 8, bottom: 40 },
        tooltip: { ...baseTooltip(p), trigger: "item", formatter: (o: { value: [number, number, number] }) => `${series[o.value[1]]?.name ?? ""} · ${labels[o.value[0]]}<br/><b>${fmt(o.value[2], prep.displayUnit)}</b>` },
        xAxis: { ...categoryAxis(p, labels), splitArea: { show: false } },
        yAxis: { ...categoryAxis(p, series.map((s) => s.name)), inverse: true },
        visualMap: {
          min: Number.isFinite(lo) ? lo : 0,
          max: Number.isFinite(hi) ? hi : 1,
          calculable: false,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          itemHeight: 120,
          itemWidth: 10,
          text: [fmt(hi, prep.displayUnit), fmt(lo, prep.displayUnit)],
          textStyle: { color: p.muted, fontSize: 10 },
          inRange: { color: p.seq },
        },
        series: [{ type: "heatmap", data, itemStyle: { borderColor: p.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: p.ink, borderWidth: 1 } } }],
      };
    }
    case "gauge": {
      const v = result.total ?? 0;
      const max = typeof w.scale.max === "number" ? w.scale.max : w.options.gaugeMax ?? (prep.unit === "PCT" ? 1 : Math.max(1, v * 1.4));
      const min = typeof w.scale.min === "number" ? w.scale.min : 0;
      const target = w.options.target;
      const ok = target === undefined || v >= target;
      return {
        animationDuration: 300,
        series: [
          {
            type: "gauge",
            min,
            max,
            startAngle: 210,
            endAngle: -30,
            radius: "92%",
            center: ["50%", "58%"],
            progress: { show: true, width: 10, roundCap: true, itemStyle: { color: ok ? p.series[1] : p.serious } },
            axisLine: { roundCap: true, lineStyle: { width: 10, color: [[1, p.surface2]] } },
            pointer: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            anchor: { show: false },
            title: { show: true, offsetCenter: [0, "32%"], color: p.muted, fontSize: 11 },
            detail: { valueAnimation: false, offsetCenter: [0, "0%"], fontSize: narrow ? 18 : 22, fontWeight: 600, color: p.ink, formatter: (x: number) => fmt(x, prep.displayUnit) },
            data: [{ value: v, name: target !== undefined ? `${ok ? "✓" : "⚠ abaixo"} objetivo ${fmt(target, prep.displayUnit)}` : "" }],
          },
        ],
      };
    }
    default:
      return {};
  }
}

export function buildScatterOption(points: { name: string; x: number | null; y: number | null }[], ux: Unit, uy: Unit, xLabel: string, yLabel: string, p: Palette, labels: boolean): EChartsCoreOption {
  const data = points.filter((pt) => pt.x !== null && pt.y !== null).map((pt) => ({ name: pt.name, value: [pt.x, pt.y] }));
  return {
    animationDuration: 300,
    grid: { left: 8, right: 16, top: 26, bottom: 24, outerBoundsMode: "same", outerBoundsContain: "axisLabel" },
    tooltip: { ...baseTooltip(p), trigger: "item", formatter: (o: { name: string; value: [number, number] }) => `<b>${o.name}</b><br/>${xLabel}: ${formatValue(o.value[0], ux)}<br/>${yLabel}: ${formatValue(o.value[1], uy)}` },
    xAxis: { type: "value", scale: true, name: xLabel, nameLocation: "middle", nameGap: 22, nameTextStyle: { color: p.muted, fontSize: 11 }, axisLabel: { color: p.muted, fontSize: 10, formatter: (v: number) => formatAxis(v, ux) }, splitLine: { lineStyle: { color: p.grid } }, axisLine: { show: false } },
    yAxis: { type: "value", scale: true, name: yLabel, nameTextStyle: { color: p.muted, fontSize: 11, align: "left" }, axisLabel: { color: p.muted, fontSize: 10, formatter: (v: number) => formatAxis(v, uy) }, splitLine: { lineStyle: { color: p.grid } } },
    series: [
      {
        type: "scatter",
        data,
        symbolSize: 12,
        itemStyle: { color: p.series[1], borderColor: p.surface, borderWidth: 2 },
        label: labels ? { show: true, position: "right", formatter: "{b}", color: p.ink2, fontSize: 10 } : undefined,
        emphasis: { scale: 1.4 },
      },
    ],
  };
}

import { useMemo, useState } from "react";
import { getMetric, type Unit } from "../data/metrics";
import { describeRange } from "../data/query";
import { useTheme } from "../lib/theme";
import { applyScale, buildOption, buildScatterOption, fmt, type Prepared } from "./chartOption";
import { EChart } from "./EChart";
import type { WidgetConfig } from "./types";
import type { WidgetData } from "./useWidgetData";

export function WidgetView({ w, data, asTable }: { w: WidgetConfig; data: WidgetData; asTable?: boolean }) {
  const { palette } = useTheme();
  const [width, setWidth] = useState(360);
  const prep = useMemo<Prepared>(() => applyScale(data.result, w, data.unit, data.additive), [data, w]);
  const option = useMemo(() => {
    if (w.type === "scatter" && data.scatter) {
      const mx = getMetric(w.metric);
      const my = getMetric(w.metricY ?? "conversion");
      return buildScatterOption(data.scatter, data.unit, data.unitY ?? "COUNT", mx.short, my.short, palette, w.options.labels);
    }
    return buildOption(prep, w, palette, width);
  }, [prep, w, palette, width, data]);

  if (data.error) return <div className="empty">{data.error}</div>;
  const hasData = data.result.series.some((s) => s.values.some((v) => v !== null)) || (w.type === "scatter" && data.scatter?.length);
  if (!hasData && w.type !== "kpi" && w.type !== "gauge") return <div className="empty">Sem dados para o período e filtros escolhidos.</div>;

  if (asTable || w.type === "table") return <TableView prep={prep} />;
  if (w.type === "kpi") return <KpiView data={data} prep={prep} compare={w.compare} />;
  const label = `${w.title}. ${describeRange(data.result.from, data.result.to)}.`;
  return <EChart option={option} ariaLabel={label} onWidth={setWidth} />;
}

function deltaText(cur: number, prev: number, unit: Unit, additive: boolean) {
  const diff = cur - prev;
  if (unit === "PCT") return `${diff >= 0 ? "+" : "−"}${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(Math.abs(diff * 100))} p.p.`;
  if (!additive && unit === "EUR_L") return `${diff >= 0 ? "+" : "−"}${new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(Math.abs(diff))} €/L`;
  if (prev === 0) return "—";
  const pct = (diff / Math.abs(prev)) * 100;
  return `${pct >= 0 ? "+" : "−"}${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format(Math.abs(pct))} %`;
}

function KpiView({ data, prep, compare }: { data: WidgetData; prep: Prepared; compare: WidgetConfig["compare"] }) {
  const cur = data.result.total;
  const prev = data.compareTotal;
  const main = data.result.series.find((s) => s.role !== "comparison");
  const pts = (main?.values ?? []).filter((v): v is number => v !== null);
  let cls = "neutral";
  let arrow = "";
  if (cur !== null && prev !== null) {
    const up = cur > prev;
    arrow = cur === prev ? "=" : up ? "▲" : "▼";
    if (data.upIsGood !== null && cur !== prev) cls = up === data.upIsGood ? "good" : "bad";
  }
  const vsLabel = compare === "yoy" ? "vs ano anterior" : "vs período anterior";
  return (
    <div className="kpi">
      <div className="value">{fmt(cur, prep.displayUnit)}</div>
      {cur !== null && prev !== null ? (
        <>
          <div className={`delta ${cls}`}>
            <span aria-hidden="true">{arrow}</span>
            {deltaText(cur, prev, data.unit, data.additive)}
          </div>
          <div className="vs">{vsLabel}</div>
        </>
      ) : (
        <div className="delta neutral muted">sem comparação</div>
      )}
      {pts.length > 2 && <Sparkline values={pts} />}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const w = 200;
  const h = 34;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const xy = values.map((v, i) => [(i / (values.length - 1)) * (w - 6) + 3, h - 4 - ((v - lo) / span) * (h - 8)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="var(--muted)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill="var(--accent)" stroke="var(--surface)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function TableView({ prep }: { prep: Prepared }) {
  const { result } = prep;
  return (
    <div className="tablewrap" style={{ position: "absolute", inset: "0 8px 6px" }}>
      <table className="data">
        <thead>
          <tr>
            <th scope="col">{result.x === "time" ? "Período" : "Categoria"}</th>
            {result.series.map((s) => (
              <th key={s.key} scope="col">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.categories.map((c, i) => (
            <tr key={c.key}>
              <th scope="row" style={{ fontWeight: 500, color: "var(--ink)" }}>{c.label}</th>
              {result.series.map((s) => (
                <td key={s.key}>{fmt(s.values[i], prep.displayUnit)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

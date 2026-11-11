import { uid } from "../lib/storage";
import { COLS, type Breakpoint, type ChartType, type DashboardDef, type DashboardState, type GridItem, type WidgetConfig } from "./types";

export function newWidget(p: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: p.id ?? uid("w"),
    title: p.title ?? "Novo gráfico",
    type: p.type ?? "line",
    source: p.source ?? "network",
    metric: p.metric ?? "vol",
    metricY: p.metricY,
    x: p.x ?? "time",
    breakdown: p.breakdown ?? "none",
    granularity: p.granularity ?? "auto",
    period: p.period ?? { inherit: true },
    compare: p.compare ?? "none",
    filters: p.filters ?? {},
    ownFilters: p.ownFilters ?? false,
    scale: p.scale ?? { type: "linear", min: "auto", max: "auto" },
    options: { zoom: false, labels: false, smooth: false, sort: "none", topN: 7, ...(p.options ?? {}) },
    csv: p.csv,
  };
}

/** Tamanho por defeito (em colunas/linhas) por tipo de gráfico e breakpoint. */
export function defaultSize(type: ChartType, bp: Breakpoint): { w: number; h: number } {
  const cols = COLS[bp];
  if (type === "kpi") return { w: bp === "xs" ? 2 : 3, h: bp === "xs" || bp === "sm" ? 2 : 3 };
  if (type === "gauge") return { w: bp === "xs" ? 2 : 3, h: bp === "xs" || bp === "sm" ? 3 : 4 };
  if (bp === "xs" || bp === "sm") return { w: cols, h: 5 };
  return { w: 6, h: 5 };
}

/** Empacota os widgets por ordem, linha a linha. */
export function packLayout(widgets: WidgetConfig[], bp: Breakpoint): GridItem[] {
  const cols = COLS[bp];
  const out: GridItem[] = [];
  const heights = new Array(cols).fill(0);
  for (const w of widgets) {
    const { w: ww, h } = defaultSize(w.type, bp);
    let bestX = 0;
    let bestY = Infinity;
    for (let x = 0; x + ww <= cols; x++) {
      const y = Math.max(...heights.slice(x, x + ww));
      if (y < bestY) {
        bestY = y;
        bestX = x;
      }
    }
    out.push({ i: w.id, x: bestX, y: bestY, w: ww, h });
    for (let x = bestX; x < bestX + ww; x++) heights[x] = bestY + h;
  }
  return out;
}

export function allLayouts(widgets: WidgetConfig[]): DashboardDef["layouts"] {
  return { lg: packLayout(widgets, "lg"), md: packLayout(widgets, "md"), sm: packLayout(widgets, "sm"), xs: packLayout(widgets, "xs") };
}

function dash(id: string, name: string, widgets: WidgetConfig[]): DashboardDef {
  return { id, name, widgets, layouts: allLayouts(widgets) };
}

export function presetDashboards(): DashboardDef[] {
  const overview = [
    newWidget({ id: "kpi-vol", title: "Volume vendido", type: "kpi", metric: "vol", compare: "previous" }),
    newWidget({ id: "kpi-gm", title: "Margem bruta total", type: "kpi", metric: "totalGm", compare: "previous" }),
    newWidget({ id: "kpi-ml", title: "Margem por litro", type: "kpi", metric: "marginL", compare: "previous" }),
    newWidget({ id: "kpi-shop", title: "Vendas de loja", type: "kpi", metric: "shopSales", compare: "previous" }),
    newWidget({ id: "vol-prod", title: "Volume por produto", type: "stacked", metric: "vol", x: "time", breakdown: "product" }),
    newWidget({ id: "rank-gm", title: "Margem total por posto", type: "hbar", metric: "totalGm", x: "station", options: { zoom: false, labels: true, smooth: false, sort: "desc", topN: 7 } }),
    newWidget({ id: "mix", title: "Mix de produtos (volume)", type: "donut", metric: "vol", x: "product" }),
    newWidget({ id: "heat", title: "Abastecimentos por hora e dia", type: "heatmap", metric: "tx", x: "hour", breakdown: "weekday" }),
    newWidget({ id: "kpi-tx", title: "Abastecimentos", type: "kpi", metric: "tx", compare: "previous" }),
    newWidget({ id: "uptime", title: "Disponibilidade das bombas", type: "gauge", metric: "uptime", scale: { type: "linear", min: 0.9, max: 1 }, options: { zoom: false, labels: false, smooth: false, sort: "none", topN: 7, target: 0.99, gaugeMax: 1 } }),
    newWidget({ id: "margin-region", title: "Margem por litro por região", type: "line", metric: "marginL", x: "time", breakdown: "region", granularity: "week" }),
  ];
  const fuel = [
    newWidget({ id: "ref-price", title: "Preço de referência nacional (€/L)", type: "line", metric: "ref", x: "time", breakdown: "product", granularity: "week",
      period: { inherit: false, preset: "all" }, filters: { products: ["gasoleo", "g95"] }, ownFilters: true, scale: { type: "linear", min: "auto", max: "auto" }, options: { zoom: true, labels: false, smooth: false, sort: "none", topN: 7 } }),
    newWidget({ id: "vol-yoy", title: "Volume mensal vs ano anterior", type: "bar", metric: "vol", x: "time", granularity: "month", period: { inherit: false, preset: "ytd" }, compare: "yoy" }),
    newWidget({ id: "gap-station", title: "Preço praticado − referência, por posto", type: "hbar", metric: "gap", x: "station", options: { zoom: false, labels: true, smooth: false, sort: "desc", topN: 7 } }),
    newWidget({ id: "gm-prod", title: "Margem bruta por produto", type: "stacked", metric: "gm", x: "time", breakdown: "product", granularity: "month", period: { inherit: false, preset: "12m" } }),
    newWidget({ id: "price-type", title: "Preço médio por tipologia de posto", type: "line", metric: "price", x: "time", breakdown: "type", granularity: "week", period: { inherit: false, preset: "90d" } }),
  ];
  const ops = [
    newWidget({ id: "kpi-conv", title: "Conversão pista → loja", type: "kpi", metric: "conversion", compare: "previous" }),
    newWidget({ id: "kpi-basket", title: "Ticket médio de loja", type: "kpi", metric: "basket", compare: "previous" }),
    newWidget({ id: "kpi-alarms", title: "Alarmes de equipamento", type: "kpi", metric: "alarms", compare: "previous" }),
    newWidget({ id: "kpi-cover", title: "Dias de cobertura de stock", type: "kpi", metric: "cover", compare: "previous" }),
    newWidget({ id: "wetstock", title: "Variação de stock (% do volume) por posto", type: "hbar", metric: "variancePct", x: "station", period: { inherit: false, preset: "30d" }, options: { zoom: false, labels: true, smooth: false, sort: "asc", topN: 7 } }),
    newWidget({ id: "tank-prod", title: "Nível médio dos tanques por produto", type: "line", metric: "tank", x: "time", breakdown: "product", granularity: "day" }),
    newWidget({ id: "alarms-station", title: "Alarmes por posto", type: "hbar", metric: "alarms", x: "station", options: { zoom: false, labels: true, smooth: false, sort: "desc", topN: 7 } }),
    newWidget({ id: "scatter", title: "Volume × conversão de loja, por posto", type: "scatter", metric: "vol", metricY: "conversion", x: "station" }),
    newWidget({ id: "conv-type", title: "Conversão de loja por tipologia", type: "line", metric: "conversion", x: "time", breakdown: "type", granularity: "week", period: { inherit: false, preset: "12m" } }),
  ];
  return [dash("geral", "Visão geral", overview), dash("combustivel", "Combustível e preços", fuel), dash("operacao", "Loja e operação", ops)];
}

export function defaultState(): DashboardState {
  return { dashboards: presetDashboards(), activeId: "geral", globalPeriod: { preset: "30d" }, globalFilters: {} };
}

import type { Agg } from "../data/csv";
import type { CompareMode, Dim, Filters, Granularity, Period } from "../data/query";

export type ChartType =
  | "kpi" | "line" | "area" | "bar" | "stacked" | "hbar" | "pie" | "donut" | "scatter" | "heatmap" | "gauge" | "table";

export const CHART_TYPES: { id: ChartType; label: string; icon: string; hint: string }[] = [
  { id: "kpi", label: "Indicador", icon: "kpi", hint: "Um número com variação e tendência" },
  { id: "line", label: "Linhas", icon: "line", hint: "Evolução no tempo" },
  { id: "area", label: "Área", icon: "area", hint: "Evolução com volume acumulado" },
  { id: "bar", label: "Colunas", icon: "bar", hint: "Comparar valores por período ou categoria" },
  { id: "stacked", label: "Empilhado", icon: "stacked", hint: "Composição por período" },
  { id: "hbar", label: "Barras", icon: "hbar", hint: "Ranking de postos/categorias" },
  { id: "pie", label: "Circular", icon: "pie", hint: "Parte do todo (poucas categorias)" },
  { id: "donut", label: "Anel", icon: "donut", hint: "Parte do todo com total ao centro" },
  { id: "scatter", label: "Dispersão", icon: "scatter", hint: "Relação entre duas métricas, por posto" },
  { id: "heatmap", label: "Mapa calor", icon: "heatmap", hint: "Padrões hora × dia da semana" },
  { id: "gauge", label: "Medidor", icon: "gauge", hint: "Valor face a um objetivo" },
  { id: "table", label: "Tabela", icon: "table", hint: "Valores exatos" },
];

export type ScaleType = "linear" | "log" | "index" | "percent";
export const SCALE_LABELS: Record<ScaleType, string> = {
  linear: "Linear",
  log: "Logarítmica",
  index: "Índice (base 100)",
  percent: "% do total",
};

export type PeriodSetting = { inherit: true } | ({ inherit: false } & Period);

export interface WidgetConfig {
  id: string;
  title: string;
  type: ChartType;
  /** "network" = dados da rede; "csv:<id>" = conjunto importado */
  source: string;
  metric: string;
  /** Métrica do eixo Y na dispersão */
  metricY?: string;
  x: Dim;
  breakdown: Dim;
  granularity: Granularity;
  period: PeriodSetting;
  compare: CompareMode;
  filters: Filters;
  /** Se true, ignora os filtros globais do painel. */
  ownFilters?: boolean;
  scale: { type: ScaleType; min: "auto" | "zero" | number; max: "auto" | number };
  options: {
    zoom: boolean;
    labels: boolean;
    smooth: boolean;
    sort: "none" | "asc" | "desc";
    topN: number;
    target?: number;
    gaugeMax?: number;
  };
  /** Configuração para conjuntos CSV */
  csv?: { valueCol: string; agg: Agg; dateCol?: string; x: string; breakdown: string };
}

export interface GridItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Breakpoint = "lg" | "md" | "sm" | "xs";
export const BREAKPOINTS: Record<Breakpoint, number> = { lg: 1200, md: 900, sm: 600, xs: 0 };
export const COLS: Record<Breakpoint, number> = { lg: 12, md: 12, sm: 6, xs: 4 };

export interface DashboardDef {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  layouts: Partial<Record<Breakpoint, GridItem[]>>;
}

export interface DashboardState {
  dashboards: DashboardDef[];
  activeId: string;
  globalPeriod: Period;
  globalFilters: Filters;
}

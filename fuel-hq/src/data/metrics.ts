export type Unit = "L" | "EUR" | "EUR_L" | "PCT" | "COUNT" | "DAYS" | "NUM";

export type AccField =
  | "vol" | "rev" | "gm" | "tx" | "refVol" | "stockL" | "capL" | "deliveries" | "variance" | "cover" | "n"
  | "shopSales" | "shopGm" | "shopTx" | "fuelTx" | "uptime" | "sn" | "alarms";

export const ALL_FIELDS: AccField[] = [
  "vol", "rev", "gm", "tx", "refVol", "stockL", "capL", "deliveries", "variance", "cover", "n",
  "shopSales", "shopGm", "shopTx", "fuelTx", "uptime", "sn", "alarms",
];

/** Campos que se podem repartir por hora (somas). */
export const ADDITIVE_FIELDS = new Set<AccField>(["vol", "rev", "gm", "tx", "refVol", "deliveries", "variance", "shopSales", "shopGm", "shopTx", "fuelTx", "alarms"]);

export type Acc = Record<AccField, number>;

export function emptyAcc(): Acc {
  const a = {} as Acc;
  for (const f of ALL_FIELDS) a[f] = 0;
  return a;
}

export function mergeAcc(into: Acc, from: Acc) {
  for (const f of ALL_FIELDS) into[f] += from[f];
}

export type MetricGroup = "Combustível" | "Preços e margens" | "Loja" | "Stock e tanques" | "Equipamentos";

export interface MetricDef {
  id: string;
  label: string;
  short: string;
  group: MetricGroup;
  unit: Unit;
  /** "fuel": por posto × produto; "station": só por posto (loja, equipamentos). */
  level: "fuel" | "station";
  /** Soma ao longo do tempo / categorias (permite % do total, empilhar, hora). */
  additive: boolean;
  /** Quando "true", subir é bom (para a cor do delta). null = neutro. */
  upIsGood: boolean | null;
  compute: (a: Acc) => number | null;
  description: string;
}

const ratio = (num: number, den: number) => (den > 0 ? num / den : null);

export const METRICS: MetricDef[] = [
  { id: "vol", label: "Volume vendido", short: "Volume", group: "Combustível", unit: "L", level: "fuel", additive: true, upIsGood: true,
    compute: (a) => a.vol, description: "Litros vendidos." },
  { id: "rev", label: "Receita de combustível", short: "Receita", group: "Combustível", unit: "EUR", level: "fuel", additive: true, upIsGood: true,
    compute: (a) => a.rev, description: "Volume × preço praticado (com IVA)." },
  { id: "tx", label: "Abastecimentos", short: "Abastec.", group: "Combustível", unit: "COUNT", level: "fuel", additive: true, upIsGood: true,
    compute: (a) => a.tx, description: "Número de transações de combustível." },
  { id: "fill", label: "Litros por abastecimento", short: "L/abast.", group: "Combustível", unit: "L", level: "fuel", additive: false, upIsGood: true,
    compute: (a) => ratio(a.vol, a.tx), description: "Volume ÷ abastecimentos." },
  { id: "gm", label: "Margem bruta de combustível", short: "Margem comb.", group: "Preços e margens", unit: "EUR", level: "fuel", additive: true, upIsGood: true,
    compute: (a) => a.gm, description: "Receita − custo do produto." },
  { id: "marginL", label: "Margem por litro", short: "Margem €/L", group: "Preços e margens", unit: "EUR_L", level: "fuel", additive: false, upIsGood: true,
    compute: (a) => ratio(a.gm, a.vol), description: "Margem bruta ÷ volume (ponderada pelo volume)." },
  { id: "price", label: "Preço médio praticado", short: "Preço", group: "Preços e margens", unit: "EUR_L", level: "fuel", additive: false, upIsGood: null,
    compute: (a) => ratio(a.rev, a.vol), description: "Receita ÷ volume." },
  { id: "ref", label: "Preço de referência nacional", short: "Preço ref.", group: "Preços e margens", unit: "EUR_L", level: "fuel", additive: false, upIsGood: null,
    compute: (a) => ratio(a.refVol, a.vol), description: "Média nacional (pontos DGEG via fontes secundárias, interpolados). Ver Dados → Fontes." },
  { id: "gap", label: "Diferença face à referência", short: "Δ vs ref.", group: "Preços e margens", unit: "EUR_L", level: "fuel", additive: false, upIsGood: null,
    compute: (a) => (a.vol > 0 ? (a.rev - a.refVol) / a.vol : null), description: "Preço praticado − preço de referência." },
  { id: "tank", label: "Nível médio dos tanques", short: "Nível tanques", group: "Stock e tanques", unit: "PCT", level: "fuel", additive: false, upIsGood: null,
    compute: (a) => ratio(a.stockL, a.capL), description: "Stock ÷ capacidade (fim do dia)." },
  { id: "cover", label: "Dias de cobertura de stock", short: "Cobertura", group: "Stock e tanques", unit: "DAYS", level: "fuel", additive: false, upIsGood: null,
    compute: (a) => ratio(a.cover, a.n), description: "Stock ÷ venda média diária (7 dias)." },
  { id: "deliveries", label: "Descargas de camião-cisterna", short: "Descargas", group: "Stock e tanques", unit: "COUNT", level: "fuel", additive: true, upIsGood: null,
    compute: (a) => a.deliveries, description: "Número de descargas recebidas." },
  { id: "variance", label: "Variação de stock (wetstock)", short: "Wetstock L", group: "Stock e tanques", unit: "L", level: "fuel", additive: true, upIsGood: null,
    compute: (a) => a.variance, description: "Stock medido − stock contabilístico. Negativo = falta (possível fuga, furto ou erro de medição)." },
  { id: "variancePct", label: "Variação de stock (% do volume)", short: "Wetstock %", group: "Stock e tanques", unit: "PCT", level: "fuel", additive: false, upIsGood: null,
    compute: (a) => ratio(a.variance, a.vol), description: "Variação de stock ÷ volume vendido." },
  { id: "shopSales", label: "Vendas de loja", short: "Vendas loja", group: "Loja", unit: "EUR", level: "station", additive: true, upIsGood: true,
    compute: (a) => a.shopSales, description: "Vendas da loja de conveniência." },
  { id: "shopGm", label: "Margem bruta de loja", short: "Margem loja", group: "Loja", unit: "EUR", level: "station", additive: true, upIsGood: true,
    compute: (a) => a.shopGm, description: "Vendas de loja − custo das mercadorias." },
  { id: "shopTx", label: "Transações de loja", short: "Transações loja", group: "Loja", unit: "COUNT", level: "station", additive: true, upIsGood: true,
    compute: (a) => a.shopTx, description: "Número de talões da loja." },
  { id: "basket", label: "Ticket médio de loja", short: "Ticket médio", group: "Loja", unit: "EUR", level: "station", additive: false, upIsGood: true,
    compute: (a) => ratio(a.shopSales, a.shopTx), description: "Vendas de loja ÷ transações de loja." },
  { id: "conversion", label: "Conversão pista → loja", short: "Conversão", group: "Loja", unit: "PCT", level: "station", additive: false, upIsGood: true,
    compute: (a) => ratio(a.shopTx, a.fuelTx), description: "Transações de loja ÷ abastecimentos (rácio aproximado; inclui clientes só de loja)." },
  { id: "totalGm", label: "Margem bruta total", short: "Margem total", group: "Preços e margens", unit: "EUR", level: "station", additive: true, upIsGood: true,
    compute: (a) => a.gm + a.shopGm, description: "Margem de combustível + margem de loja." },
  { id: "uptime", label: "Disponibilidade das bombas", short: "Disponibilidade", group: "Equipamentos", unit: "PCT", level: "station", additive: false, upIsGood: true,
    compute: (a) => ratio(a.uptime, a.sn), description: "Horas operacionais ÷ horas totais dos dispensadores." },
  { id: "alarms", label: "Alarmes de equipamento", short: "Alarmes", group: "Equipamentos", unit: "COUNT", level: "station", additive: true, upIsGood: false,
    compute: (a) => a.alarms, description: "Ocorrências e alarmes registados nos dispensadores." },
];

export const metricById = new Map(METRICS.map((m) => [m.id, m]));

export function getMetric(id: string): MetricDef {
  return metricById.get(id) ?? METRICS[0];
}

// ---------- Formatação (pt-PT) ----------
const nf0 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const nf3 = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 3, minimumFractionDigits: 3 });
const compact = new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 });
const eur0 = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", maximumFractionDigits: 2, minimumFractionDigits: 2 });

export function formatValue(v: number | null | undefined, unit: Unit, opts: { compact?: boolean } = {}): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  const big = Math.abs(v) >= 10000 && opts.compact !== false;
  switch (unit) {
    case "L":
      return `${big ? compact.format(v) : nf0.format(v)} L`;
    case "EUR":
      if (big) return `${compact.format(v)} €`;
      return Math.abs(v) < 100 ? eur2.format(v) : eur0.format(v);
    case "EUR_L":
      return `${nf3.format(v)} €/L`;
    case "PCT": {
      const a = Math.abs(v * 100);
      if (a > 0 && a < 0.1) return `${new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v * 100)} %`;
      return `${nf1.format(v * 100)} %`;
    }
    case "DAYS":
      return `${nf1.format(v)} dias`;
    case "COUNT":
      return big ? compact.format(v) : nf0.format(v);
    case "NUM":
      return big ? compact.format(v) : numAdaptive(v);
  }
}

/** Número genérico com casas decimais adaptadas à grandeza (dados importados). */
function numAdaptive(v: number): string {
  const a = Math.abs(v);
  const digits = a < 10 ? 3 : a < 1000 ? 1 : 0;
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: digits }).format(v);
}

/** Formatação curta para eixos. */
export function formatAxis(v: number, unit: Unit): string {
  switch (unit) {
    case "PCT": {
      const a = Math.abs(v * 100);
      return `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: a === 0 || a >= 10 ? 0 : a >= 1 ? 1 : 2 }).format(v * 100)}%`;
    }
    case "NUM":
      return Math.abs(v) >= 10000 ? compact.format(v) : numAdaptive(v);
    case "EUR_L":
      return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v);
    default:
      return Math.abs(v) >= 10000 ? compact.format(v) : nf0.format(v);
  }
}

export function unitLabel(unit: Unit): string {
  return { L: "litros", EUR: "€", EUR_L: "€/L", PCT: "%", COUNT: "n.º", DAYS: "dias", NUM: "" }[unit];
}

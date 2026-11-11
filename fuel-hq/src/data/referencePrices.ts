import { toDay, mondayOf } from "../lib/dates";
import type { ProductId } from "./types";

/**
 * Pontos de preço médio de venda ao público (€/L) em Portugal continental,
 * recolhidos por pesquisa web em 11/11/2026. Quase todos vêm de fontes
 * SECUNDÁRIAS (imprensa/agregadores) que citam a DGEG; confirme-os na fonte
 * primária (DGEG — precoscombustiveis.dgeg.gov.pt / "Estatísticas Rápidas")
 * antes de usar em decisões. Entre pontos, a série é interpolada linearmente e
 * mantida constante por semana (as alterações de preço em Portugal ocorrem,
 * em regra, à segunda-feira).
 */
export interface PriceAnchor {
  date: string; // dia de referência (médias mensais ancoradas a dia 15)
  product: "gasoleo" | "g95";
  value: number;
  kind: "média mensal" | "valor diário" | "média semanal";
  source: string;
  url?: string;
  note?: string;
}

const JN = "https://www.jornaldenegocios.pt/mercados/detalhe/dgeg-preco-do-gasoleo-subiu-30-e-o-da-gasolina-19-em-maio-face-a-2025";
const POUPA = "https://www.poupapilim.com/preco-dos-combustiveis-na-proxima-semana-26-de-outubro-a-1-de-novembro/";
const ECO = "https://eco.sapo.pt/2026/10/30/combustiveis-na-proxima-semana/";
const CPOUP = "https://contaspoupanca.pt/carro/2026-11-05-combustiveis--gasolina-desceu-21-centimos-no-preco-justo-esta-semana.-gasoleo-subiu-pela-quarta-semana-seguida-a2e30eb0";
const CCPT = "https://combustivel.com.pt/";

export const PRICE_ANCHORS: PriceAnchor[] = [
  { date: "2025-05-15", product: "gasoleo", value: 1.517, kind: "média mensal", source: "DGEG, citada pelo Jornal de Negócios", url: JN },
  { date: "2025-05-15", product: "g95", value: 1.677, kind: "média mensal", source: "DGEG, citada pelo Jornal de Negócios", url: JN },
  { date: "2025-10-31", product: "gasoleo", value: 1.602, kind: "valor diário", source: "Agregador combustivel.com.pt (média DGEG sem descontos)", url: CCPT, note: "valor de um único dia" },
  { date: "2025-10-31", product: "g95", value: 1.717, kind: "valor diário", source: "Agregador combustivel.com.pt (média DGEG sem descontos)", url: CCPT, note: "valor de um único dia" },
  { date: "2026-01-15", product: "gasoleo", value: 1.54, kind: "média mensal", source: "Fonte secundária citando histórico DGEG", note: "valor arredondado; fonte exata por confirmar" },
  { date: "2026-01-15", product: "g95", value: 1.66, kind: "média mensal", source: "Fonte secundária citando histórico DGEG", note: "valor arredondado; fonte exata por confirmar" },
  { date: "2026-05-15", product: "gasoleo", value: 1.977, kind: "média mensal", source: "DGEG (Estatísticas Rápidas), citada pelo Jornal de Negócios", url: JN },
  { date: "2026-05-15", product: "g95", value: 2.0, kind: "média mensal", source: "DGEG (Estatísticas Rápidas), citada pelo Jornal de Negócios", url: JN },
  { date: "2026-06-15", product: "gasoleo", value: 1.837, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-06-15", product: "g95", value: 1.907, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-07-15", product: "gasoleo", value: 1.88, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-07-15", product: "g95", value: 1.929, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-08-15", product: "gasoleo", value: 2.031, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-08-15", product: "g95", value: 1.958, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-09-15", product: "gasoleo", value: 2.135, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-09-15", product: "g95", value: 2.079, kind: "média mensal", source: "Tabela DGEG publicada por poupapilim.com", url: POUPA },
  { date: "2026-10-30", product: "gasoleo", value: 2.19, kind: "valor diário", source: "Média DGEG citada pelo ECO", url: ECO, note: "outro agregador indica 2,246 € a 31/10 (metodologia diferente)" },
  { date: "2026-10-30", product: "g95", value: 2.033, kind: "valor diário", source: "Média DGEG citada pelo ECO", url: ECO },
  { date: "2026-11-05", product: "g95", value: 2.001, kind: "média semanal", source: "Média DGEG citada por contaspoupanca.pt", url: CPOUP },
];

/**
 * Pressupostos (NÃO são dados publicados) para produtos sem pontos de preço:
 * diferencial fixo face ao produto base. Ajuste-os quando tiver dados reais.
 */
export const PRICE_ASSUMPTIONS: Record<Exclude<ProductId, "gasoleo" | "g95">, { base: "gasoleo" | "g95" | null; spread: number; fixed?: number; label: string }> = {
  gasoleo_plus: { base: "gasoleo", spread: 0.12, label: "Gasóleo simples + 0,12 €/L (pressuposto)" },
  g98: { base: "g95", spread: 0.15, label: "Gasolina 95 + 0,15 €/L (pressuposto)" },
  gpl: { base: null, spread: 0, fixed: 1.0, label: "≈1,00 €/L constante (pressuposto)" },
};

function interpolate(points: { day: number; value: number }[], day: number): number {
  if (day <= points[0].day) return points[0].value;
  const last = points[points.length - 1];
  if (day >= last.day) return last.value;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (day <= b.day) return a.value + ((b.value - a.value) * (day - a.day)) / (b.day - a.day);
  }
  return last.value;
}

const seriesCache = new Map<string, { day: number; value: number }[]>();
function anchorSeries(product: "gasoleo" | "g95") {
  let s = seriesCache.get(product);
  if (!s) {
    s = PRICE_ANCHORS.filter((a) => a.product === product)
      .map((a) => ({ day: toDay(a.date), value: a.value }))
      .sort((a, b) => a.day - b.day);
    seriesCache.set(product, s);
  }
  return s;
}

/** Preço de referência nacional (€/L), constante por semana (segunda a domingo). */
export function referencePrice(product: ProductId, day: number): number {
  const monday = mondayOf(day) + 3; // meio da semana evita saltos nas extremidades
  if (product === "gasoleo" || product === "g95") return round3(interpolate(anchorSeries(product), monday));
  const a = PRICE_ASSUMPTIONS[product];
  if (a.base === null) return a.fixed ?? 1;
  return round3(interpolate(anchorSeries(a.base), monday) + a.spread);
}

export function isAnchored(product: ProductId): boolean {
  return product === "gasoleo" || product === "g95";
}

function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}

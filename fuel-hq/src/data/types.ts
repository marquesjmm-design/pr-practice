export type ProductId = "gasoleo" | "gasoleo_plus" | "g95" | "g98" | "gpl";
export type RegionId = "norte" | "centro" | "lisboa" | "alentejo" | "algarve";
export type StationType = "autoestrada" | "urbano" | "estrada";

export interface Product {
  id: ProductId;
  name: string;
  short: string;
  /** Slot categórico fixo (1..8) — a cor segue a entidade, nunca a ordem. */
  slot: number;
}

export interface Region {
  id: RegionId;
  name: string;
  slot: number;
}

export interface Tank {
  product: ProductId;
  capacityL: number;
}

export interface Station {
  id: string;
  name: string;
  city: string;
  region: RegionId;
  type: StationType;
  /** Volume médio diário de base (litros, todos os produtos) usado pelo simulador. */
  baseDailyL: number;
  tanks: Tank[];
  shopM2: number;
  /** Ordem estável usada para atribuir cores. */
  order: number;
}

export type EquipmentStatus = "operacional" | "alarme" | "manutencao";

export interface EquipmentModel {
  id: string;
  brand: "Petrotec";
  name: string;
  family: string;
  /** Descrição factual curta, baseada em fontes públicas (ver DADOS.md). */
  summary: string;
  specs: { label: string; value: string }[];
  /** Página oficial / fonte da informação. */
  sourceUrl?: string;
  sourceLabel?: string;
  products: ProductId[];
  /** Nº máximo de mangueiras usado pelo simulador (a partir da ficha oficial quando existe). */
  maxHoses: number;
  /** Pode ter OPT / terminal de pagamento integrado. */
  optCapable: boolean;
}

export interface Incident {
  dispenserId: string;
  stationId: string;
  /** dia (índice UTC) em que começou */
  day: number;
  hours: number;
  kind: string;
  severity: "menor" | "maior";
}

export interface Dispenser {
  id: string;
  stationId: string;
  modelId: string;
  position: number;
  serial: string;
  installedOn: string;
  lastMaintenance: string;
  nextMaintenance: string;
  status: EquipmentStatus;
  totalizerL: number;
  hoses: number;
  products: ProductId[];
  opt: boolean;
}

/** Linha diária por posto × produto (métricas de combustível e tanques). */
export interface FuelRow {
  day: number;
  station: number; // índice em STATIONS
  product: number; // índice em PRODUCTS
  vol: number;
  rev: number;
  gm: number;
  tx: number;
  ref: number; // preço de referência nacional (€/L) desse dia
  stockL: number;
  capL: number;
  deliveries: number;
  variance: number; // litros (negativo = falta)
  cover: number; // dias de cobertura do stock
}

/** Linha diária por posto (loja e equipamentos). */
export interface StationRow {
  day: number;
  station: number;
  shopSales: number;
  shopGm: number;
  shopTx: number;
  fuelTx: number;
  uptime: number; // 0..1
  alarms: number;
}

export interface Dataset {
  firstDay: number;
  lastDay: number;
  fuel: FuelRow[];
  station: StationRow[];
  dispensers: Dispenser[];
  incidents: Incident[];
}

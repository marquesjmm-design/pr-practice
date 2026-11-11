import type { EquipmentModel, Product, Region, Station, StationType } from "./types";

export const PRODUCTS: Product[] = [
  { id: "gasoleo", name: "Gasóleo simples", short: "Gasóleo", slot: 1 },
  { id: "g95", name: "Gasolina 95 simples", short: "G95", slot: 2 },
  { id: "gasoleo_plus", name: "Gasóleo aditivado", short: "Gasóleo+", slot: 3 },
  { id: "g98", name: "Gasolina 98", short: "G98", slot: 4 },
  { id: "gpl", name: "GPL Auto", short: "GPL", slot: 5 },
];

export const REGIONS: Region[] = [
  { id: "norte", name: "Norte", slot: 1 },
  { id: "centro", name: "Centro", slot: 2 },
  { id: "lisboa", name: "Lisboa e Setúbal", slot: 3 },
  { id: "alentejo", name: "Alentejo", slot: 4 },
  { id: "algarve", name: "Algarve", slot: 5 },
];

export const STATION_TYPES: { id: StationType; name: string; slot: number }[] = [
  { id: "urbano", name: "Urbano", slot: 1 },
  { id: "estrada", name: "Estrada nacional", slot: 2 },
  { id: "autoestrada", name: "Autoestrada", slot: 3 },
];

const t = (product: Station["tanks"][number]["product"], capacityL: number) => ({ product, capacityL });

/**
 * Rede fictícia de 12 postos em localidades reais. Os volumes de base são
 * pressupostos do simulador (ver DADOS.md), não dados reais de nenhum posto.
 */
export const STATIONS: Station[] = [
  { id: "braga", name: "Braga Norte", city: "Braga", region: "norte", type: "urbano", baseDailyL: 7500, shopM2: 120, order: 0,
    tanks: [t("gasoleo", 40000), t("g95", 20000), t("gasoleo_plus", 10000), t("g98", 10000)] },
  { id: "porto", name: "Porto Boavista", city: "Porto", region: "norte", type: "urbano", baseDailyL: 9000, shopM2: 150, order: 1,
    tanks: [t("gasoleo", 40000), t("g95", 30000), t("gasoleo_plus", 10000), t("g98", 10000), t("gpl", 8000)] },
  { id: "guimaraes", name: "Guimarães EN101", city: "Guimarães", region: "norte", type: "estrada", baseDailyL: 6000, shopM2: 80, order: 2,
    tanks: [t("gasoleo", 30000), t("g95", 20000), t("gasoleo_plus", 10000)] },
  { id: "aveiro", name: "A1 Aveiro", city: "Aveiro", region: "centro", type: "autoestrada", baseDailyL: 14000, shopM2: 260, order: 3,
    tanks: [t("gasoleo", 60000), t("g95", 30000), t("gasoleo_plus", 20000), t("g98", 10000), t("gpl", 10000)] },
  { id: "coimbra", name: "Coimbra Sul", city: "Coimbra", region: "centro", type: "urbano", baseDailyL: 7000, shopM2: 110, order: 4,
    tanks: [t("gasoleo", 40000), t("g95", 20000), t("gasoleo_plus", 10000), t("g98", 10000)] },
  { id: "leiria", name: "Leiria IC2", city: "Leiria", region: "centro", type: "estrada", baseDailyL: 6500, shopM2: 90, order: 5,
    tanks: [t("gasoleo", 40000), t("g95", 20000), t("gasoleo_plus", 10000)] },
  { id: "benfica", name: "Lisboa Benfica", city: "Lisboa", region: "lisboa", type: "urbano", baseDailyL: 10500, shopM2: 160, order: 6,
    tanks: [t("gasoleo", 40000), t("g95", 30000), t("gasoleo_plus", 10000), t("g98", 10000), t("gpl", 8000)] },
  { id: "oeiras", name: "Oeiras Marginal", city: "Oeiras", region: "lisboa", type: "urbano", baseDailyL: 8000, shopM2: 140, order: 7,
    tanks: [t("gasoleo", 30000), t("g95", 30000), t("gasoleo_plus", 10000), t("g98", 10000)] },
  { id: "setubal", name: "Setúbal EN10", city: "Setúbal", region: "lisboa", type: "estrada", baseDailyL: 6000, shopM2: 90, order: 8,
    tanks: [t("gasoleo", 40000), t("g95", 20000), t("gpl", 8000)] },
  { id: "evora", name: "Évora Circular", city: "Évora", region: "alentejo", type: "estrada", baseDailyL: 4500, shopM2: 70, order: 9,
    tanks: [t("gasoleo", 30000), t("g95", 20000), t("gasoleo_plus", 10000)] },
  { id: "faro", name: "Faro Centro", city: "Faro", region: "algarve", type: "urbano", baseDailyL: 6500, shopM2: 100, order: 10,
    tanks: [t("gasoleo", 30000), t("g95", 20000), t("gasoleo_plus", 10000), t("g98", 10000)] },
  { id: "portimao", name: "A22 Portimão", city: "Portimão", region: "algarve", type: "autoestrada", baseDailyL: 9500, shopM2: 220, order: 11,
    tanks: [t("gasoleo", 50000), t("g95", 30000), t("gasoleo_plus", 10000), t("g98", 10000), t("gpl", 8000)] },
];

/**
 * Catálogo de modelos Petrotec usados na rede. As características vêm das
 * páginas oficiais em petrotec.com (consultadas a 11/11/2026), exceto o
 * EURO 2000 VI, que já não está no site e usa um certificado de aprovação.
 */
export const EQUIPMENT_MODELS: EquipmentModel[] = [
  {
    id: "p5000-lh",
    brand: "Petrotec",
    name: "Progress 5000 LH",
    family: "Progress (retalho)",
    summary: "O dispensador mais personalizável da gama Progress, com sistema de retração elástica da mangueira e todas as opções de multimédia e pagamento.",
    specs: [
      { label: "Produtos", value: "até 5 grelhas de combustível" },
      { label: "Mangueiras", value: "até 10" },
      { label: "Caudal", value: "até 130 L/min" },
      { label: "Combinável com", value: "GPL e AdBlue (com aquecimento)" },
      { label: "Pagamento", value: "todas as opções multimédia/pagamento" },
    ],
    sourceUrl: "https://www.petrotec.com/products/p5000-lh",
    sourceLabel: "petrotec.com — Progress 5000 LH",
    products: ["gasoleo", "g95", "gasoleo_plus", "g98"],
  },
  {
    id: "p5000-hh",
    brand: "Petrotec",
    name: "Progress 5000 HH",
    family: "Progress (retalho)",
    summary: "Versão de mangueira suspensa (hanging hose) do Progress 5000: mangueira mais comprida e melhor relação entre custo de manutenção por mangueira, proteção e acesso ao dispensador.",
    specs: [
      { label: "Produtos", value: "até 4 grelhas (a mesma página também refere até 5)" },
      { label: "Mangueiras", value: "até 8 (a mesma página também refere até 10)" },
      { label: "Caudal máximo", value: "130 L/min" },
      { label: "Pagamento", value: "multimédia e pagamento disponíveis" },
    ],
    sourceUrl: "https://www.petrotec.com/products/p5000-hh",
    sourceLabel: "petrotec.com — Progress 5000 HH",
    products: ["gasoleo", "g95", "gasoleo_plus", "g98"],
  },
  {
    id: "p1000r",
    brand: "Petrotec",
    name: "Progress 1000 Retail",
    family: "Progress (retalho)",
    summary: "Modelo de entrada da gama Progress para retalho, com a menor área ocupada da família e as mesmas tecnologias base dos modelos premium.",
    specs: [
      { label: "Produtos", value: "1 grelha de combustível" },
      { label: "Mangueiras", value: "1 ou 2" },
      { label: "Caudal", value: "até 130 L/min" },
      { label: "Configuração", value: "mangueira normal ou braço aéreo" },
    ],
    sourceUrl: "https://www.petrotec.com/products/p1000-r",
    sourceLabel: "petrotec.com — Progress 1000 Retail",
    products: ["gasoleo"],
  },
  {
    id: "progress-lpg",
    brand: "Petrotec",
    name: "Progress LPG",
    family: "Progress (GPL)",
    summary: "Gama de dispensadores de GPL Auto, com versões de ilha e de faixa, standalone e combo.",
    specs: [
      { label: "Mangueiras", value: "1 ou 2" },
      { label: "Caudal", value: "até 60 L/min" },
      { label: "Modelos", value: "Progress 5000 LPG (standalone e combo), Progress 2000 LPG (entrada, retalho), Progress 1500 LPG (industrial)" },
    ],
    sourceUrl: "https://www.petrotec.com/products/progress-lpg",
    sourceLabel: "petrotec.com — Progress LPG",
    products: ["gpl"],
  },
  {
    id: "euro2000-vi",
    brand: "Petrotec",
    name: "EURO 2000 VI",
    family: "EURO (geração anterior)",
    summary: "Gama EURO de dispensadores (geração anterior, já não listada no site da Petrotec); configurações construídas a partir de unidades de bombagem, medidores de volume e mangueiras.",
    specs: [
      { label: "Produtos", value: "até 4" },
      { label: "Mangueiras", value: "até 8" },
    ],
    sourceUrl: "https://assets.publishing.service.gov.uk/media/5a7c141940f0b61a825d6506/UK-2780-revision-3.pdf",
    sourceLabel: "Certificado de aprovação UK-2780 (gov.uk)",
    products: ["gasoleo", "g95", "gasoleo_plus"],
  },
];

export const stationById = new Map(STATIONS.map((s) => [s.id, s]));
export const productById = new Map(PRODUCTS.map((p) => [p.id, p]));
export const modelById = new Map(EQUIPMENT_MODELS.map((m) => [m.id, m]));
export const regionById = new Map(REGIONS.map((r) => [r.id, r]));

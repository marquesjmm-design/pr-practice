import { dayParts, fromDay, toDay, weekday } from "../lib/dates";
import { EQUIPMENT_MODELS, PRODUCTS, STATIONS } from "./catalog";
import { referencePrice } from "./referencePrices";
import type { Dataset, Dispenser, FuelRow, Incident, ProductId, Station, StationRow, StationType } from "./types";

/**
 * Simulador determinístico da operação da rede. TODOS os valores operacionais
 * (volumes, margens, loja, tanques, avarias) são SIMULADOS. Os pressupostos
 * estão documentados em DADOS.md e foram calibrados, de forma aproximada, com
 * valores públicos (ex.: peso do gasóleo no consumo rodoviário, margem de
 * retalho estimada pela ERSE). Os preços de referência nacionais vêm de
 * referencePrices.ts.
 */
export const DATA_START = "2025-05-01";
export const DATA_END = "2026-11-10";

// ---------- RNG determinístico ----------
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function poisson(rand: () => number, lambda: number) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

// ---------- Pressupostos ----------
const WEEKDAY: Record<StationType, number[]> = {
  urbano: [1.0, 1.0, 1.02, 1.04, 1.12, 0.95, 0.8],
  estrada: [1.0, 1.0, 1.0, 1.03, 1.1, 0.95, 0.85],
  autoestrada: [0.95, 0.92, 0.95, 1.0, 1.18, 1.0, 1.1],
};
const SEASON_DEFAULT = [0.92, 0.93, 0.98, 1.0, 1.02, 1.04, 1.1, 1.08, 1.02, 1.0, 0.96, 0.98];
const SEASON_ALGARVE = [0.75, 0.78, 0.88, 0.98, 1.05, 1.2, 1.45, 1.55, 1.15, 0.95, 0.8, 0.85];
const MIX: Record<ProductId, number> = { gasoleo: 0.66, g95: 0.22, gasoleo_plus: 0.07, g98: 0.03, gpl: 0.02 };
const BASE_MARGIN: Record<ProductId, number> = { gasoleo: 0.155, g95: 0.165, gasoleo_plus: 0.24, g98: 0.25, gpl: 0.2 };
const AVG_FILL: Record<StationType, number> = { urbano: 31, estrada: 35, autoestrada: 44 };
const CONVERSION: Record<StationType, number> = { urbano: 0.31, estrada: 0.24, autoestrada: 0.42 };
const BASKET: Record<StationType, number> = { urbano: 7.2, estrada: 6.4, autoestrada: 9.8 };
const SHOP_MARGIN = 0.31;
const PRICE_SPREAD: Record<StationType, number> = { urbano: 0.02, estrada: -0.015, autoestrada: 0.09 };
const REORDER = 0.3;
const REFILL_TO = 0.9;

/** Perfil horário (fração do dia por hora) por tipologia, usado no mapa de calor. */
export const HOURLY_PROFILE: Record<StationType, number[]> = (() => {
  const shape = (peaks: [number, number, number][], base: number) => {
    const raw = Array.from({ length: 24 }, (_, h) => {
      let v = h < 6 ? base * 0.25 : base;
      for (const [c, w, a] of peaks) v += a * Math.exp(-((h - c) ** 2) / (2 * w * w));
      return v;
    });
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / sum);
  };
  return {
    urbano: shape([[8.5, 1.2, 1.6], [13, 1.5, 0.9], [18.5, 1.6, 1.8]], 0.5),
    estrada: shape([[8, 1.5, 1.2], [12.5, 2, 0.9], [18, 2, 1.3]], 0.55),
    autoestrada: shape([[10, 2.5, 1.2], [14, 2.5, 1.0], [18, 2.5, 1.1]], 0.8),
  };
})();

const INCIDENT_KINDS = [
  "Falha de comunicação com o controlador",
  "Erro no impulsor/medidor",
  "Fuga detetada na mangueira",
  "Leitor de cartões do OPT",
  "Bloqueio de bico",
  "Calibração fora de tolerância",
];

/** Postos com equipamento específico (pressuposto da simulação): remodelações com a gama Axon e Progress P2000/P3000/P4000. */
const STATION_PLAN: Partial<Record<string, (i: number) => string>> = {
  portimao: (i) => (i < 2 ? "axon-4000" : "axon-5000"),
  oeiras: (i) => (i < 2 ? "axon-5000" : "axon-2000"),
  faro: (i) => (i < 2 ? "axon-2000" : "axon-1000"),
  braga: (i) => (i < 2 ? "p4000" : "p3000"),
  coimbra: (i) => (i < 2 ? "p5000-lh" : "p2000"),
};

function dispenserPlan(st: Station): string[] {
  const n = st.type === "autoestrada" ? 6 : st.baseDailyL >= 9000 ? 5 : st.baseDailyL >= 6000 ? 4 : 3;
  const legacy = ["guimaraes", "setubal", "evora"].includes(st.id);
  const plan = STATION_PLAN[st.id];
  const models: string[] = [];
  for (let i = 0; i < n; i++) {
    if (plan) models.push(plan(i));
    else if (st.type === "autoestrada") models.push(i < 2 ? "p5000-hh" : "p5000-lh");
    else if (legacy) models.push(i === 0 ? "p5000-lh" : "euro2000-vi");
    else if (st.baseDailyL < 7000) models.push(i < 2 ? "p5000-lh" : "p1000r");
    else models.push("p5000-lh");
  }
  if (st.tanks.some((t) => t.product === "gpl")) models.push(plan?.(0).startsWith("axon") ? "axon-lpg" : "progress-lpg");
  return models;
}

const FAILURE_RATE: Record<string, number> = {
  "p5000-lh": 1 / 70, "p5000-hh": 1 / 65, p1000r: 1 / 50, "progress-lpg": 1 / 45, "euro2000-vi": 1 / 25,
  p4000: 1 / 70, p3000: 1 / 65, p2000: 1 / 60,
  "axon-5000": 1 / 90, "axon-4000": 1 / 90, "axon-2000": 1 / 85, "axon-1000": 1 / 80, "axon-lpg": 1 / 60,
};

export function simulate(seed = 20261110): Dataset {
  const rand = mulberry32(seed);
  const firstDay = toDay(DATA_START);
  const lastDay = toDay(DATA_END);
  const nDays = lastDay - firstDay + 1;

  // ---------- Equipamentos e incidentes ----------
  const dispensers: Dispenser[] = [];
  const incidents: Incident[] = [];
  const downtime: Float64Array[] = STATIONS.map(() => new Float64Array(nDays));
  const alarmCount: Uint16Array[] = STATIONS.map(() => new Uint16Array(nDays));

  STATIONS.forEach((st, si) => {
    const plan = dispenserPlan(st);
    plan.forEach((modelId, pos) => {
      const model = EQUIPMENT_MODELS.find((m) => m.id === modelId)!;
      const legacy = modelId === "euro2000-vi";
      const yearRoll = Math.floor(rand() * 6);
      const installYear = legacy ? 2012 + (yearRoll % 4) : modelId.startsWith("axon") ? 2024 + (yearRoll % 2) : 2019 + yearRoll;
      const installedOn = `${installYear}-${String(1 + Math.floor(rand() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rand() * 27)).padStart(2, "0")}`;
      const lastMaint = lastDay - Math.floor(rand() * 200);
      const id = `${st.id}-B${pos + 1}`;
      const products = model.products.filter((p) => st.tanks.some((t) => t.product === p));
      const disp: Dispenser = {
        id,
        stationId: st.id,
        modelId,
        position: pos + 1,
        serial: `DEMO-${modelId.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${String(100000 + Math.floor(rand() * 899999))}`,
        installedOn,
        lastMaintenance: fromDay(lastMaint),
        nextMaintenance: fromDay(lastMaint + 182),
        status: "operacional",
        totalizerL: 0,
        hoses: Math.max(1, Math.min(products.length * 2, model.maxHoses)),
        products,
        opt: model.optCapable && rand() < 0.6,
      };
      const share = 1 / plan.length;
      const daysSince = lastDay - toDay(installedOn);
      disp.totalizerL = Math.round(st.baseDailyL * share * daysSince * (0.9 + rand() * 0.2));
      dispensers.push(disp);

      const rate = FAILURE_RATE[modelId] ?? 1 / 60;
      for (let d = 0; d < nDays; d++) {
        if (rand() < rate) {
          const major = rand() < 0.28;
          const hours = major ? 8 + Math.floor(rand() * 40) : 1 + Math.floor(rand() * 4);
          const inc: Incident = { dispenserId: id, stationId: st.id, day: firstDay + d, hours, kind: INCIDENT_KINDS[Math.floor(rand() * INCIDENT_KINDS.length)], severity: major ? "maior" : "menor" };
          incidents.push(inc);
          alarmCount[si][d] += 1;
          let left = hours;
          let k = d;
          while (left > 0 && k < nDays) {
            const h = Math.min(24, left);
            downtime[si][k] += h;
            left -= h;
            k++;
          }
        }
        alarmCount[si][d] += poisson(rand, 0.03);
      }
    });
  });

  // Ocorrências em curso no último dia (para a vista de estado atual).
  const forced: [string, string, number, "menor" | "maior"][] = [
    ["setubal-B2", "Erro no impulsor/medidor", 30, "maior"],
    ["aveiro-B4", "Leitor de cartões do OPT", 6, "menor"],
    ["evora-B3", "Calibração fora de tolerância", 20, "maior"],
  ];
  for (const [did, kind, hours, severity] of forced) {
    const disp = dispensers.find((x) => x.id === did);
    if (!disp) continue;
    const si = STATIONS.findIndex((s) => s.id === disp.stationId);
    incidents.push({ dispenserId: did, stationId: disp.stationId, day: lastDay, hours, kind, severity });
    downtime[si][nDays - 1] += Math.min(24, hours);
    alarmCount[si][nDays - 1] += 1;
  }
  for (const inc of incidents) {
    const end = inc.day + Math.ceil(inc.hours / 24);
    if (inc.day <= lastDay && end >= lastDay && (inc.day === lastDay || inc.hours > 24)) {
      const disp = dispensers.find((x) => x.id === inc.dispenserId)!;
      disp.status = inc.severity === "maior" ? "manutencao" : "alarme";
    }
  }
  incidents.sort((a, b) => b.day - a.day);

  // ---------- Vendas, preços, loja e tanques ----------
  const fuel: FuelRow[] = [];
  const station: StationRow[] = [];

  STATIONS.forEach((st, si) => {
    const nDisp = dispensers.filter((d) => d.stationId === st.id).length;
    const stationOffset = (rand() - 0.5) * 0.04;
    const marginOffset = (rand() - 0.5) * 0.02;
    const products = st.tanks.map((t) => t.product);
    const mixTotal = products.reduce((a, p) => a + MIX[p], 0);
    const stock = st.tanks.map((t) => t.capacityL * (0.55 + rand() * 0.3));
    const recentVol = st.tanks.map((_, i) => (st.baseDailyL * MIX[products[i]]) / mixTotal);
    const season = st.region === "algarve" ? SEASON_ALGARVE : SEASON_DEFAULT;
    let weekNoise = 0;

    for (let d = 0; d < nDays; d++) {
      const day = firstDay + d;
      const { m, d: dom, y } = dayParts(day);
      const wd = weekday(day);
      if (wd === 0 || d === 0) weekNoise = gaussian(rand) * 0.008;
      const years = d / 365;
      const trend = st.type === "autoestrada" ? 1 + 0.03 * years : st.type === "urbano" ? 1 - 0.01 * years : 1;
      let holiday = 1;
      if (m === 12 && dom === 23) holiday = 1.2;
      if (m === 12 && (dom === 24 || dom === 25)) holiday = 0.7;
      if (m === 1 && dom === 1) holiday = 0.6;
      let monthF = season[m - 1];
      if (st.type === "urbano" && st.region !== "algarve" && m === 8) monthF *= 0.92;
      const refDiesel = referencePrice("gasoleo", day);
      const elasticity = Math.pow(refDiesel / 1.6, -0.2);
      // "Guerra de preços" simulada em Setúbal a partir de julho de 2026.
      const priceWar = st.id === "setubal" && day >= toDay("2026-07-01");
      const downShare = downtime[si][d] / (nDisp * 24);
      const stationDayVol = st.baseDailyL * WEEKDAY[st.type][wd] * monthF * trend * holiday * elasticity * Math.exp(gaussian(rand) * 0.06) * (1 - downShare * 0.5) * (priceWar ? 1.08 : 1);

      let fuelTxTotal = 0;
      st.tanks.forEach((tank, ti) => {
        const p = tank.product;
        const pi = PRODUCTS.findIndex((x) => x.id === p);
        let vol = (stationDayVol * MIX[p]) / mixTotal * Math.exp(gaussian(rand) * 0.05);
        // descarga no início do dia se o stock ficou abaixo do ponto de encomenda
        let deliveries = 0;
        if (stock[ti] < tank.capacityL * REORDER) {
          const received = Math.round((tank.capacityL * REFILL_TO - stock[ti]) / 1000) * 1000;
          stock[ti] += received;
          deliveries = 1;
        }
        vol = Math.min(vol, stock[ti]);
        const ref = referencePrice(p, day);
        const spread = PRICE_SPREAD[st.type] + stationOffset + weekNoise - (priceWar ? 0.04 : 0);
        const price = ref + spread;
        const margin = Math.max(0.04, BASE_MARGIN[p] + marginOffset + spread * 0.7 - (priceWar ? 0.03 : 0) + gaussian(rand) * 0.008);
        let variance = gaussian(rand) * vol * 0.0005;
        // Deriva anómala simulada (possível fuga/medidor) em Leiria, gasóleo, desde 10/09/2026.
        if (st.id === "leiria" && p === "gasoleo" && day >= toDay("2026-09-10")) variance -= vol * 0.0035;
        stock[ti] = Math.max(0, stock[ti] - vol + variance);
        recentVol[ti] = recentVol[ti] * (6 / 7) + vol / 7;
        const tx = Math.max(0, Math.round((vol / (p === "gpl" ? 28 : AVG_FILL[st.type])) * Math.exp(gaussian(rand) * 0.04)));
        fuelTxTotal += tx;
        fuel.push({
          day,
          station: si,
          product: pi,
          vol,
          rev: vol * price,
          gm: vol * margin,
          tx,
          ref,
          stockL: stock[ti],
          capL: tank.capacityL,
          deliveries,
          variance,
          cover: recentVol[ti] > 0 ? stock[ti] / recentVol[ti] : 0,
        });
      });

      const weekend = wd >= 5 ? 0.03 : 0;
      const summer = st.region === "algarve" && (m === 7 || m === 8) ? 0.04 : 0;
      const conv = Math.min(0.9, (CONVERSION[st.type] + weekend + summer) * Math.exp(gaussian(rand) * 0.05));
      const walkIns = st.type === "urbano" ? 40 : 10;
      const shopTx = Math.round(fuelTxTotal * conv + walkIns * Math.exp(gaussian(rand) * 0.2));
      const basket = BASKET[st.type] * (1 + 0.03 * (y - 2025 + (m - 1) / 12)) * Math.exp(gaussian(rand) * 0.04);
      const shopSales = shopTx * basket;
      station.push({
        day,
        station: si,
        shopSales,
        shopGm: shopSales * (SHOP_MARGIN + gaussian(rand) * 0.01),
        shopTx,
        fuelTx: fuelTxTotal,
        uptime: Math.max(0, 1 - downtime[si][d] / (nDisp * 24)),
        alarms: alarmCount[si][d],
      });
    }
  });

  return { firstDay, lastDay, fuel, station, dispensers, incidents };
}


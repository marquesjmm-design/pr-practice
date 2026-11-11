import { useMemo } from "react";
import { useApp } from "../AppContext";
import { Icon } from "../components/Icon";
import { DispenserIllustration } from "../components/Illustrations";
import { modelById, PRODUCTS, REGIONS, STATION_TYPES, STATIONS, stationById } from "../data/catalog";
import { useEquipmentImage } from "../data/equipmentImages";
import { formatValue } from "../data/metrics";
import { runQuery } from "../data/query";
import { formatDayPt, fromDay } from "../lib/dates";
import { navigate } from "../lib/router";
import { newWidget } from "../dashboard/presets";
import { computeWidget } from "../dashboard/useWidgetData";
import { WidgetView } from "../dashboard/WidgetView";
import type { Dispenser } from "../data/types";

export function statusBadge(status: Dispenser["status"]) {
  const map = { operacional: ["status-good", "Operacional"], alarme: ["status-warning", "Alarme"], manutencao: ["status-critical", "Em manutenção"] } as const;
  const [cls, label] = map[status];
  return <span className={`badge ${cls}`}><span className="dot" />{label}</span>;
}

function kpis(ds: ReturnType<typeof useApp>["ds"], stationId: string) {
  const from = ds.lastDay - 29;
  const q = (metric: string) => runQuery(ds, { metric, x: "none", breakdown: "none", granularity: "auto", from, to: ds.lastDay, filters: { stations: [stationId] } }).total;
  return { vol: q("vol"), gm: q("totalGm"), ml: q("marginL"), uptime: q("uptime"), shop: q("shopSales") };
}

export function StationsPage({ stationId }: { stationId?: string }) {
  const { ds, scopeRegions } = useApp();
  const stations = STATIONS.filter((s) => !scopeRegions.length || scopeRegions.includes(s.region));
  if (stationId && stationById.has(stationId) && stations.some((s) => s.id === stationId)) return <StationDetail id={stationId} />;
  return (
    <>
      <header className="topbar">
        <div style={{ flex: 1 }}>
          <h1>Postos</h1>
          <div className="sub">{stations.length} postos · últimos 30 dias</div>
        </div>
      </header>
      <main className="content">
        <div className="grid-auto">
          {stations.map((s) => {
            const k = kpis(ds, s.id);
            const disp = ds.dispensers.filter((d) => d.stationId === s.id);
            const issues = disp.filter((d) => d.status !== "operacional").length;
            const lowTanks = ds.fuel.filter((r) => r.day === ds.lastDay && STATIONS[r.station].id === s.id && r.stockL / r.capL < 0.3).length;
            return (
              <a key={s.id} className="card" href={`#/postos/${s.id}`} style={{ textDecoration: "none", color: "inherit", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{s.name}</h3>
                    <div className="tiny muted">{s.city} · {REGIONS.find((r) => r.id === s.region)?.name} · {STATION_TYPES.find((t) => t.id === s.type)?.name}</div>
                  </div>
                  <Icon name="chevronRight" />
                </div>
                <div className="grid-2">
                  <div className="statmini"><div className="v">{formatValue(k.vol, "L")}</div><div className="l">Volume</div></div>
                  <div className="statmini"><div className="v">{formatValue(k.gm, "EUR")}</div><div className="l">Margem total</div></div>
                  <div className="statmini"><div className="v">{formatValue(k.ml, "EUR_L")}</div><div className="l">Margem/L</div></div>
                  <div className="statmini"><div className="v">{formatValue(k.uptime, "PCT")}</div><div className="l">Disponibilidade</div></div>
                </div>
                <div className="row wrap">
                  {issues > 0 ? <span className="badge status-warning"><span className="dot" />{issues} equipamento{issues > 1 ? "s" : ""} com ocorrência</span> : <span className="badge status-good"><span className="dot" />Equipamentos OK</span>}
                  {lowTanks > 0 && <span className="badge status-serious"><span className="dot" />{lowTanks} tanque{lowTanks > 1 ? "s" : ""} &lt; 30 %</span>}
                </div>
              </a>
            );
          })}
        </div>
      </main>
    </>
  );
}

function StationDetail({ id }: { id: string }) {
  const { ds, scopeRegions } = useApp();
  const st = stationById.get(id)!;
  const k = kpis(ds, id);
  const disp = ds.dispensers.filter((d) => d.stationId === id);
  const tanks = ds.fuel.filter((r) => r.day === ds.lastDay && STATIONS[r.station].id === id);
  const incidents = ds.incidents.filter((i) => i.stationId === id).slice(0, 8);
  const ctx = useMemo(() => ({ ds, custom: [], globalPeriod: { preset: "90d" as const }, globalFilters: { stations: [id] }, scopeRegions }), [ds, id, scopeRegions]);
  const volW = useMemo(() => newWidget({ id: "st-vol", title: "Volume por produto (90 dias)", type: "stacked", metric: "vol", breakdown: "product", granularity: "week" }), []);
  const volData = useMemo(() => computeWidget(volW, ctx), [volW, ctx]);
  return (
    <>
      <header className="topbar">
        <button className="iconbtn" aria-label="Voltar aos postos" onClick={() => navigate("postos")}><Icon name="chevronLeft" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{st.name}</h1>
          <div className="sub">{st.city} · {STATION_TYPES.find((t) => t.id === st.type)?.name} · loja {st.shopM2} m²</div>
        </div>
      </header>
      <main className="content stack">
        <div className="grid-2">
          <div className="card pad statmini"><div className="v">{formatValue(k.vol, "L")}</div><div className="l">Volume (30 dias)</div></div>
          <div className="card pad statmini"><div className="v">{formatValue(k.gm, "EUR")}</div><div className="l">Margem total</div></div>
          <div className="card pad statmini"><div className="v">{formatValue(k.shop, "EUR")}</div><div className="l">Vendas de loja</div></div>
          <div className="card pad statmini"><div className="v">{formatValue(k.uptime, "PCT")}</div><div className="l">Disponibilidade</div></div>
        </div>

        <section className="card" style={{ height: 300, position: "relative" }} aria-label={volW.title}>
          <div className="widget">
            <div className="widget-head"><h3>{volW.title}</h3></div>
            <div className="widget-body"><WidgetView w={volW} data={volData} /></div>
          </div>
        </section>

        <section className="card pad stack" aria-labelledby="tanks-h">
          <h2 id="tanks-h">Tanques — {formatDayPt(ds.lastDay)}</h2>
          {tanks.map((t) => {
            const pct = t.stockL / t.capL;
            const p = PRODUCTS[t.product];
            const level = pct < 0.2 ? "crit" : pct < 0.3 ? "low" : "";
            return (
              <div key={p.id} className="stack" style={{ gap: 4 }}>
                <div className="row small">
                  <b style={{ flex: 1 }}>{p.name}</b>
                  <span className="num ink2">{formatValue(t.stockL, "L", { compact: false })} / {formatValue(t.capL, "L", { compact: false })}</span>
                </div>
                <div className={`tankbar ${level}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={`Nível ${p.name}`}><span style={{ width: `${Math.min(100, pct * 100)}%` }} /></div>
                <div className="tiny muted">{formatValue(pct, "PCT")} · cobertura {formatValue(t.cover, "DAYS")}{level ? " · abaixo do ponto de encomenda" : ""}</div>
              </div>
            );
          })}
        </section>

        <section className="stack" aria-labelledby="disp-h">
          <h2 id="disp-h">Equipamentos ({disp.length})</h2>
          <div className="card">
            {disp.map((d) => <DispenserRow key={d.id} d={d} />)}
          </div>
        </section>

        <section className="card pad stack" aria-labelledby="inc-h">
          <h2 id="inc-h">Ocorrências recentes</h2>
          {incidents.length === 0 && <div className="muted small">Sem ocorrências.</div>}
          {incidents.map((i, n) => (
            <div key={n} className="row small" style={{ alignItems: "flex-start" }}>
              <span className={`badge ${i.severity === "maior" ? "status-critical" : "status-warning"}`}><span className="dot" />{i.severity}</span>
              <div style={{ flex: 1 }}>
                <div>{i.kind}</div>
                <div className="tiny muted">{i.dispenserId.split("-").pop()} · {formatDayPt(i.day)} · {i.hours} h</div>
              </div>
            </div>
          ))}
        </section>
        <p className="tiny muted">Valores operacionais simulados. Dados até {fromDay(ds.lastDay).split("-").reverse().join("/")}.</p>
      </main>
    </>
  );
}

export function DispenserRow({ d }: { d: Dispenser }) {
  const model = modelById.get(d.modelId)!;
  const img = useEquipmentImage(d.modelId);
  return (
    <a className="listitem" href={`#/equipamentos/${d.modelId}`} style={{ borderBottom: "1px solid var(--grid)" }}>
      {img.src ? <img className="equip-thumb" src={img.src} alt="" /> : <span className="equip-thumb" style={{ display: "block", overflow: "hidden" }}><DispenserIllustration modelId={d.modelId} /></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 6 }}><b className="small">Bomba {d.position}</b>{statusBadge(d.status)}</div>
        <div className="tiny ink2">{model.brand} {model.name} · {d.hoses} mangueiras{d.opt ? " · OPT" : ""}</div>
        <div className="tiny muted">Próx. manutenção {d.nextMaintenance.split("-").reverse().join("/")}</div>
      </div>
      <Icon name="chevronRight" size={18} />
    </a>
  );
}

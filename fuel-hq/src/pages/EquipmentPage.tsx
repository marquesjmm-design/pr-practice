import { Fragment, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { Icon } from "../components/Icon";
import { DispenserIllustration } from "../components/Illustrations";
import { EQUIPMENT_MODELS, modelById, stationById } from "../data/catalog";
import { downscaleImage, equipmentImages, useEquipmentImage } from "../data/equipmentImages";
import { formatValue } from "../data/metrics";
import type { Dispenser, EquipmentStatus } from "../data/types";
import { formatDayPt, fromDay, toDay } from "../lib/dates";
import { navigate } from "../lib/router";
import { DispenserRow } from "./StationsPage";

function EquipmentImage({ modelId, name, large }: { modelId: string; name: string; large?: boolean }) {
  const img = useEquipmentImage(modelId);
  const [failed, setFailed] = useState<string | null>(null);
  const showImg = img.src && failed !== img.src;
  return (
    <figure style={{ margin: 0 }}>
      {showImg ? (
        <img className="equip-img" src={img.src!} alt={`${name}`} onError={() => setFailed(img.src)} loading="lazy" />
      ) : (
        <div className="equip-img" style={{ overflow: "hidden" }}><DispenserIllustration modelId={modelId} title={`Ilustração genérica — ${name}`} /></div>
      )}
      {large && (
        <figcaption className="tiny muted" style={{ marginTop: 6 }}>
          {showImg
            ? img.origin === "oficial"
              ? `Imagem oficial Petrotec.${img.caption ? ` ${img.caption}` : ""}`
              : "Imagem definida neste dispositivo."
            : "Ilustração genérica: não há imagem oficial deste modelo no site atual da Petrotec."}
        </figcaption>
      )}
    </figure>
  );
}

function useFleet(scope: string[]) {
  const { ds } = useApp();
  const disp = ds.dispensers.filter((d) => !scope.length || scope.includes(stationById.get(d.stationId)!.region));
  const overdue = disp.filter((d) => toDay(d.nextMaintenance) < ds.lastDay);
  return { disp, overdue };
}

export function EquipmentPage({ modelId }: { modelId?: string }) {
  const { ds, scopeRegions } = useApp();
  const { disp, overdue } = useFleet(scopeRegions);
  if (modelId && modelById.has(modelId)) return <ModelDetail id={modelId} />;
  const byStatus = (s: EquipmentStatus) => disp.filter((d) => d.status === s).length;
  const recent = ds.incidents.filter((i) => i.day > ds.lastDay - 30 && disp.some((d) => d.id === i.dispenserId)).length;
  return (
    <>
      <header className="topbar">
        <div style={{ flex: 1 }}>
          <h1>Equipamentos</h1>
          <div className="sub">Dispensadores Petrotec instalados na rede</div>
        </div>
      </header>
      <main className="content stack">
        <div className="grid-2">
          <div className="card pad statmini"><div className="v">{disp.length}</div><div className="l">Dispensadores</div></div>
          <div className="card pad statmini"><div className="v">{byStatus("operacional")}</div><div className="l"><span className="badge status-good" style={{ padding: 0, background: "none" }}><span className="dot" />Operacionais</span></div></div>
          <div className="card pad statmini"><div className="v">{byStatus("alarme") + byStatus("manutencao")}</div><div className="l"><span className="badge status-warning" style={{ padding: 0, background: "none" }}><span className="dot" />Com ocorrência agora</span></div></div>
          <div className="card pad statmini"><div className="v">{overdue.length}</div><div className="l">Manutenções em atraso</div></div>
        </div>
        <div className="tiny muted">{recent} ocorrências nos últimos 30 dias.</div>

        {disp.some((d) => d.status !== "operacional") && (
          <section className="stack" aria-labelledby="now-h">
            <h2 id="now-h">Requer atenção</h2>
            <div className="card">
              {disp.filter((d) => d.status !== "operacional").map((d) => (
                <div key={d.id}>
                  <div className="tiny muted" style={{ padding: "8px 14px 0" }}>{stationById.get(d.stationId)?.name}</div>
                  <DispenserRow d={d} />
                </div>
              ))}
            </div>
          </section>
        )}

        <h2>Catálogo de modelos</h2>
        <div className="grid-auto">
          {EQUIPMENT_MODELS.map((m) => {
            const n = disp.filter((d) => d.modelId === m.id).length;
            return (
              <a key={m.id} href={`#/equipamentos/${m.id}`} className="card" style={{ padding: 12, textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: 8 }}>
                <EquipmentImage modelId={m.id} name={`${m.brand} ${m.name}`} />
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <div className="tiny muted">{m.brand} · {m.family}</div>
                    <h3>{m.name}</h3>
                  </div>
                  <span className="badge">{n} na rede</span>
                </div>
                <p className="small ink2" style={{ margin: 0 }}>{m.summary}</p>
              </a>
            );
          })}
        </div>
        <p className="tiny muted">Imagens e características dos modelos retiradas de petrotec.com (ver ligação em cada modelo). Números de série, estados e ocorrências são simulados.</p>
      </main>
    </>
  );
}

function uptime90(ds: ReturnType<typeof useApp>["ds"], d: Dispenser) {
  const from = ds.lastDay - 89;
  const hours = ds.incidents.filter((i) => i.dispenserId === d.id && i.day >= from).reduce((a, i) => a + i.hours, 0);
  return Math.max(0, 1 - hours / (90 * 24));
}

function ModelDetail({ id }: { id: string }) {
  const { ds, scopeRegions, canEdit } = useApp();
  const m = modelById.get(id)!;
  const { disp } = useFleet(scopeRegions);
  const units = disp.filter((d) => d.modelId === id);
  const [filter, setFilter] = useState<EquipmentStatus | "todos">("todos");
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const img = useEquipmentImage(id);
  const shown = units.filter((u) => filter === "todos" || u.status === filter);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const data = await downscaleImage(f);
      setMsg(equipmentImages.set(id, data) ? "Imagem guardada neste dispositivo." : "Sem espaço no armazenamento local para a imagem.");
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const onUrl = () => {
    try {
      const u = new URL(url.trim());
      if (u.protocol !== "https:") throw new Error();
      equipmentImages.set(id, u.toString());
      setMsg("Endereço da imagem guardado.");
      setUrl("");
    } catch {
      setMsg("Indique um endereço https:// válido.");
    }
  };

  return (
    <>
      <header className="topbar">
        <button className="iconbtn" aria-label="Voltar aos equipamentos" onClick={() => navigate("equipamentos")}><Icon name="chevronLeft" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1>{m.brand} {m.name}</h1>
          <div className="sub">{m.family}</div>
        </div>
      </header>
      <main className="content stack">
        <EquipmentImage modelId={id} name={`${m.brand} ${m.name}`} large />
        {canEdit && (
          <details className="card pad">
            <summary className="small" style={{ fontWeight: 600, cursor: "pointer" }}>Alterar imagem do equipamento</summary>
            <div className="stack" style={{ marginTop: 12 }}>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="image" size={18} /> Escolher fotografia ou tirar foto</button>
              <div className="row">
                <input className="input" type="url" inputMode="url" placeholder="https://… (imagem oficial)" aria-label="Endereço da imagem" value={url} onChange={(e) => setUrl(e.target.value)} />
                <button className="btn" onClick={onUrl} disabled={!url.trim()}>Usar</button>
              </div>
              {img.origin === "utilizador" && <button className="btn danger" onClick={() => { equipmentImages.clear(id); setMsg("Imagem removida."); }}><Icon name="trash" size={18} /> Remover imagem definida</button>}
              {msg && <div className="small ink2" role="status">{msg}</div>}
              <p className="tiny muted" style={{ margin: 0 }}>A imagem escolhida aqui fica só neste dispositivo e tem prioridade sobre a imagem oficial incluída na app. Para mudar a imagem para todos, troque o ficheiro em <code>public/equipment/</code> e o <code>manifest.json</code>.</p>
            </div>
          </details>
        )}

        <section className="card pad stack">
          <p className="small" style={{ margin: 0 }}>{m.summary}</p>
          <dl className="kv">
            {m.specs.map((s) => <Fragment key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></Fragment>)}
          </dl>
          {m.sourceUrl ? (
            <a className="small" href={m.sourceUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={14} /> Fonte: {m.sourceLabel}</a>
          ) : (
            <span className="tiny muted">Sem fonte pública verificada — confirmar com o fabricante.</span>
          )}
        </section>

        <section className="stack" aria-labelledby="units-h">
          <h2 id="units-h">Unidades instaladas ({units.length})</h2>
          <div className="chips" role="group" aria-label="Filtrar por estado">
            {(["todos", "operacional", "alarme", "manutencao"] as const).map((s) => (
              <button key={s} className="chip" aria-pressed={filter === s} onClick={() => setFilter(s)}>
                {{ todos: "Todos", operacional: "Operacional", alarme: "Alarme", manutencao: "Manutenção" }[s]} ({s === "todos" ? units.length : units.filter((u) => u.status === s).length})
              </button>
            ))}
          </div>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr><th>Posto · bomba</th><th>Estado</th><th>Disp. 90 d</th><th>Totalizador</th><th>Próx. manut.</th></tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const late = toDay(u.nextMaintenance) < ds.lastDay;
                  return (
                    <tr key={u.id}>
                      <td><a href={`#/postos/${u.stationId}`}>{stationById.get(u.stationId)?.name}</a> · B{u.position}<div className="tiny muted">{u.serial}</div></td>
                      <td>{u.status === "operacional" ? "OK" : u.status === "alarme" ? "⚠ Alarme" : "✖ Manutenção"}</td>
                      <td>{formatValue(uptime90(ds, u), "PCT")}</td>
                      <td>{formatValue(u.totalizerL, "L")}</td>
                      <td style={{ color: late ? "var(--delta-bad)" : undefined }}>{late ? "⚠ " : ""}{formatDayPt(toDay(u.nextMaintenance))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="tiny muted">Instalação, números de série (prefixo DEMO) e totalizadores são simulados. Dados até {fromDay(ds.lastDay).split("-").reverse().join("/")}.</p>
        </section>
      </main>
    </>
  );
}

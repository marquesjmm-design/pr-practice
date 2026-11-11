import { useMemo, useRef, useState } from "react";
import { useApp } from "../AppContext";
import { Icon } from "../components/Icon";
import { buildDataset, MAX_CSV_BYTES, type CustomDataset } from "../data/csv";
import { customStore, useCustomDatasets } from "../data/customStore";
import { PRICE_ANCHORS, PRICE_ASSUMPTIONS } from "../data/referencePrices";
import { DATA_END, DATA_START } from "../data/simulate";
import { newWidget } from "../dashboard/presets";
import { computeWidget } from "../dashboard/useWidgetData";
import { WidgetView } from "../dashboard/WidgetView";
import { formatDayPt, fromDay, toDay } from "../lib/dates";
import { uid } from "../lib/storage";

const nf3 = new Intl.NumberFormat("pt-PT", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function DataPage() {
  const { ds, canEdit } = useApp();
  const datasets = useCustomDatasets();
  const refW = useMemo(() => newWidget({ id: "data-ref", title: "Preço de referência", type: "line", metric: "ref", breakdown: "product", granularity: "week", period: { inherit: false, preset: "all" }, filters: { products: ["gasoleo", "g95"] }, ownFilters: true }), []);
  const refData = useMemo(() => computeWidget(refW, { ds, custom: [], globalPeriod: { preset: "all" }, globalFilters: {}, scopeRegions: [] }), [ds, refW]);

  return (
    <>
      <header className="topbar">
        <div style={{ flex: 1 }}>
          <h1>Dados</h1>
          <div className="sub">Fontes, pressupostos e importação</div>
        </div>
      </header>
      <main className="content stack">
        <section className="card pad stack">
          <h2>O que é real e o que é simulado</h2>
          <ul className="small ink2" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            <li><b>Preço de referência nacional</b> (gasóleo simples e gasolina 95): pontos publicados (DGEG, citada por imprensa e agregadores), interpolados por semana. Ver tabela abaixo.</li>
            <li><b>Operação da rede</b> (volumes, margens, loja, tanques, avarias, números de série): <b>simulada</b> por um modelo determinístico, entre {formatDayPt(toDay(DATA_START))} e {formatDayPt(toDay(DATA_END))}. Os postos são fictícios, em localidades reais.</li>
            <li><b>Modelos de equipamento Petrotec</b>: nomes e características retirados de fontes públicas (ver cada modelo).</li>
            <li><b>Os seus dados</b>: importe ficheiros CSV (por ex. exportações do portal de preços da DGEG ou do seu sistema de back-office) e construa gráficos com eles.</li>
          </ul>
        </section>

        <section className="card stack" style={{ padding: 14 }} aria-labelledby="ref-h">
          <h2 id="ref-h">Preços de referência (€/L)</h2>
          <div style={{ height: 240, position: "relative" }}><WidgetView w={refW} data={refData} /></div>
          <details>
            <summary className="small" style={{ fontWeight: 600, cursor: "pointer" }}>Pontos publicados usados ({PRICE_ANCHORS.length})</summary>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table className="data">
                <thead><tr><th>Data</th><th>Produto</th><th>€/L</th><th>Tipo</th><th>Fonte</th></tr></thead>
                <tbody>
                  {PRICE_ANCHORS.map((a, i) => (
                    <tr key={i}>
                      <td>{a.date.split("-").reverse().join("/")}</td>
                      <td>{a.product === "g95" ? "G95" : "Gasóleo"}</td>
                      <td>{nf3.format(a.value)}</td>
                      <td>{a.kind}</td>
                      <td style={{ textAlign: "left", whiteSpace: "normal", minWidth: 180 }}>
                        {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer">{a.source}</a> : a.source}
                        {a.note && <div className="tiny muted">{a.note}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <div className="banner warn"><Icon name="alert" size={18} /><span>Valores recolhidos de fontes secundárias em 11/11/2026. Confirme na DGEG (precoscombustiveis.dgeg.gov.pt) antes de usar em decisões. Outros produtos usam pressupostos: {Object.values(PRICE_ASSUMPTIONS).map((p) => p.label).join("; ")}.</span></div>
        </section>

        {canEdit && <CsvImport />}

        <section className="stack" aria-labelledby="ds-h">
          <h2 id="ds-h">Conjuntos importados ({datasets.length})</h2>
          {datasets.length === 0 && <div className="card pad small muted">Ainda não importou nenhum ficheiro.</div>}
          {datasets.map((d) => <DatasetCard key={d.id} d={d} canEdit={canEdit} />)}
        </section>
        <p className="tiny muted">Dados operacionais até {fromDay(ds.lastDay).split("-").reverse().join("/")}.</p>
      </main>
    </>
  );
}

function DatasetCard({ d, canEdit }: { d: CustomDataset; canEdit: boolean }) {
  return (
    <div className="card pad stack" style={{ gap: 6 }}>
      <div className="row">
        <Icon name="table" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b>{d.name}</b>
          <div className="tiny muted">{d.rows.length} linhas · {d.source} · importado {d.createdAt.slice(0, 10).split("-").reverse().join("/")}</div>
        </div>
        {canEdit && <button className="iconbtn" aria-label={`Eliminar ${d.name}`} onClick={() => window.confirm(`Eliminar «${d.name}»? Os gráficos que o usam ficam sem dados.`) && customStore.remove(d.id)}><Icon name="trash" size={18} /></button>}
      </div>
      <div className="chips wrap">
        {d.columns.map((c) => <span key={c.name} className="badge">{c.name} · {c.type === "date" ? "data" : c.type === "number" ? "número" : "texto"}</span>)}
      </div>
      <div className="tiny muted">Para usar: Painel → Novo gráfico → Fonte de dados → «CSV: {d.name}».</div>
    </div>
  );
}

function CsvImport() {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<CustomDataset | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onFile = async (f?: File) => {
    setError(null);
    setPreview(null);
    if (!f) return;
    if (f.size > MAX_CSV_BYTES) return setError(`Ficheiro demasiado grande (máx. ${(MAX_CSV_BYTES / 1e6).toFixed(0)} MB).`);
    try {
      const text = await f.text();
      const ds = buildDataset(f.name.replace(/\.[^.]+$/, ""), f.name, text, uid("csv"));
      setPreview(ds);
      setName(ds.name);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const save = () => {
    if (!preview) return;
    const ok = customStore.add({ ...preview, name: name.trim() || preview.name });
    if (!ok) setError("Sem espaço no armazenamento local do dispositivo para este ficheiro.");
    else {
      setPreview(null);
      if (ref.current) ref.current.value = "";
    }
  };

  const fmtCell = (v: number | string | null, t: string) => (v === null ? "—" : t === "date" && typeof v === "number" ? formatDayPt(v) : String(v));

  return (
    <section className="card pad stack" aria-labelledby="imp-h">
      <h2 id="imp-h">Importar CSV</h2>
      <p className="small ink2" style={{ margin: 0 }}>Aceita separador «;», «,» ou tabulação, números em formato português (1.234,56) e datas AAAA-MM-DD ou DD/MM/AAAA. Os dados ficam só neste dispositivo.</p>
      <input ref={ref} type="file" accept=".csv,text/csv,text/plain" onChange={(e) => onFile(e.target.files?.[0])} className="sr-only" id="csv-file" />
      <label htmlFor="csv-file" className="btn"><Icon name="upload" size={18} /> Escolher ficheiro CSV</label>
      {error && <div className="error" role="alert">{error}</div>}
      {preview && (
        <>
          <div className="field">
            <label htmlFor="csv-name">Nome</label>
            <input id="csv-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="small ink2">{preview.rows.length} linhas · colunas detetadas:</div>
          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>{preview.columns.map((c) => <th key={c.name}>{c.name}<div className="tiny">{c.type === "date" ? "data" : c.type === "number" ? "número" : "texto"}</div></th>)}</tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{fmtCell(v, preview.columns[j].type)}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
          {!preview.columns.some((c) => c.type === "number") && <div className="banner warn">Não foi detetada nenhuma coluna numérica: só será possível contar linhas.</div>}
          <div className="row">
            <button className="btn" onClick={() => setPreview(null)}>Cancelar</button>
            <button className="btn primary" onClick={save}>Guardar conjunto</button>
          </div>
        </>
      )}
    </section>
  );
}

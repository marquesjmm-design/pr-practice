import { useMemo, useState, type ReactElement } from "react";
import { Sheet } from "../components/Sheet";
import { AGG_LABELS, type Agg, type CustomDataset } from "../data/csv";
import { PRODUCTS, REGIONS, STATION_TYPES, STATIONS } from "../data/catalog";
import { getMetric, METRICS, type MetricGroup } from "../data/metrics";
import { dimAllowed, DIM_LABELS, PERIOD_LABELS, type Dim, type Filters, type Granularity, type PeriodPreset } from "../data/query";
import { fromDay } from "../lib/dates";
import { useWidgetData, type computeWidget } from "./useWidgetData";
import { WidgetView } from "./WidgetView";
import { CHART_TYPES, SCALE_LABELS, type ChartType, type ScaleType, type WidgetConfig } from "./types";

type Ctx = Parameters<typeof computeWidget>[1];

const X_DIMS: Dim[] = ["time", "station", "product", "region", "type", "weekday", "hour"];
const B_DIMS: Dim[] = ["none", "product", "station", "region", "type", "weekday"];
const GRANS: { id: Granularity; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "day", label: "Dia" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mês" },
  { id: "quarter", label: "Trim." },
];
const PRESETS: PeriodPreset[] = ["7d", "30d", "90d", "mtd", "qtd", "ytd", "12m", "all", "custom"];
export const SIZE_PRESETS = [
  { id: "s", label: "Pequeno" },
  { id: "m", label: "Médio" },
  { id: "l", label: "Grande" },
  { id: "full", label: "Largura total" },
] as const;
export type SizePreset = (typeof SIZE_PRESETS)[number]["id"];

/** Ajusta dimensões quando se muda o tipo de gráfico, para a combinação fazer sentido. */
export function adaptToType(w: WidgetConfig, type: ChartType): WidgetConfig {
  const n: WidgetConfig = { ...w, type };
  const m = getMetric(w.metric);
  if (type === "heatmap") {
    if (w.source === "network") {
      if (m.additive) {
        n.x = "hour";
        n.breakdown = "weekday";
      } else {
        n.x = "time";
        n.breakdown = "station";
      }
    }
  } else if (type === "hbar" || type === "pie" || type === "donut") {
    if (n.x === "time" || n.x === "hour") n.x = type === "hbar" ? "station" : dimAllowed(m.id, "product") ? "product" : "region";
    if (type !== "hbar") n.breakdown = "none";
  } else if (type === "line" || type === "area" || type === "stacked") {
    if (w.type === "hbar" || w.type === "pie" || w.type === "donut" || w.type === "heatmap") {
      n.x = "time";
      if (w.type === "heatmap") n.breakdown = "none";
    }
  } else if (type === "scatter") {
    n.x = "station";
    n.breakdown = "none";
    n.metricY = n.metricY ?? "conversion";
  }
  if (type === "heatmap" && n.breakdown === "none") n.breakdown = "station";
  return n;
}

function TypeIcon({ id }: { id: string }) {
  const c = "currentColor";
  const s = { fill: "none", stroke: c, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<string, ReactElement> = {
    kpi: <><text x="4" y="17" fontSize="13" fontWeight="700" fill={c}>123</text></>,
    line: <path {...s} d="M3 18l6-7 5 4 7-9" />,
    area: <><path d="M3 18l6-7 5 4 7-9v12H3z" fill={c} opacity="0.2" /><path {...s} d="M3 18l6-7 5 4 7-9" /></>,
    bar: <path {...s} d="M5 20v-6M10 20V8M15 20v-9M20 20V5" />,
    stacked: <><path {...s} d="M6 20v-9M12 20V6M18 20v-6" /><path stroke={c} strokeWidth="2" opacity="0.45" d="M6 11V7M12 6V3M18 14v-4" /></>,
    hbar: <path {...s} d="M4 5h14M4 10h10M4 15h16M4 20h7" />,
    pie: <><path d="M12 3a9 9 0 1 0 9 9h-9z" fill={c} opacity="0.25" /><path {...s} d="M12 3a9 9 0 1 0 9 9h-9zM14 2v8h8a8 8 0 0 0-8-8z" /></>,
    donut: <><circle cx="12" cy="12" r="7.5" {...s} strokeWidth="4" opacity="0.3" /><path {...s} strokeWidth="4" d="M12 4.5a7.5 7.5 0 0 1 7.5 7.5" /></>,
    scatter: <><circle cx="6" cy="16" r="2" fill={c} /><circle cx="11" cy="10" r="2" fill={c} /><circle cx="16" cy="13" r="2" fill={c} /><circle cx="19" cy="6" r="2" fill={c} /></>,
    heatmap: <>{[0, 1, 2].map((r) => [0, 1, 2].map((q) => <rect key={`${r}${q}`} x={3 + q * 6.5} y={3 + r * 6.5} width="5.5" height="5.5" rx="1" fill={c} opacity={0.2 + ((r + q) % 3) * 0.35} />))}</>,
    gauge: <><path {...s} opacity="0.35" d="M4 17a8 8 0 1 1 16 0" /><path {...s} d="M4 17a8 8 0 0 1 12.5-6.6" /></>,
    table: <path {...s} d="M3 5h18v14H3zM3 10h18M3 15h18M9 5v14" />,
  };
  return <svg width="28" height="24" viewBox="0 0 24 24" aria-hidden="true">{shapes[id]}</svg>;
}

function MultiChips<T extends string>({ label, options, value, onChange }: { label: string; options: { id: T; name: string }[]; value: T[] | undefined; onChange: (v: T[]) => void }) {
  const sel = new Set(value ?? []);
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="chips wrap" role="group" aria-label={label}>
        <button type="button" className="chip" aria-pressed={sel.size === 0} onClick={() => onChange([])}>Todos</button>
        {options.map((o) => (
          <button key={o.id} type="button" className="chip" aria-pressed={sel.has(o.id)} onClick={() => {
            const n = new Set(sel);
            if (n.has(o.id)) n.delete(o.id);
            else n.add(o.id);
            onChange([...n]);
          }}>{o.name}</button>
        ))}
      </div>
    </div>
  );
}

export function FilterFields({ value, onChange, scopeRegions }: { value: Filters; onChange: (f: Filters) => void; scopeRegions: string[] }) {
  const stations = STATIONS.filter((s) => !scopeRegions.length || scopeRegions.includes(s.region));
  const regions = REGIONS.filter((r) => !scopeRegions.length || scopeRegions.includes(r.id));
  return (
    <>
      <MultiChips label="Postos" options={stations.map((s) => ({ id: s.id, name: s.name }))} value={value.stations} onChange={(v) => onChange({ ...value, stations: v })} />
      <MultiChips label="Produtos" options={PRODUCTS.map((p) => ({ id: p.id, name: p.short }))} value={value.products} onChange={(v) => onChange({ ...value, products: v })} />
      {regions.length > 1 && <MultiChips label="Regiões" options={regions.map((r) => ({ id: r.id, name: r.name }))} value={value.regions} onChange={(v) => onChange({ ...value, regions: v })} />}
      <MultiChips label="Tipologia" options={STATION_TYPES.map((t) => ({ id: t.id, name: t.name }))} value={value.types} onChange={(v) => onChange({ ...value, types: v })} />
    </>
  );
}

export function WidgetEditor({ initial, ctx, custom, onSave, onClose, onSize, isNew }: {
  initial: WidgetConfig;
  ctx: Ctx;
  custom: CustomDataset[];
  onSave: (w: WidgetConfig) => void;
  onClose: () => void;
  onSize?: (s: SizePreset) => void;
  isNew?: boolean;
}) {
  const [w, setW] = useState<WidgetConfig>(initial);
  const [titleTouched, setTitleTouched] = useState(!isNew);
  const data = useWidgetData(w, ctx);
  const set = (patch: Partial<WidgetConfig>) => setW((prev) => autoTitle({ ...prev, ...patch }));
  const autoTitle = (n: WidgetConfig) => {
    if (titleTouched || n.source !== "network") return n;
    const m = getMetric(n.metric);
    const by = n.type === "scatter" ? ` × ${getMetric(n.metricY ?? "conversion").short}` : n.x !== "time" && n.x !== "none" ? ` por ${DIM_LABELS[n.x].toLowerCase()}` : n.breakdown !== "none" ? ` por ${DIM_LABELS[n.breakdown].toLowerCase()}` : "";
    return { ...n, title: `${m.label}${by}` };
  };
  const metric = getMetric(w.metric);
  const isNetwork = w.source === "network";
  const csvDs = custom.find((d) => `csv:${d.id}` === w.source);
  const groups = useMemo(() => {
    const g = new Map<MetricGroup, typeof METRICS>();
    METRICS.forEach((m) => g.set(m.group, [...(g.get(m.group) ?? []), m]));
    return [...g.entries()];
  }, []);
  const timeX = w.x === "time" || (!isNetwork && w.csv?.x === "time");
  const categorical = !timeX && w.x !== "hour";
  const noAxes = w.type === "kpi" || w.type === "gauge";

  const metricSelect = (value: string, onChange: (v: string) => void, id: string, label: string) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        {groups.map(([g, ms]) => (
          <optgroup key={g} label={g}>
            {ms.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </optgroup>
        ))}
      </select>
      <span className="hint">{getMetric(value).description}</span>
    </div>
  );

  const textCols = csvDs?.columns.filter((c) => c.type === "text") ?? [];
  const numCols = csvDs?.columns.filter((c) => c.type === "number") ?? [];
  const dateCols = csvDs?.columns.filter((c) => c.type === "date") ?? [];

  return (
    <Sheet
      title={isNew ? "Novo gráfico" : "Configurar gráfico"}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => onSave(w)}>{isNew ? "Adicionar ao painel" : "Guardar"}</button>
        </>
      }
    >
      <div className="card preview" aria-label="Pré-visualização">
        <div className="widget">
          <div className="widget-head"><h3>{w.title}</h3></div>
          <div className="widget-body"><WidgetView w={w} data={data} /></div>
        </div>
      </div>
      {[...data.result.warnings].map((m) => <div key={m} className="banner warn">{m}</div>)}

      <div className="field">
        <label htmlFor="w-title">Título</label>
        <input id="w-title" className="input" value={w.title} onChange={(e) => { setTitleTouched(true); setW({ ...w, title: e.target.value }); }} />
      </div>

      <div className="field">
        <label htmlFor="w-source">Fonte de dados</label>
        <select id="w-source" className="input" value={w.source} onChange={(e) => {
          const src = e.target.value;
          if (src === "network") setW(autoTitle({ ...w, source: src }));
          else {
            const d = custom.find((x) => `csv:${x.id}` === src)!;
            const num = d.columns.find((c) => c.type === "number");
            const date = d.columns.find((c) => c.type === "date");
            setW({ ...w, source: src, type: w.type === "scatter" || w.type === "heatmap" ? "line" : w.type, title: d.name, csv: { valueCol: num?.name ?? "", agg: "sum", dateCol: date?.name, x: date ? "time" : "none", breakdown: "none" } });
          }
        }}>
          <option value="network">Rede de postos (simulado)</option>
          {custom.map((d) => <option key={d.id} value={`csv:${d.id}`}>CSV: {d.name}</option>)}
        </select>
      </div>

      <section className="stack">
        <div className="section-title">Tipo de gráfico</div>
        <div className="typegrid">
          {CHART_TYPES.map((t) => {
            const disabled = !isNetwork && (t.id === "scatter" || t.id === "heatmap");
            return (
              <button key={t.id} type="button" className="typecard" aria-pressed={w.type === t.id} disabled={disabled} title={t.hint} onClick={() => setW(autoTitle(adaptToType(w, t.id)))}>
                <TypeIcon id={t.id} />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="stack">
        <div className="section-title">Dados</div>
        {isNetwork ? (
          <>
            {metricSelect(w.metric, (v) => {
              const m = getMetric(v);
              const patch: Partial<WidgetConfig> = { metric: v };
              if (!dimAllowed(v, w.x)) patch.x = "time";
              if (!dimAllowed(v, w.breakdown)) patch.breakdown = "none";
              if (w.type === "heatmap" && !m.additive) {
                patch.x = "time";
                patch.breakdown = "station";
              }
              set(patch);
            }, "w-metric", w.type === "scatter" ? "Métrica (eixo X)" : "Métrica")}
            {w.type === "scatter" && metricSelect(w.metricY ?? "conversion", (v) => set({ metricY: v }), "w-metric-y", "Métrica (eixo Y)")}
            {!noAxes && w.type !== "scatter" && (
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="w-x">{w.type === "pie" || w.type === "donut" ? "Fatias" : w.type === "hbar" ? "Barras" : "Eixo X"}</label>
                  <select id="w-x" className="input" value={w.x} onChange={(e) => set({ x: e.target.value as Dim })}>
                    {X_DIMS.filter((d) => dimAllowed(w.metric, d)).map((d) => <option key={d} value={d}>{DIM_LABELS[d]}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="w-b">{w.type === "heatmap" ? "Linhas" : "Séries (desagregar)"}</label>
                  <select id="w-b" className="input" value={w.breakdown} onChange={(e) => set({ breakdown: e.target.value as Dim })}>
                    {B_DIMS.filter((d) => d !== w.x && dimAllowed(w.metric, d)).map((d) => <option key={d} value={d}>{d === "none" ? "Sem desagregação" : DIM_LABELS[d]}</option>)}
                  </select>
                </div>
              </div>
            )}
          </>
        ) : csvDs && w.csv ? (
          <>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="c-val">Valor</label>
                <select id="c-val" className="input" value={w.csv.valueCol} onChange={(e) => setW({ ...w, csv: { ...w.csv!, valueCol: e.target.value } })}>
                  {numCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-agg">Agregação</label>
                <select id="c-agg" className="input" value={w.csv.agg} onChange={(e) => setW({ ...w, csv: { ...w.csv!, agg: e.target.value as Agg } })}>
                  {(Object.keys(AGG_LABELS) as Agg[]).map((a) => <option key={a} value={a}>{AGG_LABELS[a]}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-x">Eixo X</label>
                <select id="c-x" className="input" value={w.csv.x} onChange={(e) => setW({ ...w, csv: { ...w.csv!, x: e.target.value } })}>
                  {dateCols.length > 0 && <option value="time">Tempo</option>}
                  <option value="none">Total</option>
                  {textCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-b">Séries</label>
                <select id="c-b" className="input" value={w.csv.breakdown} onChange={(e) => setW({ ...w, csv: { ...w.csv!, breakdown: e.target.value } })}>
                  <option value="none">Sem desagregação</option>
                  {textCols.filter((c) => c.name !== w.csv!.x).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>
            {dateCols.length > 1 && (
              <div className="field">
                <label htmlFor="c-date">Coluna de data</label>
                <select id="c-date" className="input" value={w.csv.dateCol} onChange={(e) => setW({ ...w, csv: { ...w.csv!, dateCol: e.target.value } })}>
                  {dateCols.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            )}
          </>
        ) : (
          <div className="banner warn">O conjunto de dados deste gráfico já não existe.</div>
        )}
        {timeX && !noAxes && (
          <div className="field">
            <span className="label">Granularidade</span>
            <div className="seg" role="group" aria-label="Granularidade">
              {GRANS.map((g) => <button key={g.id} type="button" aria-pressed={w.granularity === g.id} onClick={() => set({ granularity: g.id })}>{g.label}</button>)}
            </div>
          </div>
        )}
      </section>

      <section className="stack">
        <div className="section-title">Período</div>
        <label className="toggle">
          <span>Usar o período do painel</span>
          <input type="checkbox" checked={w.period.inherit} onChange={(e) => set({ period: e.target.checked ? { inherit: true } : { inherit: false, preset: "30d" } })} />
        </label>
        {!w.period.inherit && (
          <>
            <div className="chips wrap" role="group" aria-label="Período do gráfico">
              {PRESETS.map((p) => (
                <button key={p} type="button" className="chip" aria-pressed={!w.period.inherit && w.period.preset === p} onClick={() => set({ period: { inherit: false, preset: p, from: p === "custom" ? fromDay(ctx.ds.lastDay - 29) : undefined, to: p === "custom" ? fromDay(ctx.ds.lastDay) : undefined } })}>{PERIOD_LABELS[p]}</button>
              ))}
            </div>
            {!w.period.inherit && w.period.preset === "custom" && (
              <div className="grid-2">
                <div className="field"><label htmlFor="p-from">De</label><input id="p-from" type="date" className="input" value={w.period.from ?? ""} min={fromDay(ctx.ds.firstDay)} max={fromDay(ctx.ds.lastDay)} onChange={(e) => set({ period: { ...(w.period as { inherit: false; preset: PeriodPreset }), from: e.target.value } })} /></div>
                <div className="field"><label htmlFor="p-to">Até</label><input id="p-to" type="date" className="input" value={w.period.to ?? ""} min={fromDay(ctx.ds.firstDay)} max={fromDay(ctx.ds.lastDay)} onChange={(e) => set({ period: { ...(w.period as { inherit: false; preset: PeriodPreset }), to: e.target.value } })} /></div>
              </div>
            )}
          </>
        )}
        {isNetwork && w.type !== "scatter" && w.type !== "heatmap" && w.type !== "pie" && w.type !== "donut" && (
          <div className="field">
            <span className="label">Comparar com</span>
            <div className="seg" role="group" aria-label="Comparação">
              {(["none", "previous", "yoy"] as const).map((c) => <button key={c} type="button" aria-pressed={w.compare === c} onClick={() => set({ compare: c })}>{{ none: "Nada", previous: "Período anterior", yoy: "Ano anterior" }[c]}</button>)}
            </div>
            {w.compare !== "none" && w.breakdown !== "none" && !noAxes && <span className="hint">A comparação só aparece em gráficos com uma única série.</span>}
          </div>
        )}
      </section>

      {isNetwork && (
        <section className="stack">
          <div className="section-title">Filtros deste gráfico</div>
          <label className="toggle">
            <span>Ignorar os filtros do painel</span>
            <input type="checkbox" checked={!!w.ownFilters} onChange={(e) => set({ ownFilters: e.target.checked })} />
          </label>
          <FilterFields value={w.filters} onChange={(f) => set({ filters: f })} scopeRegions={ctx.scopeRegions} />
          {metric.level === "station" && (w.filters.products?.length ?? 0) > 0 && <span className="hint">O filtro de produto não se aplica a métricas de loja/equipamentos.</span>}
        </section>
      )}

      {w.type !== "kpi" && w.type !== "table" && w.type !== "pie" && w.type !== "donut" && w.type !== "heatmap" && (
        <section className="stack">
          <div className="section-title">Escala</div>
          {w.type !== "scatter" && w.type !== "gauge" && (
            <div className="seg" role="group" aria-label="Tipo de escala" style={{ flexWrap: "wrap" }}>
              {(Object.keys(SCALE_LABELS) as ScaleType[]).map((s) => (
                <button key={s} type="button" aria-pressed={w.scale.type === s} disabled={s === "percent" && !data.additive} onClick={() => set({ scale: { ...w.scale, type: s } })}>{SCALE_LABELS[s]}</button>
              ))}
            </div>
          )}
          <div className="grid-2">
            <div className="field">
              <label htmlFor="s-min">Mínimo do eixo</label>
              <div className="row">
                <select id="s-min" className="input" value={typeof w.scale.min === "number" ? "value" : w.scale.min} onChange={(e) => set({ scale: { ...w.scale, min: e.target.value === "value" ? 0 : (e.target.value as "auto" | "zero") } })}>
                  <option value="auto">Automático</option>
                  <option value="zero">Zero</option>
                  <option value="value">Valor…</option>
                </select>
              </div>
              {typeof w.scale.min === "number" && <input aria-label="Valor mínimo" className="input" type="number" step="any" inputMode="decimal" value={w.scale.min} onChange={(e) => set({ scale: { ...w.scale, min: Number(e.target.value) } })} />}
            </div>
            <div className="field">
              <label htmlFor="s-max">Máximo do eixo</label>
              <select id="s-max" className="input" value={typeof w.scale.max === "number" ? "value" : "auto"} onChange={(e) => set({ scale: { ...w.scale, max: e.target.value === "value" ? 1 : "auto" } })}>
                <option value="auto">Automático</option>
                <option value="value">Valor…</option>
              </select>
              {typeof w.scale.max === "number" && <input aria-label="Valor máximo" className="input" type="number" step="any" inputMode="decimal" value={w.scale.max} onChange={(e) => set({ scale: { ...w.scale, max: Number(e.target.value) } })} />}
            </div>
          </div>
          {(metric.unit === "PCT" || w.scale.type === "percent") && <span className="hint">Percentagens: use valores entre 0 e 1 (ex.: 0,95 = 95 %).</span>}
          {w.type === "gauge" && (
            <div className="field">
              <label htmlFor="g-target">Objetivo</label>
              <input id="g-target" className="input" type="number" step="any" inputMode="decimal" value={w.options.target ?? ""} placeholder="sem objetivo" onChange={(e) => set({ options: { ...w.options, target: e.target.value === "" ? undefined : Number(e.target.value) } })} />
            </div>
          )}
        </section>
      )}

      {!noAxes && w.type !== "table" && (
        <section className="stack">
          <div className="section-title">Opções</div>
          {timeX && <label className="toggle"><span>Zoom e deslocamento no tempo</span><input type="checkbox" checked={w.options.zoom} onChange={(e) => set({ options: { ...w.options, zoom: e.target.checked } })} /></label>}
          <label className="toggle"><span>Mostrar valores no gráfico</span><input type="checkbox" checked={w.options.labels} onChange={(e) => set({ options: { ...w.options, labels: e.target.checked } })} /></label>
          {(w.type === "line" || w.type === "area") && <label className="toggle"><span>Linhas suavizadas</span><input type="checkbox" checked={w.options.smooth} onChange={(e) => set({ options: { ...w.options, smooth: e.target.checked } })} /></label>}
          {categorical && isNetwork && (
            <div className="field">
              <span className="label">Ordenar</span>
              <div className="seg" role="group" aria-label="Ordenação">
                {(["none", "desc", "asc"] as const).map((s) => <button key={s} type="button" aria-pressed={w.options.sort === s} onClick={() => set({ options: { ...w.options, sort: s } })}>{{ none: "Natural", desc: "Maior → menor", asc: "Menor → maior" }[s]}</button>)}
              </div>
            </div>
          )}
          {isNetwork && w.breakdown !== "none" && (
            <div className="field">
              <label htmlFor="o-top">Séries visíveis antes de agrupar em «Outros»: {w.options.topN}</label>
              <input id="o-top" type="range" min={2} max={7} value={w.options.topN} onChange={(e) => set({ options: { ...w.options, topN: Number(e.target.value) } })} />
            </div>
          )}
        </section>
      )}

      {onSize && (
        <section className="stack">
          <div className="section-title">Tamanho no ecrã atual</div>
          <div className="chips wrap">
            {SIZE_PRESETS.map((s) => <button key={s.id} type="button" className="chip" onClick={() => onSize(s.id)}>{s.label}</button>)}
          </div>
          <span className="hint">Também pode arrastar e redimensionar no modo «Editar painel».</span>
        </section>
      )}
    </Sheet>
  );
}

import { useMemo, useState } from "react";
import { Responsive, useContainerWidth, type Layout, type ResponsiveLayouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { useApp } from "../AppContext";
import { confirmAction } from "../components/Confirm";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { useCustomDatasets } from "../data/customStore";
import { getMetric } from "../data/metrics";
import { describeRange, DIM_LABELS, PERIOD_LABELS, resolvePeriod, type Filters, type PeriodPreset } from "../data/query";
import { formatDayPt, fromDay } from "../lib/dates";
import { newWidget } from "./presets";
import { useDashboardStore } from "./store";
import { BREAKPOINTS, COLS, type Breakpoint, type GridItem, type WidgetConfig } from "./types";
import { FilterFields, WidgetEditor, type SizePreset } from "./WidgetEditor";
import { useWidgetData } from "./useWidgetData";
import { WidgetView } from "./WidgetView";

const GLOBAL_PRESETS: PeriodPreset[] = ["7d", "30d", "90d", "mtd", "ytd", "12m", "all", "custom"];

function filterCount(f: Filters) {
  return (f.stations?.length ?? 0) + (f.products?.length ?? 0) + (f.regions?.length ?? 0) + (f.types?.length ?? 0);
}

export function DashboardPage() {
  const { ds, user, scopeRegions, canEdit } = useApp();
  const store = useDashboardStore(user.id);
  const custom = useCustomDatasets();
  const { state, active } = store;
  const [editing, setEditing] = useState(false);
  const [editor, setEditor] = useState<{ w: WidgetConfig; isNew: boolean } | null>(null);
  const [expanded, setExpanded] = useState<WidgetConfig | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showDashMenu, setShowDashMenu] = useState(false);
  const [tables, setTables] = useState<Record<string, boolean>>({});
  const [bp, setBp] = useState<Breakpoint>("xs");
  const { width, containerRef, mounted } = useContainerWidth({ initialWidth: typeof window !== "undefined" ? Math.min(window.innerWidth - 32, 1368) : 360 });

  const ctx = useMemo(
    () => ({ ds, custom, globalPeriod: state.globalPeriod, globalFilters: state.globalFilters, scopeRegions }),
    [ds, custom, state.globalPeriod, state.globalFilters, scopeRegions],
  );
  const range = resolvePeriod(state.globalPeriod, ds);
  const nFilters = filterCount(state.globalFilters);

  const layouts = useMemo(() => {
    const out: ResponsiveLayouts<Breakpoint> = {};
    (Object.keys(COLS) as Breakpoint[]).forEach((b) => {
      const items = active.layouts[b] ?? [];
      out[b] = items.filter((it) => active.widgets.some((w) => w.id === it.i)).map((it) => ({ ...it, minW: 1, minH: 2 }));
    });
    return out;
  }, [active]);

  const onSize = (id: string) => (s: SizePreset) => {
    const cols = COLS[bp];
    const sizes: Record<SizePreset, { w: number; h: number }> = {
      s: { w: Math.max(1, Math.round(cols / 4)) * (cols <= 4 ? 2 : 1), h: 2 },
      m: { w: Math.round(cols / 2), h: 4 },
      l: { w: cols <= 6 ? cols : Math.round((cols * 2) / 3), h: 5 },
      full: { w: cols, h: 6 },
    };
    store.resizeWidget(id, bp, sizes[s]);
  };

  return (
    <>
      <header className="topbar">
        <div style={{ minWidth: 0, flex: 1 }}>
          <button className="btn ghost" style={{ padding: "0 4px", minHeight: 32, maxWidth: "100%" }} onClick={() => setShowDashMenu(true)} aria-haspopup="dialog">
            <h1 style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{active.name}</h1>
            <Icon name="chevronDown" size={18} />
          </button>
          <div className="sub" style={{ paddingLeft: 4 }}>Dados até {formatDayPt(ds.lastDay)} · operação simulada</div>
        </div>
        <button className="iconbtn" aria-label={`Filtros${nFilters ? ` (${nFilters} ativos)` : ""}`} aria-pressed={nFilters > 0} onClick={() => setShowFilters(true)}>
          <Icon name="filter" />
        </button>
        {canEdit && (
          <button className="iconbtn" aria-label="Editar painel (mover e redimensionar)" aria-pressed={editing} onClick={() => setEditing((e) => !e)}>
            <Icon name={editing ? "check" : "move"} />
          </button>
        )}
      </header>
      <main className="content">
        <div className="dash-toolbar">
          <div className="chips" role="group" aria-label="Período do painel">
            {GLOBAL_PRESETS.map((p) => (
              <button key={p} className="chip" aria-pressed={state.globalPeriod.preset === p} onClick={() => store.setGlobalPeriod(p === "custom" ? { preset: p, from: fromDay(range.from), to: fromDay(range.to) } : { preset: p })}>
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
          {state.globalPeriod.preset === "custom" && (
            <div className="grid-2">
              <div className="field"><label htmlFor="g-from">De</label><input id="g-from" type="date" className="input" value={state.globalPeriod.from} min={fromDay(ds.firstDay)} max={fromDay(ds.lastDay)} onChange={(e) => store.setGlobalPeriod({ ...state.globalPeriod, from: e.target.value })} /></div>
              <div className="field"><label htmlFor="g-to">Até</label><input id="g-to" type="date" className="input" value={state.globalPeriod.to} min={fromDay(ds.firstDay)} max={fromDay(ds.lastDay)} onChange={(e) => store.setGlobalPeriod({ ...state.globalPeriod, to: e.target.value })} /></div>
            </div>
          )}
          <div className="row small ink2">
            <Icon name="calendar" size={16} />
            <span>{describeRange(range.from, range.to)}</span>
            {nFilters > 0 && <button className="btn small ghost" onClick={() => store.setGlobalFilters({})}>Limpar {nFilters} filtro{nFilters > 1 ? "s" : ""}</button>}
            <span className="spacer" />
          </div>
          {editing && (
            <div className="banner info">
              <Icon name="info" size={18} />
              <span>Arraste pela pega <b>⋮⋮</b> para mover e pelo canto inferior direito para redimensionar. Toque em ✓ para terminar.</span>
            </div>
          )}
          {canEdit && (
            <div className="row">
              <button className="btn primary" onClick={() => setEditor({ w: newWidget({ period: { inherit: true } }), isNew: true })}>
                <Icon name="plus" size={18} /> Novo gráfico
              </button>
              {editing && <button className="btn" onClick={store.resetLayout}><Icon name="refresh" size={18} /> Reorganizar</button>}
            </div>
          )}
        </div>

        <div ref={containerRef} className={editing ? "editing" : undefined}>
          {active.widgets.length === 0 && (
            <div className="card pad empty" style={{ minHeight: 160 }}>Este painel está vazio. Use «Novo gráfico» para construir o primeiro.</div>
          )}
          {mounted && (
            <Responsive
              width={width}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              layouts={layouts}
              rowHeight={56}
              margin={[10, 10]}
              containerPadding={[0, 0]}
              dragConfig={{ enabled: editing, handle: ".drag-handle", allowMobileScroll: true, threshold: 4 }}
              resizeConfig={{ enabled: editing, handles: ["se"] }}
              onBreakpointChange={(b) => setBp(b as Breakpoint)}
              onLayoutChange={(_l: Layout, all: ResponsiveLayouts) => {
                if (!editing) return;
                const out: Partial<Record<Breakpoint, GridItem[]>> = {};
                for (const [b, items] of Object.entries(all)) out[b as Breakpoint] = (items ?? []).map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
                store.setLayouts(out);
              }}
            >
              {active.widgets.map((w) => (
                <div key={w.id}>
                  <WidgetCard
                    w={w}
                    ctx={ctx}
                    editing={editing}
                    canEdit={canEdit}
                    asTable={!!tables[w.id]}
                    onToggleTable={() => setTables((t) => ({ ...t, [w.id]: !t[w.id] }))}
                    onConfigure={() => setEditor({ w, isNew: false })}
                    onExpand={() => setExpanded(w)}
                    onDuplicate={() => store.duplicateWidget(w.id)}
                    onRemove={() => {
                      confirmAction({ title: "Remover gráfico", message: `Remover «${w.title}» deste painel?`, confirmLabel: "Remover", danger: true }).then((ok) => ok && store.removeWidget(w.id));
                    }}
                  />
                </div>
              ))}
            </Responsive>
          )}
        </div>
      </main>

      {editor && (
        <WidgetEditor
          initial={editor.w}
          isNew={editor.isNew}
          ctx={ctx}
          custom={custom}
          onClose={() => setEditor(null)}
          onSize={editor.isNew ? undefined : onSize(editor.w.id)}
          onSave={(w) => {
            store.upsertWidget(w);
            setEditor(null);
          }}
        />
      )}

      {expanded && <ExpandedWidget w={active.widgets.find((x) => x.id === expanded.id) ?? expanded} ctx={ctx} onClose={() => setExpanded(null)} />}

      {showFilters && (
        <Sheet title="Filtros do painel" onClose={() => setShowFilters(false)} footer={<><button className="btn" onClick={() => store.setGlobalFilters({})}>Limpar</button><button className="btn primary" onClick={() => setShowFilters(false)}>Aplicar</button></>}>
          <p className="small ink2" style={{ margin: 0 }}>Aplicam-se a todos os gráficos deste painel, exceto aos que estão configurados para os ignorar.</p>
          <FilterFields value={state.globalFilters} onChange={store.setGlobalFilters} scopeRegions={scopeRegions} />
        </Sheet>
      )}

      {showDashMenu && (
        <DashboardMenu
          store={store}
          canEdit={canEdit}
          onClose={() => setShowDashMenu(false)}
        />
      )}
    </>
  );
}

function subtitle(w: WidgetConfig) {
  const parts: string[] = [];
  if (!w.period.inherit) parts.push(PERIOD_LABELS[w.period.preset]);
  if (w.source === "network") {
    if (w.type === "scatter") parts.push(`${getMetric(w.metric).short} × ${getMetric(w.metricY ?? "conversion").short}`);
    else if (w.breakdown !== "none" && w.type !== "kpi" && w.type !== "gauge") parts.push(`por ${DIM_LABELS[w.breakdown].toLowerCase()}`);
    if (w.ownFilters || Object.values(w.filters).some((v) => v && v.length)) parts.push("filtros próprios");
    if (w.compare !== "none" && w.type !== "kpi") parts.push(w.compare === "yoy" ? "vs ano anterior" : "vs período anterior");
  } else parts.push("CSV importado");
  if (w.scale.type !== "linear") parts.push(`escala ${({ log: "log.", index: "índice", percent: "% total", linear: "" } as const)[w.scale.type]}`);
  return parts.join(" · ");
}

function WidgetCard({ w, ctx, editing, canEdit, asTable, onToggleTable, onConfigure, onExpand, onDuplicate, onRemove }: {
  w: WidgetConfig;
  ctx: Parameters<typeof useWidgetData>[1];
  editing: boolean;
  canEdit: boolean;
  asTable: boolean;
  onToggleTable: () => void;
  onConfigure: () => void;
  onExpand: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const data = useWidgetData(w, ctx);
  const sub = subtitle(w);
  const partial = w.type !== "kpi" && w.type !== "gauge" && data.result.categories.some((c) => c.partial);
  const tableable = w.type !== "kpi" && w.type !== "table" && w.type !== "gauge";
  return (
    <section className="card widget" aria-label={w.title}>
      <div className="widget-head">
        {editing && (
          <span className="drag-handle iconbtn sm" aria-label="Arrastar para mover" role="button" tabIndex={0}>
            <Icon name="grip" size={20} stroke={3} />
          </span>
        )}
        <h3 title={w.title}>{w.title}</h3>
        {!editing && (
          <>
            {tableable && <button className="iconbtn sm" aria-label={asTable ? "Ver gráfico" : "Ver tabela"} aria-pressed={asTable} onClick={onToggleTable}><Icon name={asTable ? "chart" : "table"} size={18} /></button>}
            {w.type !== "kpi" && <button className="iconbtn sm" aria-label="Expandir" onClick={onExpand}><Icon name="external" size={17} /></button>}
            {canEdit && <button className="iconbtn sm" aria-label="Configurar gráfico" onClick={onConfigure}><Icon name="sliders" size={18} /></button>}
          </>
        )}
      </div>
      {editing && (
        <div className="edit-actions">
          <button className="iconbtn sm" aria-label="Configurar gráfico" onClick={onConfigure}><Icon name="sliders" size={18} /></button>
          <button className="iconbtn sm" aria-label="Duplicar" onClick={onDuplicate}><Icon name="copy" size={18} /></button>
          <button className="iconbtn sm" aria-label="Remover" onClick={onRemove}><Icon name="trash" size={18} /></button>
        </div>
      )}
      {(sub || partial) && <div className="widget-sub">{[sub, partial ? "* período incompleto" : ""].filter(Boolean).join(" · ")}</div>}
      <div className="widget-body">
        <WidgetView w={w} data={data} asTable={asTable} />
      </div>
    </section>
  );
}

function ExpandedWidget({ w, ctx, onClose }: { w: WidgetConfig; ctx: Parameters<typeof useWidgetData>[1]; onClose: () => void }) {
  const data = useWidgetData(w, ctx);
  return (
    <Sheet title={w.title} onClose={onClose}>
      <div className="small ink2">{describeRange(data.result.from, data.result.to)}{subtitle(w) ? ` · ${subtitle(w)}` : ""}</div>
      <div className="card" style={{ height: "min(55vh, 460px)", position: "relative" }}>
        <div className="widget-body" style={{ position: "absolute", inset: 8 }}><WidgetView w={{ ...w, options: { ...w.options, zoom: w.options.zoom || w.x === "time" } }} data={data} /></div>
      </div>
      {w.type !== "gauge" && (
        <div className="card" style={{ height: 280, position: "relative" }}>
          <WidgetView w={w} data={data} asTable />
        </div>
      )}
    </Sheet>
  );
}

function DashboardMenu({ store, canEdit, onClose }: { store: ReturnType<typeof useDashboardStore>; canEdit: boolean; onClose: () => void }) {
  const [name, setName] = useState(store.active.name);
  const [newName, setNewName] = useState("");
  return (
    <Sheet title="Painéis" onClose={onClose}>
      <div className="list">
        {store.state.dashboards.map((d) => (
          <button key={d.id} className="card listitem" style={{ textAlign: "left" }} aria-current={d.id === store.active.id} onClick={() => { store.setActive(d.id); onClose(); }}>
            <Icon name="grid" />
            <span style={{ flex: 1 }}>
              <b>{d.name}</b>
              <div className="tiny muted">{d.widgets.length} gráficos</div>
            </span>
            {d.id === store.active.id && <Icon name="check" />}
          </button>
        ))}
      </div>
      {canEdit && (
        <>
          <div className="section-title">Novo painel</div>
          <div className="row">
            <input className="input" aria-label="Nome do novo painel" placeholder="ex.: Região Norte" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="btn primary" disabled={!newName.trim()} onClick={() => { store.addDashboard(newName.trim()); onClose(); }}>Criar</button>
          </div>
          <div className="section-title">Painel atual</div>
          <div className="row">
            <input className="input" aria-label="Nome do painel atual" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn" disabled={!name.trim() || name === store.active.name} onClick={() => store.renameDashboard(name.trim())}>Renomear</button>
          </div>
          <div className="row wrap">
            <button className="btn danger" disabled={store.state.dashboards.length <= 1} onClick={() => confirmAction({ title: "Eliminar painel", message: `Eliminar o painel «${store.active.name}» e os seus gráficos?`, confirmLabel: "Eliminar", danger: true }).then((ok) => { if (ok) { store.deleteDashboard(); onClose(); } })}>
              <Icon name="trash" size={18} /> Eliminar painel
            </button>
            <button className="btn" onClick={() => confirmAction({ title: "Repor painéis predefinidos", message: "Os seus painéis e gráficos personalizados são substituídos pelos predefinidos.", confirmLabel: "Repor", danger: true }).then((ok) => { if (ok) { store.resetAll(); onClose(); } })}>
              <Icon name="refresh" size={18} /> Repor predefinidos
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}

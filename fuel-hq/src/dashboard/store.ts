import { useCallback, useEffect, useState } from "react";
import type { Filters, Period } from "../data/query";
import { load, save, uid } from "../lib/storage";
import { allLayouts, defaultSize, defaultState, newWidget } from "./presets";
import { COLS, type Breakpoint, type DashboardDef, type DashboardState, type GridItem, type WidgetConfig } from "./types";

const VERSION = 1;

function key(userId: string) {
  return `dash:${userId}`;
}

function valid(s: unknown): s is DashboardState {
  const d = s as DashboardState;
  return !!d && Array.isArray(d.dashboards) && d.dashboards.length > 0 && typeof d.activeId === "string";
}

export function useDashboardStore(userId: string) {
  const [state, setState] = useState<DashboardState>(() => {
    const saved = load<{ v: number; s: DashboardState } | null>(key(userId), null);
    return saved && saved.v === VERSION && valid(saved.s) ? saved.s : defaultState();
  });

  useEffect(() => {
    save(key(userId), { v: VERSION, s: state });
  }, [state, userId]);

  const active = state.dashboards.find((d) => d.id === state.activeId) ?? state.dashboards[0];

  const patchActive = useCallback((fn: (d: DashboardDef) => DashboardDef) => {
    setState((s) => ({ ...s, dashboards: s.dashboards.map((d) => (d.id === (s.dashboards.find((x) => x.id === s.activeId)?.id ?? s.dashboards[0].id) ? fn(d) : d)) }));
  }, []);

  const appendToLayouts = (d: DashboardDef, w: WidgetConfig): DashboardDef["layouts"] => {
    const out: DashboardDef["layouts"] = {};
    (Object.keys(COLS) as Breakpoint[]).forEach((bp) => {
      const items = d.layouts[bp] ?? [];
      const bottom = items.reduce((m, it) => Math.max(m, it.y + it.h), 0);
      const size = defaultSize(w.type, bp);
      out[bp] = [...items, { i: w.id, x: 0, y: bottom, ...size }];
    });
    return out;
  };

  return {
    state,
    active,
    setActive: (id: string) => setState((s) => ({ ...s, activeId: id })),
    setGlobalPeriod: (p: Period) => setState((s) => ({ ...s, globalPeriod: p })),
    setGlobalFilters: (f: Filters) => setState((s) => ({ ...s, globalFilters: f })),
    setLayouts: (layouts: DashboardDef["layouts"]) => patchActive((d) => ({ ...d, layouts: { ...d.layouts, ...layouts } })),
    upsertWidget: (w: WidgetConfig) =>
      patchActive((d) => {
        const exists = d.widgets.some((x) => x.id === w.id);
        if (exists) return { ...d, widgets: d.widgets.map((x) => (x.id === w.id ? w : x)) };
        return { ...d, widgets: [...d.widgets, w], layouts: appendToLayouts(d, w) };
      }),
    removeWidget: (id: string) =>
      patchActive((d) => ({
        ...d,
        widgets: d.widgets.filter((w) => w.id !== id),
        layouts: Object.fromEntries(Object.entries(d.layouts).map(([bp, items]) => [bp, (items ?? []).filter((it) => it.i !== id)])),
      })),
    duplicateWidget: (id: string) =>
      patchActive((d) => {
        const src = d.widgets.find((w) => w.id === id);
        if (!src) return d;
        const copy = newWidget({ ...structuredClone(src), id: uid("w"), title: `${src.title} (cópia)` });
        return { ...d, widgets: [...d.widgets, copy], layouts: appendToLayouts(d, copy) };
      }),
    resizeWidget: (id: string, bp: Breakpoint, size: { w: number; h: number }) =>
      patchActive((d) => ({
        ...d,
        layouts: { ...d.layouts, [bp]: (d.layouts[bp] ?? []).map((it: GridItem) => (it.i === id ? { ...it, w: Math.min(size.w, COLS[bp]), h: size.h, x: Math.min(it.x, COLS[bp] - Math.min(size.w, COLS[bp])) } : it)) },
      })),
    addDashboard: (name: string) => {
      const id = uid("d");
      setState((s) => ({ ...s, activeId: id, dashboards: [...s.dashboards, { id, name, widgets: [], layouts: allLayouts([]) }] }));
    },
    renameDashboard: (name: string) => patchActive((d) => ({ ...d, name })),
    deleteDashboard: () =>
      setState((s) => {
        if (s.dashboards.length <= 1) return s;
        const rest = s.dashboards.filter((d) => d.id !== s.activeId);
        return { ...s, dashboards: rest, activeId: rest[0].id };
      }),
    resetLayout: () => patchActive((d) => ({ ...d, layouts: allLayouts(d.widgets) })),
    resetAll: () => setState(defaultState()),
  };
}

export type DashboardStore = ReturnType<typeof useDashboardStore>;

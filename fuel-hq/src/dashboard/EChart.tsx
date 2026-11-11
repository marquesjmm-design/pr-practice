import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { BarChart, GaugeChart, HeatmapChart, LineChart, PieChart, ScatterChart } from "echarts/charts";
import { DataZoomComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, GaugeChart, HeatmapChart, LineChart, PieChart, ScatterChart, DataZoomComponent, GridComponent, LegendComponent, TitleComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

/** Contentor ECharts que se redimensiona com o widget (ResizeObserver). */
export function EChart({ option, ariaLabel, onWidth }: { option: EChartsCoreOption; ariaLabel: string; onWidth?: (w: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const widthCb = useRef(onWidth);
  widthCb.current = onWidth;

  useEffect(() => {
    if (!el.current) return;
    const c = echarts.init(el.current, undefined, { renderer: "canvas" });
    chart.current = c;
    let frame = 0;
    const ro = new ResizeObserver((entries) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        c.resize();
        const w = entries[0]?.contentRect.width;
        if (w) widthCb.current?.(w);
      });
    });
    ro.observe(el.current);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    chart.current?.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return <div ref={el} className="chart" role="img" aria-label={ariaLabel} />;
}

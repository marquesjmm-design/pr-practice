import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { load, save } from "./storage";

export type ThemeMode = "auto" | "light" | "dark";

export interface Palette {
  dark: boolean;
  series: string[]; // índice 0 = neutro, 1..8 = slots categóricos
  ink: string;
  ink2: string;
  muted: string;
  grid: string;
  axis: string;
  surface: string;
  surface2: string;
  border: string;
  seq: string[];
  good: string;
  warning: string;
  serious: string;
  critical: string;
}

function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    dark: cs.colorScheme === "dark" || v("--surface").toLowerCase() === "#1a1a19",
    series: Array.from({ length: 9 }, (_, i) => v(`--series-${i}`)),
    ink: v("--ink"),
    ink2: v("--ink-2"),
    muted: v("--muted"),
    grid: v("--grid"),
    axis: v("--axis"),
    surface: v("--surface"),
    surface2: v("--surface-2"),
    border: v("--border"),
    seq: ["--seq-100", "--seq-250", "--seq-400", "--seq-550", "--seq-700"].map(v),
    good: v("--good"),
    warning: v("--warning"),
    serious: v("--serious"),
    critical: v("--critical"),
  };
}

interface ThemeCtx {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  palette: Palette;
}

const Ctx = createContext<ThemeCtx | null>(null);

// Só removemos o atributo data-theme que a própria app colocou (o anfitrião pode ter definido o seu).
let appliedByApp: string | null = null;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => load<ThemeMode>("theme", "auto"));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "auto") {
      if (appliedByApp && root.getAttribute("data-theme") === appliedByApp) root.removeAttribute("data-theme");
      appliedByApp = null;
    } else {
      root.setAttribute("data-theme", mode);
      appliedByApp = mode;
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    setTick((t) => t + 1);
    requestAnimationFrame(() => meta?.setAttribute("content", getComputedStyle(root).getPropertyValue("--page").trim() || "#f9f9f7"));
  }, [mode]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const on = () => setTick((t) => t + 1);
    mq?.addEventListener?.("change", on);
    return () => mq?.removeEventListener?.("change", on);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const palette = useMemo(() => readPalette(), [tick, mode]);
  const value = useMemo(
    () => ({
      mode,
      palette,
      setMode: (m: ThemeMode) => {
        save("theme", m);
        setModeState(m);
      },
    }),
    [mode, palette],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("ThemeProvider em falta");
  return c;
}

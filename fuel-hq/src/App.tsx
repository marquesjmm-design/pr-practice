import { useEffect, useMemo, useState } from "react";
import { AppContext } from "./AppContext";
import { authService, type Session } from "./auth/authService";
import { ConfirmHost } from "./components/Confirm";
import { Icon } from "./components/Icon";
import { DashboardPage } from "./dashboard/DashboardPage";
import { simulate } from "./data/simulate";
import type { Dataset } from "./data/types";
import { navigate, useRoute } from "./lib/router";
import { AccountPage } from "./pages/AccountPage";
import { DataPage } from "./pages/DataPage";
import { EquipmentPage } from "./pages/EquipmentPage";
import { LoginPage } from "./pages/LoginPage";
import { StationsPage } from "./pages/StationsPage";

const TABS = [
  { id: "painel", label: "Painel", icon: "grid" },
  { id: "postos", label: "Postos", icon: "pump" },
  { id: "equipamentos", label: "Equipamentos", icon: "wrench" },
  { id: "dados", label: "Dados", icon: "database" },
  { id: "conta", label: "Conta", icon: "user" },
] as const;

let cached: Dataset | null = null;
function getDataset() {
  if (!cached) cached = simulate();
  return cached;
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => authService.restore());
  const route = useRoute();
  const [ds, setDs] = useState<Dataset | null>(null);

  useEffect(() => {
    if (!session || ds) return;
    // Gera os dados depois do primeiro desenho para não bloquear a transição do login.
    const t = setTimeout(() => setDs(getDataset()), 0);
    return () => clearTimeout(t);
  }, [session, ds]);

  useEffect(() => {
    if (!session) return;
    const left = session.expiresAt - Date.now();
    const t = setTimeout(() => {
      authService.logout();
      setSession(null);
    }, Math.max(0, Math.min(left, 2 ** 31 - 1)));
    return () => clearTimeout(t);
  }, [session]);

  const ctx = useMemo(
    () =>
      session && ds
        ? {
            ds,
            user: session.user,
            canEdit: session.user.role !== "consulta",
            scopeRegions: session.user.regions,
            logout: () => {
              authService.logout();
              setSession(null);
              navigate("painel");
            },
          }
        : null,
    [session, ds],
  );

  if (!session) return <LoginPage onLogin={(s) => { setSession(s); if (!window.location.hash) navigate("painel"); }} />;
  if (!ctx) return <div className="empty" style={{ height: "100vh" }} role="status">A preparar os dados da rede…</div>;

  const tab = TABS.some((t) => t.id === route[0]) ? route[0] : "painel";
  return (
    <AppContext.Provider value={ctx}>
      <div className="app">
        {tab === "painel" && <DashboardPage />}
        {tab === "postos" && <StationsPage stationId={route[1]} />}
        {tab === "equipamentos" && <EquipmentPage modelId={route[1]} />}
        {tab === "dados" && <DataPage />}
        {tab === "conta" && <AccountPage />}
        <nav className="bottomnav" aria-label="Navegação principal">
          {TABS.map((t) => (
            <a key={t.id} href={`#/${t.id}`} aria-current={tab === t.id ? "page" : undefined}>
              <span className="navicon"><Icon name={t.icon} size={22} /></span>
              {t.label}
            </a>
          ))}
        </nav>
        <ConfirmHost />
      </div>
    </AppContext.Provider>
  );
}

import { useApp } from "../AppContext";
import { confirmAction } from "../components/Confirm";
import { Icon } from "../components/Icon";
import { REGIONS } from "../data/catalog";
import { formatDayPt } from "../lib/dates";
import { useTheme, type ThemeMode } from "../lib/theme";

const ROLE_LABEL = { admin: "Administrador", regional: "Gestor regional", consulta: "Consulta (só leitura)" } as const;

export function AccountPage() {
  const { user, logout, ds, scopeRegions } = useApp();
  const { mode, setMode } = useTheme();
  const clearLocal = async () => {
    const ok = await confirmAction({ title: "Apagar dados locais", message: "Apaga os painéis personalizados, as imagens e os ficheiros importados guardados neste dispositivo. A sessão mantém-se.", confirmLabel: "Apagar", danger: true });
    if (!ok) return;
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("hqpostos:v1:") && !k.endsWith(":session")).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignorar */
    }
    window.location.reload();
  };
  return (
    <>
      <header className="topbar">
        <div style={{ flex: 1 }}><h1>Conta</h1></div>
      </header>
      <main className="content stack">
        <section className="card pad stack">
          <div className="row">
            <span className="navicon" style={{ background: "var(--accent-wash)", color: "var(--accent)", width: 48, height: 48, borderRadius: 24 }}><Icon name="user" size={24} /></span>
            <div>
              <b>{user.name}</b>
              <div className="small muted">{user.username} · {ROLE_LABEL[user.role]}</div>
            </div>
          </div>
          <div className="small ink2">Âmbito: {scopeRegions.length ? scopeRegions.map((r) => REGIONS.find((x) => x.id === r)?.name).join(", ") : "toda a rede"}</div>
        </section>

        <section className="card pad stack">
          <h2>Aparência</h2>
          <div className="seg" role="group" aria-label="Tema">
            {(["auto", "light", "dark"] as ThemeMode[]).map((m) => (
              <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>{{ auto: "Automático", light: "Claro", dark: "Escuro" }[m]}</button>
            ))}
          </div>
        </section>

        <section className="card pad stack">
          <h2>Sobre</h2>
          <div className="small ink2">HQ Postos, versão {__APP_VERSION__} · dados operacionais simulados até {formatDayPt(ds.lastDay)}.</div>
          <button className="btn danger" onClick={clearLocal}><Icon name="trash" size={18} /> Apagar dados locais</button>
        </section>

        <button className="btn" onClick={logout} style={{ minHeight: 48 }}><Icon name="logout" size={18} /> Terminar sessão</button>
      </main>
    </>
  );
}

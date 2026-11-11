import { useState, type FormEvent } from "react";
import { AuthError, authService, DEMO_CREDENTIALS, type Session } from "../auth/authService";
import { Icon } from "../components/Icon";
import { HeroArt } from "../components/Illustrations";

export function LoginPage({ onLogin }: { onLogin: (s: Session) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Indique o utilizador e a palavra-passe.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onLogin(await authService.login(username, password, remember));
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Não foi possível iniciar sessão.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-hero">
        <HeroArt />
        <div className="small" style={{ opacity: 0.8, fontWeight: 600, letterSpacing: "0.06em" }}>HEAD OFFICE</div>
        <h1>HQ Postos</h1>
        <p>Gestão e análise da rede de postos de combustível.</p>
      </div>
      <form className="login-form" onSubmit={submit} noValidate>
        <h2>Iniciar sessão</h2>
        <div className="field">
          <label htmlFor="u">Utilizador</label>
          <input id="u" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="p">Palavra-passe</label>
          <div className="pw">
            <input id="p" className="input" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 48 }} />
            <button type="button" className="iconbtn" aria-label={show ? "Ocultar palavra-passe" : "Mostrar palavra-passe"} onClick={() => setShow((s) => !s)}>
              <Icon name={show ? "eyeOff" : "eye"} />
            </button>
          </div>
        </div>
        <label className="toggle">
          <span>Manter sessão iniciada neste dispositivo</span>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        </label>
        {error && <div className="error" role="alert">{error}</div>}
        <button className="btn primary" type="submit" disabled={busy} style={{ minHeight: 48 }}>
          {busy ? "A verificar…" : "Entrar"}
        </button>

        <div className="card pad stack" style={{ gap: 8 }}>
          <div className="row"><Icon name="info" size={18} /><b className="small">Contas de demonstração</b></div>
          <p className="tiny muted" style={{ margin: 0 }}>Autenticação local apenas para demonstração. Em produção ligue a app ao serviço de autenticação da empresa (ver README).</p>
          {DEMO_CREDENTIALS.map((c) => (
            <button key={c.username} type="button" className="btn small" style={{ justifyContent: "space-between" }} onClick={() => { setUsername(c.username); setPassword(c.password); setError(null); }}>
              <span>{c.label}</span>
              <span className="muted num">{c.username}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

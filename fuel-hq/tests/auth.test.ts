import { describe, expect, it } from "vitest";
import { AuthError, LocalAuthService, LOCK_MS, MAX_ATTEMPTS } from "../src/auth/authService";

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

function svc(now = { t: 1_700_000_000_000 }) {
  const local = memStore();
  const session = memStore();
  return { s: new LocalAuthService(local, session, () => now.t), local, session, now };
}

describe("autenticação local (demonstração)", () => {
  it("aceita credenciais corretas e devolve o perfil", async () => {
    const { s } = svc();
    const sess = await s.login("admin", "HeadOffice#2026", true);
    expect(sess.user.role).toBe("admin");
    expect(s.restore()?.user.username).toBe("admin");
  });

  it("rejeita palavra-passe errada sem revelar qual campo falhou", async () => {
    const { s } = svc();
    await expect(s.login("admin", "x", true)).rejects.toThrow("Utilizador ou palavra-passe incorretos.");
    await expect(s.login("naoexiste", "x", true)).rejects.toThrow("Utilizador ou palavra-passe incorretos.");
  });

  it("bloqueia após tentativas falhadas e desbloqueia passado o tempo", async () => {
    const t = { t: 1_700_000_000_000 };
    const { s } = svc(t);
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) await expect(s.login("admin", "errada", true)).rejects.toBeInstanceOf(AuthError);
    await expect(s.login("admin", "errada", true)).rejects.toMatchObject({ code: "locked" });
    await expect(s.login("admin", "HeadOffice#2026", true)).rejects.toMatchObject({ code: "locked" });
    t.t += LOCK_MS + 1;
    await expect(s.login("admin", "HeadOffice#2026", true)).resolves.toBeTruthy();
  });

  it("a sessão expira e o perfil não pode ser alterado no armazenamento", async () => {
    const t = { t: 1_700_000_000_000 };
    const { s, local } = svc(t);
    await s.login("consulta", "Consulta#2026", true);
    const key = [...local.m.keys()].find((k) => k.endsWith(":session"))!;
    const tampered = JSON.parse(local.getItem(key)!);
    tampered.user.role = "admin";
    local.setItem(key, JSON.stringify(tampered));
    expect(s.restore()?.user.role).toBe("consulta");
    t.t += 13 * 60 * 60 * 1000;
    expect(s.restore()).toBeNull();
  });

  it("sem «manter sessão», guarda apenas na sessão do navegador", async () => {
    const { s, local, session } = svc();
    await s.login("gestor.norte", "Norte#2026", false);
    expect([...session.m.keys()].some((k) => k.endsWith(":session"))).toBe(true);
    expect([...local.m.keys()].some((k) => k.endsWith(":session"))).toBe(false);
    s.logout();
    expect(s.restore()).toBeNull();
  });
});

import type { RegionId } from "../data/types";

export type Role = "admin" | "regional" | "consulta";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  /** Regiões visíveis; vazio = toda a rede. */
  regions: RegionId[];
}

export interface Session {
  user: User;
  expiresAt: number;
}

/**
 * Contrato do serviço de autenticação. A implementação local abaixo serve
 * apenas para demonstração offline: numa instalação real deve ser substituída
 * por um serviço no servidor (ex.: OpenID Connect / OAuth 2.0 com PKCE), pois
 * qualquer verificação feita só no dispositivo pode ser contornada.
 */
export interface AuthService {
  login(username: string, password: string, remember: boolean): Promise<Session>;
  restore(): Session | null;
  logout(): void;
}

interface StoredUser extends User {
  salt: string;
  hash: string;
}

/** Contas de demonstração (palavras-passe guardadas como PBKDF2-SHA256, 120 000 iterações). */
const DEMO_USERS: StoredUser[] = [
  { id: "u1", username: "admin", name: "Administração Head Office", role: "admin", regions: [],
    salt: "fe63615d39a7f16ee4854d9fe9eb3acb", hash: "2e2ca161980cd3fe97260aaead819d559900e0bf07a265a6f1f0a155df4ba355" },
  { id: "u2", username: "gestor.norte", name: "Gestor Regional Norte", role: "regional", regions: ["norte"],
    salt: "75b6bdb2e0c31153b11e5508559bd16c", hash: "a852e8940a575709e5410693f1df01e995980b2b4242a19b4c8aa310070d6016" },
  { id: "u3", username: "consulta", name: "Utilizador de consulta", role: "consulta", regions: [],
    salt: "2fd46793ede36eb502513bec46742808", hash: "9d5179bea984a4ccdf9aa9c1462279991f4b2488d2fbdaf47d669a8de07cee32" },
];

export const DEMO_CREDENTIALS = [
  { username: "admin", password: "HeadOffice#2026", label: "Administrador (toda a rede)" },
  { username: "gestor.norte", password: "Norte#2026", label: "Gestor regional (só Norte)" },
  { username: "consulta", password: "Consulta#2026", label: "Só leitura (não edita dashboards)" },
];

export const MAX_ATTEMPTS = 5;
export const LOCK_MS = 5 * 60 * 1000;
const SESSION_MS = 12 * 60 * 60 * 1000;
const SESSION_KEY = "hqpostos:v1:session";
const ATTEMPTS_KEY = "hqpostos:v1:attempts";

export class AuthError extends Error {
  constructor(message: string, public code: "invalid" | "locked" | "unavailable") {
    super(message);
  }
}

function hex(buf: ArrayBuffer) {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(s: string) {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function pbkdf2(password: string, saltHex: string, iterations = 120000): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new AuthError("Este dispositivo não suporta criptografia segura (WebCrypto).", "unavailable");
  const key = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations }, key, 256);
  return hex(bits);
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

function safe(fn: () => KV | undefined): KV {
  try {
    const s = fn();
    if (s) return s;
  } catch {
    /* sem armazenamento */
  }
  const mem = new Map<string, string>();
  return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
}

export class LocalAuthService implements AuthService {
  private local: KV;
  private session: KV;
  constructor(local?: KV, session?: KV, private now: () => number = () => Date.now()) {
    this.local = local ?? safe(() => globalThis.localStorage);
    this.session = session ?? safe(() => globalThis.sessionStorage);
  }

  private attempts(): Record<string, { count: number; lockedUntil: number }> {
    try {
      return JSON.parse(this.local.getItem(ATTEMPTS_KEY) ?? "{}");
    } catch {
      return {};
    }
  }

  lockedUntil(username: string): number {
    const a = this.attempts()[username.toLowerCase()];
    return a && a.lockedUntil > this.now() ? a.lockedUntil : 0;
  }

  async login(username: string, password: string, remember: boolean): Promise<Session> {
    const uname = username.trim().toLowerCase();
    const all = this.attempts();
    const entry = all[uname] ?? { count: 0, lockedUntil: 0 };
    if (entry.lockedUntil > this.now()) {
      const mins = Math.ceil((entry.lockedUntil - this.now()) / 60000);
      throw new AuthError(`Conta bloqueada temporariamente. Tente de novo dentro de ${mins} min.`, "locked");
    }
    const user = DEMO_USERS.find((u) => u.username === uname);
    // Calcula sempre o hash (mesmo para utilizador inexistente) para não revelar quais existem pelo tempo de resposta.
    const hash = await pbkdf2(password, user?.salt ?? "00000000000000000000000000000000");
    if (!user || !constantTimeEqual(hash, user.hash)) {
      entry.count += 1;
      if (entry.count >= MAX_ATTEMPTS) {
        entry.lockedUntil = this.now() + LOCK_MS;
        entry.count = 0;
      }
      all[uname] = entry;
      this.local.setItem(ATTEMPTS_KEY, JSON.stringify(all));
      if (entry.lockedUntil > this.now()) throw new AuthError("Demasiadas tentativas falhadas. Conta bloqueada durante 5 minutos.", "locked");
      throw new AuthError("Utilizador ou palavra-passe incorretos.", "invalid");
    }
    delete all[uname];
    this.local.setItem(ATTEMPTS_KEY, JSON.stringify(all));
    const { salt: _s, hash: _h, ...pub } = user;
    const session: Session = { user: pub, expiresAt: this.now() + SESSION_MS };
    (remember ? this.local : this.session).setItem(SESSION_KEY, JSON.stringify(session));
    (remember ? this.session : this.local).removeItem(SESSION_KEY);
    return session;
  }

  restore(): Session | null {
    for (const store of [this.session, this.local]) {
      try {
        const raw = store.getItem(SESSION_KEY);
        if (!raw) continue;
        const s = JSON.parse(raw) as Session;
        const known = DEMO_USERS.find((u) => u.id === s.user?.id);
        if (s.expiresAt > this.now() && known) {
          // O perfil vem sempre da definição do utilizador, nunca do que está guardado.
          const { salt: _s, hash: _h, ...pub } = known;
          return { user: pub, expiresAt: s.expiresAt };
        }
        store.removeItem(SESSION_KEY);
      } catch {
        /* sessão inválida */
      }
    }
    return null;
  }

  logout() {
    this.local.removeItem(SESSION_KEY);
    this.session.removeItem(SESSION_KEY);
  }
}

export const authService: AuthService & { lockedUntil?(u: string): number } = new LocalAuthService();

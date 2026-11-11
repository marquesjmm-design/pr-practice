// Acesso seguro ao armazenamento local: pode falhar (modo privado, quota, WebView restrito).
const PREFIX = "hqpostos:v1:";

export function load<T>(key: string, fallback: T, area: "local" | "session" = "local"): T {
  try {
    const store = area === "local" ? window.localStorage : window.sessionStorage;
    const raw = store.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown, area: "local" | "session" = "local"): boolean {
  try {
    const store = area === "local" ? window.localStorage : window.sessionStorage;
    store.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key: string, area: "local" | "session" = "local") {
  try {
    (area === "local" ? window.localStorage : window.sessionStorage).removeItem(PREFIX + key);
  } catch {
    /* ignorar */
  }
}

export function uid(prefix = "w"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

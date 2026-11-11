import { useEffect, useState, useSyncExternalStore } from "react";
import { load, remove, save } from "../lib/storage";

/**
 * Imagens dos equipamentos, por ordem de prioridade:
 *  1. imagem escolhida pelo utilizador no telemóvel (fotografia/galeria) ou URL https;
 *  2. imagem oficial colocada em public/equipment/ e listada em public/equipment/manifest.json;
 *  3. ilustração genérica (componente DispenserIllustration).
 */
type UserImages = Record<string, string>;
const KEY = "equipment-images";
let userImages: UserImages = load<UserImages>(KEY, {});
const listeners = new Set<() => void>();

export const equipmentImages = {
  get: () => userImages,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  set(modelId: string, src: string): boolean {
    const next = { ...userImages, [modelId]: src };
    if (!save(KEY, next)) return false;
    userImages = next;
    listeners.forEach((l) => l());
    return true;
  },
  clear(modelId: string) {
    const { [modelId]: _, ...rest } = userImages;
    userImages = rest;
    if (Object.keys(rest).length) save(KEY, rest);
    else remove(KEY);
    listeners.forEach((l) => l());
  },
};

let manifestPromise: Promise<Record<string, string>> | null = null;
function loadManifest(): Promise<Record<string, string>> {
  if (!manifestPromise) {
    manifestPromise = fetch("./equipment/manifest.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j: { images?: Record<string, string> } | null) => (j && typeof j === "object" && j.images ? j.images : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
}

export function useEquipmentImage(modelId: string): { src: string | null; origin: "utilizador" | "oficial" | "ilustração" } {
  const user = useSyncExternalStore(equipmentImages.subscribe, equipmentImages.get, equipmentImages.get);
  const [manifest, setManifest] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    loadManifest().then((m) => alive && setManifest(m));
    return () => {
      alive = false;
    };
  }, []);
  if (user[modelId]) return { src: user[modelId], origin: "utilizador" };
  if (manifest[modelId]) return { src: `./equipment/${manifest[modelId]}`, origin: "oficial" };
  return { src: null, origin: "ilustração" };
}

/** Reduz a imagem para no máximo 900 px e devolve um data URL JPEG (para caber no armazenamento local). */
export function downscaleImage(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const g = c.getContext("2d");
      if (!g) return reject(new Error("Canvas indisponível"));
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });
}

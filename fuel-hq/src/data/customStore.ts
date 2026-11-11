import { useSyncExternalStore } from "react";
import { load, save } from "../lib/storage";
import type { CustomDataset } from "./csv";

// Conjuntos de dados importados (CSV) guardados no dispositivo.
const KEY = "datasets";
let state: CustomDataset[] = load<CustomDataset[]>(KEY, []);
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const customStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  add(ds: CustomDataset): boolean {
    const next = [...state.filter((d) => d.id !== ds.id), ds];
    if (!save(KEY, next)) return false;
    state = next;
    emit();
    return true;
  },
  remove(id: string) {
    state = state.filter((d) => d.id !== id);
    save(KEY, state);
    emit();
  },
};

export function useCustomDatasets() {
  return useSyncExternalStore(customStore.subscribe, customStore.get, customStore.get);
}

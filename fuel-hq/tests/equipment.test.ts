import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_MODELS, modelById } from "../src/data/catalog";
import { simulate } from "../src/data/simulate";

const ds = simulate();
const manifest = JSON.parse(readFileSync(new URL("../public/equipment/manifest.json", import.meta.url), "utf-8")) as { images: Record<string, string> };

describe("equipamentos", () => {
  it("cada dispensador simulado respeita o nº máximo de mangueiras do modelo", () => {
    for (const d of ds.dispensers) {
      const m = modelById.get(d.modelId)!;
      expect(d.hoses).toBeGreaterThanOrEqual(1);
      expect(d.hoses).toBeLessThanOrEqual(m.maxHoses);
      if (d.opt) expect(m.optCapable).toBe(true);
    }
  });

  it("a gama Axon está instalada nos postos remodelados", () => {
    const models = (st: string) => new Set(ds.dispensers.filter((d) => d.stationId === st).map((d) => d.modelId));
    expect([...models("portimao")].sort()).toEqual(["axon-4000", "axon-5000", "axon-lpg"]);
    expect([...models("oeiras")].sort()).toEqual(["axon-2000", "axon-5000"]);
    expect([...models("faro")].sort()).toEqual(["axon-1000", "axon-2000"]);
    expect(ds.dispensers.filter((d) => d.modelId.startsWith("axon")).every((d) => d.installedOn >= "2024")).toBe(true);
  });

  it("todos os modelos têm imagem oficial registada, exceto o EURO 2000 VI", () => {
    for (const m of EQUIPMENT_MODELS) {
      if (m.id === "euro2000-vi") expect(manifest.images[m.id]).toBeUndefined();
      else {
        expect(manifest.images[m.id]).toBe(`${m.id}.webp`);
        expect(() => readFileSync(new URL(`../public/equipment/${m.id}.webp`, import.meta.url))).not.toThrow();
      }
    }
  });
});

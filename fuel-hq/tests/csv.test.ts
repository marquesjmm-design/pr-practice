import { describe, expect, it } from "vitest";
import { buildDataset, parseCsv, parseDate, parseNumber, runCustomQuery } from "../src/data/csv";
import { toDay } from "../src/lib/dates";

describe("CSV", () => {
  it("deteta «;» e respeita aspas", () => {
    const r = parseCsv('a;b;c\n1;"x;y";"diz ""olá"""\n');
    expect(r.delimiter).toBe(";");
    expect(r.rows[0]).toEqual(["1", "x;y", 'diz "olá"']);
  });

  it("converte números em formato português e internacional", () => {
    expect(parseNumber("1.234,56")).toBeCloseTo(1234.56);
    expect(parseNumber("1,234.56")).toBeCloseTo(1234.56);
    expect(parseNumber("2,215 €")).toBeCloseTo(2.215);
    expect(parseNumber("1.000.000")).toBe(1000000);
    expect(parseNumber("abc")).toBeNull();
  });

  it("converte datas comuns e rejeita datas impossíveis", () => {
    expect(parseDate("2026-11-03")).toBe(toDay("2026-11-03"));
    expect(parseDate("03/11/2026")).toBe(toDay("2026-11-03"));
    expect(parseDate("31/02/2026")).toBeNull();
  });

  it("constrói o conjunto e agrega por tempo e categoria", () => {
    const text = "Data;Combustível;Preço\n03/11/2026;Gasóleo;2,215\n03/11/2026;G95;2,008\n27/10/2026;Gasóleo;2,19\n27/10/2026;G95;2,033\n";
    const ds = buildDataset("t", "t.csv", text, "id1");
    expect(ds.columns.map((c) => c.type)).toEqual(["date", "text", "number"]);
    const r = runCustomQuery(ds, { valueCol: "Preço", agg: "avg", x: "time", breakdown: "Combustível", granularity: "week" });
    expect(r.series.map((s) => s.name).sort()).toEqual(["G95", "Gasóleo"]);
    const gas = r.series.find((s) => s.name === "Gasóleo")!;
    expect(gas.values.filter((v) => v !== null)).toEqual([2.19, 2.215]);
    const byCat = runCustomQuery(ds, { valueCol: "Preço", agg: "max", x: "Combustível", breakdown: "none", granularity: "auto" });
    expect(byCat.categories.map((c) => c.key)).toEqual(["G95", "Gasóleo"]);
    expect(byCat.series[0].values).toEqual([2.033, 2.215]);
  });

  it("recusa ficheiros sem dados", () => {
    expect(() => buildDataset("x", "x.csv", "so;cabecalho\n", "id")).toThrow();
  });
});

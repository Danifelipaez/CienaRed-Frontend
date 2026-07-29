import { describe, expect, it } from "vitest";
import { normalizeTone, semaphoreToEventos, catchToSeries, toCorrelacion } from "./adapters";
import type { SemaphoreHistoryPoint } from "@/lib/api";

describe("normalizeTone", () => {
  it("maps English and Spanish backend colors to the same Spanish tone", () => {
    expect(normalizeTone("red")).toBe("rojo");
    expect(normalizeTone("rojo")).toBe("rojo");
    expect(normalizeTone("yellow")).toBe("amarillo");
    expect(normalizeTone("amarillo")).toBe("amarillo");
  });

  it("defaults anything else to verde", () => {
    expect(normalizeTone("green")).toBe("verde");
    expect(normalizeTone("unknown")).toBe("verde");
  });
});

function semRow(date: string, color: string, reason: string | null = null): SemaphoreHistoryPoint {
  return { date, color, reason, ipp_ranking: null };
}

describe("semaphoreToEventos", () => {
  it("skips verde rows and collapses consecutive same-tone rows into one evento", () => {
    const rows = [
      semRow("2026-07-01", "verde"),
      semRow("2026-07-02", "amarillo", "viento fuerte"),
      semRow("2026-07-03", "amarillo", "viento fuerte"),
      semRow("2026-07-04", "rojo", "ciclón"),
    ];
    const eventos = semaphoreToEventos(rows);
    // reversed: most recent first
    expect(eventos).toEqual([
      { fecha: "04 Jul", tipo: "Alerta crítica", sem: "rojo", variable: "ciclón", nota: "ciclón" },
      { fecha: "02 Jul–03 Jul", tipo: "Precaución", sem: "amarillo", variable: "viento fuerte", nota: "viento fuerte" },
    ]);
  });

  it("caps output at 6 eventos", () => {
    // alternate tones so each row starts a new evento instead of collapsing into one
    const rows = Array.from({ length: 12 }, (_, i) =>
      semRow(`2026-07-${String(i + 1).padStart(2, "0")}`, i % 2 === 0 ? "rojo" : "amarillo")
    );
    expect(semaphoreToEventos(rows)).toHaveLength(6);
  });
});

describe("catchToSeries", () => {
  it("maps date/cantidad_indice straight to t/v", () => {
    expect(catchToSeries([{ date: "2026-07-01", cantidad_indice: 5 }])).toEqual([{ t: "2026-07-01", v: 5 }]);
  });
});

describe("toCorrelacion", () => {
  it("pairs satellite chlorophyll with catch on matching dates only", () => {
    const result = toCorrelacion(
      [
        { date: "2026-07-01", sst_celsius: 29, chlorophyll_mgm3: 1.2 },
        { date: "2026-07-02", sst_celsius: 29, chlorophyll_mgm3: null }, // no chlorophyll -> dropped
        { date: "2026-07-03", sst_celsius: 29, chlorophyll_mgm3: 1.5 }, // no matching catch -> dropped
      ],
      [
        { date: "2026-07-01", cantidad_indice: 10 },
      ]
    );
    expect(result).toEqual([{ cloro: 1.2, captura: 10, date: "2026-07-01" }]);
  });
});

import { describe, expect, it } from "vitest";
import { historyToEstaciones } from "./stations";
import type { HistoryResponse } from "./api";

function history(overrides: Partial<HistoryResponse>): HistoryResponse {
  return {
    weather: [],
    semaphore: [],
    satellite: [],
    captura: [],
    ideam_precipitacion: [],
    ideam_nivel_rio: [],
    ...overrides,
  };
}

describe("historyToEstaciones", () => {
  it("drops stations with no known coordinates", () => {
    const h = history({
      weather: [{ timestamp: "2026-07-01T00:00:00Z", estacion: "Estación Desconocida", temperature_c: 30, humidity_pct: null, wind_speed_kmh: null, precipitation_mm: null }],
    });
    expect(historyToEstaciones(h)).toEqual([]);
  });

  it("keeps stations with known coordinates and merges weather/ideam readings", () => {
    const h = history({
      weather: [{ timestamp: "2026-07-01T00:00:00Z", estacion: "CGSM", temperature_c: 31.5, humidity_pct: 80, wind_speed_kmh: 12, precipitation_mm: null }],
      ideam_precipitacion: [{ date: "2026-07-01", estacion: "CGSM", precipitacion_mm: 4.2 }],
      ideam_nivel_rio: [{ date: "2026-07-01", estacion: "CGSM", nivel_m: 1.1 }],
    });
    expect(historyToEstaciones(h)).toEqual([
      { id: "CGSM", nombre: "CGSM", lat: 10.859056, lng: -74.460611, tempAmbiental: 31.5, humedad: 80, viento: 12, precipitacion: 4.2, nivelRio: 1.1 },
    ]);
  });

  it("keeps the last row per station (assumes ascending-date input)", () => {
    const h = history({
      weather: [
        { timestamp: "2026-07-01T00:00:00Z", estacion: "CGSM", temperature_c: 30, humidity_pct: null, wind_speed_kmh: null, precipitation_mm: null },
        { timestamp: "2026-07-02T00:00:00Z", estacion: "CGSM", temperature_c: 33, humidity_pct: null, wind_speed_kmh: null, precipitation_mm: null },
      ],
    });
    expect(historyToEstaciones(h)[0].tempAmbiental).toBe(33);
  });

  it("fills missing readings with null instead of dropping the station", () => {
    const h = history({
      ideam_nivel_rio: [{ date: "2026-07-01", estacion: "Tasajera", nivel_m: 0.9 }],
    });
    const [estacion] = historyToEstaciones(h);
    expect(estacion.tempAmbiental).toBeNull();
    expect(estacion.nivelRio).toBe(0.9);
  });
});

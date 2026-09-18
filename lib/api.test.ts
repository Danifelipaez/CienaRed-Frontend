import { afterEach, describe, expect, it, vi } from "vitest";
import { getHistory } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getHistory", () => {
  it("fills in missing or null keys with empty arrays so adapters never see undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ weather: [{ estacion: "CGSM" }], water: null }),
      })
    );

    const history = await getHistory(30);

    expect(history.weather).toEqual([{ estacion: "CGSM" }]);
    expect(history.water).toEqual([]);
    expect(history.semaphore).toEqual([]);
    expect(history.satellite).toEqual([]);
    expect(history.captura).toEqual([]);
    expect(history.ideam_precipitacion).toEqual([]);
    expect(history.ideam_nivel_rio).toEqual([]);
  });
});

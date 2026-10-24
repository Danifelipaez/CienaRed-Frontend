import { describe, expect, it } from "vitest";
import { niceTicks } from "./charts";

describe("niceTicks", () => {
  it("covers the domain with round steps instead of 15.1 / 30.3 / 45.4", () => {
    expect(niceTicks(0, 60.5)).toEqual([0, 20, 40, 60, 80]);
    expect(niceTicks(22.7, 37.9)).toEqual([20, 25, 30, 35, 40]);
  });

  it("handles small and flat ranges", () => {
    expect(niceTicks(0.1, 0.9)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
    expect(niceTicks(5, 5).length).toBeGreaterThan(1);
  });
});

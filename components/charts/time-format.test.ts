import { describe, expect, it } from "vitest";
import { formatDate, formatAxisTick, formatTooltipHeader } from "./time-format";

describe("formatDate", () => {
  it("formats a date-only string as UTC midnight, not shifted by local zone", () => {
    expect(formatDate("2026-07-08")).toBe("08 Jul");
  });

  it("formats a full ISO timestamp in America/Bogota (UTC-5)", () => {
    // 02:00 UTC on the 8th is still the 7th in Bogota — this is exactly the
    // off-by-one the date-only/timestamp split in toDateAndZone prevents.
    expect(formatDate("2026-07-08T02:00:00Z")).toBe("07 Jul");
  });
});

describe("formatAxisTick", () => {
  it("appends the hour for hour granularity", () => {
    expect(formatAxisTick("2026-07-08T14:00:00Z", "hour")).toBe("08 Jul 09h");
  });

  it("omits the hour for day/week granularity", () => {
    expect(formatAxisTick("2026-07-08", "day")).toBe("08 Jul");
  });
});

describe("formatTooltipHeader", () => {
  it("includes minutes for hour granularity", () => {
    expect(formatTooltipHeader("2026-07-08T14:30:00Z", "hour")).toBe("08 jul, 09:30");
  });

  it("shows a week range for week granularity", () => {
    expect(formatTooltipHeader("2026-07-06", "week")).toBe("Semana del 06 Jul al 12 Jul");
  });

  it("marks aggregated day points as an average", () => {
    expect(formatTooltipHeader("2026-07-08", "day", true)).toBe("Promedio del 08 Jul");
  });

  it("leaves non-aggregated day points as a plain date", () => {
    expect(formatTooltipHeader("2026-07-08", "day", false)).toBe("08 Jul");
  });
});

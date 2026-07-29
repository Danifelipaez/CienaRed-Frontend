import { describe, expect, it } from "vitest";
import { moonPhaseGlyph, moonPhaseLabel } from "./moon";

const KNOWN_NEW_MOON = new Date(Date.UTC(2000, 0, 6, 18, 14));
const SYNODIC_MONTH_MS = 29.530588853 * 86400000;

describe("moonPhaseGlyph", () => {
  it("returns 'new' at the known reference new moon", () => {
    expect(moonPhaseGlyph(KNOWN_NEW_MOON)).toBe("new");
  });

  it("returns 'full' ~half a synodic month after a new moon", () => {
    const full = new Date(KNOWN_NEW_MOON.getTime() + SYNODIC_MONTH_MS / 2);
    expect(moonPhaseGlyph(full)).toBe("full");
  });

  it("returns 'new' again a full synodic month later", () => {
    const nextNew = new Date(KNOWN_NEW_MOON.getTime() + SYNODIC_MONTH_MS);
    expect(moonPhaseGlyph(nextNew)).toBe("new");
  });

  it("handles dates before the reference (negative age modulo)", () => {
    const before = new Date(KNOWN_NEW_MOON.getTime() - SYNODIC_MONTH_MS / 2);
    expect(moonPhaseGlyph(before)).toBe("full");
  });
});

describe("moonPhaseLabel", () => {
  it("maps every glyph to its Spanish label", () => {
    expect(moonPhaseLabel("new")).toBe("Nueva");
    expect(moonPhaseLabel("first")).toBe("Creciente");
    expect(moonPhaseLabel("full")).toBe("Llena");
    expect(moonPhaseLabel("last")).toBe("Menguante");
  });
});

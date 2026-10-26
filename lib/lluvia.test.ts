import { describe, expect, it } from "vitest";
import type { LluviaNowcast, LluviaSignal } from "./api";
import { buildLluviaVista, formatProb, sistemaLabel } from "./lluvia";

const nowcast = (over: Partial<LluviaNowcast> = {}): LluviaNowcast => ({
  estado: "sin_lluvia",
  frac_caja_1mm: 0,
  frac_anillo_5mm: 0,
  tormenta_electrica: false,
  n_rayos_30min: 0,
  estimacion: true,
  scan: "2026-10-26T13:40:00Z",
  ...over,
});

const completo: LluviaSignal = {
  outlook: { prob_6h: 0.35, prob_24h: 0.62, nivel: "medio", estimacion: true },
  nowcast: nowcast(),
  sinoptico: { sistemas: ["frente_frio", "onda_tropical"], afecta_cgsm: true, extracto: "x", emitido: null },
};

const fila = (v: ReturnType<typeof buildLluviaVista>, id: "24h" | "6h" | "1h") => v!.filas.find((f) => f.id === id)!;

describe("formatProb", () => {
  it("redondea y acota", () => {
    expect(formatProb(0.623)).toBe("62 %");
    expect(formatProb(0)).toBe("0 %");
    expect(formatProb(1.4)).toBe("100 %");
    expect(formatProb(-1)).toBe("0 %");
  });
  it("null/undefined/NaN -> null", () => {
    expect(formatProb(null)).toBeNull();
    expect(formatProb(undefined)).toBeNull();
    expect(formatProb(NaN)).toBeNull();
  });
});

describe("sistemaLabel", () => {
  it("traduce los cuatro sistemas y tolera desconocidos", () => {
    expect(sistemaLabel("frente_frio")).toBe("frente frío");
    expect(sistemaLabel("onda_tropical")).toBe("onda tropical");
    expect(sistemaLabel("vaguada")).toBe("vaguada");
    expect(sistemaLabel("baja_presion")).toBe("baja presión");
    expect(sistemaLabel("nuevo_sistema")).toBe("nuevo sistema");
  });
});

describe("buildLluviaVista", () => {
  it("backend viejo (sin lluvia) o null -> sin tarjeta", () => {
    expect(buildLluviaVista(undefined)).toBeNull();
    expect(buildLluviaVista(null)).toBeNull();
  });

  it("los tres subcampos null -> sin tarjeta", () => {
    expect(buildLluviaVista({ outlook: null, nowcast: null, sinoptico: null })).toBeNull();
  });

  it("caso completo: tres filas en orden de antelación", () => {
    const v = buildLluviaVista(completo)!;
    expect(v.filas.map((f) => f.id)).toEqual(["24h", "6h", "1h"]);
    expect(fila(v, "24h")).toMatchObject({ etiqueta: "Próximas 24 h", valor: "62 %", texto: "Probabilidad alta", tone: "rojo" });
    expect(fila(v, "6h")).toMatchObject({ etiqueta: "Próximas 6 h", valor: "35 %", tone: "amarillo" });
    expect(v.sistemas).toEqual(["frente frío", "onda tropical"]);
    expect(v.afectaCgsm).toBe(true);
    expect(v.esEstimacion).toBe(true);
  });

  it("tono por fila según su propia probabilidad (no el nivel global del backend)", () => {
    const tono = (prob_24h: number) =>
      fila(buildLluviaVista({ ...completo, outlook: { ...completo.outlook!, prob_24h, nivel: "alto" } }), "24h").tone;
    expect(tono(0.29)).toBe("verde");
    expect(tono(0.3)).toBe("amarillo");
    expect(tono(0.49)).toBe("amarillo");
    expect(tono(0.5)).toBe("rojo");
  });

  it("outlook null -> filas 24h y 6h sin pronóstico, aún se muestra el nowcast", () => {
    const v = buildLluviaVista({ ...completo, outlook: null })!;
    expect(fila(v, "24h")).toMatchObject({ valor: null, texto: "Sin pronóstico", tone: "neutral" });
    expect(fila(v, "6h")).toMatchObject({ valor: null, texto: "Sin pronóstico" });
    expect(fila(v, "1h").texto).toBe("Sin lluvia cerca");
    expect(v.esEstimacion).toBe(true);
  });

  it("probabilidades individuales null", () => {
    const v = buildLluviaVista({ ...completo, outlook: { nivel: null, estimacion: true } })!;
    expect(fila(v, "6h")).toMatchObject({ valor: null, texto: "Sin pronóstico" });
    expect(fila(v, "24h")).toMatchObject({ valor: null, texto: "Sin pronóstico", tone: "neutral" });
  });

  describe("nowcast", () => {
    const f = (n: LluviaNowcast | null) => fila(buildLluviaVista({ outlook: null, nowcast: n, sinoptico: { sistemas: ["vaguada"], afecta_cgsm: false, extracto: null, emitido: null } }), "1h");

    it("inminente con ETA", () => {
      expect(f(nowcast({ estado: "inminente", eta_rango_min: [30, 60] }))).toMatchObject({
        texto: "Lluvia fuerte acercándose (~30-60 min)",
        tone: "rojo",
        pulse: true,
        valor: null,
      });
    });
    it("inminente sin ETA", () => {
      expect(f(nowcast({ estado: "inminente" })).texto).toBe("Lluvia fuerte acercándose");
    });
    it("lloviendo", () => {
      expect(f(nowcast({ estado: "lloviendo" }))).toMatchObject({ texto: "Lloviendo ahora", tone: "amarillo", pulse: false });
    });
    it("sin_lluvia", () => {
      expect(f(nowcast({ estado: "sin_lluvia" }))).toMatchObject({ texto: "Sin lluvia cerca", tone: "verde", pulse: false });
    });
    it("sin_dato y nowcast null", () => {
      expect(f(nowcast({ estado: "sin_dato" }))).toMatchObject({ texto: "Sin dato satelital", tone: "neutral" });
      expect(f(null)).toMatchObject({ texto: "Sin dato satelital", tone: "neutral", pulse: false });
    });
    it("tormenta eléctrica se anota y sube a rojo", () => {
      expect(f(nowcast({ estado: "lloviendo", tormenta_electrica: true }))).toMatchObject({
        texto: "Lloviendo ahora · ⚡ tormenta eléctrica",
        tone: "rojo",
        pulse: true,
      });
      expect(f(nowcast({ estado: "inminente", eta_rango_min: [30, 60], tormenta_electrica: true })).texto).toBe(
        "Lluvia fuerte acercándose (~30-60 min) · ⚡ tormenta eléctrica"
      );
    });
    it("estado desconocido no afirma nada", () => {
      expect(f(nowcast({ estado: "raro" as never })).texto).toBe("Sin dato satelital");
    });
  });

  describe("sinóptico", () => {
    const v = (sinoptico: LluviaSignal["sinoptico"]) => buildLluviaVista({ outlook: completo.outlook, nowcast: null, sinoptico })!;

    it("null o sin sistemas -> sin chips ni 'afecta'", () => {
      expect(v(null)).toMatchObject({ sistemas: [], afectaCgsm: false });
      expect(v({ sistemas: [], afecta_cgsm: true, extracto: null, emitido: null })).toMatchObject({ sistemas: [], afectaCgsm: false });
    });
    it("afecta_cgsm false", () => {
      expect(v({ sistemas: ["baja_presion"], afecta_cgsm: false, extracto: null, emitido: null })).toMatchObject({
        sistemas: ["baja presión"],
        afectaCgsm: false,
      });
    });
    it("solo sinóptico: la tarjeta existe", () => {
      const r = buildLluviaVista({ outlook: null, nowcast: null, sinoptico: { sistemas: ["vaguada"], afecta_cgsm: true, extracto: null, emitido: null } });
      expect(r).not.toBeNull();
      expect(r!.afectaCgsm).toBe(true);
    });
  });
});

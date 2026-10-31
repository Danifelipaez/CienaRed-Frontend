import { describe, expect, it } from "vitest";
import type { Aviso, AvisosSignal } from "./api";
import { avisosPill, buildAvisosVista, etiquetaAviso } from "./avisos";

const aviso = (over: Partial<Aviso> = {}): Aviso => ({
  tipo: "viento_fuerte",
  nivel: "alto",
  titulo: "Viento fuerte",
  mensaje: "💨 Viento fuerte mañana en la madrugada.",
  fuente: "2 de 3 modelos",
  desde: "2026-11-01T08:00:00+00:00",
  clave: "2026-11-01",
  push: true,
  ...over,
});

const signal = (vigentes: Aviso[], sin_revisar: AvisosSignal["sin_revisar"] = []): AvisosSignal => ({
  vigentes,
  sin_revisar,
  actualizado: "2026-10-31T08:00:00+00:00",
  temporada: {
    actual: "segunda temporada de lluvias",
    proxima: "temporada seca",
    proxima_inicio: "2026-12-15",
    proxima_cuando: "mediados de diciembre",
    dias_para_proxima: 45,
    que_esperar: "poca lluvia",
    enso: null,
    efecto_enso: null,
  },
});

describe("buildAvisosVista", () => {
  it("separa altos y medios y traduce las fuentes caídas", () => {
    const v = buildAvisosVista(signal([aviso(), aviso({ nivel: "medio", titulo: "Posible mar picado" })], ["ideam", "oleaje"]));
    expect(v!.altos).toHaveLength(1);
    expect(v!.medios).toHaveLength(1);
    expect(v!.sinRevisar).toEqual(["alertas del IDEAM", "oleaje"]);
  });

  it("devuelve null sin dato (backend viejo o proceso recién arrancado)", () => {
    expect(buildAvisosVista(undefined)).toBeNull();
    expect(buildAvisosVista(null)).toBeNull();
  });
});

describe("etiquetaAviso", () => {
  it("no dice 'enviado' y no llama 'posible' a una alerta oficial", () => {
    expect(etiquetaAviso(aviso())).toBe("confirmado");
    expect(etiquetaAviso(aviso({ nivel: "medio" }))).toBe("posible");
    expect(etiquetaAviso(aviso({ nivel: "medio", tipo: "ideam_mar" }))).toBe("alerta oficial");
  });
});

describe("avisosPill", () => {
  it("un alto muestra su título en rojo; varios, el conteo", () => {
    expect(avisosPill(buildAvisosVista(signal([aviso()])))).toEqual({ texto: "Viento fuerte", tone: "rojo" });
    expect(avisosPill(buildAvisosVista(signal([aviso(), aviso({ titulo: "Mar picado" })])))!.texto).toBe("2 avisos del tiempo");
  });

  it("solo medios va en amarillo; sin avisos no hay pastilla", () => {
    expect(avisosPill(buildAvisosVista(signal([aviso({ nivel: "medio", titulo: "Posible lluvia fuerte" })])))).toEqual({
      texto: "Posible lluvia fuerte",
      tone: "amarillo",
    });
    expect(avisosPill(buildAvisosVista(signal([])))).toBeNull();
  });
});

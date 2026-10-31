import type { Aviso, AvisoFuente, AvisosSignal } from "./api";

const SIN_REVISAR_LABEL: Record<AvisoFuente, string> = {
  viento: "viento",
  lluvia: "lluvia",
  oleaje: "oleaje",
  ciclon: "ciclones",
  frente_frio: "frentes fríos",
  enso: "El Niño/La Niña",
  ideam: "alertas del IDEAM",
};

export interface AvisosVista {
  altos: Aviso[];
  medios: Aviso[];
  /** Fuentes caídas, en español. Si hay, "sin avisos" no se puede afirmar. */
  sinRevisar: string[];
}

export function buildAvisosVista(av: AvisosSignal | null | undefined): AvisosVista | null {
  if (!av) return null;
  return {
    altos: av.vigentes.filter((a) => a.nivel === "alto"),
    medios: av.vigentes.filter((a) => a.nivel === "medio"),
    sinRevisar: av.sin_revisar.map((k) => SIN_REVISAR_LABEL[k] ?? k),
  };
}

/** "push" solo dice que el aviso califica para WhatsApp, no que se haya enviado (dedup, fallas,
 * o el backend público que no envía): por eso "confirmado", nunca "enviado". Las alertas del
 * IDEAM de nivel medio son oficiales (amarillas), no "posibles". */
export function etiquetaAviso(a: Aviso): string {
  if (a.nivel === "alto") return "confirmado";
  return a.tipo.startsWith("ideam") ? "alerta oficial" : "posible";
}

/** Texto de la pastilla del encabezado; null si no hay nada que mostrar. */
export function avisosPill(v: AvisosVista | null): { texto: string; tone: "rojo" | "amarillo" } | null {
  if (!v) return null;
  if (v.altos.length) return { texto: v.altos.length === 1 ? v.altos[0].titulo : `${v.altos.length} avisos del tiempo`, tone: "rojo" };
  if (v.medios.length) return { texto: v.medios.length === 1 ? v.medios[0].titulo : `${v.medios.length} avisos para estar atento`, tone: "amarillo" };
  return null;
}

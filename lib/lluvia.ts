import type { LluviaSignal, SistemaSinoptico } from "./api";

export type LluviaTone = "neutral" | "verde" | "amarillo" | "rojo" | "teal";

export interface LluviaFila {
  id: "24h" | "6h" | "1h";
  etiqueta: string;
  /** Porcentaje ya formateado ("62 %") o null cuando la fila no es una probabilidad. */
  valor: string | null;
  texto: string;
  tone: LluviaTone;
  /** Solo la fila de la próxima hora puede tener un aviso que merezca llamar la atención. */
  pulse: boolean;
}

export interface LluviaVista {
  filas: LluviaFila[];
  /** Nombres en español de los sistemas sinópticos activos (vacío si no hay). */
  sistemas: string[];
  afectaCgsm: boolean;
  /** El outlook es un pronóstico de ensamble: siempre se etiqueta como estimación. */
  esEstimacion: boolean;
}

export const SISTEMA_LABEL: Record<SistemaSinoptico, string> = {
  frente_frio: "frente frío",
  onda_tropical: "onda tropical",
  vaguada: "vaguada",
  baja_presion: "baja presión",
};

const NIVEL_TEXTO = { bajo: "Probabilidad baja", medio: "Probabilidad media", alto: "Probabilidad alta" } as const;
const NIVEL_TONE = { bajo: "verde", medio: "amarillo", alto: "rojo" } as const;

/** 0.623 -> "62 %"; null/NaN -> null. Se acota a 0-100. */
export function formatProb(p: number | null | undefined): string | null {
  if (p == null || !Number.isFinite(p)) return null;
  return `${Math.round(Math.min(1, Math.max(0, p)) * 100)} %`;
}

/** Sistema desconocido (backend más nuevo que el front): se muestra legible en vez de omitirse. */
export function sistemaLabel(s: string): string {
  return (SISTEMA_LABEL as Record<string, string>)[s] ?? s.replace(/_/g, " ");
}

// Mismos cortes que el backend (rain_signals.py::lluvia_outlook), pero por fila: el `nivel` del
// backend es el peor de 6 h y 24 h, y pintado en una sola fila contradiría su porcentaje.
function nivelDe(p: number): "alto" | "medio" | "bajo" {
  return p >= 0.5 ? "alto" : p >= 0.3 ? "medio" : "bajo";
}

function filaProb(id: "24h" | "6h", etiqueta: string, prob: number | null | undefined): LluviaFila {
  const valor = formatProb(prob);
  if (valor === null || prob == null) {
    return { id, etiqueta, valor: null, texto: "Sin pronóstico", tone: "neutral", pulse: false };
  }
  const nivel = nivelDe(prob);
  return { id, etiqueta, valor, texto: NIVEL_TEXTO[nivel], tone: NIVEL_TONE[nivel], pulse: false };
}

function filaNowcast(nowcast: LluviaSignal["nowcast"]): LluviaFila {
  const base = { id: "1h" as const, etiqueta: "Próxima hora", valor: null };
  if (!nowcast) return { ...base, texto: "Sin dato satelital", tone: "neutral", pulse: false };

  const rayo = nowcast.tormenta_electrica ? " · ⚡ tormenta eléctrica" : "";
  switch (nowcast.estado) {
    case "inminente": {
      const eta = nowcast.eta_rango_min ? ` (~${nowcast.eta_rango_min[0]}-${nowcast.eta_rango_min[1]} min)` : "";
      return { ...base, texto: `Lluvia fuerte acercándose${eta}${rayo}`, tone: "rojo", pulse: true };
    }
    case "lloviendo":
      return {
        ...base,
        texto: `Lloviendo ahora${rayo}`,
        tone: nowcast.tormenta_electrica ? "rojo" : "amarillo",
        pulse: nowcast.tormenta_electrica,
      };
    case "sin_lluvia":
      return {
        ...base,
        texto: `Sin lluvia cerca${rayo}`,
        tone: nowcast.tormenta_electrica ? "rojo" : "verde",
        pulse: nowcast.tormenta_electrica,
      };
    default:
      // "sin_dato" y cualquier estado desconocido: no afirmar nada que no sepamos.
      return {
        ...base,
        texto: `Sin dato satelital${rayo}`,
        tone: nowcast.tormenta_electrica ? "rojo" : "neutral",
        pulse: nowcast.tormenta_electrica,
      };
  }
}

/**
 * Mapea `senales.lluvia` a lo que pinta la tarjeta. Devuelve null cuando no hay nada que mostrar
 * (backend viejo sin `lluvia`, o los tres subcampos null) para que la tarjeta no se renderice.
 */
export function buildLluviaVista(lluvia: LluviaSignal | null | undefined): LluviaVista | null {
  if (!lluvia) return null;
  const { outlook, nowcast, sinoptico } = lluvia;
  if (!outlook && !nowcast && !sinoptico) return null;

  const sistemas = (sinoptico?.sistemas ?? []).map(sistemaLabel);
  return {
    filas: [
      filaProb("24h", "Próximas 24 h", outlook?.prob_24h),
      filaProb("6h", "Próximas 6 h", outlook?.prob_6h),
      filaNowcast(nowcast),
    ],
    sistemas,
    afectaCgsm: sistemas.length > 0 && sinoptico?.afecta_cgsm === true,
    esEstimacion: outlook ? outlook.estimacion !== false : true,
  };
}

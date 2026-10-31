import { Card } from "@/components/ui/card";
import { MonoChip, Pill, StatusDot } from "@/components/ui/primitives";
import { formatTooltipHeader } from "./time-format";
import type { AvisosSignal } from "@/lib/api";
import { buildAvisosVista, etiquetaAviso } from "@/lib/avisos";

const mono = { fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: ".08em" } as const;

// Avisos del tiempo (backend app/services/avisos.py). Muestra el mismo texto que llega por WhatsApp.
export function AvisosCard({ avisos }: { avisos: AvisosSignal | null | undefined }) {
  const v = buildAvisosVista(avisos);
  const horas = avisos?.horas ?? 36; // backends previos a `horas` usaban 36
  return (
    <Card title="Avisos del tiempo" label={`Consenso de modelos · IDEAM · NOAA — próximas ${horas} h`} span={12} icon="wind">
      <span id="avisos" />
      {!v || !avisos ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>
          Todavía no hay cálculo de avisos (el backend los calcula en cada refresco horario).
        </p>
      ) : (
        <div className="cr-events">
          {[...v.altos, ...v.medios].map((a) => (
            <div key={`${a.tipo}:${a.clave}`} className="cr-event-row">
              <span style={{ marginTop: 3 }}>
                <StatusDot tone={a.nivel === "alto" ? "rojo" : "amarillo"} pulse={a.nivel === "alto"} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{a.titulo}</span>
                  <Pill tone={a.nivel === "alto" ? "rojo" : "amarillo"}>{etiquetaAviso(a)}</Pill>
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.45, color: "var(--ink-soft)" }}>{a.mensaje}</p>
                <span className="mono" style={{ ...mono, textTransform: "none", letterSpacing: 0 }}>
                  {a.fuente}
                  {a.desde && ` · desde ${formatTooltipHeader(a.desde, "hour")}`}
                </span>
              </div>
            </div>
          ))}
          {!v.altos.length && !v.medios.length && (
            <div className="cr-event-row">
              <span style={{ marginTop: 3 }}>
                <StatusDot tone={v.sinRevisar.length ? "amarillo" : "verde"} />
              </span>
              <span style={{ fontSize: 13.5, color: "var(--ink)" }}>
                Sin avisos para las próximas {horas} horas{v.sinRevisar.length ? " en lo que se pudo revisar" : ""}.
              </span>
            </div>
          )}
          {v.sinRevisar.length > 0 && (
            <div className="cr-event-row">
              <span style={{ marginTop: 3 }}>
                <StatusDot tone="amarillo" pulse />
              </span>
              <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                No se pudo revisar: <b>{v.sinRevisar.join(", ")}</b> (fuente sin datos). No es lo mismo que &quot;sin
                avisos&quot;.
              </span>
            </div>
          )}
          <div className="cr-event-row">
            <span style={{ marginTop: 3 }}>
              <StatusDot tone="off" />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span className="mono" style={mono}>
                Temporada
              </span>
              <p style={{ margin: "3px 0 0", fontSize: 13, lineHeight: 1.45, color: "var(--ink)" }}>
                Ahora: {avisos.temporada.actual}. Próxima: {avisos.temporada.proxima} desde {avisos.temporada.proxima_cuando}{" "}
                (en {avisos.temporada.dias_para_proxima} días) — {avisos.temporada.que_esperar}.
              </p>
              {avisos.temporada.enso && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 6 }}>
                  <MonoChip tone="teal">NOAA CPC: {avisos.temporada.enso.estado}</MonoChip>
                  {avisos.temporada.efecto_enso && (
                    <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{avisos.temporada.efecto_enso}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

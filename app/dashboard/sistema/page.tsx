import { Icon } from "@/components/ui/icon";
import { Card, CardGrid } from "@/components/ui/card";
import { MetricGrid, MetricTile, MonoChip, Pill, StatusDot } from "@/components/ui/primitives";
import { BackendError } from "@/components/ui/backend-error";
import {
  backendFetchAdmin,
  getLatestSnapshot,
  READ_REVALIDATE,
  type ApiStatus,
  type DashboardSnapshot,
  type SystemStatusResponse,
} from "@/lib/api";

function estTone(e: ApiStatus["estado"]) {
  return e === "ok" ? "verde" : e === "degradado" ? "amarillo" : "rojo";
}
function estLabel(e: ApiStatus["estado"]) {
  return e === "ok" ? "Operativo" : e === "degradado" ? "Degradado" : "Caído";
}

function nivelTone(n: "alto" | "medio" | "bajo" | null) {
  return n === "alto" ? "rojo" : n === "medio" ? "amarillo" : "verde";
}

async function getSystemStatus(): Promise<SystemStatusResponse | null> {
  try {
    return await backendFetchAdmin<SystemStatusResponse>("/dashboard/system-status", undefined, READ_REVALIDATE);
  } catch {
    return null;
  }
}

async function getSnapshot(): Promise<DashboardSnapshot | null> {
  try {
    return await getLatestSnapshot();
  } catch {
    return null;
  }
}

export default async function SistemaPage() {
  const [status, snapshot] = await Promise.all([getSystemStatus(), getSnapshot()]);

  if (!status) {
    return <BackendError title="Estado del sistema" />;
  }

  const anoxia = snapshot?.senales.anoxia;
  const pulso = snapshot?.senales.pulso_agua_dulce;

  return (
    <div className="cr-content-scroll">
      <header className="cr-page-head">
        <div>
          <h1 className="serif cr-page-title">Estado del sistema</h1>
          <p className="mono cr-page-sub">Fuentes conectadas · bot comunitario · alertas</p>
        </div>
        <Pill tone="verde" dot>
          Sistema operativo
        </Pill>
      </header>

      <CardGrid>
        {status.apis.map((a) => (
          <Card
            key={a.id}
            span={4}
            pad={20}
            accent={a.estado === "ok" ? "var(--verde-sem)" : a.estado === "degradado" ? "var(--amarillo)" : "var(--rojo)"}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div>
                <h3 className="serif" style={{ margin: 0, fontSize: 19, fontWeight: 600, color: "var(--verde)" }}>
                  {a.nombre}
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{a.desc}</p>
              </div>
              <StatusDot tone={estTone(a.estado)} size={11} pulse={a.estado !== "ok"} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <Pill tone={estTone(a.estado)}>{estLabel(a.estado)}</Pill>
            </div>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="history" size={12} /> Actualizado {a.actualizado}
            </div>
          </Card>
        ))}

        <Card title="Métricas del bot" label="Comunidad · WhatsApp" span={12} icon="bot" motif="cana">
          <MetricGrid>
            {status.bot_metricas.map((m) => (
              <MetricTile key={m.id} label={m.label} value={m.valor} sub={m.sub} />
            ))}
          </MetricGrid>
        </Card>

        {anoxia && (
          <Card title="Señales de riesgo" label="Compuestas · satélite + clima + sensores" span={12} icon="gauge" motif="lirio">
            <MetricGrid>
              <MetricTile
                label="Riesgo de anoxia"
                value={anoxia.score != null ? anoxia.score : "—"}
                unit={anoxia.score != null ? "/100" : undefined}
                sub={
                  anoxia.nivel ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Pill tone={nivelTone(anoxia.nivel)}>{anoxia.nivel}</Pill>
                      {anoxia.factores.length > 0 && anoxia.factores.join(", ")}
                    </span>
                  ) : (
                    "Datos insuficientes para estimar"
                  )
                }
              />
              {pulso && (
                <MetricTile
                  label="Pulso de agua dulce"
                  value={`${pulso.lluvia_72h_mm}`}
                  unit="mm / 72h"
                  sub={pulso.mensaje}
                />
              )}
            </MetricGrid>
            <p className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 14 }}>
              Estimación, no medición — umbrales sin validar contra un evento real todavía.
            </p>
          </Card>
        )}

        <Card title="Alertas recientes" label="Enviadas a WhatsApp" span={12} icon="system">
          <div className="cr-alert-log">
            {status.log_alertas.map((al, i) => (
              <div key={i} className="cr-alert-row">
                <div className="cr-alert-time mono">{al.hora}</div>
                <span style={{ marginTop: 3 }}>
                  <StatusDot tone={al.tipo === "red" || al.tipo === "rojo" ? "rojo" : al.tipo === "yellow" || al.tipo === "amarillo" ? "amarillo" : "verde"} pulse={al.tipo === "red" || al.tipo === "rojo"} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 600 }}>{al.zonas}</span>
                    <MonoChip>{al.canal}</MonoChip>
                    {al.destinatarios != null && <MonoChip tone="teal">{al.destinatarios} destinatarios</MonoChip>}
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 12.5, lineHeight: 1.45, color: "var(--ink-soft)" }}>{al.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </CardGrid>
    </div>
  );
}

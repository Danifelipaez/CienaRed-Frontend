import type { CSSProperties, ReactNode } from "react";

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 11,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: "var(--ink-soft)",
        fontWeight: 600,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type Tone = "neutral" | "teal" | "sediment";

export function MonoChip({ children, tone = "neutral" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: "var(--surface-3)", fg: "var(--ink)" },
    teal: { bg: "var(--teal-soft)", fg: "color-mix(in srgb, var(--teal) 50%, var(--ink))" },
    sediment: { bg: "var(--sedimento-soft)", fg: "var(--ink)" },
  };
  const t = tones[tone];
  return (
    <span
      className="mono"
      style={{
        background: t.bg,
        color: t.fg,
        padding: "1px 6px",
        borderRadius: 6,
        fontSize: ".82em",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

type PillTone = "neutral" | "verde" | "amarillo" | "rojo" | "teal";

export function Pill({
  children,
  tone = "neutral",
  dot = false,
  pulse = false,
}: {
  children: ReactNode;
  tone?: PillTone;
  dot?: boolean;
  pulse?: boolean;
}) {
  // El texto se mezcla con --ink para pasar 4.5:1 sobre el fondo suave en ambos temas
  // (amarillo puro daba 2.1:1 en claro); el punto conserva el color semántico puro.
  const ink = (c: string) => `color-mix(in srgb, ${c} 50%, var(--ink))`;
  const tones: Record<PillTone, { bg: string; fg: string; dc: string }> = {
    neutral: { bg: "var(--surface-3)", fg: "var(--ink-soft)", dc: "var(--ink-soft)" },
    verde: { bg: "var(--verde-sem-soft)", fg: ink("var(--verde-sem)"), dc: "var(--verde-sem)" },
    amarillo: { bg: "var(--amarillo-soft)", fg: ink("var(--amarillo)"), dc: "var(--amarillo)" },
    rojo: { bg: "var(--rojo-soft)", fg: ink("var(--rojo)"), dc: "var(--rojo)" },
    teal: { bg: "var(--teal-soft)", fg: ink("var(--teal)"), dc: "var(--teal)" },
  };
  const t = tones[tone];
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: t.bg,
        color: t.fg,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: ".04em",
        whiteSpace: "nowrap",
      }}
    >
      {dot && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: t.dc,
            display: "inline-block",
            animation: pulse ? "cr-pulse-red 1.8s infinite" : "none",
          }}
        />
      )}
      {children}
    </span>
  );
}

type StatusTone = "verde" | "amarillo" | "rojo" | "teal" | "off";

export function StatusDot({
  tone = "verde",
  size = 9,
  pulse = false,
}: {
  tone?: StatusTone;
  size?: number;
  pulse?: boolean;
}) {
  const colors: Record<StatusTone, string> = {
    verde: "var(--verde-sem)",
    amarillo: "var(--amarillo)",
    rojo: "var(--rojo)",
    teal: "var(--teal)",
    off: "var(--ink-faint)",
  };
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors[tone],
        display: "inline-block",
        flexShrink: 0,
        animation: pulse ? "cr-pulse-red 1.8s infinite" : "none",
      }}
    />
  );
}

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      className="cr-press"
      onClick={() => onChange(!on)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
        background: on ? "var(--teal)" : "var(--surface-3)",
        position: "relative",
        transition: "background-color 200ms ease, transform 160ms var(--ease-out)",
        boxShadow: on ? "none" : "inset 0 0 0 1px var(--border)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: 3,
          transform: on ? "translateX(18px)" : "none",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          transition: "transform 200ms var(--ease-out)",
          boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }}
      />
    </button>
  );
}

export function BigStat({ value, unit, size = 44 }: { value: ReactNode; unit?: string; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span
        className="serif"
        style={{ fontSize: size, fontWeight: 600, color: "var(--ink)", lineHeight: 1, letterSpacing: "-.02em" }}
      >
        {value}
      </span>
      {unit && (
        <span
          className="mono"
          style={{
            fontSize: 12,
            color: "var(--ink-soft)",
            background: "var(--surface-3)",
            padding: "2px 7px",
            borderRadius: 6,
            fontWeight: 500,
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

// Grid de tarjetas "icon + label + value" — mismo patrón que antes vivía inline
// en sistema/page.tsx (bot_metricas), promovido para reusarse en Gráficas/Sistema.
export function MetricGrid({ children }: { children: ReactNode }) {
  return <div className="cr-metric-grid">{children}</div>;
}

export function MetricTile({
  label,
  value,
  unit,
  sub,
  trend,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  trend?: ReactNode;
}) {
  return (
    <div className="cr-metric">
      <span
        className="mono"
        style={{ fontSize: 11, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: ".08em" }}
      >
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0 2px" }}>
        <span className="serif" style={{ fontSize: 34, fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
          {value}
        </span>
        {unit && (
          <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
            {unit}
          </span>
        )}
      </div>
      {(sub || trend) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {sub && <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{sub}</span>}
          {trend}
        </div>
      )}
    </div>
  );
}

export function nivelTone(n: "alto" | "medio" | "bajo" | null): PillTone {
  return n === "alto" ? "rojo" : n === "medio" ? "amarillo" : "verde";
}

export const VENDAVAL_LABEL: Record<"alto" | "medio" | "bajo", string> = {
  alto: "altas",
  medio: "moderadas",
  bajo: "favorables",
};

const TREND_ARROW: Record<"subiendo" | "bajando" | "estable", string> = {
  subiendo: "▲",
  bajando: "▼",
  estable: "—",
};

/** Insignia de tendencia (24h/7d) — dirección no implica bueno/malo, solo movimiento. */
export function TrendBadge({
  direccion,
  delta,
  unit = "",
}: {
  direccion: "subiendo" | "bajando" | "estable" | null;
  delta?: number | null;
  unit?: string;
}) {
  if (!direccion) return null;
  const signo = delta != null && delta > 0 ? "+" : "";
  return (
    <MonoChip tone={direccion === "bajando" ? "teal" : "neutral"}>
      {TREND_ARROW[direccion]} {delta != null ? `${signo}${delta}${unit}` : direccion}
    </MonoChip>
  );
}

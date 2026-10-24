import { Icon } from "./icon";
import { Pill } from "./primitives";

export function BackendError({ title }: { title: string }) {
  return (
    <div className="cr-content-scroll">
      <header className="cr-page-head">
        <div>
          <h1 className="serif cr-page-title">{title}</h1>
          <p className="cr-page-sub" style={{ fontSize: 13, maxWidth: 520, lineHeight: 1.5 }}>
            El servidor de datos no respondió. Puede ser una caída momentánea: espera unos segundos y vuelve a intentar.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Pill tone="rojo" dot>
            No se pudo contactar al backend
          </Pill>
          {/* href="" recarga la ruta actual — sin JS de cliente. */}
          <a href="" className="cr-btn-ghost" style={{ textDecoration: "none" }}>
            <Icon name="history" size={15} /> Reintentar
          </a>
        </div>
      </header>
    </div>
  );
}

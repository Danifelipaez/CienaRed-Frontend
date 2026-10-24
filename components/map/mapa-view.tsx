"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as LeafletType from "leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "@/components/ui/icon";
import { StatusDot, SectionLabel, MonoChip, Toggle } from "@/components/ui/primitives";
import { MoonGlyph } from "@/components/ui/charts";
import type { PuntoPesca, Especie, ZonaSedimentacion } from "@/lib/api";
import type { EstacionSnapshot } from "@/lib/stations";
import { moonPhaseGlyph, moonPhaseLabel } from "@/lib/moon";
import { formatTooltipHeader } from "@/components/charts/time-format";

const CR_CENTER: [number, number] = [10.86, -74.43];

// Capas raster sobre el mapa. `nivel` es el zoom nativo máximo: más allá Leaflet escala la tesela.
// - Nubes: NASA GIBS GOES-East GeoColor (abierto, sin key, ~1 km). El tiempo "default" es la imagen
//   más reciente y GIBS responde no-cache, así que cada carga trae la última.
// - Lluvia: Xweather radar-global vía nuestro proxy app/api/tiles/radar (inyecta la clave y cachea
//   20 min para todos). Solo existen las 2 teselas z9 de la Ciénaga: RADAR_BOUNDS evita que Leaflet
//   pida otras, y nivel 9 hace que las escale en vez de pedir más (cada tesela gasta cuota).
const GIBS_NUBES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_GeoColor/default/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png";
const RADAR_BOUNDS: [[number, number], [number, number]] = [[10.55, -75.15], [11.1, -73.9]];
const SATELITE = {
  nubes: { url: GIBS_NUBES, nivel: 7, opacity: 0.75, attribution: "NASA GIBS" },
  lluvia: { url: "/api/tiles/radar/{z}/{x}/{y}", nivel: 9, opacity: 0.8, attribution: "Xweather" },
} as const;
type CapaSatelite = keyof typeof SATELITE;

function semColor(c: string) {
  return c === "rojo" ? "#C05746" : c === "amarillo" ? "#C9981E" : "#4A7C59";
}
function semLabel(c: string) {
  return c === "rojo" ? "Crítica" : c === "amarillo" ? "Precaución" : "Estable";
}

function markerIcon(L: typeof import("leaflet"), cond: string, selected: boolean) {
  const col = semColor(cond);
  const s = selected ? 24 : 18;
  return L.divIcon({
    className: "cr-marker",
    iconSize: [s, s * 1.3],
    iconAnchor: [s / 2, s * 1.3 - 2],
    html: `<svg width="${s}" height="${s * 1.3}" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 41 C16 41 29 25 29 14 A13 13 0 1 0 3 14 C3 25 16 41 16 41Z"
        fill="${col}" stroke="#fff" stroke-width="2.2"/>
      <circle cx="16" cy="14" r="5" fill="#fff" fill-opacity="${selected ? 1 : 0.92}"/>
      ${selected ? `<circle cx="16" cy="14" r="2.4" fill="${col}"/>` : ""}
    </svg>`,
  });
}

function stationIcon(L: typeof import("leaflet")) {
  return L.divIcon({
    className: "cr-station-marker",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<svg width="14" height="14" viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="12" height="12" rx="3" fill="var(--teal, #2E7D6B)" stroke="#fff" stroke-width="1.6"/>
    </svg>`,
  });
}

function fmt(v: number | null, unit: string) {
  return v == null ? "—" : `${v.toFixed(1)} ${unit}`;
}

function estacionPopupHTML(e: EstacionSnapshot) {
  return `<div style="padding:12px 14px;font-family:var(--font-body)">
    <div class="serif" style="font-size:16px;font-weight:600;color:var(--verde);margin-bottom:8px">${escapeHtml(e.nombre)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:12.5px;color:var(--ink-soft)">
      <div>Temp. ambiental: <b style="color:var(--ink)">${fmt(e.tempAmbiental, "°C")}</b></div>
      <div>Humedad: <b style="color:var(--ink)">${fmt(e.humedad, "%")}</b></div>
      <div>Viento: <b style="color:var(--ink)">${fmt(e.viento, "km/h")}</b></div>
      <div>Ráfaga: <b style="color:var(--ink)">${fmt(e.rafaga, "km/h")}</b></div>
      <div>Precipitación: <b style="color:var(--ink)">${fmt(e.precipitacion, "mm")}</b></div>
      <div>Nivel río: <b style="color:var(--ink)">${fmt(e.nivelRio, "m")}</b></div>
    </div>
  </div>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SEDIMENTACION_NIVEL_COLOR: Record<string, string> = { alto: "#C05746", medio: "#C9981E", bajo: "#4A7C59" };

function sedimentacionPopupHTML(z: ZonaSedimentacion) {
  const col = SEDIMENTACION_NIVEL_COLOR[z.nivel] ?? "#C4A882";
  return `<div style="padding:12px 14px;font-family:var(--font-body)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
      <span class="serif" style="font-size:15px;font-weight:600;color:var(--verde)">${escapeHtml(z.nombre)}</span>
      <span class="mono" style="font-size:10px;font-weight:600;letter-spacing:.04em;padding:3px 8px;border-radius:999px;background:${col}22;color:${col}">${z.nivel.toUpperCase()}</span>
    </div>
    ${z.observacion ? `<p style="margin:0;font-size:12.5px;line-height:1.45;color:var(--ink-soft)">${escapeHtml(z.observacion)}</p>` : ""}
  </div>`;
}

function popupHTML(p: PuntoPesca) {
  return `<div style="padding:14px 16px;font-family:var(--font-body)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px">
      <span class="serif" style="font-size:18px;font-weight:600;color:var(--verde)">${escapeHtml(p.nombre)}</span>
      <span class="mono" style="font-size:10px;font-weight:600;letter-spacing:.04em;padding:3px 8px;border-radius:999px;background:${semColor(p.condicion)}22;color:${semColor(p.condicion)}">${semLabel(p.condicion).toUpperCase()}</span>
    </div>
    <div style="display:flex;gap:14px;margin-bottom:10px">
      <div><div class="mono" style="font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em">Temp. sup.</div><div class="serif" style="font-size:17px;color:var(--ink)">${p.temp != null ? p.temp.toFixed(1) : "—"}<span class="mono" style="font-size:11px;color:var(--ink-soft)"> °C</span></div></div>
      <div><div class="mono" style="font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em">Clorofila-a</div><div class="serif" style="font-size:17px;color:var(--ink)">${p.clorofila != null ? p.clorofila.toFixed(1) : "—"}<span class="mono" style="font-size:11px;color:var(--ink-soft)"> mg/m³</span></div></div>
      <div><div class="mono" style="font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em">Salinidad</div><div class="serif" style="font-size:17px;color:var(--ink)">${p.salinidad != null ? p.salinidad.toFixed(1) : "—"}<span class="mono" style="font-size:11px;color:var(--ink-soft)"> PSU</span></div></div>
      <div><div class="mono" style="font-size:10px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em">TDS</div><div class="serif" style="font-size:17px;color:var(--ink)">${p.tds != null ? p.tds.toFixed(0) : "—"}<span class="mono" style="font-size:11px;color:var(--ink-soft)"> mg/L</span></div></div>
    </div>
    <div style="font-size:12.5px;line-height:1.45;color:var(--ink-soft);border-top:1px solid var(--border);padding-top:9px">
      <div class="mono" style="font-size:9.5px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">Observación comunitaria</div>
      ${p.observacion ? escapeHtml(p.observacion) : ""}
    </div>
  </div>`;
}

export default function MapaView({
  puntos,
  especies,
  sedimentacion,
  estaciones,
}: {
  puntos: PuntoPesca[];
  especies: Especie[];
  sedimentacion: ZonaSedimentacion[];
  estaciones: EstacionSnapshot[];
}) {
  const mapRef = useRef<LeafletType.Map | null>(null);
  const elRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<Record<string, LeafletType.Marker>>({});
  const satRef = useRef<Partial<Record<CapaSatelite, LeafletType.TileLayer>>>({});
  const [nubesHora, setNubesHora] = useState<string | null>(null);
  const [radarHora, setRadarHora] = useState<string | null>(null);
  const [center, setCenter] = useState<[number, number]>(CR_CENTER);
  const [selected, setSelected] = useState<PuntoPesca | undefined>(() =>
    puntos.find((p) => p.condicion === "rojo") ?? puntos[0]
  );
  const [layers, setLayers] = useState({
    nubes: false,
    lluvia: false,
    puntos: true,
    semaforo: true,
    sst: false,
    clorofila: false,
    viento: false,
    sedimentacion: false,
    estaciones: false,
  });
  const [query, setQuery] = useState("");
  const [showSug, setShowSug] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [especie, setEspecie] = useState("all");
  const [faseLuna, setFaseLuna] = useState(false);
  // Leaflet carga async: los efectos de capas/filtros esperan a que el mapa exista.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    let disposed = false;

    import("leaflet").then((mod) => {
      if (disposed || !elRef.current || mapRef.current) return;
      const L = mod.default;
      const map = L.map(elRef.current, {
        center: CR_CENTER,
        zoom: 11,
        zoomControl: false,
        attributionControl: true,
        minZoom: 9,
        maxZoom: 15,
      });
      L.control.zoom({ position: "topright" }).addTo(map);
      // ponytail: tiles públicos de OSM (CARTO ahora exige API key). La política de
      // uso de OSM no admite tráfico alto — pasar a un proveedor con key si crece.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      ["nubes", "lluvia", "sst", "clorofila", "viento", "sedimentacion", "semaforo", "puntos", "estaciones"].forEach((p, i) => {
        map.createPane("pane-" + p);
        const pane = map.getPane("pane-" + p)!;
        pane.style.transition = "opacity .3s ease";
        pane.style.zIndex = String(400 + i * 10);
      });

      // Las capas satelitales no se agregan aquí: el efecto de `layers` las monta solo al
      // encenderlas, para no descargar teselas que nadie ve.
      (Object.keys(SATELITE) as CapaSatelite[]).forEach((k) => {
        satRef.current[k] = L.tileLayer(SATELITE[k].url, {
          pane: "pane-" + k,
          maxNativeZoom: SATELITE[k].nivel,
          maxZoom: 15,
          opacity: SATELITE[k].opacity,
          attribution: SATELITE[k].attribution,
          ...(k === "lluvia" && { bounds: RADAR_BOUNDS }),
        });
      });

      const sstG = L.layerGroup();
      puntos.forEach((p) => {
        const t = p.temp ?? 29;
        const k = Math.min(1, Math.max(0, (t - 29) / 5));
        const col = `rgb(${Math.round(180 + k * 70)}, ${Math.round(190 - k * 120)}, ${Math.round(120 - k * 70)})`;
        L.circle([p.lat, p.lng], { radius: 2400, color: col, weight: 0, fillColor: col, fillOpacity: 0.32, pane: "pane-sst" }).addTo(sstG);
      });
      const chlG = L.layerGroup();
      puntos.forEach((p) => {
        const k = Math.min(1, (p.clorofila ?? 0) / 9);
        const col = `rgb(${Math.round(120 - k * 60)}, ${Math.round(160 - k * 30)}, ${Math.round(90 - k * 30)})`;
        L.circle([p.lat, p.lng], { radius: 1800 + k * 1000, color: col, weight: 0, fillColor: col, fillOpacity: 0.3, pane: "pane-clorofila" }).addTo(chlG);
      });
      const vieG = L.layerGroup();
      puntos.forEach((p) => {
        const k = Math.min(1, (p.viento ?? 0) / 25);
        const col = `rgb(${Math.round(140 - k * 40)}, ${Math.round(170 - k * 20)}, ${Math.round(180 + k * 50)})`;
        L.circle([p.lat, p.lng], { radius: 1600 + k * 1200, color: col, weight: 0, fillColor: col, fillOpacity: 0.28, pane: "pane-viento" }).addTo(vieG);
      });
      const sedG = L.layerGroup();
      sedimentacion.forEach((z) => {
        const col = SEDIMENTACION_NIVEL_COLOR[z.nivel] ?? "#C4A882";
        L.polygon(z.polygon, { color: col, weight: 1, fillColor: col, fillOpacity: 0.4, dashArray: "4 4", pane: "pane-sedimentacion" })
          .bindPopup(sedimentacionPopupHTML(z), { className: "cr-popup", closeButton: true })
          .addTo(sedG);
      });
      const semG = L.layerGroup();
      puntos.forEach((p) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 10,
          color: semColor(p.condicion),
          weight: 2,
          fillOpacity: 0.1,
          fillColor: semColor(p.condicion),
          pane: "pane-semaforo",
        }).addTo(semG);
      });
      const ptsG = L.layerGroup();
      puntos.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon: markerIcon(L, p.condicion, false), pane: "pane-puntos" });
        m.bindPopup(popupHTML(p), { className: "cr-popup", closeButton: true, offset: [0, -20] });
        m.on("click", () => setSelected(p));
        m.addTo(ptsG);
        markerRef.current[p.id] = m;
      });
      const estG = L.layerGroup();
      estaciones.forEach((e) => {
        const m = L.marker([e.lat, e.lng], { icon: stationIcon(L), pane: "pane-estaciones" });
        m.bindPopup(estacionPopupHTML(e), { className: "cr-popup", closeButton: true, offset: [0, -10] });
        m.addTo(estG);
      });

      sstG.addTo(map);
      chlG.addTo(map);
      vieG.addTo(map);
      sedG.addTo(map);
      semG.addTo(map);
      ptsG.addTo(map);
      estG.addTo(map);

      map.on("move", () => {
        const c = map.getCenter();
        setCenter([c.lat, c.lng]);
      });
      mapRef.current = map;
      setReady(true);
      setTimeout(() => map.invalidateSize(), 60);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.entries(layers).forEach(([k, on]) => {
      const pane = map.getPane("pane-" + k);
      if (pane) {
        pane.style.opacity = on ? "1" : "0";
        pane.style.pointerEvents = on ? "auto" : "none";
      }
      const sat = satRef.current[k as CapaSatelite];
      if (sat) {
        if (on) sat.addTo(map);
        else sat.remove();
      }
    });
  }, [layers, ready]);

  // GIBS informa en un header la hora real de la imagen "default"; se muestra junto a la capa
  // para que el usuario sepa de cuándo es la imagen de nubes que ve.
  useEffect(() => {
    fetch(GIBS_NUBES.replace("{z}/{y}/{x}", "0/0/0"), { method: "HEAD" })
      .then((r) => r.headers.get("layer-time-actual"))
      .then((t) => t && setNubesHora(t))
      .catch(() => {});
  }, []);

  // Hora del radar: sale de una tesela que el mapa pide igual al encender la capa (misma caché),
  // así que no gasta cuota extra. Solo se consulta si alguien enciende la capa.
  useEffect(() => {
    if (!layers.lluvia || radarHora) return;
    fetch("/api/tiles/radar/9/150/240", { method: "HEAD" })
      .then((r) => r.headers.get("x-radar-hora"))
      .then((t) => t && setRadarHora(new Date(t).toISOString()))
      .catch(() => {});
  }, [layers.lluvia, radarHora]);

  // Filtro de especie: atenúa los marcadores que no la tienen en vez de ocultarlos.
  useEffect(() => {
    Object.entries(markerRef.current).forEach(([id, m]) => {
      const p = puntos.find((x) => x.id === id);
      m.setOpacity(especie === "all" || p?.especies.includes(especie) ? 1 : 0.25);
    });
  }, [especie, ready, puntos]);

  useEffect(() => {
    Object.entries(markerRef.current).forEach(([id, m]) => {
      const p = puntos.find((x) => x.id === id);
      if (!p) return;
      import("leaflet").then((mod) => m.setIcon(markerIcon(mod.default, p.condicion, selected?.id === id)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const sugerencias = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return puntos.filter((p) => p.nombre.toLowerCase().includes(q)).slice(0, 6);
  }, [query, puntos]);

  function goTo(p: PuntoPesca) {
    setSelected(p);
    setQuery(p.nombre);
    setShowSug(false);
    const map = mapRef.current;
    if (map) {
      map.flyTo([p.lat, p.lng], 12.5, { duration: 0.8 });
      setTimeout(() => markerRef.current[p.id]?.openPopup(), 850);
    }
  }

  const especiesFiltradas = especie === "all" ? puntos : puntos.filter((p) => p.especies.includes(especie));
  const fase = moonPhaseGlyph(new Date());

  const capas = [
    {
      id: "nubes",
      icon: "cloud",
      nombre: "Nubes (satélite)",
      sub: `GOES-East · ${nubesHora ? formatTooltipHeader(nubesHora, "hour") : "cada 10 min"}`,
      tone: "teal",
    },
    {
      id: "lluvia",
      icon: "droplet",
      nombre: "Lluvia (radar)",
      sub: `Xweather · ${radarHora ? formatTooltipHeader(radarHora, "hour") : "cada 20 min"}`,
      tone: "teal",
    },
    { id: "sst", icon: "thermometer", nombre: "Temp. superficial", sub: "NASA MODIS", tone: "rojo" },
    { id: "clorofila", icon: "leaf", nombre: "Clorofila-a", sub: "Copernicus Marine", tone: "teal" },
    { id: "viento", icon: "wind", nombre: "Viento", sub: "Reporte comunitario", tone: "teal" },
    { id: "puntos", icon: "pin", nombre: "Puntos de pesca", sub: `${puntos.length} puntos · comunidad`, tone: "verde" },
    { id: "sedimentacion", icon: "waves", nombre: "Sedimentación", sub: "Zonas críticas", tone: "sediment" },
    { id: "semaforo", icon: "dot", nombre: "Semáforo", sub: "Condición por zona", tone: "amarillo" },
    { id: "estaciones", icon: "gauge", nombre: "Estaciones", sub: "Viento · humedad · lluvia · nivel río", tone: "teal" },
  ] as const;

  return (
    <div className="cr-mapa">
      <div className="cr-mapa-canvas">
        <div ref={elRef} style={{ position: "absolute", inset: 0 }} />
        {/* Colapsada es solo la lupa; al abrirse se expande hacia la derecha (transición de width en CSS).
            Se vuelve a plegar al perder el foco si no hay texto. */}
        <div className={"cr-map-search" + (searchOpen ? "" : " collapsed")}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 12, height: 44 }}>
            <button
              type="button"
              className="cr-map-search-btn"
              aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar punto de pesca"}
              aria-expanded={searchOpen}
              // Evita que el input pierda el foco antes del click (si no, el blur la pliega y el click la reabre).
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                if (searchOpen) {
                  setSearchOpen(false);
                  setQuery("");
                  setShowSug(false);
                  searchRef.current?.blur();
                } else {
                  setSearchOpen(true);
                  searchRef.current?.focus();
                }
              }}
            >
              <Icon name="search" size={17} />
            </button>
            <input
              ref={searchRef}
              tabIndex={searchOpen ? 0 : -1}
              onBlur={() => {
                if (!query) setSearchOpen(false);
              }}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSug(true);
              }}
              onFocus={() => setShowSug(true)}
              // Enter va a la primera coincidencia; Escape cierra la lista y, sin texto, pliega la barra.
              onKeyDown={(e) => {
                if (e.key === "Enter" && sugerencias[0]) goTo(sugerencias[0]);
                if (e.key === "Escape") {
                  setShowSug(false);
                  if (!query) e.currentTarget.blur();
                }
              }}
              placeholder="Buscar punto de pesca…"
              aria-label="Buscar punto de pesca"
              // El foco se marca en el contenedor (.cr-map-search:focus-within).
              style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14, color: "var(--ink)", fontFamily: "var(--font-body)" }}
            />
            {query && (
              <button
                aria-label="Limpiar búsqueda"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery("");
                  setShowSug(false);
                  searchRef.current?.focus();
                }}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-faint)", display: "flex" }}
              >
                <Icon name="x" size={15} />
              </button>
            )}
          </div>
          {showSug && sugerencias.length > 0 && (
            <div className="cr-sug">
              {sugerencias.map((p) => (
                <button key={p.id} onClick={() => goTo(p)} className="cr-sug-item">
                  <span style={{ display: "flex" }}>
                    <StatusDot tone={p.condicion} />
                  </span>
                  <span style={{ flex: 1, textAlign: "left" }}>{p.nombre}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-faint)" }}>
                    {p.especies[0]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="cr-coord mono">
          <Icon name="target" size={13} />
          {Math.abs(center[0]).toFixed(3)}°N, {Math.abs(center[1]).toFixed(3)}°W
        </div>
      </div>

      <aside className="cr-map-panel">
        <div className="cr-map-panel-head">
          <h2 className="serif" style={{ margin: 0, fontSize: 23, fontWeight: 600, color: "var(--verde)" }}>
            Capas y filtros
          </h2>
          <span style={{ color: "var(--ink-soft)", display: "flex" }}>
            <Icon name="sliders" size={19} />
          </span>
        </div>

        <div className="cr-map-panel-body">
          <SectionLabel style={{ margin: "4px 0 2px" }}>Capas de datos</SectionLabel>
          {capas.map((c) => (
            <div key={c.id} className="cr-layer-row">
              <span
                className="cr-layer-ic"
                style={{
                  background: `var(--${c.tone === "sediment" ? "sedimento" : c.tone}-soft, var(--surface-3))`,
                  color: `var(--${c.tone === "sediment" ? "sedimento" : c.tone === "verde" ? "verde-sem" : c.tone})`,
                }}
              >
                <Icon name={c.icon} size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{c.nombre}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-faint)" }}>
                  {c.sub}
                </div>
              </div>
              <Toggle on={layers[c.id]} onChange={(v) => setLayers((s) => ({ ...s, [c.id]: v }))} label={c.nombre} />
            </div>
          ))}

          <SectionLabel style={{ margin: "8px 0 2px" }}>Filtros</SectionLabel>
          <div className="cr-mini-card" style={{ display: "grid", gap: 12 }}>
            <label className="cr-field">
              <span className="mono cr-field-lbl">Especie objetivo</span>
              <select value={especie} onChange={(e) => setEspecie(e.target.value)} className="cr-select">
                <option value="all">Todas</option>
                {especies.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--teal)", display: "flex" }}>
                  <Icon name="moon" size={16} />
                </span>
                <span style={{ fontSize: 13, color: "var(--ink)" }}>Fase lunar actual</span>
              </div>
              <Toggle on={faseLuna} onChange={setFaseLuna} label="Fase lunar" />
            </div>
            {faseLuna && (
              <div
                className="mono"
                style={{ fontSize: 11.5, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 8, background: "var(--surface-3)", padding: "7px 10px", borderRadius: 8 }}
              >
                <svg width="18" height="18" viewBox="0 0 22 22">
                  <MoonGlyph phase={fase} size={18} active />
                </svg>
                Luna {moonPhaseLabel(fase).toLowerCase()} · {fase === "new" || fase === "full" ? "mareas vivas" : "mareas muertas"}
              </div>
            )}
            {especie !== "all" && (
              <div className="mono" style={{ fontSize: 11, color: "var(--teal)" }}>
                {especiesFiltradas.length} puntos con {especies.find((e) => e.id === especie)?.label.toLowerCase()}
              </div>
            )}
          </div>

          {selected && (
            <div className="cr-notes" style={{ animation: "cr-fade-up .3s ease" }}>
              <SectionLabel>Notas del punto seleccionado</SectionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "7px 0 4px" }}>
                <StatusDot tone={selected.condicion} pulse={selected.condicion === "rojo"} />
                <span className="serif" style={{ fontSize: 19, fontStyle: "italic", color: "var(--verde)" }}>
                  {selected.nombre}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "2px 0 9px" }}>
                {selected.temp != null && <MonoChip tone="teal">{selected.temp.toFixed(1)} °C</MonoChip>}
                {selected.clorofila != null && <MonoChip>{selected.clorofila.toFixed(1)} mg/m³</MonoChip>}
                {selected.tds != null && <MonoChip>{selected.tds.toFixed(0)} mg/L TDS</MonoChip>}
                <MonoChip tone="sediment">{selected.especies.join(" · ")}</MonoChip>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--ink-soft)" }}>{selected.observacion}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

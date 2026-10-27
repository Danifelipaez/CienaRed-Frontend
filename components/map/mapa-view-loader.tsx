"use client";

import dynamic from "next/dynamic";
import MapaLoading from "@/app/dashboard/mapa/loading";
import type { PuntoPesca, Especie, ZonaSedimentacion } from "@/lib/api";
import type { EstacionSnapshot } from "@/lib/stations";

// Mismo esqueleto que loading.tsx: sin salto entre la carga de la ruta y la de Leaflet.
const MapaView = dynamic(() => import("./mapa-view"), {
  ssr: false,
  loading: () => <MapaLoading />,
});

export function MapaViewLoader(props: {
  puntos: PuntoPesca[];
  especies: Especie[];
  sedimentacion: ZonaSedimentacion[];
  estaciones: EstacionSnapshot[];
}) {
  return <MapaView {...props} />;
}

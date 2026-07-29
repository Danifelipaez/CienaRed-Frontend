import { MapaViewLoader } from "@/components/map/mapa-view-loader";
import { BackendError } from "@/components/ui/backend-error";
import { getPoints, getSpecies, getSedimentation, getHistory } from "@/lib/api";
import { historyToEstaciones } from "@/lib/stations";

export default async function MapaPage() {
  let puntos, especies, zonas, history;
  try {
    [puntos, especies, zonas, history] = await Promise.all([
      getPoints(),
      getSpecies(),
      getSedimentation(),
      getHistory(1),
    ]);
  } catch {
    return <BackendError title="Mapa interactivo" />;
  }
  const estaciones = historyToEstaciones(history);
  return <MapaViewLoader puntos={puntos} especies={especies} sedimentacion={zonas} estaciones={estaciones} />;
}

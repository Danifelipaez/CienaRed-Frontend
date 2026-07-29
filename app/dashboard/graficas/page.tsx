import { GraficasView } from "@/components/charts/graficas-view";
import { BackendError } from "@/components/ui/backend-error";
import { getHistory, getLatestSnapshot, type DashboardSnapshot } from "@/lib/api";

export default async function GraficasPage() {
  let history;
  try {
    history = await getHistory(30);
  } catch {
    return <BackendError title="Gráficas e históricos" />;
  }
  // El snapshot solo alimenta la tarjeta de calidad del agua (dato que no vive
  // en /data/history) — su falla no debe tumbar toda la página de gráficas.
  let snapshot: DashboardSnapshot | null = null;
  try {
    snapshot = await getLatestSnapshot();
  } catch {
    snapshot = null;
  }
  return <GraficasView initialHistory={history} snapshot={snapshot} />;
}

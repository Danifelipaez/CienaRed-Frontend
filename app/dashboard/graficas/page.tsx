import { GraficasView } from "@/components/charts/graficas-view";
import { BackendError } from "@/components/ui/backend-error";
import { getHistory } from "@/lib/api";

export default async function GraficasPage() {
  let history;
  try {
    history = await getHistory(30);
  } catch {
    return <BackendError title="Gráficas e históricos" />;
  }
  return <GraficasView initialHistory={history} />;
}

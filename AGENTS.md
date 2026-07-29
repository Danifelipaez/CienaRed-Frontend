# Frontend

Next.js App Router project. Ver [README.md](README.md) para setup, páginas, env vars y deploy.
Convenciones propias de este repo que no son el default de Next:

- **No inventar componentes de UI.** Todo lo visual reusable vive en `components/ui/` (`Card`/`CardGrid`, `Pill`/`MonoChip`/`StatusDot`/`Toggle`, `MetricGrid`/`MetricTile`, `Icon`) y en `components/ui/charts.tsx` (charts hechos a mano en SVG — no hay recharts/chart.js/d3 en el proyecto, no agregar uno). Revisar ahí antes de escribir JSX/CSS nuevo para una tarjeta, badge o gráfica.
- **Gráficas de `/dashboard/graficas` son declarativas.** Una gráfica nueva = una función pura en `components/charts/adapters.ts` (`HistoryResponse` → serie) + una entrada en `components/charts/chart-specs.ts`. No tocar `graficas-view.tsx`, que solo mapea `CHART_SPECS`.
- **Toda llamada al backend pasa por `lib/api.ts`** (un tipo TS + un `get*` por endpoint, fetch nativo con `next: { revalidate }`, sin cliente HTTP externo). No hacer `fetch` a mano en un componente o page.
- **`DashboardSnapshot` (`/data/latest`, dato actual) e `HistoryResponse` (`/data/history`, series) son modelos distintos** — el histórico no incluye calidad del agua/sensores, solo el snapshot la tiene. No asumir que un campo de uno existe en el otro.
- **Rutas admin (`ai/ask`, `ai/history`, `system-status`) nunca se llaman desde el cliente.** Pasan por Route Handlers en `app/api/admin/*`, que inyectan `ADMIN_API_KEY` server-side vía `backendFetchAdmin()`.
- No hay autenticación real: `lib/user-id.ts` genera un UUID por navegador (localStorage) solo para aislar el historial de "Pregunta a la IA" entre usuarios — no lo confundir con control de acceso.

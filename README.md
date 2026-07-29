# CienaRed Frontend

Dashboard Next.js (App Router) para **CienRayas** (nombre de producto mostrado en la UI — el
repo/paquete se llaman CienaRed/frontend, no son el mismo nombre): monitoreo ambiental de la
Ciénaga Grande de Santa Marta para pescadores artesanales. Consume un backend FastAPI aparte
(`CienaNet Bot`, repo separado).

`/` redirige siempre a `/dashboard/mapa` — no hay landing page propia.

## Páginas

| Ruta | Qué muestra |
|---|---|
| `/dashboard/mapa` | Mapa Leaflet: puntos de pesca (semáforo/IPP/salinidad/TDS), estaciones meteorológicas, capas de temperatura/clorofila/viento y sedimentación. |
| `/dashboard/graficas` | Históricos (7/30/90 días): viento, ráfagas, temperatura, humedad, temp. superficial, clorofila, precipitación IDEAM, nivel de río, ciclo lunar, correlación clorofila-captura, calidad del agua actual (pH/conductividad/salinidad/TDS/nivel + tendencias 24h-7d) y eventos históricos del semáforo. |
| `/dashboard/ia` | Chat "Pregunta a la IA" contra el backend, con historial por conversación. |
| `/dashboard/sistema` | Estado de las APIs externas del backend, métricas del bot de WhatsApp, señales de riesgo compuestas (anoxia, pulso de agua dulce — estimaciones, no mediciones) y log de alertas enviadas. |

El header global (`DashboardShell`) muestra, en todas las páginas, las pills de estado de API y
una alerta si hay ciclones activos (NOAA NHC).

## Setup

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Ninguna es obligatoria para levantar en local (hay defaults), pero para hablar con un backend real:

| Variable | Requerida | Descripción |
|---|---|---|
| `BACKEND_URL` | No (default `http://localhost:8000`) | URL base del backend FastAPI. Solo se lee server-side (Server Components y Route Handlers). |
| `ADMIN_API_KEY` | Sí, para las rutas admin | Clave `X-Admin-Key` del backend. La usan `app/api/admin/*` (ai/ask, ai/history, system-status) vía `backendFetchAdmin()`. Nunca se expone al cliente. Sin ella, esas rutas fallan con error explícito. |

Ponlas en `.env.local` (no se versiona).

## Arquitectura

- Todas las llamadas al backend viven en [lib/api.ts](lib/api.ts) — un tipo TS + una función `get*` por endpoint, sin cliente HTTP externo (fetch nativo con `next: { revalidate }`).
- Dos modelos de datos ambientales, no intercambiables:
  - **Snapshot actual** (`GET /data/latest` → `DashboardSnapshot`, vía `getLatestSnapshot()`): semáforo, clima por estación (CGSM + Tasajera), satélite, calidad del agua, tendencias 24h/7d, señales de riesgo (anoxia/pulso de agua dulce) y alertas de ciclón. Vive el momento presente, no series.
  - **Histórico** (`GET /data/history` → `HistoryResponse`, vía `getHistory(days)`): series de tiempo para Gráficas. No incluye calidad del agua/sensores — esa serie no existe en el backend todavía, solo el valor actual vía el snapshot.
- Lecturas públicas (puntos, especies, sedimentación, snapshot, histórico) se piden directo desde Server Components.
- Rutas que requieren `X-Admin-Key` (`ai/ask`, `ai/history`, `system-status`) pasan por Route Handlers en `app/api/admin/*`, que leen la clave server-side y nunca la exponen al cliente. El chat de IA además manda `X-User-Id` (UUID por navegador, ver [lib/user-id.ts](lib/user-id.ts)) para aislar el historial entre usuarios — no es autenticación real, solo scoping; el control de acceso sigue siendo `ADMIN_API_KEY`.
- `lib/api.ts` también define `getAlerts`/`AlertsResponse` (`GET /data/alerts`) sin usar en ninguna página todavía — las alertas de ciclón que sí se muestran (header global) vienen del snapshot, no de este endpoint.
- UI propia sin librería de componentes ni de gráficas: `components/ui/` (`Card`/`CardGrid`, `Pill`/`MonoChip`/`StatusDot`, `MetricGrid`/`MetricTile`, `Icon` con paths SVG a mano) y `components/ui/charts.tsx` (line/scatter chart hechos con SVG, sin recharts/chart.js/d3). Antes de añadir un componente nuevo, revisar si ya existe algo reusable ahí.
- Las gráficas de Gráficas son declarativas: cada una es un `ChartSpec` en `components/charts/chart-specs.ts` que apunta a una función pura en `adapters.ts` (`HistoryResponse` → serie). Añadir una gráfica nueva no toca `graficas-view.tsx`.
- `output: "standalone"` en [next.config.ts](next.config.ts) es para el build de Docker (servidor universitario), no afecta al deploy en Vercel.

## Deploy

Dos targets, independientes:

- **Vercel** (proyecto `ciena-net-dashboard`) — deploy normal de Next.js, configura `BACKEND_URL` y `ADMIN_API_KEY` en las env vars del proyecto.
- **Servidor universitario (Docker)** — usa el [Dockerfile](Dockerfile), build standalone. Pasa las mismas env vars al contenedor en runtime.

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # sirve el build de producción
npm run lint     # ESLint
npm test         # pruebas unitarias (Vitest)
```

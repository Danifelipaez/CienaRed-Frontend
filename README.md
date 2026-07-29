# CienaRed Frontend

Dashboard Next.js (App Router) para CienaRed: mapa de puntos de pesca, gráficas/históricos ambientales, "Pregunta a la IA" y estado del sistema. Consume un backend FastAPI aparte.

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

- Lecturas públicas (puntos, especies, sedimentación, históricos, alertas) se piden directo desde Server Components — ver [lib/api.ts](lib/api.ts).
- Rutas que requieren `X-Admin-Key` pasan por Route Handlers en `app/api/admin/*`, que leen la clave server-side y nunca la exponen al cliente.
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

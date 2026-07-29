/**
 * Fetch helpers hacia el backend FastAPI. Los endpoints públicos (puntos, especies,
 * sedimentación, history, alerts) se llaman directo desde Server Components.
 * Los endpoints con X-Admin-Key (ai/ask, ai/history, system-status) NUNCA se llaman
 * desde aquí en el cliente — pasan por los Route Handlers en app/api/admin/*, que
 * usan backendFetchAdmin() con la clave leída server-side.
 */

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

// Los datos ambientales cambian a lo sumo cada hora (refresco horario del backend),
// así que las lecturas de navegación se cachean unos segundos: la 1ª visita golpea
// el backend y las siguientes se sirven del Data Cache → navegación instantánea.
export const READ_REVALIDATE = 60;

// revalidate=N cachea la respuesta N segundos (Data Cache de Next). Sin él, no-store:
// cada llamada golpea el backend en vivo (correcto para lecturas por-usuario/mutaciones).
async function backendFetch<T>(path: string, init?: RequestInit, revalidate?: number): Promise<T> {
  const cacheOpt: RequestInit = revalidate != null ? { next: { revalidate } } : { cache: "no-store" };
  const res = await fetch(`${BACKEND_URL}/api/v1${path}`, { ...init, ...cacheOpt });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export async function backendFetchAdmin<T>(path: string, init?: RequestInit, revalidate?: number): Promise<T> {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) throw new Error("ADMIN_API_KEY no configurada en el servidor");
  return backendFetch<T>(
    path,
    { ...init, headers: { ...init?.headers, "X-Admin-Key": adminKey } },
    revalidate
  );
}

// ── Mapa ──────────────────────────────────────────────────────────────────────

export type Condicion = "verde" | "amarillo" | "rojo";

export interface PuntoPesca {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  especies: string[];
  observacion: string | null;
  temp: number | null;
  clorofila: number | null;
  viento: number | null;
  salinidad: number | null;
  tds: number | null;
  ipp: number;
  condicion: Condicion;
}

export interface Especie {
  id: string;
  label: string;
}

export interface ZonaSedimentacion {
  id: string;
  nombre: string;
  polygon: [number, number][];
  nivel: string;
  observacion: string | null;
}

export const getPoints = () =>
  backendFetch<{ puntos: PuntoPesca[] }>("/dashboard/points", undefined, READ_REVALIDATE).then((r) => r.puntos);

export const getSpecies = () =>
  backendFetch<{ especies: Especie[] }>("/dashboard/species", undefined, READ_REVALIDATE).then((r) => r.especies);

export const getSedimentation = () =>
  backendFetch<{ zonas: ZonaSedimentacion[] }>("/dashboard/sedimentation", undefined, READ_REVALIDATE).then((r) => r.zonas);

// ── Gráficas / históricos ──────────────────────────────────────────────────────

export interface WeatherHistoryPoint {
  timestamp: string;
  estacion: string;
  temperature_c: number | null;
  humidity_pct: number | null;
  wind_speed_kmh: number | null;
  wind_gust_kmh: number | null;
  precipitation_mm: number | null;
}

export interface SemaphoreHistoryPoint {
  date: string;
  color: string;
  reason: string | null;
  ipp_ranking: { zone: string; ipp: number }[] | null;
}

export interface SatelliteHistoryPoint {
  date: string;
  sst_celsius: number | null;
  chlorophyll_mgm3: number | null;
}

export interface CatchHistoryPoint {
  date: string;
  cantidad_indice: number;
}

export interface IdeamPrecipitacionPoint {
  date: string;
  estacion: string;
  precipitacion_mm: number;
}

export interface IdeamNivelPoint {
  date: string;
  estacion: string;
  nivel_m: number;
}

export interface HistoryResponse {
  weather: WeatherHistoryPoint[];
  semaphore: SemaphoreHistoryPoint[];
  satellite: SatelliteHistoryPoint[];
  captura: CatchHistoryPoint[];
  ideam_precipitacion: IdeamPrecipitacionPoint[];
  ideam_nivel_rio: IdeamNivelPoint[];
}

export const getHistory = (days = 30) =>
  backendFetch<HistoryResponse>(`/data/history?days=${days}`, undefined, READ_REVALIDATE);

// ── Estado actual (snapshot) ────────────────────────────────────────────────────

export interface WeatherSnapshot {
  temperature_c: number | null;
  humidity_pct: number | null;
  wind_speed_kmh: number | null;
  wind_direction_deg: number | null;
  wind_gust_kmh: number | null;
  precipitation_mm: number | null;
}

export interface SatelliteSnapshot {
  sst_celsius: number | null;
  chlorophyll_mgm3: number | null;
  date: string | null;
}

export interface SemaphoreInfo {
  color: string;
  reason: string;
  safe: boolean;
}

export interface WaterQuality {
  ph: number | null;
  temperature_c: number | null;
  conductivity_mscm: number | null;
  water_level_cm: number | null;
  salinity_psu: number | null;
  tds_mgl: number | null;
}

export interface SensorSummary {
  zone: string | null;
  ph: number | null;
  temperature_c: number | null;
  conductivity_mscm: number | null;
  water_level_cm: number | null;
}

export interface ZoneIPP {
  zone: string;
  ipp: number;
  cobertura: number | null;
}

export interface CycloneAlert {
  title: string;
  summary: string;
  link: string;
}

// direccion: null cuando no hay histórico suficiente — no es lo mismo que "estable".
export interface TrendVariable {
  actual: number;
  delta_24h: number | null;
  delta_7d: number | null;
  direccion: "subiendo" | "bajando" | "estable" | null;
}

export interface Tendencias {
  variables: Record<string, TrendVariable>;
  lluvia_72h_mm: number | null;
}

// Señal compuesta — ESTIMACIÓN, no medición (ver app/services/signals.py del backend).
export interface AnoxiaSignal {
  score: number | null;
  nivel: "alto" | "medio" | "bajo" | null;
  factores: string[];
  n_factores: number;
  estimacion: boolean;
}

export interface PulsoAguaDulce {
  lluvia_72h_mm: number;
  mensaje: string;
  estimacion: boolean;
}

export interface Senales {
  anoxia: AnoxiaSignal;
  pulso_agua_dulce: PulsoAguaDulce | null;
}

export interface DashboardSnapshot {
  semaphore: SemaphoreInfo;
  weather: WeatherSnapshot;
  tasajera_weather: WeatherSnapshot | null;
  satellite: SatelliteSnapshot;
  water: WaterQuality;
  sensors: SensorSummary[];
  ipp_ranking: ZoneIPP[];
  cyclone_alerts: CycloneAlert[];
  ideam_precipitacion: IdeamPrecipitacionPoint[];
  ideam_nivel_rio: IdeamNivelPoint[];
  origen: Record<string, unknown>;
  tendencias: Tendencias;
  senales: Senales;
  updated_at: string;
}

export const getLatestSnapshot = () =>
  backendFetch<DashboardSnapshot>("/data/latest", undefined, READ_REVALIDATE);

// ── Alertas ────────────────────────────────────────────────────────────────────

export interface ExternalAlertItem {
  source: string | null;
  type: string | null;
  title: string | null;
  fetched_at: string;
}

export interface AlertsResponse {
  cyclones: Record<string, unknown>[];
  external: ExternalAlertItem[];
  semaphore_color: string | null;
}

export const getAlerts = () => backendFetch<AlertsResponse>("/data/alerts");

// ── Pregunta a la IA ───────────────────────────────────────────────────────────

export interface AIDato {
  v: string;
  d: string;
  fuente: string;
}

export interface AIParrafo {
  tipo: "texto" | "datos" | "limitaciones";
  titulo: string | null;
  html: string | null;
  items: AIDato[] | null;
}

export interface AskResponse {
  parrafos: AIParrafo[];
  sugerencia: string | null;
  conversation_id: string; // hilo al que quedó asociada la respuesta
}

// Un turno (pregunta + respuesta) dentro de una conversación.
export interface AITurn {
  id: string;
  pregunta: string;
  respuesta: AIParrafo[];
  sugerencia: string | null;
  created_at: string;
}

// Una conversación del historial: un hilo con todos sus turnos (un hilo = una card).
export interface AIConversationItem {
  id: string; // conversation_id
  titulo: string; // primera pregunta del hilo
  created_at: string;
  updated_at: string; // última actividad — ordena el historial
  turnos: AITurn[];
}

// ── Sistema ────────────────────────────────────────────────────────────────────

export interface ApiStatus {
  id: string;
  nombre: string;
  desc: string;
  estado: "ok" | "degradado" | "caido";
  actualizado: string;
}

export interface BotMetrica {
  id: string;
  label: string;
  valor: string | number;
  sub: string;
}

export interface AlertLogEntry {
  hora: string;
  tipo: string;
  canal: string;
  zonas: string;
  texto: string;
  destinatarios?: number;
}

export interface SystemStatusResponse {
  apis: ApiStatus[];
  bot_metricas: BotMetrica[];
  log_alertas: AlertLogEntry[];
}

// Proxy de teselas de Xweather radar-global. La clave va dentro de la URL de Xweather, así que
// solo se arma aquí (server-side) y nunca llega al navegador.
// Cada tesela se cachea 120 s en el Data Cache de Next: varios usuarios mirando el mismo
// encuadre gastan un solo acceso de la cuota (plan Developer: 15.000 accesos/mes).
const CACHE_S = 120;
// ponytail: solo se limita el zoom (el del mapa, 9–15). Si alguien abusa del proxy para gastar
// la cuota, limitar también x/y a la región de la Ciénaga.
const ZOOM_MIN = 9;
const ZOOM_MAX = 15;

export async function GET(_req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params;
  const id = process.env.XWEATHER_CLIENT_ID;
  const secret = process.env.XWEATHER_CLIENT_SECRET;
  if (!id || !secret) return new Response("Xweather no configurado en el servidor", { status: 503 });
  if (![z, x, y].every((v) => /^\d+$/.test(v)) || +z < ZOOM_MIN || +z > ZOOM_MAX) {
    return new Response("Tesela inválida", { status: 400 });
  }

  const res = await fetch(`https://maps.api.xweather.com/${id}_${secret}/radar-global/${z}/${x}/${y}/current.png`, {
    next: { revalidate: CACHE_S },
  });
  // No se reenvía el cuerpo del error: podría repetir la URL con la clave.
  if (!res.ok) return new Response(null, { status: res.status === 404 ? 404 : 502 });

  return new Response(await res.arrayBuffer(), {
    headers: { "Content-Type": "image/png", "Cache-Control": `public, max-age=${CACHE_S}` },
  });
}

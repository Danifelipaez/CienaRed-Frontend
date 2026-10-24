// Proxy de teselas de Xweather radar-global. La clave va dentro de la URL de Xweather, así que
// solo se arma aquí (server-side) y nunca llega al navegador.
//
// Cuota (plan Developer: 15.000 tokens/mes compartidos con toda la cuenta; cada tesela = 1 token):
// solo se sirven las 2 teselas z9 que cubren la Ciénaga, y el mapa las escala a cualquier zoom
// (radar-global aquí es estimación satelital, más zoom no agrega detalle). Cada tesela se cachea
// en el Data Cache de Next y la comparten todos los usuarios: como mucho 2 tokens cada CACHE_S,
// sin importar cuánta gente mire el mapa (~4.300 tokens/mes con uso continuo a 20 min).
const CACHE_S = 20 * 60;
const TESELAS_RADAR = ["9/149/240", "9/150/240"];

export async function GET(_req: Request, { params }: { params: Promise<{ z: string; x: string; y: string }> }) {
  const { z, x, y } = await params;
  const id = process.env.XWEATHER_CLIENT_ID;
  const secret = process.env.XWEATHER_CLIENT_SECRET;
  if (!id || !secret) return new Response("Xweather no configurado en el servidor", { status: 503 });
  if (!TESELAS_RADAR.includes(`${z}/${x}/${y}`)) return new Response("Tesela fuera de la Ciénaga", { status: 404 });

  const res = await fetch(`https://maps.api.xweather.com/${id}_${secret}/radar-global/${z}/${x}/${y}/current.png`, {
    next: { revalidate: CACHE_S },
  });
  // No se reenvía el cuerpo del error: podría repetir la URL con la clave.
  if (!res.ok) return new Response(null, { status: res.status === 404 ? 404 : 502 });

  return new Response(await res.arrayBuffer(), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": `public, max-age=${CACHE_S}`,
      // Hora de la imagen de radar, para mostrarla en la lista de capas.
      "X-Radar-Hora": res.headers.get("x-aeris-valid-date") ?? "",
    },
  });
}

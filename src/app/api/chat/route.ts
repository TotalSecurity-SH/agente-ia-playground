import type { NextRequest } from "next/server";
import { construirPrompt, extraerAccion, limpiarNegocio, LIMITES, type Mensaje } from "@/lib/negocio";
import { credencial, responder } from "@/lib/llm";
import { respuestaDemo } from "@/lib/demo";

export const maxDuration = 30;

// Cada mensaje cuesta dinero: límite por IP (por instancia) además del límite de la conversación.
const VENTANA_MS = 10 * 60_000;
const MAX_POR_VENTANA = Number(process.env.AGENTE_LIMITE ?? 30);
const visitas = new Map<string, number[]>();

function limitado(ip: string) {
  const ahora = Date.now();
  const recientes = (visitas.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  recientes.push(ahora);
  visitas.set(ip, recientes);
  if (visitas.size > 5000) visitas.clear();
  return recientes.length > MAX_POR_VENTANA;
}

const error = (status: number, mensaje: string) => Response.json({ ok: false, mensaje }, { status });

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (limitado(ip)) return error(429, "Llegaste al límite de mensajes de la demo. Intenta de nuevo en unos minutos.");

  let body: { negocio?: Record<string, unknown>; mensajes?: unknown };
  try {
    body = await request.json();
  } catch {
    return error(400, "Solicitud inválida.");
  }

  const negocio = limpiarNegocio(body.negocio ?? {});
  const mensajes: Mensaje[] = Array.isArray(body.mensajes)
    ? body.mensajes
        .filter((m): m is Mensaje => (m?.rol === "usuario" || m?.rol === "agente") && typeof m.texto === "string")
        .map((m) => ({ rol: m.rol, texto: m.texto.slice(0, LIMITES.mensaje) }))
    : [];

  if (!mensajes.length || mensajes.at(-1)!.rol !== "usuario") return error(400, "Falta el mensaje del cliente.");
  if (mensajes.length > LIMITES.mensajesPorConversacion) return error(400, "La conversación llegó a su límite. Reiníciala para seguir probando.");

  const ia = process.env.AGENTE_DEMO === "1" ? null : credencial(request.headers.get("x-vercel-oidc-token"));
  if (ia) {
    try {
      const crudo = await responder(ia, construirPrompt(negocio), mensajes);
      return Response.json({ ok: true, modo: "ia", ...extraerAccion(crudo, negocio.objetivo) });
    } catch {
      // Si la IA falla (sin crédito, saturada o caída) el agente sigue funcionando en modo demostración.
    }
  }
  return Response.json({ ok: true, modo: "demo", ...extraerAccion(respuestaDemo(negocio, mensajes), negocio.objetivo) });
}

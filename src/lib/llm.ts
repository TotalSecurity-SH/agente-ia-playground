// Cliente mínimo para OpenAI o Anthropic usando fetch (sin SDKs).
// El proveedor se elige con LLM_PROVIDER o, si no se define, por la llave disponible.

import type { Mensaje } from "./negocio";

export type Proveedor = "openai" | "anthropic";

const MODELO_POR_DEFECTO: Record<Proveedor, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-5-5",
};

export class ErrorLlm extends Error {}

export function proveedorConfigurado(): Proveedor | null {
  const elegido = process.env.LLM_PROVIDER as Proveedor | undefined;
  if (elegido === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (elegido === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function responder(proveedor: Proveedor, sistema: string, mensajes: Mensaje[]): Promise<string> {
  const modelo = process.env.LLM_MODEL || MODELO_POR_DEFECTO[proveedor];
  const historial = mensajes.map((m) => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto }));
  const señal = AbortSignal.timeout(25_000);

  const res =
    proveedor === "openai"
      ? await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: señal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          body: JSON.stringify({ model: modelo, max_tokens: 350, temperature: 0.4, messages: [{ role: "system", content: sistema }, ...historial] }),
        })
      : await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: señal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({ model: modelo, max_tokens: 350, temperature: 0.4, system: sistema, messages: historial }),
        });

  if (!res.ok) {
    // El detalle se registra en el servidor; al usuario solo le llega un mensaje genérico.
    console.error(`LLM ${proveedor} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    throw new ErrorLlm(res.status === 429 ? "El servicio de IA está saturado. Intenta en un momento." : "El servicio de IA no respondió.");
  }

  const data = await res.json();
  const texto: string | undefined =
    proveedor === "openai"
      ? data.choices?.[0]?.message?.content
      : data.content?.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  if (!texto) throw new ErrorLlm("La IA respondió vacío.");
  return texto;
}

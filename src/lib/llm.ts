// Cliente mínimo para modelos de lenguaje usando fetch (sin SDKs).
// Proveedores: OpenAI, Anthropic o Vercel AI Gateway (que en Vercel se autentica con el token OIDC del proyecto).

import type { Mensaje } from "./negocio";

export type Proveedor = "openai" | "anthropic" | "gateway";

const MODELO_POR_DEFECTO: Record<Proveedor, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-5-5",
  gateway: "openai/gpt-4o-mini",
};

export class ErrorLlm extends Error {}

export interface Credencial {
  proveedor: Proveedor;
  token: string;
}

/**
 * Elige el proveedor: una llave explícita tiene prioridad; si no hay, se usa AI Gateway
 * con su llave o con el token OIDC que Vercel inyecta en cada petición.
 */
export function credencial(oidc?: string | null): Credencial | null {
  const { LLM_PROVIDER, OPENAI_API_KEY, ANTHROPIC_API_KEY, AI_GATEWAY_API_KEY } = process.env;
  if (LLM_PROVIDER === "anthropic" && ANTHROPIC_API_KEY) return { proveedor: "anthropic", token: ANTHROPIC_API_KEY };
  if (LLM_PROVIDER === "openai" && OPENAI_API_KEY) return { proveedor: "openai", token: OPENAI_API_KEY };
  if (OPENAI_API_KEY) return { proveedor: "openai", token: OPENAI_API_KEY };
  if (ANTHROPIC_API_KEY) return { proveedor: "anthropic", token: ANTHROPIC_API_KEY };
  const gateway = AI_GATEWAY_API_KEY || oidc || process.env.VERCEL_OIDC_TOKEN;
  return gateway ? { proveedor: "gateway", token: gateway } : null;
}

export async function responder({ proveedor, token }: Credencial, sistema: string, mensajes: Mensaje[]): Promise<string> {
  const modelo = process.env.LLM_MODEL || MODELO_POR_DEFECTO[proveedor];
  const historial = mensajes.map((m) => ({ role: m.rol === "usuario" ? "user" : "assistant", content: m.texto }));
  const señal = AbortSignal.timeout(25_000);
  const chat = { model: modelo, max_tokens: 350, temperature: 0.4, messages: [{ role: "system", content: sistema }, ...historial] };

  const res =
    proveedor === "anthropic"
      ? await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal: señal,
          headers: { "Content-Type": "application/json", "x-api-key": token, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: modelo, max_tokens: 350, temperature: 0.4, system: sistema, messages: historial }),
        })
      : await fetch(proveedor === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://ai-gateway.vercel.sh/v1/chat/completions", {
          method: "POST",
          signal: señal,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(chat),
        });

  if (!res.ok) {
    // El detalle se registra en el servidor; al usuario solo le llega un mensaje genérico.
    console.error(`LLM ${proveedor} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    throw new ErrorLlm(res.status === 429 ? "El servicio de IA está saturado. Intenta en un momento." : "El servicio de IA no respondió.");
  }

  const data = await res.json();
  const texto: string | undefined =
    proveedor === "anthropic"
      ? data.content?.filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("")
      : data.choices?.[0]?.message?.content;
  if (!texto) throw new ErrorLlm("La IA respondió vacío.");
  return texto;
}

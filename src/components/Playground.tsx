"use client";

import { useEffect, useRef, useState } from "react";
import {
  construirPrompt,
  ETIQUETAS,
  LIMITES,
  OBJETIVOS,
  PLANTILLAS,
  TONOS,
  type Accion,
  type Mensaje,
  type Negocio,
  type Objetivo,
  type Tono,
} from "@/lib/negocio";
import { BASE_PATH } from "@/lib/site";

const SUGERENCIAS: Record<Objetivo, string[]> = {
  cita: ["Hola, ¿cuánto cuesta la limpieza?", "¿Qué horario tienen?", "Quiero agendar una cita"],
  pedido: ["¿Qué tienen de comer?", "¿Cuánto cuesta el mole?", "Quiero hacer un pedido"],
  prospecto: ["Busco casa en renta", "¿Dónde están?", "Me interesa comprar con Infonavit"],
};

const campo = "w-full rounded-lg border border-[var(--line)] bg-transparent px-3 py-2 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25";

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="muted mb-1 block text-xs font-medium uppercase tracking-wider">{etiqueta}</span>
      {children}
    </label>
  );
}

export default function Playground() {
  const [plantilla, setPlantilla] = useState("Clínica dental");
  const [negocio, setNegocio] = useState<Negocio>(PLANTILLAS["Clínica dental"]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string>();
  const [modo, setModo] = useState<"ia" | "demo">();
  const [accion, setAccion] = useState<Accion>();
  const [verPrompt, setVerPrompt] = useState(false);
  const final = useRef<HTMLDivElement>(null);

  useEffect(() => final.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), [mensajes, enviando]);

  const reiniciar = () => {
    setMensajes([]);
    setAccion(undefined);
    setAviso(undefined);
  };

  const cambiar = <K extends keyof Negocio>(k: K, v: Negocio[K]) => {
    setNegocio((n) => ({ ...n, [k]: v }));
    reiniciar();
  };

  const elegirPlantilla = (nombre: string) => {
    setPlantilla(nombre);
    setNegocio(PLANTILLAS[nombre]);
    reiniciar();
  };

  const enviar = async (contenido: string) => {
    const limpio = contenido.trim().slice(0, LIMITES.mensaje);
    if (!limpio || enviando) return;
    const historial: Mensaje[] = [...mensajes, { rol: "usuario", texto: limpio }];
    setMensajes(historial);
    setTexto("");
    setEnviando(true);
    setAviso(undefined);
    try {
      const res = await fetch(`${BASE_PATH}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocio, mensajes: historial }),
      });
      const data = await res.json();
      if (!data.ok) {
        setAviso(data.mensaje);
        return;
      }
      setModo(data.modo);
      setMensajes([...historial, { rol: "agente", texto: data.texto }]);
      if (data.accion) setAccion(data.accion);
    } catch {
      setAviso("Sin conexión. Revisa tu internet.");
    } finally {
      setEnviando(false);
    }
  };

  const lleno = mensajes.length >= LIMITES.mensajesPorConversacion - 1;

  return (
    <main className="mx-auto -mt-16 grid w-full max-w-6xl flex-1 gap-4 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* ---------- Configuración ---------- */}
      <section className="card fade-up min-w-0 space-y-4 self-start p-5 shadow-xl shadow-black/5" style={{ animationDelay: ".25s" }}>
        <div>
          <h2 className="font-semibold">1. Configura tu negocio</h2>
          <p className="muted mt-0.5 text-sm">Elige una plantilla o escribe los datos de tu negocio. El agente solo responde con esta información.</p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Plantillas">
          {Object.keys(PLANTILLAS).map((p) => (
            <button
              key={p}
              onClick={() => elegirPlantilla(p)}
              aria-pressed={plantilla === p}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                plantilla === p ? "border-teal bg-teal/15 text-teal-dark dark:text-teal" : "border-[var(--line)] hover:border-teal/60"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Nombre">
            <input className={campo} maxLength={LIMITES.campoCorto} value={negocio.nombre} onChange={(e) => cambiar("nombre", e.target.value)} />
          </Campo>
          <Campo etiqueta="Giro">
            <input className={campo} maxLength={LIMITES.campoCorto} value={negocio.giro} onChange={(e) => cambiar("giro", e.target.value)} />
          </Campo>
          <Campo etiqueta="Horario">
            <input className={campo} maxLength={LIMITES.campoCorto * 2} value={negocio.horario} onChange={(e) => cambiar("horario", e.target.value)} />
          </Campo>
          <Campo etiqueta="Ubicación">
            <input className={campo} maxLength={LIMITES.campoCorto * 2} value={negocio.ubicacion} onChange={(e) => cambiar("ubicacion", e.target.value)} />
          </Campo>
        </div>
        <Campo etiqueta="Servicios y precios (uno por línea)">
          <textarea rows={4} className={`${campo} resize-y`} maxLength={LIMITES.campoLargo} value={negocio.servicios} onChange={(e) => cambiar("servicios", e.target.value)} />
        </Campo>
        <Campo etiqueta="Reglas del agente">
          <textarea rows={3} className={`${campo} resize-y`} maxLength={LIMITES.campoLargo} value={negocio.reglas} onChange={(e) => cambiar("reglas", e.target.value)} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Tono">
            <select className={campo} value={negocio.tono} onChange={(e) => cambiar("tono", e.target.value as Tono)}>
              {Object.keys(TONOS).map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Objetivo">
            <select className={campo} value={negocio.objetivo} onChange={(e) => cambiar("objetivo", e.target.value as Objetivo)}>
              {Object.entries(OBJETIVOS).map(([k, o]) => (
                <option key={k} value={k}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="border-t border-[var(--line)] pt-3">
          <button onClick={() => setVerPrompt((v) => !v)} className="text-sm font-semibold text-teal-dark hover:underline dark:text-teal" aria-expanded={verPrompt}>
            {verPrompt ? "Ocultar" : "Ver"} el prompt que recibe la IA
          </button>
          {verPrompt && (
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--line)] p-3 font-mono text-xs leading-relaxed">
              {construirPrompt(negocio)}
            </pre>
          )}
        </div>
      </section>

      {/* ---------- Chat estilo WhatsApp ---------- */}
      <section className="fade-up flex min-w-0 flex-col gap-4" style={{ animationDelay: ".35s" }}>
        <div className="card flex h-[600px] flex-col overflow-hidden shadow-xl shadow-black/5">
          <header className="flex items-center gap-3 bg-navy-900 px-4 py-3 text-[#eef2f7]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/25 font-bold text-teal">{negocio.nombre.charAt(0) || "N"}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{negocio.nombre || "Mi negocio"}</p>
              <p className="text-xs text-[#93a1b5]">{enviando ? "escribiendo…" : modo === "demo" ? "modo demostración" : "en línea"}</p>
            </div>
            <button onClick={reiniciar} className="rounded-md px-2 py-1 text-xs text-[#93a1b5] hover:bg-white/10 hover:text-white">
              Reiniciar
            </button>
          </header>

          <div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(var(--line)_1px,transparent_1px)] [background-size:16px_16px] p-3" aria-live="polite">
            {mensajes.length === 0 && (
              <div className="mx-auto mt-6 max-w-[85%] rounded-lg bg-[var(--card)] p-3 text-center text-xs shadow-sm">
                <p className="font-semibold">2. Escribe como si fueras un cliente</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {SUGERENCIAS[negocio.objetivo].map((s) => (
                    <button key={s} onClick={() => enviar(s)} className="rounded-md border border-[var(--line)] px-2 py-1.5 hover:border-teal">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === "usuario" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    m.rol === "usuario" ? "rounded-br-sm bg-teal-dark text-white" : "rounded-bl-sm bg-[var(--card)]"
                  }`}
                >
                  {m.texto}
                </p>
              </div>
            ))}
            {enviando && (
              <div className="flex">
                <span className="muted rounded-2xl rounded-bl-sm bg-[var(--card)] px-3 py-2 text-sm shadow-sm">•••</span>
              </div>
            )}
            {aviso && <p className="mx-auto max-w-[90%] rounded-lg bg-bad/10 px-3 py-2 text-center text-xs text-bad">{aviso}</p>}
            <div ref={final} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar(texto);
            }}
            className="flex gap-2 border-t border-[var(--line)] p-2"
          >
            <label htmlFor="mensaje" className="sr-only">
              Mensaje
            </label>
            <input
              id="mensaje"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={LIMITES.mensaje}
              disabled={lleno}
              placeholder={lleno ? "Conversación al límite: reiníciala" : "Escribe un mensaje"}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-2 text-sm outline-none focus:border-teal"
            />
            <button disabled={enviando || !texto.trim() || lleno} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-dark text-white transition disabled:opacity-40" aria-label="Enviar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2z" />
              </svg>
            </button>
          </form>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold">3. Lo que el agente capturó</h2>
          {accion ? (
            <>
              <p className="mt-1 text-xs text-ok">✓ {OBJETIVOS[accion.tipo].etiqueta}: datos listos para tu CRM, hoja de cálculo o n8n.</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                {Object.entries(accion.datos).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="muted">{ETIQUETAS[k] ?? k}</dt>
                    <dd className="min-w-0 break-words">{v || "—"}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p className="muted mt-1 text-xs">
              Cuando el cliente complete los datos ({OBJETIVOS[negocio.objetivo].campos.map((c) => ETIQUETAS[c].toLowerCase()).join(", ")}), aparecerán aquí en formato estructurado.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

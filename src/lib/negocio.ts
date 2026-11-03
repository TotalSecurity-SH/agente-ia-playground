// Configuración del negocio y construcción del prompt del agente.
// Se usa en el navegador (para mostrar el prompt) y en el servidor (para enviarlo al modelo).

export type Tono = "amable" | "formal" | "directo";
export type Objetivo = "cita" | "pedido" | "prospecto";

export interface Negocio {
  nombre: string;
  giro: string;
  horario: string;
  ubicacion: string;
  servicios: string;
  reglas: string;
  tono: Tono;
  objetivo: Objetivo;
}

export interface Mensaje {
  rol: "usuario" | "agente";
  texto: string;
}

/** Datos que el agente captura cuando cumple su objetivo (cita, pedido o prospecto). */
export interface Accion {
  tipo: Objetivo;
  datos: Record<string, string>;
}

export const LIMITES = {
  campoCorto: 80,
  campoLargo: 1200,
  mensaje: 500,
  mensajesPorConversacion: 24,
} as const;

export const TONOS: Record<Tono, string> = {
  amable: "Cálido y cercano, tutea al cliente y usa máximo un emoji por mensaje.",
  formal: "Profesional y cortés, habla de usted y no usa emojis.",
  directo: "Breve y al grano, sin rodeos ni emojis.",
};

export const OBJETIVOS: Record<Objetivo, { etiqueta: string; campos: string[] }> = {
  cita: { etiqueta: "Agendar una cita", campos: ["nombre", "telefono", "servicio", "fecha"] },
  pedido: { etiqueta: "Tomar un pedido", campos: ["nombre", "telefono", "pedido", "entrega"] },
  prospecto: { etiqueta: "Calificar un prospecto", campos: ["nombre", "telefono", "interes", "presupuesto"] },
};

export const ETIQUETAS: Record<string, string> = {
  nombre: "Nombre",
  telefono: "Teléfono",
  servicio: "Servicio",
  fecha: "Fecha",
  pedido: "Pedido",
  entrega: "Entrega",
  interes: "Interés",
  presupuesto: "Presupuesto",
};

export const PLANTILLAS: Record<string, Negocio> = {
  "Clínica dental": {
    nombre: "Sonrisa Plena",
    giro: "Clínica dental",
    horario: "Lunes a viernes de 9:00 a 19:00, sábados de 9:00 a 14:00",
    ubicacion: "Av. Central 123, Tuxtla Gutiérrez, Chiapas",
    servicios: "Valoración: gratis\nLimpieza dental: $650\nResina: desde $900\nBlanqueamiento: $3,500\nOrtodoncia: valoración y plan de pagos",
    reglas: "No des diagnósticos ni recetes medicamentos.\nSi hay dolor intenso o sangrado, ofrece la primera cita disponible.\nLos precios finales se confirman en la valoración.",
    tono: "amable",
    objetivo: "cita",
  },
  "Taller mecánico": {
    nombre: "Servicio Automotriz Ruiz",
    giro: "Taller mecánico",
    horario: "Lunes a sábado de 8:00 a 18:00",
    ubicacion: "Calle 5 Norte 48, Puebla",
    servicios: "Afinación menor: $1,200\nCambio de aceite: $750\nFrenos (balatas delanteras): $1,400\nDiagnóstico por computadora: $450",
    reglas: "No des un costo final sin revisar el auto.\nPregunta siempre marca, modelo y año.",
    tono: "directo",
    objetivo: "cita",
  },
  Restaurante: {
    nombre: "La Cocina de Doña Mary",
    giro: "Restaurante de comida mexicana con servicio a domicilio",
    horario: "Todos los días de 13:00 a 22:00",
    ubicacion: "Col. Centro, Oaxaca. Entregas en un radio de 5 km",
    servicios: "Mole negro con pollo: $185\nTlayuda tradicional: $140\nEnchiladas suizas: $150\nAgua de horchata 1 L: $45\nEnvío: $35",
    reglas: "Pedido mínimo a domicilio: $200.\nConfirma dirección completa y forma de pago (efectivo o transferencia).",
    tono: "amable",
    objetivo: "pedido",
  },
  Inmobiliaria: {
    nombre: "Hábitat Inmobiliaria",
    giro: "Venta y renta de casas y departamentos",
    horario: "Lunes a viernes de 9:00 a 18:00",
    ubicacion: "Mérida, Yucatán",
    servicios: "Casas en venta desde $1.8 millones\nDepartamentos en renta desde $9,000 al mes\nAsesoría de crédito Infonavit y bancario sin costo",
    reglas: "No prometas disponibilidad: un asesor la confirma.\nPregunta zona de interés, presupuesto y si usará crédito.",
    tono: "formal",
    objetivo: "prospecto",
  },
};

const recortar = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Normaliza lo que llega del cliente: recorta longitudes y valida opciones. */
export function limpiarNegocio(entrada: Partial<Record<keyof Negocio, unknown>>): Negocio {
  const tono = entrada.tono as Tono;
  const objetivo = entrada.objetivo as Objetivo;
  return {
    nombre: recortar(entrada.nombre, LIMITES.campoCorto) || "Mi negocio",
    giro: recortar(entrada.giro, LIMITES.campoCorto),
    horario: recortar(entrada.horario, LIMITES.campoCorto * 2),
    ubicacion: recortar(entrada.ubicacion, LIMITES.campoCorto * 2),
    servicios: recortar(entrada.servicios, LIMITES.campoLargo),
    reglas: recortar(entrada.reglas, LIMITES.campoLargo),
    tono: tono in TONOS ? tono : "amable",
    objetivo: objetivo in OBJETIVOS ? objetivo : "cita",
  };
}

export const MARCA_ACCION = "<<ACCION";

export function construirPrompt(n: Negocio): string {
  const { etiqueta, campos } = OBJETIVOS[n.objetivo];
  return `Eres el asistente de WhatsApp de "${n.nombre}" (${n.giro || "negocio"}). Atiendes a clientes en español de México.

DATOS DEL NEGOCIO
- Horario: ${n.horario || "no especificado"}
- Ubicación: ${n.ubicacion || "no especificada"}
- Servicios y precios:
${n.servicios || "(no especificados)"}

REGLAS DEL NEGOCIO
${n.reglas || "(sin reglas adicionales)"}

ESTILO
- ${TONOS[n.tono]}
- Mensajes cortos, como en WhatsApp: máximo 3 líneas.
- Usa solo la información de arriba. Si no sabes algo, dilo y ofrece que un asesor humano le contacte.
- No inventes precios, promociones ni horarios.
- Atiende solo temas de este negocio. Si te piden otra cosa, redirige amablemente.

OBJETIVO: ${etiqueta}
Pide uno por uno estos datos: ${campos.join(", ")}.
Cuando tengas todos y el cliente los confirme, despídete y en una línea aparte escribe exactamente:
${MARCA_ACCION} {${campos.map((c) => `"${c}":"..."`).join(",")}}>>`;
}

/** Separa el texto visible de la acción estructurada que el modelo agrega al final. */
export function extraerAccion(texto: string, objetivo: Objetivo): { texto: string; accion?: Accion } {
  const i = texto.indexOf(MARCA_ACCION);
  if (i < 0) return { texto: texto.trim() };
  const visible = texto.slice(0, i).trim();
  const fin = texto.indexOf(">>", i);
  const json = texto.slice(i + MARCA_ACCION.length, fin < 0 ? undefined : fin).trim();
  try {
    const crudo = JSON.parse(json) as Record<string, unknown>;
    const datos = Object.fromEntries(OBJETIVOS[objetivo].campos.map((c) => [c, recortar(crudo[c], 120)]));
    return { texto: visible, accion: { tipo: objetivo, datos } };
  } catch {
    return { texto: visible };
  }
}

// Agente de reglas para el modo demostración (sin llave de IA).
// Responde con los datos configurados y captura los campos del objetivo uno por uno.

import { MARCA_ACCION, OBJETIVOS, type Mensaje, type Negocio } from "./negocio";

const PREGUNTA: Record<string, string> = {
  nombre: "¿Me compartes tu nombre?",
  telefono: "¿A qué número de WhatsApp te confirmamos?",
  servicio: "¿Qué servicio te interesa?",
  fecha: "¿Qué día y hora te acomodan?",
  pedido: "¿Qué te gustaría pedir?",
  entrega: "¿Cuál es la dirección de entrega y cómo pagarás?",
  interes: "¿Qué estás buscando?",
  presupuesto: "¿Qué presupuesto aproximado tienes?",
};

const normal = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function buscarServicio(negocio: Negocio, texto: string): string | undefined {
  const palabras = normal(texto).split(/\W+/).filter((p) => p.length > 3);
  return negocio.servicios
    .split("\n")
    .find((linea) => palabras.some((p) => normal(linea).includes(p.slice(0, -1))));
}

export function respuestaDemo(negocio: Negocio, mensajes: Mensaje[]): string {
  const { campos } = OBJETIVOS[negocio.objetivo];
  const ultimo = mensajes.at(-1)?.texto ?? "";
  const t = normal(ultimo);

  // Campos ya respondidos: el mensaje del usuario que sigue a cada pregunta del agente.
  const datos: Record<string, string> = {};
  mensajes.forEach((m, i) => {
    const campo = campos.find((c) => m.rol === "agente" && m.texto.includes(PREGUNTA[c]));
    const respuesta = mensajes[i + 1];
    if (campo && respuesta?.rol === "usuario") datos[campo] = respuesta.texto;
  });
  const capturando = Object.keys(datos).length > 0;
  const siguiente = campos.find((c) => !(c in datos));

  if (capturando && !siguiente) {
    return `¡Listo, ${datos.nombre?.split(" ")[0] ?? ""}! Quedó registrado y te confirmamos por este medio. Gracias por escribir a ${negocio.nombre}.\n${MARCA_ACCION} ${JSON.stringify(datos)}>>`;
  }
  if (capturando && siguiente) return `Perfecto. ${PREGUNTA[siguiente]}`;

  if (/horario|abren|cierran|hora/.test(t)) return `Nuestro horario es: ${negocio.horario}.`;
  if (/donde|ubica|direccion/.test(t)) return `Estamos en ${negocio.ubicacion}.`;
  const servicio = buscarServicio(negocio, ultimo);
  if (servicio && /cuanto|precio|cuesta|costo/.test(t)) {
    return `${servicio}. ¿Te gustaría continuar? ${PREGUNTA[campos[0]]}`;
  }
  if (/cita|agendar|pedido|pedir|quiero|interesa|si\b|claro/.test(t)) return PREGUNTA[campos[0]];
  if (mensajes.length <= 1) {
    return `¡Hola! Bienvenido a ${negocio.nombre}. Te puedo ayudar con precios, horario, ubicación o a ${OBJETIVOS[negocio.objetivo].etiqueta.toLowerCase()}. ¿Qué necesitas?`;
  }
  return `En modo demostración respondo sobre precios, horario y ubicación. Con una llave de IA configurada, el agente entiende cualquier pregunta. ${PREGUNTA[campos[0]]}`;
}

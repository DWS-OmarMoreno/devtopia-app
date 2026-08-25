/**
 * Catálogo fijo de eventos disparadores reconocidos por el motor de alertas
 * (`lib/alertas/despacho.ts`). Antes de esta etapa, `evento_disparador` en
 * `alertas_notificaciones_reglas` era un campo de texto libre sin ningún
 * catálogo detrás — un administrador podía escribir cualquier cosa y la
 * regla simplemente nunca se disparaba. Este archivo es la única fuente de
 * verdad de qué eventos existen y de qué variables de plantilla
 * (`{{variable}}`) puede usar cada uno; se usa tanto para el dropdown de
 * Configuración → Alertas como para las llamadas a `dispararAlerta()` desde
 * cada server action.
 *
 * IMPORTANTE — no es (ni pretende ser) el catálogo final de todo lo que el
 * ERP podría notificar algún día: es el conjunto que quedó realmente
 * conectado a una acción real en esta etapa. Agregar un evento nuevo aquí no
 * hace nada por sí solo — hay que además llamar a `dispararAlerta()` desde
 * el lugar del código donde ese evento ocurre (ver comentarios "Alerta:" en
 * los `actions.ts` de cada módulo).
 *
 * Deliberadamente NO incluido todavía:
 *   - Cualquier evento de "timesheet rechazado" — el destinatario natural
 *     sería "el recurso dueño de ESE timesheet en particular", y
 *     `alertas_notificaciones_reglas.destinatarios_tipo` no tiene ningún
 *     valor que signifique eso (solo PM_PROYECTO/EQUIPO_PROYECTO/
 *     ROL_ESPECIFICO/USUARIO_ESPECIFICO fijo/CLIENTE) — agregar uno nuevo es
 *     un cambio de esquema fuera del alcance de esta etapa.
 */

export type CategoriaEvento = "TRANSACCIONAL" | "TIEMPO";

export interface DefinicionEvento {
  codigo: string;
  etiqueta: string;
  categoria: CategoriaEvento;
  entidadTipo: string;
  descripcion: string;
  /** Nombres de variables disponibles en plantilla_asunto/plantilla_cuerpo, sin las llaves. */
  variables: string[];
}

export const EVENTOS_DISPARADOR: DefinicionEvento[] = [
  {
    codigo: "COTIZACION_ENVIADA",
    etiqueta: "Cotización enviada al cliente",
    categoria: "TRANSACCIONAL",
    entidadTipo: "COTIZACION",
    descripcion: "Se dispara cuando una cotización pasa a estado ENVIADA.",
    variables: ["numero_cotizacion", "cuenta", "total", "moneda"],
  },
  {
    codigo: "COTIZACION_ACEPTADA",
    etiqueta: "Cotización aceptada por el cliente",
    categoria: "TRANSACCIONAL",
    entidadTipo: "COTIZACION",
    descripcion: "Se dispara cuando una cotización pasa a estado ACEPTADA.",
    variables: ["numero_cotizacion", "cuenta", "total", "moneda"],
  },
  {
    codigo: "COTIZACION_RECHAZADA",
    etiqueta: "Cotización rechazada por el cliente",
    categoria: "TRANSACCIONAL",
    entidadTipo: "COTIZACION",
    descripcion: "Se dispara cuando una cotización pasa a estado RECHAZADA.",
    variables: ["numero_cotizacion", "cuenta", "motivo_rechazo"],
  },
  {
    codigo: "CONTRATO_ACTIVADO",
    etiqueta: "Contrato activado",
    categoria: "TRANSACCIONAL",
    entidadTipo: "CONTRATO",
    descripcion: "Se dispara cuando un contrato pasa a estado ACTIVO.",
    variables: ["numero_contrato", "cuenta", "valor_total"],
  },
  {
    codigo: "PROYECTO_INICIADO",
    etiqueta: "Proyecto iniciado",
    categoria: "TRANSACCIONAL",
    entidadTipo: "PROYECTO",
    descripcion: "Se dispara cuando un proyecto pasa a estado EN_EJECUCION.",
    variables: ["numero_proyecto", "nombre_proyecto"],
  },
  {
    codigo: "HITO_ENTREGADO",
    etiqueta: "Hito entregado",
    categoria: "TRANSACCIONAL",
    entidadTipo: "HITO",
    descripcion: "Se dispara cuando un hito pasa a estado ENTREGADO.",
    variables: ["numero_entregable", "nombre_hito", "numero_proyecto"],
  },
  {
    codigo: "HITO_ACEPTADO_CLIENTE",
    etiqueta: "Hito aceptado por el cliente",
    categoria: "TRANSACCIONAL",
    entidadTipo: "HITO",
    descripcion: "Se dispara cuando un hito pasa a estado ACEPTADO.",
    variables: ["numero_entregable", "nombre_hito", "numero_proyecto"],
  },
  {
    codigo: "HITO_RECHAZADO",
    etiqueta: "Hito rechazado por el cliente",
    categoria: "TRANSACCIONAL",
    entidadTipo: "HITO",
    descripcion: "Se dispara cuando un hito pasa a estado RECHAZADO.",
    variables: ["numero_entregable", "nombre_hito", "numero_proyecto", "notas_rechazo"],
  },
  {
    codigo: "CHANGE_REQUEST_APROBADO_CLIENTE",
    etiqueta: "Change request aprobado por el cliente",
    categoria: "TRANSACCIONAL",
    entidadTipo: "CHANGE_REQUEST",
    descripcion: "Se dispara cuando un change request pasa a estado APROBADO_CLIENTE.",
    variables: ["numero_cr", "titulo", "numero_proyecto"],
  },
  {
    codigo: "ORDEN_COSTO_APROBADA",
    etiqueta: "Orden de costo aprobada",
    categoria: "TRANSACCIONAL",
    entidadTipo: "ORDEN_COSTO",
    descripcion: "Se dispara cuando una orden de costo pasa a estado APROBADA.",
    variables: ["numero_orden", "proveedor", "valor_total"],
  },
  {
    codigo: "HITO_PROXIMO_VENCER",
    etiqueta: "Hito próximo a vencer",
    categoria: "TIEMPO",
    entidadTipo: "HITO",
    descripcion:
      "Evaluado periódicamente (ver ruta de cron). \"Próximo\" se define por " +
      "parametros.dias_antes en la regla (por defecto 7 días); se ignoran " +
      "hitos ya ENTREGADO/EN_REVISION_CLIENTE/ACEPTADO/RECHAZADO.",
    variables: ["numero_entregable", "nombre_hito", "numero_proyecto", "fecha_planeada_entrega"],
  },
  {
    codigo: "CONTRATO_PROXIMO_VENCER",
    etiqueta: "Contrato próximo a vencer",
    categoria: "TIEMPO",
    entidadTipo: "CONTRATO",
    descripcion:
      "Evaluado periódicamente (ver ruta de cron). \"Próximo\" se define por " +
      "parametros.dias_antes en la regla (por defecto 15 días); se ignoran " +
      "contratos ya FINALIZADO/CANCELADO.",
    variables: ["numero_contrato", "cuenta", "fecha_fin_estimada"],
  },
  {
    codigo: "GARANTIA_PROXIMA_VENCER",
    etiqueta: "Garantía próxima a vencer",
    categoria: "TIEMPO",
    entidadTipo: "GARANTIA",
    descripcion:
      "Evaluado periódicamente (ver ruta de cron). \"Próxima\" se define por " +
      "parametros.dias_antes en la regla (por defecto 30 días). La empresa de " +
      "la garantía se toma del proyecto asociado o, si no tiene proyecto, del " +
      "contrato asociado.",
    variables: ["numero_proyecto", "numero_contrato", "fecha_fin_garantia"],
  },
];

export function obtenerDefinicionEvento(codigo: string): DefinicionEvento | undefined {
  return EVENTOS_DISPARADOR.find((e) => e.codigo === codigo);
}

export const EVENTOS_TIEMPO = EVENTOS_DISPARADOR.filter((e) => e.categoria === "TIEMPO");
